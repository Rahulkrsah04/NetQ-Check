// ============================================================
// NetQ Check — Real Image OCR & Declaration Parser
// Advanced, context-aware parser for real product labels and Blinkit screenshots
// Safe OCR corrections, strict MRP physical packaging attribution,
// multi-image evidence tracking, and zero demo fallbacks.
// ============================================================

/**
 * Filter out numbers that represent statutory IDs, barcodes, PIN codes,
 * phone numbers, dates, or FSSAI licenses rather than prices or quantities.
 */
function isNonPriceIdentifier(numStr, contextLine = '') {
  const cleanDigits = numStr.replace(/\D/g, '');
  
  // 1. PIN Codes (exactly 6 digits, often following state / pin / postal code)
  if (/pin|postal|code|bhopal|delhi|mumbai|bangalore|kolkata|chennai|rajkot|\b\d{6}\b/i.test(contextLine) && cleanDigits.length === 6) {
    return true;
  }
  
  // 2. Phone / Helpline numbers (10 digits or 1800 toll free)
  if (/care|helpline|call|phone|tel|mobile|toll\s*free|1800/i.test(contextLine) || (cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits)) || cleanDigits.startsWith('1800')) {
    return true;
  }
  
  // 3. FSSAI License Number (14 digits)
  if (/fssai|lic|license/i.test(contextLine) || cleanDigits.length === 14) {
    return true;
  }
  
  // 4. Barcodes / EAN / UPC (8, 12, 13, 14 digits)
  if (cleanDigits.length >= 8 && cleanDigits.length <= 14 && !numStr.includes('.')) {
    return true;
  }

  // 5. Batch numbers (e.g. B-204, Batch: 104)
  if (/batch|lot|b\.?\s*no/i.test(contextLine)) {
    return true;
  }

  return false;
}

/**
 * Contextual optical correction safety:
 * Only repairs common character confusions when bounded by explicit statutory context.
 * Never performs universal unvalidated string replacements.
 */
export function safeContextualClean(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  return rawText
    .replace(/\r\n/g, '\n')
    // Safe context: M.R.P. followed by optional separator and lowercase 'l' before digits
    .replace(/(m\.?r\.?p\.?\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*)l(\d+)/gi, (match, p1, p2) => `${p1}1${p2}`)
    // Safe context: M.R.P. decimal comma confusion like "32,00" (2 trailing digits) -> "32.00"
    .replace(/((?:m\.?\s*r\.?\s*p\.?|m\.?\s*a\.?\s*p\.?|maximum\s*retail\s*price)[^\n]{0,30}?\b\d+),(\d{2})\b/gi, (match, p1, p2) => `${p1}.${p2}`)
    // Safe context: Net Qty / Wt followed by optional separator and 'O' instead of 0
    .replace(/(net\s*(?:qty|quantity|wt|weight|vol|volume)\s*[:\-]?\s*)O(\d+)/gi, (match, p1, p2) => `${p1}0${p2}`);
}

/**
 * Distinguishes printed package MRP from online Blinkit selling prices,
 * discount prices, barcodes, phone numbers, and unrelated numbers.
 * @param {string} text - Raw OCR text
 * @returns {Object} { packageMRP, onlineSellingPrice, originalValue, confidence, isAmbiguous, notVisible, uncertainCorrection }
 */
