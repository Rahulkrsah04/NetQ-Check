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
  // Handles optional "(Incl. of all taxes)" between MRP and amount, spaced "M R P", and common OCR currency glyphs
  const packageMrpRegex = /(?:m\.?\s*r\.?\s*p\.?|maximum\s*retail\s*price|max\.?\s*retail\s*price)(?:\s*\(?\s*(?:incl\.?|inclusive)\s*(?:of\s*)?(?:all\s*)?taxes\s*\)?)?\s*[:\-;|]?\s*(?:rs\.?|₹|inr|re\.?|[?*=¥£€])?\s*([\d,]+(?:\.\d{1,2})?)(?!\d|\s*(?:%|percent|off))\b(?:\s*\/\-)?(?:\s*\(?(?:incl\.?|inclusive)\s*(?:of\s*)?(?:all\s*)?taxes\)?)?/i;

  // Also check for "Inclusive of all taxes" trailing clause or trailing "(MRP)" which confirms printed package price
  const taxClauseRegex = /(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)(?!\d|\s*(?:%|percent|off))\b\s*(?:\/\-)?\s*\(?(?:incl\.?|inclusive)\s*(?:of\s*)?(?:all\s*)?taxes\)?/i;
  const trailingMrpRegex = /(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)(?!\d|\s*(?:%|percent|off))\b\s*(?:\/\-)?\s*\(?\s*(?:m\.?\s*r\.?\s*p\.?|maximum\s*retail\s*price)\s*\)?/i;

  let packageMRP = null;
  let onlineSellingPrice = null;
  let originalValue = null;
  let confidence = 0;
  let isAmbiguous = false;
  let uncertainCorrection = false;

  const pkgMatch =
    cleanedText.match(packageMrpRegex) ||
    cleanedText.match(taxClauseRegex) ||
    cleanedText.match(trailingMrpRegex);

  // Multi-line MRP lookahead:
  // Associate nearby price with MRP header across lines if not matched on single line
  let multiLineMatch = null;
  if (!pkgMatch) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/(?:m\.?\s*r\.?\s*p\.?|maximum\s*retail\s*price|max\.?\s*retail\s*price)\b/i.test(line)) {
        // Look ahead up to 3 subsequent lines
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const candidateLine = lines[j];
          if (/^(?:batch|lot|b\.?\s*no|\(?incl|\(?inclusive|usp|unit\s*sale\s*price|for\s*sale)/i.test(candidateLine) &&
              !/(?:rs\.?|₹|inr)\s*[\d,]+/i.test(candidateLine)) {
            continue;
          }

          const priceMatch = candidateLine.match(/(?:rs\.?|₹|inr|re\.?)?\s*([\d,]+(?:\.\d{1,2})?)(?!\d|\s*(?:%|percent|off))\b(?:\s*\/\-)?/i);
          if (priceMatch && priceMatch[1]) {
            const rawDigits = priceMatch[1];
            if (!isNonPriceIdentifier(rawDigits, candidateLine) &&
                !/\b(?:\d{1,2}\/\d{2,4}|\d{1,2}%\s*off|discount|save|cal|kcal|g|ml|kg|l)\b/i.test(candidateLine)) {
              const parsedVal = parseFloat(rawDigits.replace(/,/g, ''));
              if (parsedVal > 0 && parsedVal < 100000) {
                multiLineMatch = {
                  packageMRP: `₹${rawDigits}`,
                  originalValue: `${line}\n${candidateLine}`,
                  confidence: 0.95,
                  rawDigits,
                };
                break;
              }
            }
          }
        }
        if (multiLineMatch) break;
      }
    }
  }

  // Detect online e-commerce / shopping app UI chrome context (word-bounded so "Vitamins" etc. never match)
  const isBlinkitContext = /\b(?:blinkit|zepto|instamart|swiggy|bigbasket|jiomart|amazon|flipkart)\b|\bdeliver(?:y|ing)?\s+in\s+\d+\s*mins?\b|\badd\s+to\s+cart\b|\bview\s+cart\b|\bcheckout\b|\b\d{1,2}%\s*off\b|\bsave\s*(?:rs\.?|₹)/i.test(cleanedText);

  // Find all standalone currency/price candidates (excluding Unit Sale Price / per-unit rates)
  const standalonePriceRegex = /(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)/gi;
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
    const rawDigits = pkgMatch[1];
    if (!isNonPriceIdentifier(rawDigits, pkgMatch[0])) {
      packageMRP = `₹${rawDigits}`;
      originalValue = pkgMatch[0].trim();
      confidence = 0.95;

      // Check if raw text had an optical character fix
      if (/l\d+/i.test(text) && packageMRP) {
        uncertainCorrection = true;
      }

      // Check if there is an online selling price in addition to package MRP (e.g. on Blinkit screenshots)
      if (isBlinkitContext && standaloneMatches.length > 0) {
        const otherPrices = standaloneMatches.filter(m => m.amount !== parseFloat(rawDigits.replace(/,/g, '')));
        if (otherPrices.length > 0) {
          onlineSellingPrice = `₹${otherPrices[0].amount}`;
        }
      }
    }
  } else if (multiLineMatch) {
    packageMRP = multiLineMatch.packageMRP;
    originalValue = multiLineMatch.originalValue;
    confidence = multiLineMatch.confidence;
    if (isBlinkitContext && standaloneMatches.length > 0) {
      const otherPrices = standaloneMatches.filter(m => m.amount !== parseFloat(multiLineMatch.rawDigits.replace(/,/g, '')));
      if (otherPrices.length > 0) {
        onlineSellingPrice = `₹${otherPrices[0].amount}`;
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
 * Safeguarded against barcodes, phone numbers, and serial digits.
 * @param {string} text
 * @returns {Object} { value, originalValue, confidence, uncertainCorrection }
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

  // Boundary condition allows unspaced units (50g, 500ml, 1kg, 2L, 750ml, 100ge)
  const boundary = '(?:\b|(?=[℮e\s\\.\\,\\/\\(\\)\\-]|[^a-z0-9]|$))';

  // 1. Prioritize explicitly labeled Net Quantity / Weight / Volume lines
  const labeledQtyRegex = new RegExp(
    `(?:net\\s*(?:qty|quantity|wt\\.?|weight|vol\\.?|volume|content\\.?)|n\\.?\\s*w\\.?|quantity|weight|volume|qty)[:\\-\\.]?\\s*(\\d+(?:\\.\\d+)?)\\s*${unitPattern}${boundary}`,
    'i'
  );
  const labeledMatch = cleanedText.match(labeledQtyRegex);
  if (labeledMatch) {
    const unit = normalizeUnit(labeledMatch[2]);
    return {
      value: `${labeledMatch[1]} ${unit}`,
      originalValue: labeledMatch[0].trim(),
      confidence: 0.96,
      uncertainCorrection: false,
    };
  }

  // 2. Fallback: scan lines for standalone SI unit quantity while skipping nutrition tables & USP rates
  const standaloneQtyRegex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unitPattern}${boundary}`, 'i');
  const nutritionOrRateRegex = /\b(?:per\s*100|serving|energy|protein|carbohydrate|carbs|sugar|fat|saturated|trans|cholesterol|fibre|fiber|sodium|calcium|iron|vitamin|kcal|rda|unit\s*sale\s*price|usp)\b|(?:per|\/)\s*(?:100\s*g|100\s*ml|kg|g|gm|ml|l)\b/i;

  const lines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (nutritionOrRateRegex.test(line)) continue;
    const match = line.match(standaloneQtyRegex);
    if (match) {
      const unit = normalizeUnit(match[2]);
      return {
        value: `${match[1]} ${unit}`,
        originalValue: match[0].trim(),
        confidence: 0.95,
        uncertainCorrection: false,
      };
    }
  }

  return { value: null, originalValue: null, confidence: 0, uncertainCorrection: false };
}

/**
 * Extracts Manufacturer / Packer details from text
 * Filters out statutory FSSAI and telephone noise and stops before adjacent declarations.
 * Supports prefixes (Mfd by, Packed by, Factory) and company suffixes (Pvt. Ltd., Limited, LLP, Industries).
 * @param {string} text
 * @returns {Object} { value, originalValue, confidence }
 */
export function extractManufacturer(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, originalValue: null, confidence: 0 };
  }

  // 1. Explicit statutory manufacturer/packer prefixes
  const mfgPrefixRegex = /(?:(?:manufactured|mfd\.?|marketed|mktd\.?|packed|pkd\.?|imported|distributed|bottled|blended)(?:\s*(?:&|and|\/|,)\s*(?:manufactured|mfd\.?|marketed|mktd\.?|packed|pkd\.?|imported|distributed|bottled|blended))*\s*(?:by|at)|(?:manufacturer|packer|importer|factory(?:\s*address)?|regd\.?\s*(?:office|off\.?)))[:\-]?\s*([^\n]+(?:\n[^\n]+){0,2})/i;
  const match = text.match(mfgPrefixRegex);

  const stopLineRegex = /^(?:country\s*of\s*origin|made\s*in|consumer\s*care|customer\s*care|toll\s*free|helpline|m\.?\s*r\.?\s*p|maximum\s*retail|net\s*(?:qty|quantity|wt|weight|vol)|best\s*before|use\s*by|date\s*of|mfg\s*date|pkd\s*date|unit\s*sale\s*price|usp|fssai\s*lic)/i;

  if (match && match[1]) {
    const rawLines = match[1].split('\n').map(l => l.trim()).filter(Boolean);
    const keptLines = [];
    for (const line of rawLines) {
      if (stopLineRegex.test(line)) break;
      keptLines.push(line);
    }

    const rawVal = keptLines.join(', ').replace(/\s+/g, ' ').replace(/^[:\-,\s]+/, '').trim();
    if (rawVal.length > 3 && !/^\d+$/.test(rawVal)) {
      return {
        value: rawVal,
        originalValue: match[0].trim(),
        confidence: 0.92,
      };
    }
  }

  // 2. Fallback: Search for corporate entities with standard company suffixes
  // (Pvt. Ltd., Private Limited, Limited, Ltd., LLP, Industries)
  const companySuffixRegex = /\b([A-Z0-9&][A-Za-z0-9&.,'\-\s]{1,60}?\b(?:Pvt\.?\s*Ltd\.?|Private\s*Limited|Limited|Ltd\.?|LLP|Industries))\b/i;
  const nonCompanyFilter = /\b(?:limited\s*(?:offer|edition|time|period|stock|warranty)|nutrition|ingredients|directions|storage|instructions|serving)\b/i;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (stopLineRegex.test(line) || nonCompanyFilter.test(line)) continue;

    const compMatch = line.match(companySuffixRegex);
    if (compMatch && compMatch[1]) {
      const compName = compMatch[1].trim();
      if (compName.length >= 4 && /[a-zA-Z]{3,}/.test(compName)) {
        let fullVal = line.replace(/^[:\-,\s]+/, '').trim();
        if (fullVal === compName && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (!stopLineRegex.test(nextLine) && !nonCompanyFilter.test(nextLine) && !/mrp|net\s*qty/i.test(nextLine)) {
            fullVal = `${compName}, ${nextLine}`;
          }
        }

        return {
          value: fullVal,
          originalValue: fullVal,
          confidence: 0.90,
        };
      }
    }
  }

  return { value: null, originalValue: null, confidence: 0 };
}

/**
 * Extracts Manufacturing and Expiry dates
 * Supports MM/YYYY, DD/MM/YYYY, Month YYYY, Date of Packing, and Best Before periods.
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
    `(?:date\\s*of\\s*(?:manufacture|mfg|packing|pkg)|(?:mfg|mfd|manufactured|packed|packing|pkd|pkg)\\s*(?:date|on)?)\\s*[:\\-]?\\s*${datePattern}`,
    'i'
  );
  const expRegex = new RegExp(
    `(?:best\\s*before|use\\s*by|exp\\.?\\s*date|expiry\\s*date|exp|expiry|bb)\\s*[:\\-]?\\s*(${datePattern.slice(1, -1)}|\\d+\\s*(?:months?|days?|years?)\\s*(?:from\\s*(?:date\\s*of\\s*)?(?:packaging|packing|pkg|manufacture|mfg|mfd))?)`,
    'i'
  );

  const mfgMatch = text.match(mfgRegex);
  const expMatch = text.match(expRegex);

  return {
    manufactureDate: mfgMatch ? { value: mfgMatch[1].trim(), originalValue: mfgMatch[0].trim(), confidence: 0.90 } : { value: null, originalValue: null, confidence: 0 },
    expiryDate: expMatch ? { value: expMatch[1].trim(), originalValue: expMatch[0].trim(), confidence: 0.90 } : { value: null, originalValue: null, confidence: 0 },
  };
}

/**
 * Extracts Consumer Care / Helpline details
 * @param {string} text
 * @returns {Object} { value, originalValue, confidence }
 */
export function extractConsumerCare(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, originalValue: null, confidence: 0 };
  }

  const careRegex = /(?:consumer|customer|helpline|care|feedback|toll\s*free)\s*(?:no\.?|number|cell|desk|details|email|toll\s*free|:|-)*\s*([+\d][\d\s\-]{7,14}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
  const match = text.match(careRegex);

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
 * e-commerce UI chrome lines, statutory headers, and OCR gibberish.
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

    // Require at least one genuine 3+ letter English word (rejects symbol/numeric/short-code gibberish)
    const alphaMatches = line.match(/[a-zA-Z]{3,}/g) || [];
    if (alphaMatches.length === 0) return true;

    // E-commerce UI chrome lines
    if (/\b(?:blinkit|zepto|instamart|swiggy|bigbasket|jiomart|amazon|flipkart|deliver(?:y|ing)?\s+in|add\s+to\s+cart|view\s+cart|checkout|product\s+details|key\s+features|highlights|ratings?\s*(?:&|and)?\s*reviews?|you\s+save|buy\s+now|out\s+of\s+stock|in\s+stock|free\s+delivery|see\s+all|view\s+all|\d+%\s*off)\b/i.test(line)) {
      return true;
    }
    if (/^(?:blinkit|search|cart|home|deliver|mins|add|checkout|bill|order|total|save|discount|ratings?|reviews?|share|back)$/i.test(line)) {
      return true;
    }

    // Statutory / non-title packaging section lines
    if (/^(?:net\s*(?:qty|quantity|wt|weight|vol|volume|content)|m\.?\s*r\.?\s*p|maximum\s*retail|incl\.?\s*of|inclusive\s*of|mfg|mfd|date\s*of|packed|pkd|best\s*before|use\s*by|exp|expiry|manufactured|marketed|imported|distributed|fssai|lic\.?\s*no|batch|lot\s*no|country\s*of\s*origin|made\s*in|consumer\s*care|customer\s*care|toll\s*free|helpline|email|ingredients|nutrition|nutritional|serving|energy|protein|carbohydrate|allergen|storage|directions|caution|warning|unit\s*sale\s*price|usp|barcode|rs\.?|₹|inr)\b/i.test(line)) {
      return true;
    }

    // Pure numeric / price / quantity lines
    if (/^(?:[₹$€£]|rs\.?|inr)?\s*[\d,.\-\/]+\s*(?:kg|g|gm|gms|ml|l|ltr|pcs)?$/i.test(line)) {
      return true;
    }

    return false;
  };

  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => !isNoiseOrChromeLine(l));

  if (lines.length > 0) {
    const name = lines[0];
    const brand = name.split(' ')[0] || null;
    return {
      productName: { value: name, originalValue: name, confidence: 0.80 },
      brand: { value: brand, originalValue: brand, confidence: 0.75 },
    };
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
          const hasKeyword = /m\.?r\.?p|maximum\s*retail|incl.*taxes/i.test(lower);
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
            /mfd\.?\s*by|manufactured|marketed|packed\s*by|imported\s*by|packer/i.test(lower) ||
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
            /(?:mfg|mfd|packed|packing|pkd|pkg|date\s*of\s*(?:manufacture|packing|pkg))/i.test(lower) &&
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
            /consumer|customer|helpline|care|feedback|toll\s*free|email/i.test(lower) ||
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
    remarks: 'Net Quantity not detected in provided image',
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