export function extractMRP(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      packageMRP: null,
      onlineSellingPrice: null,
      originalValue: null,
      confidence: 0,
      isAmbiguous: false,
      notVisible: true,
      uncertainCorrection: false,
      remarks: 'MRP not visible in provided image — upload back/side label image.',
    };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const cleanedText = safeContextualClean(text);

  // 1. Strict Physical Package MRP regex (requires packaging context)
  // Handles optional "(Incl. of all taxes)" between MRP and amount, spaced "M R P", and common OCR currency glyphs (₹, ¥, ?, Z, 2 before X.XX)
  const packageMrpRegex = /(?:m\.?\s*r\.?\s*p\.?|maximum\s*retail\s*price|max\.?\s*retail\s*price)(?:\s*\(?\s*(?:incl\.?|inclusive)\s*(?:of\s*)?(?:all\s*|al\s*)?tax(?:es|e|s)?\s*\)?)?\s*[:\-;|]?\s*(?:\b(?:rs\.?|inr|re\.?)|₹|[?*=¥£€]|(?:[zZ2]\s+(?=\d+\.\d{2})))?\s*([\d,]+(?:\.\d{1,2})?)(?:\s*\/\-)?(?:\s*\(?(?:incl\.?|inclusive)\s*(?:of\s*)?(?:all\s*|al\s*)?tax(?:es|e|s)?\)?)?/i;

  // OCR variant where "MRP" was read as "MAP" or "MRF" AND paired with tax inclusion clause or explicit currency glyph
  const ocrMrpVariantRegex = /\b(?:m\.?\s*a\.?\s*p\.?|m\.?\s*r\.?\s*f\.?)\s*[:\-;|]?\s*(?:\b(?:rs\.?|inr|re\.?)|₹|[?*=¥£€zZ]|(?:2\s+(?=\d+\.\d{2})))\s*([\d,]+(?:\.\d{1,2})?)(?:\s*\/\-)?(?:\s*\(?(?:incl\.?|inclusive)\s*(?:of\s*)?(?:al[l]?\s*)?(?:tax(?:es|e|s)?|tas[e]?|es)\)?)?/i;

  // Also check for "Inclusive of all taxes" trailing clause or trailing "(MRP)" which confirms printed package price
  const taxClauseRegex = /(?:\b(?:rs\.?|inr)|₹|[?*=¥£€zZ])\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/\-)?\s*\(?(?:incl\.?|inclusive)\s*(?:of\s*)?(?:al[l]?\s*)?(?:tax(?:es|e|s)?|tas[e]?|es)\)?/i;
  const trailingMrpRegex = /(?:\b(?:rs\.?|inr)|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/\-)?\s*\(?\s*(?:m\.?\s*r\.?\s*p\.?|maximum\s*retail\s*price)\s*\)?/i;

  let packageMRP = null;
  let onlineSellingPrice = null;
  let originalValue = null;
  let confidence = 0;
  let isAmbiguous = false;
  let uncertainCorrection = false;

  const pkgMatch =
    cleanedText.match(packageMrpRegex) ||
    cleanedText.match(ocrMrpVariantRegex) ||
    cleanedText.match(taxClauseRegex) ||
    cleanedText.match(trailingMrpRegex);

  // Detect online e-commerce / shopping app UI chrome context (word-bounded so "Vitamins" etc. never match)
  const isBlinkitContext = /\b(?:blinkit|zepto|instamart|swiggy|bigbasket|jiomart|amazon|flipkart)\b|\bdeliver(?:y|ing)?\s+in\s+\d+\s*mins?\b|\badd\s+to\s+cart\b|\bview\s+cart\b|\bcheckout\b|\b\d{1,2}%\s*off\b|\bsave\s*(?:\b(?:rs\.?)|₹)/i.test(cleanedText);

  // Find all standalone currency/price candidates (word-bounded rs/inr so "Sugars 9" never matches)
  const standalonePriceRegex = /(?:\b(?:rs\.?|inr)|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi;
  const standaloneMatches = [];

  for (const line of lines) {
    if (/\b(?:unit\s*sale\s*price|usp)\b|(?:per|\/)\s*(?:kg|g|gm|gms|ml|l|ltr|litre|unit|pc|100\s*g|100\s*ml)\b/i.test(line)) {
      continue;
    }
    let match;
    while ((match = standalonePriceRegex.exec(line)) !== null) {
      const numStr = match[1];
      // Filter out barcodes, PIN codes, phone numbers
      if (!isNonPriceIdentifier(numStr, line)) {
        const parsedNum = parseFloat(numStr.replace(/,/g, ''));
        if (parsedNum > 0 && parsedNum < 100000) {
          standaloneMatches.push({
            fullMatch: match[0],
            amount: parsedNum,
            lineText: line,
          });
        }
      }
    }
  }

  if (pkgMatch && pkgMatch[1]) {
    let rawDigits = pkgMatch[1];
    // Repair OCR decimal comma (e.g. "32,00" -> "32.00") while keeping thousands ("1,200") untouched
    if (/^\d+,\d{2}$/.test(rawDigits)) {
      rawDigits = rawDigits.replace(',', '.');
    }
    const parsedMrpVal = parseFloat(rawDigits.replace(/,/g, ''));
    if (!isNonPriceIdentifier(rawDigits, pkgMatch[0]) && parsedMrpVal > 0 && parsedMrpVal < 100000) {
      packageMRP = `₹${rawDigits}`;
      originalValue = pkgMatch[0].trim();
      confidence = 0.95;

      // Check if raw text had an optical character fix
      if (/l\d+/i.test(text) && packageMRP) {
        uncertainCorrection = true;
      }

      // Check if there is an online selling price in addition to package MRP (e.g. on Blinkit screenshots)
      if (isBlinkitContext && standaloneMatches.length > 0) {
        const otherPrices = standaloneMatches.filter(m => m.amount !== parsedMrpVal);
        if (otherPrices.length > 0) {
          onlineSellingPrice = `₹${otherPrices[0].amount}`;
        }
      }
    }
  } else if (isBlinkitContext && standaloneMatches.length > 0) {
    // In e-commerce screenshot without explicit printed package MRP:
    // The price shown is an online selling / discount price, NOT statutory package MRP.
    onlineSellingPrice = `₹${standaloneMatches[0].amount}`;
    packageMRP = null;
    confidence = 0;
    // Do not fabricate an MRP or assume online price is package MRP!
  } else if (standaloneMatches.length === 1 && !isBlinkitContext) {
    // Single unlabeled currency price on a physical product photo:
    // Surface detected price with Needs Review status so inspector can confirm if printed MRP.
    packageMRP = `₹${standaloneMatches[0].amount}`;
    isAmbiguous = true;
    originalValue = standaloneMatches[0].fullMatch;
    confidence = 0.65;
  } else if (standaloneMatches.length > 1) {
    // Multiple unlabeled prices: strictly ambiguous
    isAmbiguous = true;
    confidence = 0.40;
  }

  const notVisible = !packageMRP && !isAmbiguous;

  let remarks = 'Extracted from physical package label';
  if (notVisible) {
    remarks = isBlinkitContext
      ? `Online selling price ${onlineSellingPrice || ''} detected — verify printed MRP on back/side label`
      : 'MRP not visible in provided image — upload back/side label image.';
  } else if (isAmbiguous && !packageMRP) {
    remarks = 'Manual Verification Required — Multiple prices detected without explicit MRP attribution.';
  } else if (isAmbiguous && packageMRP) {
    remarks = 'Currency price detected without explicit "MRP" prefix — please verify printed MRP.';
  } else if (onlineSellingPrice) {
    remarks = `Package MRP: ${packageMRP} (Online Selling Price: ${onlineSellingPrice})`;
  }

  return {
    packageMRP,
    onlineSellingPrice,
    originalValue,
    confidence,
    isAmbiguous,
    notVisible,
    uncertainCorrection,
    remarks,
  };
}

/**
 * Extracts Net Quantity from text (e.g., "500 g", "1 kg", "250 ml", "1 L", "100 ml", "2 pcs")
 * Safeguarded against nutrition tables, micronutrients (mg), zero values, barcodes, and serial digits.
 * @param {string} text
 * @returns {Object} { value, originalValue, confidence, uncertainCorrection, notDetectedReason }
 */
export function extractNetQuantity(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, originalValue: null, confidence: 0, uncertainCorrection: false };
  }

  const cleanedText = safeContextualClean(text);
  const unitPattern = '(kg|g|gm|gms|gram|grams|ml|l|ltr|ltrs|litre|liter|litres|liters|mg|pcs|pc|pieces|nos|units|unit)';

  const normalizeUnit = (rawUnit) => {
    const u = rawUnit.toLowerCase();
    if (['g', 'gm', 'gms', 'gram', 'grams'].includes(u)) return 'g';
    if (['l', 'ltr', 'ltrs', 'litre', 'liter', 'litres', 'liters'].includes(u)) return 'L';
    if (u === 'ml') return 'ml';
    if (u === 'kg') return 'kg';
    if (u === 'mg') return 'mg';
    if (['pcs', 'pc', 'pieces', 'nos', 'units', 'unit'].includes(u)) return 'pcs';
    return u;
  };

  // 1. Prioritize explicitly labeled Net Quantity / Weight / Volume lines
  const labeledQtyRegex = new RegExp(
    `(?:net\\s*(?:qty|quantity|wt|weight|vol|volume|content\\.?)|n\\.?\\s*w\\.?|quantity|weight|volume|qty)\\s*[:\\-|]*\\s*(\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\b`,
    'i'
  );
  const labeledMatch = cleanedText.match(labeledQtyRegex);
  if (labeledMatch && parseFloat(labeledMatch[1]) > 0) {
    const unit = normalizeUnit(labeledMatch[2]);
    return {
      value: `${labeledMatch[1]} ${unit}`,
      originalValue: labeledMatch[0].trim(),
      confidence: 0.96,
      uncertainCorrection: false,
    };
  }

  // 2. Fallback: scan lines for standalone SI unit quantity while skipping nutrition tables, RDA lines & USP rates
  const standaloneQtyRegex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\b`, 'i');
  const standaloneQtyGlobalRegex = new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\b`, 'gi');
  const nutritionOrRateRegex = /\b(?:(?:per|por|p[eo]r)\s*100|(?:per|por|p[eo]r)\s*s[eo]rve|servings?|pack\s*:\s*\d+|energy|protein|carbohydrate|carbs|sugar|added\s*sugars?|fat|total\s*fat|saturated|trans|cholesterol|fibre|fiber|sodium|iodine|lodine|iodate|potassium|calcium|iron|magnesium|zinc|vitamin|kcal|mcg|µg|rda|nutritional?|approx(?:imate)?|unit\s*sale\s*price|usp)\b|(?:per|por|\/)\s*(?:100\s*g|100\s*ml|kg|g|gm|ml|l)\b|\[\s*\d{1,3}\s*\]|\(\s*%\s*\)/i;

  // Standalone quantity numbers without 'Net Qty' prefix require packaging context so wall/desk noise is not falsely extracted
  const hasPackagingContext = /\b(?:net\s*(?:qty|quantity|wt|weight|vol|volume|content)|m\.?\s*r\.?\s*p|maximum\s*retail|pkg|pack|packaging|mfg|best\s*before|use\s*by|fssai|salt|rice|oil|soap|sugar|atta|flour|tea|coffee|biscuit)\b/i.test(cleanedText);

  if (hasPackagingContext) {
    const lines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (nutritionOrRateRegex.test(line)) continue;

      // Skip lines listing multiple nutrient quantities (e.g. "0 g, Carbohydrate 0 g" or "38000 mg ... 2 mg")
      const multiMatches = line.match(standaloneQtyGlobalRegex) || [];
      if (multiMatches.length > 1) continue;

      const match = line.match(standaloneQtyRegex);
      if (match) {
        const numericVal = parseFloat(match[1]);
        if (isNaN(numericVal) || numericVal <= 0) continue; // Reject "0 g" / zero-value nutrition noise

        const unit = normalizeUnit(match[2]);
        // Unlabeled "mg" is micronutrient content; unlabeled small gram amounts (< 50g) without 'Net' prefix are nutrition facts/serving noise
        if (unit === 'mg') continue;
        if (unit === 'g' && numericVal < 50 && !/\b(?:net|qty|quantity|wt|weight|content)\b/i.test(line)) continue;

        return {
          value: `${match[1]} ${unit}`,
          originalValue: match[0].trim(),
          confidence: 0.85,
          uncertainCorrection: false,
        };
      }
    }
  }

  const hasNetQtyHeading = /\bnet\s*(?:qty|quantity|wt|weight|vol|volume)\b/i.test(cleanedText);
  return {
    value: null,
    originalValue: null,
    confidence: 0,
    uncertainCorrection: false,
    notDetectedReason: hasNetQtyHeading
      ? 'NET QUANTITY label detected, but unit value could not be read clearly — enter manually or upload a sharper close-up.'
      : 'Net Quantity not detected in provided image',
  };
}

/**
 * Extracts Manufacturer / Packer / Marketer details from text
 * Supports "Mfd by", "Mfg by", "Mkt by", "Marketed by", "Packed by", and multi-line addresses.
 * Filters out adjacent declarations cleanly.
 * @param {string} text
 * @returns {Object} { value, originalValue, confidence }
 */
export function extractManufacturer(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, originalValue: null, confidence: 0 };
  }

  const mfgRegex = /(?:(?:manufactured|mfd\.?|mfg\.?|marketed|mktd\.?|mkt\.?|packed|pkd\.?|imported|distributed)(?:\s*(?:&|and|\/|,)\s*(?:manufactured|mfd\.?|mfg\.?|marketed|mktd\.?|mkt\.?|packed|pkd\.?|imported|distributed))*\s*by|(?:mf[gqd]|mi[gq]|mit|mk[tdc])\.?\s*by(?=\s*[:\-]|\s+[A-Z])|(?:manufacturer|packer|importer|regd\.?\s*office))[:\-]?\s*([^\n]+(?:\n[^\n]+){0,3})/gi;

  const stopLineRegex = /^(?:country\s*of\s*origin|made\s*in|consumer\s*care|customer\s*care|toll\s*free|helpline|m\.?\s*r\.?\s*p|maximum\s*retail|net\s*(?:qty|quantity|wt|weight|vol)|best\s*before|use\s*by|date\s*of|(?:mfg|mfd|mkt|mfq|mit|mig|miq|mkc)\.?\s*by|packed\s*by|pkd\.?\s*by|manufactured\s*by|marketed\s*by|for\s*repacking|unit\s*sale\s*price|usp|fssai\s*lic(?:ense)?\s*no)/i;

  const candidates = [];
  let match;
  while ((match = mfgRegex.exec(text)) !== null) {
    if (!match[1]) continue;
    const rawLines = match[1].split('\n').map(l => l.trim()).filter(Boolean);
    const keptLines = [];
    for (const line of rawLines) {
      const normalizedLine = line.replace(/^[^a-zA-Z0-9]+/, '').trim();
      if (stopLineRegex.test(normalizedLine)) break;
      // Strip trailing OCR artifact pipe/punctuation noise
      const cleanedLine = normalizedLine.replace(/\s*[|~]+\s*$/, '').trim();
      if (cleanedLine) keptLines.push(cleanedLine);
    }

    const rawVal = keptLines.join(', ').replace(/\s+/g, ' ').replace(/^[:\-,\s]+/, '').trim();
    if (rawVal.length > 4 && !/^\d+$/.test(rawVal) && /[a-zA-Z]{3,}/.test(rawVal)) {
      const hasPin = /\b\d{3}\s?\d{3}\b/.test(rawVal) ? 1 : 0;
      const hasOrg = /\b(?:ltd|limited|pvt|private|inc|corp|agro|foods|chemicals|consumer|products|industries|india)\b/i.test(rawVal) ? 1 : 0;
      const score = hasPin * 30 + hasOrg * 20 + Math.min(rawVal.length, 120);
      candidates.push({
        value: rawVal,
        originalValue: match[0].trim(),
        confidence: 0.90,
        score,
      });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    return {
      value: best.value,
      originalValue: best.originalValue,
      confidence: best.confidence,
    };
  }

  return { value: null, originalValue: null, confidence: 0 };
}

/**
 * Extracts Manufacturing/Packaging and Expiry/Use-By dates
 * Supports MM/YYYY, DD/MM/YYYY, MMM/YY (SEP/26, AUG/28), Date of Packing/Packaging, and Best Before periods.
 * @param {string} text
 * @returns {Object} { manufactureDate, expiryDate }
 */
export function extractDates(text) {
  if (!text || typeof text !== 'string') {
    return {
      manufactureDate: { value: null, originalValue: null, confidence: 0 },
      expiryDate: { value: null, originalValue: null, confidence: 0 },
    };
  }

  const datePattern = '(\\d{2}[\\/.\\-]\\d{2}[\\/.\\-]\\d{2,4}|\\d{2}[\\/.\\-]\\d{4}|\\d{2}[\\/.\\-]\\d{2}|[a-z]{3,9}\\s*[\\-,\\/\\s]?\\s*\\d{2,4})';
  const mfgRegex = new RegExp(
    `(?:date\\s*of\\s*(?:manufacture|mfg|packing|packaging|pac\\s*kaging|pkg)|(?:mfg|mfd|manufactured|packed|packing|packaging|pac\\s*kaging|pkd|pkg)\\s*(?:date|on)?)\\s*[:\\-~\\s]*${datePattern}`,
    'i'
  );
  const expRegex = new RegExp(
    `(?:best\\s*before|use\\s*by|exp\\.?\\s*date|expiry\\s*date|exp|expiry|bb)\\s*[:\\-~\\s]*(${datePattern.slice(1, -1)}|\\d+\\s*(?:months?|days?|years?)\\s*(?:from\\s*(?:date\\s*of\\s*)?(?:packaging|packing|pkg|manufacture|mfg|mfd))?)`,
    'i'
  );

  const normalizeMatchedDate = (raw) => {
    const trimmed = raw.trim();
    // Uppercase month abbreviations like "sEp/26" -> "SEP/26" while keeping duration statements readable
    if (/^[a-z]{3,9}\s*[\-,\/]\s*\d{2,4}$/i.test(trimmed)) {
      return trimmed.toUpperCase().replace(/\s+/g, '');
    }
    return trimmed;
  };

  const mfgMatch = text.match(mfgRegex);
  const expMatch = text.match(expRegex);

  return {
    manufactureDate: mfgMatch
      ? { value: normalizeMatchedDate(mfgMatch[1]), originalValue: mfgMatch[0].trim(), confidence: 0.90 }
      : { value: null, originalValue: null, confidence: 0 },
    expiryDate: expMatch
      ? { value: normalizeMatchedDate(expMatch[1]), originalValue: expMatch[0].trim(), confidence: 0.90 }
      : { value: null, originalValue: null, confidence: 0 },
  };
}

/**
 * Extracts Consumer Care / Helpline details (phone, toll-free, email, or multi-line care block)
 * @param {string} text
 * @returns {Object} { value, originalValue, confidence }
 */
export function extractConsumerCare(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, originalValue: null, confidence: 0 };
  }

  // 1. Direct single-line match (preserves exact phone / email extraction for standard labels)
  const careRegex = /(?:consumer|customer|helpline|care|feedback|toll\s*free)\s*(?:no\.?|number|cell|desk|details|email|toll\s*free|:|-)*\s*([+\d][\d\s\-]{7,14}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
  const directMatch = text.match(careRegex);

  // 2. Multi-line / noisy OCR Toll-Free & Email search (handles "CONSUMER CARE DETAILS: ...\nTOLL FREE NUMBER: 1800 108 4488\nEMAIL: care@tataconsumer.com")
  const tollFreeMatch = text.match(/(?:(?:t?o?ll|0ll)\s*free(?:\s*(?:no\.?|number))?\s*[:\-]?\s*)?(1[89]00[\s\-]?\d{3,4}[\s\-]?\d{3,4})/i);
  const labeledPhoneMatch = text.match(/(?:helpline|customer\s*care|consumer\s*care|call\s*(?:us)?|toll\s*free)\s*(?:no\.?|number|cell|:|-)*\s*([+\d][\d\s\-]{7,14})/i);
  const emailMatch = text.match(/(?:e-?mail\s*[:\-]?\s*)?([a-z0-9._%+-]+@[a-z0-9.-]+\.\s*[a-z]{2,})/i);

  const phoneRaw = directMatch && /^[+\d]/.test(directMatch[1].trim())
    ? directMatch[1].trim()
    : tollFreeMatch?.[1]?.trim() || labeledPhoneMatch?.[1]?.trim() || null;

  const emailRaw = emailMatch?.[1]
    ? emailMatch[1].replace(/\s+/g, '').trim()
    : (directMatch && directMatch[1].includes('@') ? directMatch[1].trim() : null);

  // Avoid combining unrelated parts when direct match alone already matched cleanly without separate email
  if (phoneRaw && emailRaw) {
    const combined = `${phoneRaw} | ${emailRaw}`;
    return {
      value: combined,
      originalValue: combined,
      confidence: 0.90,
    };
  }

  if (directMatch && directMatch[1]) {
    return {
      value: directMatch[1].trim(),
      originalValue: directMatch[0].trim(),
      confidence: 0.88,
    };
  }

  if (phoneRaw) {
    return {
      value: phoneRaw,
      originalValue: tollFreeMatch?.[0]?.trim() || labeledPhoneMatch?.[0]?.trim() || phoneRaw,
      confidence: 0.88,
    };
  }

  if (emailRaw) {
    return {
      value: emailRaw,
      originalValue: emailMatch[0].trim(),
      confidence: 0.85,
    };
  }

  // 3. Fallback: Consumer Care Details block exists with address/executive info even if phone/email partially obscured
  const careBlockMatch = text.match(/(?:consumer|customer)\s*care\s*(?:details|cell|desk|executive)?\s*[:\-]?\s*([^\n]+(?:\n[^\n]+){0,2})/i);
  if (careBlockMatch && careBlockMatch[1]) {
    const cleaned = careBlockMatch[1]
      .replace(/\d*\s*\(?\s*servings?\s*per\s*pack[^,\n]*/gi, '')
      .replace(/\n+/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length > 8 && /[a-zA-Z]{3,}/.test(cleaned)) {
      return {
        value: cleaned,
        originalValue: careBlockMatch[0].trim(),
        confidence: 0.70,
      };
    }
  }

  return { value: null, originalValue: null, confidence: 0 };
}

/**
 * Extracts Country of Origin (strictly within the same line to prevent bleed)
 * @param {string} text
 * @returns {Object} { value, originalValue, confidence }
 */
export function extractCountryOfOrigin(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, originalValue: null, confidence: 0 };
  }

  const countryRegex = /(?:country\s*of\s*origin|made\s*in|product\s*of)\s*[:\-]?\s*([a-zA-Z ]+)/i;
  const match = text.match(countryRegex);

  if (match && match[1]) {
    const country = match[1].trim();
    if (country.length > 2) {
      return {
        value: country,
        originalValue: match[0].trim(),
        confidence: 0.92,
      };
    }
  }

  return { value: null, originalValue: null, confidence: 0 };
}

/**
 * Extracts Unit Sale Price (USP) when declared on label or shopping card
 * @param {string} text
 * @returns {Object} { value, originalValue, confidence }
 */
export function extractUnitSalePrice(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, originalValue: null, confidence: 0 };
  }

  const uspPrefixRegex = /(?:unit\s*sale\s*price|u\.?s\.?p\.?)\s*[:\-]?\s*((?:rs\.?|₹|inr)\s*[\d,]+(?:\.\d{1,2})?\s*(?:per|\/)\s*(?:100\s*g|100\s*ml|kg|g|gm|ml|l|ltr|unit|pc)[a-z]*)/i;
  const inlineUspRegex = /\(?\s*((?:rs\.?|₹|inr)\s*[\d,]+(?:\.\d{1,2})?\s*(?:per|\/)\s*(?:100\s*g|100\s*ml|kg|g|ml|l|unit|pc))\s*\)?/i;

  const match = text.match(uspPrefixRegex) || text.match(inlineUspRegex);
  if (match && match[1]) {
    return {
      value: match[1].trim(),
      originalValue: match[0].trim(),
      confidence: 0.88,
    };
  }

  return { value: null, originalValue: null, confidence: 0 };
}

/**
 * Extracts Product Name and Brand while filtering out mobile status bars,
 * e-commerce UI chrome lines, statutory headers, marketing slogans, and OCR gibberish.
 * @param {string} text
 * @returns {Object} { productName, brand }
 */
export function extractProductNameAndBrand(text) {
  if (!text || typeof text !== 'string') {
    return {
      productName: { value: null, originalValue: null, confidence: 0 },
      brand: { value: null, originalValue: null, confidence: 0 },
    };
  }

  const isNoiseOrChromeLine = (line) => {
    if (!line || line.length < 3) return true;
    // Mobile status bar time, signal/battery indicators (e.g. "2:17 al 56 E10", "10:45 5G 84%")
    if (/^\d{1,2}[:.]\d{2}\b/.test(line)) return true;
    if (/\b(?:lte|volte|4g|5g|wifi|kb\/s|mb\/s)\b/i.test(line)) return true;
    if (/^\d{1,3}\s*%$/.test(line)) return true;

    // Reject OCR border/symbol gibberish containing backslash, pipe, angle brackets, or excessive symbols
    if (/[\\|<>[\]{}=~]/.test(line)) return true;

    // Require genuine 3+ letter words containing at least one vowel (rejects gibberish like "v. ay AND \ . ps" or "cnccmmee")
    const rawTokens = line.split(/\s+/).filter(Boolean);
    const validWords = [];
    let noiseTokens = 0;

    for (const tok of rawTokens) {
      const stripped = tok.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
      if (!stripped) {
        noiseTokens++;
        continue;
      }
      const isValidWord =
        (/^[a-zA-Z]{3,}$/.test(stripped) && /[aeiouy]/i.test(stripped) && !/[bcdfghjklmnpqrstvwxz]{5,}/i.test(stripped)) ||
        /^(?:mp|1l|\d+(?:g|kg|ml|l))$/i.test(stripped);

      if (isValidWord) {
        validWords.push(stripped);
      } else {
        noiseTokens++;
      }
    }

    if (validWords.length === 0) return true;
    // Reject lines dominated by short fragments/noise (e.g. "v. ay AND . ps", "Lon -", "s ITE > red")
    if (noiseTokens >= validWords.length && validWords.length <= 2) return true;
    if (/^\d+\s+\d*\(/.test(line) || /\bservings?\b/i.test(line)) return true;

    // Reject lines with multiple 1-2 letter fragments (e.g. "Sera ANE TAN Sm Ya ee") unless a commodity keyword is present
    const commodityKeywordRegex = /\b(?:salt|oil|rice|atta|flour|butter|soap|cream|powder|biscuits|tea|coffee|milk|water|sugar|dal|masala|juice|shampoo|toothpaste|detergent|iodised|evaporated|refined|commodity)\b/i;
    const shortLetterTokens = rawTokens.filter(t => t.replace(/[^a-zA-Z]/g, '').length <= 2);
    if (shortLetterTokens.length >= 2 && !commodityKeywordRegex.test(line)) {
      return true;
    }
    if (rawTokens.length > 2 && (shortLetterTokens.length / rawTokens.length) > 0.30 && !commodityKeywordRegex.test(line)) {
      return true;
    }
    if (rawTokens.length >= 3) {
      const t1 = rawTokens[rawTokens.length - 1].replace(/[^a-zA-Z]/g, '');
      const t2 = rawTokens[rawTokens.length - 2].replace(/[^a-zA-Z]/g, '');
      if (t1.length <= 2 && t2.length <= 2 && !commodityKeywordRegex.test(line)) {
        return true;
      }
    }

    // Reject single-word lines that are just generic stopwords or short non-product tokens
    if (validWords.length === 1 && rawTokens.length === 1 && /^(?:and|the|for|with|from|made|only|this|that|less|more|high|scan|visit)$/i.test(validWords[0])) {
      return true;
    }

    // E-commerce UI chrome lines
    if (/\b(?:blinkit|zepto|instamart|swiggy|bigbasket|jiomart|amazon|flipkart|deliver(?:y|ing)?\s+in|add\s+to\s+cart|view\s+cart|checkout|product\s+details|key\s+features|highlights|ratings?\s*(?:&|and)?\s*reviews?|you\s+save|buy\s+now|out\s+of\s+stock|in\s+stock|free\s+delivery|see\s+all|view\s+all|\d+%\s*off)\b/i.test(line)) {
      return true;
    }
    if (/^(?:blinkit|search|cart|home|deliver|mins|add|checkout|bill|order|total|save|discount|ratings?|reviews?|share|back)$/i.test(line)) {
      return true;
    }

    // Statutory / non-title packaging section lines & marketing/instructional boilerplate
    if (/^(?:net\s*(?:qty|quantity|wt|weight|vol|volume|content)|m\.?\s*r\.?\s*p|maximum\s*retail|incl\.?\s*of|inclusive\s*of|mfg|mfd|mkt|mfq|mit|mig|date\s*of|packed|packing|packaging|pkd|best\s*before|use\s*by|exp|expiry|manufactured|marketed|imported|distributed|fssai|lic\.?\s*no|batch|lot\s*no|country\s*of\s*origin|made\s*in|consumer\s*care|customer\s*care|toll\s*free|helpline|email|ingredients|nutrition|nutritional|serving|servings|energy|protein|carbohydrate|allergen|storage|directions|caution|warning|unit\s*sale\s*price|usp|barcode|rs\.?|₹|inr|did\s*you\s*know|also\s*explore|for\s*repacking|please\s*scan|see\s*the\s*first|letters\s*of|for\s*guidelines|please\s*visit|store\s*in|keep\s*away|approximate\s*values|per\s*serve)\b/i.test(line)) {
      return true;
    }
    if (/\b(?:repacking\s*unit|qr\s*code|batch\s*no|approximate\s*values|servings\s*per\s*pack|recyclable\s*pack|cleaner\s*environment|energy\s*savings|direct\s*heat|cool\s*and\s*dry|only\s*a\s*brand\s*name|true\s*nature|years\s*of\s*trust|mental\s*development|active\s*health|ancient\s*wisdom|with\s*the\s*goodness|right\s*amount\s*of\s*iodine|\binformation\b)\b/i.test(line)) {
      return true;
    }

    // Pure numeric / price / quantity lines
    if (/^(?:[₹$€£]|rs\.?|inr)?\s*[\d,.\-\/]+\s*(?:kg|g|gm|gms|ml|l|ltr|pcs)?$/i.test(line)) {
      return true;
    }

    return false;
  };

  // Safe OCR repair for common packaging commodity words (e.g. "lodised" -> "Iodised")
  const cleanTitle = (s) => s.replace(/\blodised\b/g, 'Iodised').replace(/\s+/g, ' ').trim();

  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const candidates = [];

  // 1. Check inline brand/product mentions inside sentences (e.g. "3 | Tata Salt is made with...", "nd Tata Salt is made with...")
  for (const rawLine of rawLines) {
    const inlineMatch = rawLine.match(/\b([A-Z][a-zA-Z0-9&'.-]{1,18}(?:\s+[A-Z][a-zA-Z0-9&'.-]{1,18}){1,3})\s+(?:is\s+made\s+with|provides|contains|'s\s+recyclable)\b/);
    if (inlineMatch && inlineMatch[1] && !isNoiseOrChromeLine(inlineMatch[1])) {
      const cleaned = cleanTitle(inlineMatch[1]);
      candidates.push({
        name: cleaned,
        score: 88,
        confidence: 0.85,
      });
    }
  }

  // 2. Score standalone non-noise lines (prefer clean early title lines & commodity keywords)
  const commodityKeywordRegex = /\b(?:salt|oil|rice|atta|flour|butter|soap|cream|powder|biscuits|tea|coffee|milk|water|sugar|dal|masala|juice|shampoo|toothpaste|detergent|iodised|evaporated|refined|commodity)\b/i;

  const cleanLines = rawLines.filter(l => !isNoiseOrChromeLine(l));
  cleanLines.forEach((line, idx) => {
    const cleaned = cleanTitle(line).replace(/[\s:;,\-•·]+$/, '').trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 0) return;
    const hasCommodity = commodityKeywordRegex.test(cleaned) ? 1 : 0;
    const isSentence = /\b(?:is|are|was|with|that|owing|please|visit|scan)\b/i.test(cleaned) && words.length > 5;
    if (isSentence) return;

    const strayNoiseCount = words.filter(w => !/^[a-zA-Z]{2,}[®™©.,-]*$/.test(w) && !/^\d+(?:g|kg|ml|l)$/i.test(w)).length;

    // Early lines on the label strongly correlate with product title; penalize lines with OCR junk tokens
    let score = 50 - Math.min(idx * 4, 24) - strayNoiseCount * 12;
    if (words.length >= 2 && words.length <= 6) score += 20;
    if (words.length === 1) score -= 12;
    if (hasCommodity) score += 22;

    const conf = strayNoiseCount >= 2 || (words.length === 1 && !hasCommodity) ? 0.60 : 0.80;

    candidates.push({
      name: cleaned,
      score,
      confidence: conf,
    });
  });

  const recognizedBrandRegex = /\b(?:tata|amul|aashirvaad|fortune|parle|britannia|haldiram|nestle|dabur|patanjali|itc|dettol|colgate|lifebuoy|surf\s*excel|freshglow|saffola|everest|catch|mdh|maggi|sunfeast|kissan)\b/i;

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    const hasCommodity = commodityKeywordRegex.test(best.name);
    const hasBrand = recognizedBrandRegex.test(best.name);
    const words = best.name.split(/\s+/).filter(Boolean);
    const isTitleCase = words.length >= 2 && words.length <= 5 && words.every(w => /^[A-Z][a-zA-Z0-9&'.-]{2,}$/.test(w));

    // Reject candidates that have no commodity, no brand, and are not clean Title-Case phrases
    if (hasCommodity || hasBrand || (isTitleCase && best.score >= 55)) {
      const brand = best.name.split(' ')[0] || null;
      return {
        productName: { value: best.name, originalValue: best.name, confidence: best.confidence },
        brand: { value: brand, originalValue: brand, confidence: Math.round(Math.min(0.80, best.confidence - 0.05) * 100) / 100 },
      };
    }
  }

  return {
    productName: { value: null, originalValue: null, confidence: 0 },
    brand: { value: null, originalValue: null, confidence: 0 },
  };
}

/**
 * Resolves normalized bounding box (percentages 0-100) for a detected declaration
 * by finding matching OCR line(s) and computing their union bounding box.
 * @param {Array<Object>} lines - Array of Tesseract line objects with { text, bbox: {x0, y0, x1, y1} }
 * @param {RegExp|Function|string} matcher - Match condition for the line(s)
 * @param {{ width: number, height: number }} dimensions - OCR canvas dimensions in pixels
 * @param {Object} [options={}] - Options (e.g. multiLine: boolean, padX: number, padY: number)
 * @returns {Object|null} Normalized bounding box or null if no reliable match
 */
export function resolveFieldBoundingBox(lines, matcher, dimensions, options = {}) {
  if (!lines || !Array.isArray(lines) || lines.length === 0) return null;
  const { width = 0, height = 0 } = dimensions || {};
  if (width <= 0 || height <= 0) return null;

  const { multiLine = false, padX = 0.5, padY = 0.5 } = options;

  const matchedLines = [];

  for (const line of lines) {
    if (!line || !line.bbox || typeof line.text !== 'string') continue;
    const lineText = line.text.trim();
    if (!lineText) continue;

    let isMatch = false;
    if (typeof matcher === 'function') {
      isMatch = matcher(lineText, line);
    } else if (matcher instanceof RegExp) {
      isMatch = matcher.test(lineText);
    } else if (typeof matcher === 'string' && matcher.trim()) {
      isMatch = lineText.toLowerCase().includes(matcher.toLowerCase());
    }

    if (isMatch) {
      matchedLines.push(line);
      if (!multiLine) break; // single line match is enough
    }
  }

  if (matchedLines.length === 0) return null;

  // Compute union bounding box across matched lines
  let minX0 = Infinity;
  let minY0 = Infinity;
  let maxX1 = -Infinity;
  let maxY1 = -Infinity;

  for (const line of matchedLines) {
    const { x0 = 0, y0 = 0, x1 = 0, y1 = 0 } = line.bbox || {};
    if (x0 < minX0) minX0 = x0;
    if (y0 < minY0) minY0 = y0;
    if (x1 > maxX1) maxX1 = x1;
    if (y1 > maxY1) maxY1 = y1;
  }

  if (minX0 >= maxX1 || minY0 >= maxY1) return null;

  // Convert to normalized percentages (0-100%)
  const rawX = (minX0 / width) * 100;
  const rawY = (minY0 / height) * 100;
  const rawWidth = ((maxX1 - minX0) / width) * 100;
  const rawHeight = ((maxY1 - minY0) / height) * 100;

  // Add small visual padding & clamp inside [0, 100]
  const clampedX = Math.max(0, Math.round((rawX - padX) * 10) / 10);
  const clampedY = Math.max(0, Math.round((rawY - padY) * 10) / 10);
  const clampedWidth = Math.min(100 - clampedX, Math.round((rawWidth + 2 * padX) * 10) / 10);
  const clampedHeight = Math.min(100 - clampedY, Math.round((rawHeight + 2 * padY) * 10) / 10);

  if (clampedWidth <= 0 || clampedHeight <= 0) return null;

  return {
    x: clampedX,
    y: clampedY,
    width: clampedWidth,
    height: clampedHeight,
    isRealCoordinate: true,
    matchedLineCount: matchedLines.length,
    pixelBox: {
      x0: minX0,
      y0: minY0,
      x1: maxX1,
      y1: maxY1,
    },
  };
}

/**
 * Detects whether OCR text contains genuine packaged commodity indicators
 * (statutory keywords, commodity terms, brand names, or decoded barcode/QR).
 * Prevents hallucinating fake products from empty room/wall/face camera shots.
 */
export function isGenuineProductLabel(rawText, barcodes = []) {
  if (barcodes && barcodes.some(b => b?.detected && b?.data)) {
    return true;
  }
  if (!rawText || typeof rawText !== 'string') return false;
  const text = rawText.trim();
  if (text.length < 5) return false;

  // 1. Statutory packaging declarations
  const statutoryRegex = /\b(?:m\.?\s*r\.?\s*p|maximum\s*retail\s*price|incl\.?\s*of\s*all\s*tax(?:es)?|net\s*(?:qty|quantity|wt|weight|vol|volume|content)|mfg|mfd|mkt|mktd|packed\s*by|manufactured\s*by|marketed\s*by|best\s*before|use\s*by|date\s*of\s*(?:pkg|packing|packaging|mfg)|expiry\s*date|exp\s*date|consumer\s*care|customer\s*care|toll\s*free|helpline|fssai|lic\.?\s*no|batch|lot|country\s*of\s*origin|made\s*in\s*india|unit\s*sale\s*price|usp|commodity|packaged)\b|(?:rs\.?|₹|inr)\s*\d+/i;
  if (statutoryRegex.test(text)) return true;

  // 2. Packaging commodities and established brands
  const commodityRegex = /\b(?:salt|iodised|vacuum\s*evaporated|sugar|rice|atta|flour|wheat|refined\s*oil|mustard\s*oil|sunflower\s*oil|soyabean\s*oil|soap|detergent|shampoo|toothpaste|tea|coffee|biscuit|biscuits|milk|butter|cheese|ghee|dal|noodles|chips|spices|masala|turmeric|chilli|coriander|tata|amul|aashirvaad|fortune|parle|britannia|haldiram|nestle|dabur|patanjali|itc|dettol|colgate|lifebuoy|surf\s*excel)\b/i;
  if (commodityRegex.test(text)) return true;

  // 3. Minimum text coherence: needs at least 5 meaningful words (>= 4 letters) and good coherence ratio
  const coherentWords = text.match(/\b[a-zA-Z]{4,}\b/g) || [];
  const tokens = text.split(/\s+/).filter(Boolean);
  if (coherentWords.length >= 5 && (coherentWords.length / tokens.length) >= 0.35) {
    return true;
  }

  return false;
}

/**
 * Master parser for real user uploaded images.
 * STRICTLY NO HARDCODED DEMO FALLBACKS!
 * @param {string} rawText - Actual OCR text extracted from image
 * @param {Object} [imageMeta={}] - image metadata (imageId, imageType, lines, dimensions, etc.)
 * @returns {Object} Extracted fields object with source attribution and real bounding boxes
 */
export function parseRealImageDeclarations(rawText, imageMeta = {}) {
  const text = rawText || '';
  const sourceImageId = imageMeta.imageId || 'IMG-01';
  const sourceImageType = imageMeta.imageType || 'Front Label';
  const lines = imageMeta.lines || [];
  const dimensions = imageMeta.dimensions || { width: 0, height: 0 };

  const isGenuine = isGenuineProductLabel(text, imageMeta.barcodes || []);
  if (!isGenuine) {
    return {
      rawOCRText: text,
      isGenuineProduct: false,
      productName: {
        value: null,
        confidence: 0,
        status: 'NOT_DETECTED',
        remarks: 'No genuine product label detected in image. Please point camera directly at a product package with clear text (MRP, Net Qty, Brand).',
        boundingBox: null,
        imageRegion: null,
        sourceImageId,
        sourceImageType,
      },
      brand: {
        value: null,
        confidence: 0,
        status: 'NOT_DETECTED',
        remarks: 'No product label detected in image.',
        boundingBox: null,
        imageRegion: null,
        sourceImageId,
        sourceImageType,
      },
      netQuantity: {
        value: null,
        confidence: 0,
        status: 'NOT_DETECTED',
        remarks: 'No product label detected in image.',
        boundingBox: null,
        imageRegion: null,
        sourceImageId,
        sourceImageType,
      },
      mrp: {
        value: null,
        confidence: 0,
        status: 'NOT_DETECTED',
        remarks: 'No product label detected in image.',
        boundingBox: null,
        imageRegion: null,
        sourceImageId,
        sourceImageType,
      },
      manufacturer: {
        value: null,
        confidence: 0,
        status: 'NOT_DETECTED',
        remarks: 'No product label detected in image.',
        boundingBox: null,
        imageRegion: null,
        sourceImageId,
        sourceImageType,
      },
      manufactureDate: {
        value: null,
        confidence: 0,
        status: 'NOT_DETECTED',
        remarks: 'No product label detected in image.',
        boundingBox: null,
        imageRegion: null,
        sourceImageId,
        sourceImageType,
      },
      expiryDate: {
        value: null,
        confidence: 0,
        status: 'NOT_DETECTED',
        remarks: 'No product label detected in image.',
        boundingBox: null,
        imageRegion: null,
        sourceImageId,
        sourceImageType,
      },
      consumerCare: {
        value: null,
        confidence: 0,
        status: 'NOT_DETECTED',
        remarks: 'No product label detected in image.',
        boundingBox: null,
        imageRegion: null,
        sourceImageId,
        sourceImageType,
      },
      countryOfOrigin: {
        value: null,
        confidence: 0,
        status: 'NOT_DETECTED',
        remarks: 'No product label detected in image.',
        boundingBox: null,
        imageRegion: null,
        sourceImageId,
        sourceImageType,
      },
      unitSalePrice: {
        value: null,
        confidence: 0,
        status: 'NOT_DETECTED',
        remarks: 'No product label detected in image.',
        boundingBox: null,
        imageRegion: null,
        sourceImageId,
        sourceImageType,
      },
    };
  }

  const mrpRes = extractMRP(text);
  const qtyRes = extractNetQuantity(text);
  const mfgRes = extractManufacturer(text);
  const datesRes = extractDates(text);
  const careRes = extractConsumerCare(text);
  const countryRes = extractCountryOfOrigin(text);
  const nameRes = extractProductNameAndBrand(text);
  const uspRes = extractUnitSalePrice(text);

  // Match genuine OCR bounding boxes against lines
  const mrpAmount = mrpRes.packageMRP ? mrpRes.packageMRP.replace(/[^0-9.]/g, '') : null;
  const mrpBbox = mrpRes.packageMRP
    ? resolveFieldBoundingBox(
        lines,
        (l) => {
          const lower = l.toLowerCase();
          const hasKeyword = /m\.?\s*r\.?\s*p|m\.?\s*a\.?\s*p|maximum\s*retail|incl.*tax/i.test(lower);
          const hasAmount = mrpAmount ? lower.includes(mrpAmount) : false;
          return hasKeyword || hasAmount;
        },
        dimensions
      )
    : null;

  const qtyBbox = qtyRes.value
    ? resolveFieldBoundingBox(
        lines,
        (l) => {
          const lower = l.toLowerCase();
          const qVal = (qtyRes.value || '').toLowerCase();
          return lower.includes(qVal) || /net\s*(?:qty|quantity|wt|weight|vol|volume)/i.test(lower);
        },
        dimensions
      )
    : null;

  const nameBbox = nameRes.productName.value
    ? resolveFieldBoundingBox(
        lines,
        (l) => {
          const lower = l.toLowerCase();
          const pName = (nameRes.productName.value || '').toLowerCase();
          return lower === pName || (pName.length > 5 && lower.includes(pName.slice(0, 10)));
        },
        dimensions
      )
    : null;

  const mfgBbox = mfgRes.value
    ? resolveFieldBoundingBox(
        lines,
        (l) => {
          const lower = l.toLowerCase();
          return (
            /(?:mfd|mfg|mkt|mfq|mit|mig)\.?\s*by|manufactured|marketed|packed\s*by|imported\s*by|packer/i.test(lower) ||
            (mfgRes.value && lower.includes(mfgRes.value.slice(0, 15).toLowerCase()))
          );
        },
        dimensions,
        { multiLine: true }
      )
    : null;

  const mfgDateBbox = datesRes.manufactureDate.value
    ? resolveFieldBoundingBox(
        lines,
        (l) => {
          const lower = l.toLowerCase();
          return (
            /(?:mfg|mfd|packed|packing|packaging|pac\s*kaging|pkd|pkg|date\s*of\s*(?:manufacture|packing|packaging|pkg))/i.test(lower) &&
            lower.includes(datesRes.manufactureDate.value.toLowerCase())
          );
        },
        dimensions
      )
    : null;

  const expDateBbox = datesRes.expiryDate.value
    ? resolveFieldBoundingBox(
        lines,
        (l) => {
          const lower = l.toLowerCase();
          return (
            /exp|expiry|best\s*before|use\s*by|bb/i.test(lower) &&
            lower.includes(datesRes.expiryDate.value.toLowerCase())
          );
        },
        dimensions
      )
    : null;

  const careBbox = careRes.value
    ? resolveFieldBoundingBox(
        lines,
        (l) => {
          const lower = l.toLowerCase();
          return (
            /consumer|customer|helpline|care|feedback|toll\s*free|0ll\s*free|email/i.test(lower) ||
            lower.includes(careRes.value.toLowerCase())
          );
        },
        dimensions,
        { multiLine: true }
      )
    : null;

  const countryBbox = countryRes.value
    ? resolveFieldBoundingBox(
        lines,
        (l) => {
          const lower = l.toLowerCase();
          return (
            /country\s*of\s*origin|made\s*in|product\s*of/i.test(lower) &&
            lower.includes(countryRes.value.toLowerCase())
          );
        },
        dimensions
      )
    : null;

  const uspBbox = uspRes.value
    ? resolveFieldBoundingBox(
        lines,
        (l) => {
          const lower = l.toLowerCase();
          return (
            /unit\s*sale\s*price|u\.?s\.?p|(?:per|\/)\s*(?:100\s*g|100\s*ml|kg|g|ml|l|unit|pc)/i.test(lower) ||
            lower.includes(uspRes.value.toLowerCase())
          );
        },
        dimensions
      )
    : null;

  // MRP field formatting & remarks
  let mrpField = {
    value: null,
    originalValue: mrpRes.originalValue || null,
    confidence: 0,
    status: 'NOT_DETECTED',
    onlineSellingPrice: mrpRes.onlineSellingPrice || null,
    remarks: mrpRes.remarks,
    boundingBox: null,
    imageRegion: null,
    sourceImageId,
    sourceImageType,
  };

  if (mrpRes.packageMRP) {
    mrpField = {
      value: mrpRes.packageMRP,
      originalValue: mrpRes.originalValue,
      confidence: mrpRes.confidence,
      ...(mrpRes.isAmbiguous ? { status: 'NEEDS_REVIEW', manualVerificationRequired: true } : {}),
      onlineSellingPrice: mrpRes.onlineSellingPrice || null,
      remarks: mrpRes.remarks,
      uncertainCorrection: mrpRes.uncertainCorrection,
      boundingBox: mrpBbox,
      imageRegion: mrpBbox,
      sourceImageId,
      sourceImageType,
    };
  } else if (mrpRes.isAmbiguous) {
    mrpField = {
      value: null,
      originalValue: mrpRes.originalValue,
      confidence: mrpRes.confidence,
      status: 'NEEDS_REVIEW',
      remarks: mrpRes.remarks,
      manualVerificationRequired: true,
      boundingBox: null,
      imageRegion: null,
      sourceImageId,
      sourceImageType,
    };
  }

  // Quantity field formatting
  let qtyField = {
    value: null,
    originalValue: null,
    confidence: 0,
    status: 'NOT_DETECTED',
    remarks: qtyRes.notDetectedReason || 'Net Quantity not detected in provided image',
    boundingBox: null,
    imageRegion: null,
    sourceImageId,
    sourceImageType,
  };

  if (qtyRes.value) {
    qtyField = {
      value: qtyRes.value,
      originalValue: qtyRes.originalValue,
      confidence: qtyRes.confidence,
      remarks: 'Extracted from label',
      boundingBox: qtyBbox,
      imageRegion: qtyBbox,
      sourceImageId,
      sourceImageType,
    };
  }

  return {
    rawOCRText: text,
    productName: {
      ...nameRes.productName,
      boundingBox: nameBbox,
      imageRegion: nameBbox,
      sourceImageId,
      sourceImageType,
    },
    brand: {
      ...nameRes.brand,
      boundingBox: nameBbox,
      imageRegion: nameBbox,
      sourceImageId,
      sourceImageType,
    },
    netQuantity: qtyField,
    mrp: mrpField,
    manufacturer: mfgRes.value
      ? {
          ...mfgRes,
          boundingBox: mfgBbox,
          imageRegion: mfgBbox,
          sourceImageId,
          sourceImageType,
        }
      : {
          value: null,
          originalValue: null,
          confidence: 0,
          status: 'NOT_DETECTED',
          remarks: 'Manufacturer not detected in provided image',
          boundingBox: null,
          imageRegion: null,
          sourceImageId,
          sourceImageType,
        },
    manufactureDate: datesRes.manufactureDate.value
      ? {
          ...datesRes.manufactureDate,
          boundingBox: mfgDateBbox,
          imageRegion: mfgDateBbox,
          sourceImageId,
          sourceImageType,
        }
      : {
          value: null,
          originalValue: null,
          confidence: 0,
          status: 'NOT_DETECTED',
          remarks: 'Manufacturing date not detected',
          boundingBox: null,
          imageRegion: null,
          sourceImageId,
          sourceImageType,
        },
    expiryDate: datesRes.expiryDate.value
      ? {
          ...datesRes.expiryDate,
          boundingBox: expDateBbox,
          imageRegion: expDateBbox,
          sourceImageId,
          sourceImageType,
        }
      : {
          value: null,
          originalValue: null,
          confidence: 0,
          status: 'NOT_DETECTED',
          remarks: 'Expiry date not detected',
          boundingBox: null,
          imageRegion: null,
          sourceImageId,
          sourceImageType,
        },
    consumerCare: careRes.value
      ? {
          ...careRes,
          boundingBox: careBbox,
          imageRegion: careBbox,
          sourceImageId,
          sourceImageType,
        }
      : {
          value: null,
          originalValue: null,
          confidence: 0,
          status: 'NOT_DETECTED',
          remarks: 'Consumer care not detected',
          boundingBox: null,
          imageRegion: null,
          sourceImageId,
          sourceImageType,
        },
    countryOfOrigin: countryRes.value
      ? {
          ...countryRes,
          boundingBox: countryBbox,
          imageRegion: countryBbox,
          sourceImageId,
          sourceImageType,
        }
      : {
          value: null,
          originalValue: null,
          confidence: 0,
          status: 'NOT_DETECTED',
          remarks: 'Country of origin not detected',
          boundingBox: null,
          imageRegion: null,
          sourceImageId,
          sourceImageType,
        },
    unitSalePrice: uspRes.value
      ? {
          ...uspRes,
          boundingBox: uspBbox,
          imageRegion: uspBbox,
          sourceImageId,
          sourceImageType,
        }
      : {
          value: null,
          originalValue: null,
          confidence: 0,
          status: 'NOT_DETECTED',
          remarks: 'Unit Sale Price not detected',
          boundingBox: null,
          imageRegion: null,
          sourceImageId,
          sourceImageType,
        },
  };
}
