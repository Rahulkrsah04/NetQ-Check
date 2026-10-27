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
  // E.g.: "M.R.P. ₹120.00", "MRP: Rs. 120/- (Incl. of all taxes)", "Maximum Retail Price: ₹ 120"
  const packageMrpRegex = /(?:m\.?r\.?p\.?|maximum\s*retail\s*price|max\s*retail\s*price)\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{1,2})?)(?:\s*\/\-)?(?:\s*\(?(?:incl\.?|inclusive)\s*(?:of\s*)?all\s*taxes\)?)?/i;
  
  // Also check for "Inclusive of all taxes" trailing clause which confirms printed package price
  const taxClauseRegex = /(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/\-)?\s*\(?(?:incl\.?|inclusive)\s*(?:of\s*)?all\s*taxes\)?/i;

  let packageMRP = null;
  let onlineSellingPrice = null;
  let originalValue = null;
  let confidence = 0;
  let isAmbiguous = false;
  let uncertainCorrection = false;

  const pkgMatch = cleanedText.match(packageMrpRegex) || cleanedText.match(taxClauseRegex);

  // Detect online e-commerce / Blinkit UI chrome context
  const isBlinkitContext = /blinkit|deliver\s*in|mins|add\s*to\s*cart|\bcart\b|checkout|\b\d+%\s*off\b|save\s*(?:rs\.?|₹)/i.test(cleanedText);

  // Find all standalone currency/price candidates
  const standalonePriceRegex = /(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)/gi;
  const standaloneMatches = [];
  
  for (const line of lines) {
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
  } else if (isBlinkitContext && standaloneMatches.length > 0) {
    // In Blinkit screenshot without explicit printed package MRP:
    // The price shown is an online selling / discount price, NOT statutory package MRP.
    onlineSellingPrice = `₹${standaloneMatches[0].amount}`;
    packageMRP = null;
    confidence = 0;
    // Do not fabricate an MRP or assume online price is package MRP!
  } else if (standaloneMatches.length === 1 && !isBlinkitContext) {
    // Only one standalone price and no explicit MRP keyword:
    // We do NOT assume a price is MRP merely because it appears near a currency symbol.
    // Flag for manual verification.
    isAmbiguous = true;
    originalValue = standaloneMatches[0].fullMatch;
    confidence = 0.60;
  } else if (standaloneMatches.length > 1) {
    // Multiple unlabeled prices: strictly ambiguous
    isAmbiguous = true;
    confidence = 0.40;
  }

  const notVisible = !packageMRP && !isAmbiguous;

  let remarks = 'Extracted from physical package label';
  if (notVisible) {
    remarks = isBlinkitContext 
      ? `Online selling price ${onlineSellingPrice || ''} detected, but package-printed MRP is not visible in provided screenshot — upload back/side label image.`
      : 'MRP not visible in provided image — upload back/side label image.';
  } else if (isAmbiguous) {
    remarks = 'Manual Verification Required — Price detected without explicit statutory MRP packaging attribution.';
  } else if (onlineSellingPrice) {
    remarks = `Package MRP: ${packageMRP} (Blinkit Online Selling Price: ${onlineSellingPrice})`;
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

  // Regex requiring standard SI quantity units
  const qtyRegex = /(?:net\s*(?:qty|quantity|wt|weight|vol|volume|content)[:\-]?\s*)?(\d+(?:\.\d+)?)\s*(kg|g|gm|gram|grams|ml|l|ltr|litre|liter|mg|pcs|pieces|nos|units)\b/i;
  const match = cleanedText.match(qtyRegex);

  if (match) {
    const rawNum = match[1];
    let unit = match[2].toLowerCase();

    // Standardize SI unit notation
    if (['g', 'gm', 'gram', 'grams'].includes(unit)) unit = 'g';
    else if (['l', 'ltr', 'litre', 'liter'].includes(unit)) unit = 'L';
    else if (['ml'].includes(unit)) unit = 'ml';
    else if (['kg'].includes(unit)) unit = 'kg';
    else if (['pcs', 'pieces', 'nos', 'units'].includes(unit)) unit = 'pcs';

    return {
      value: `${rawNum} ${unit}`,
      originalValue: match[0].trim(),
      confidence: 0.95,
      uncertainCorrection: false,
    };
  }

  return { value: null, originalValue: null, confidence: 0, uncertainCorrection: false };
}

/**
 * Extracts Manufacturer / Packer details from text
 * Filters out statutory FSSAI and telephone noise.
 * @param {string} text
 * @returns {Object} { value, originalValue, confidence }
 */
export function extractManufacturer(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, originalValue: null, confidence: 0 };
  }

  const mfgRegex = /(?:mfd\.?\s*by|manufactured\s*by|packed\s*by|marketed\s*by|imported\s*by|packer)[:\-]?\s*([^\n]+(?:\n[^\n]+)?)/i;
  const match = text.match(mfgRegex);

  if (match && match[1] && match[1].trim().length > 3) {
    const rawVal = match[1].trim().replace(/\s+/g, ' ');
    // Filter out if it's purely a license number
    if (!/^\d+$/.test(rawVal)) {
      return {
        value: rawVal,
        originalValue: match[0].trim(),
        confidence: 0.90,
      };
    }
  }

  return { value: null, originalValue: null, confidence: 0 };
}

/**
 * Extracts Manufacturing and Expiry dates
 * Supports MM/YYYY, DD/MM/YYYY, Month YYYY.
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

  const mfgRegex = /(?:mfg|mfd|manufactured|packed|pkd)\s*(?:date|:)?\s*(\d{2}[\/\-]\d{4}|\d{2}[\/\-]\d{2}|[a-z]{3}\s*\d{4})/i;
  const expRegex = /(?:best\s*before|use\s*by|exp|expiry|bb)\s*:?\s*(\d{2}[\/\-]\d{4}|\d{2}[\/\-]\d{2}|[a-z]{3}\s*\d{4})/i;

  const mfgMatch = text.match(mfgRegex);
  const expMatch = text.match(expRegex);

  return {
    manufactureDate: mfgMatch ? { value: mfgMatch[1], originalValue: mfgMatch[0].trim(), confidence: 0.90 } : { value: null, originalValue: null, confidence: 0 },
    expiryDate: expMatch ? { value: expMatch[1], originalValue: expMatch[0].trim(), confidence: 0.90 } : { value: null, originalValue: null, confidence: 0 },
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

  const careRegex = /(?:consumer|customer|helpline|care|feedback|toll\s*free)\s*(?:no|number|cell|email|:)?\s*([+\d\s\-]{8,14}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
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
 * Extracts Country of Origin
 * @param {string} text
 * @returns {Object} { value, originalValue, confidence }
 */
export function extractCountryOfOrigin(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, originalValue: null, confidence: 0 };
  }

  const countryRegex = /(?:country\s*of\s*origin|made\s*in|product\s*of)\s*:?\s*([a-zA-Z\s]+)/i;
  const match = text.match(countryRegex);

  if (match && match[1] && match[1].trim().length > 2) {
    return {
      value: match[1].trim(),
      originalValue: match[0].trim(),
      confidence: 0.92,
    };
  }

  return { value: null, originalValue: null, confidence: 0 };
}

/**
 * Extracts Product Name and Brand while filtering out Blinkit UI chrome lines
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

  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2)
    // Filter out e-commerce UI chrome lines
    .filter(l => !/^(blinkit|search|cart|home|deliver|mins|add|checkout|bill|order|total|save|discount|ratings?|reviews?)$/i.test(l));

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
 * Master parser for real user uploaded images.
 * STRICTLY NO HARDCODED DEMO FALLBACKS!
 * @param {string} rawText - Actual OCR text extracted from image
 * @param {Object} [imageMeta={}] - image metadata (imageId, imageType, etc.)
 * @returns {Object} Extracted fields object with source attribution
 */
export function parseRealImageDeclarations(rawText, imageMeta = {}) {
  const text = rawText || '';
  const sourceImageId = imageMeta.imageId || 'IMG-01';
  const sourceImageType = imageMeta.imageType || 'Front Label';

  const mrpRes = extractMRP(text);
  const qtyRes = extractNetQuantity(text);
  const mfgRes = extractManufacturer(text);
  const datesRes = extractDates(text);
  const careRes = extractConsumerCare(text);
  const countryRes = extractCountryOfOrigin(text);
  const nameRes = extractProductNameAndBrand(text);

  // MRP field formatting & remarks
  let mrpField = {
    value: null,
    originalValue: mrpRes.originalValue || null,
    confidence: 0,
    status: 'NOT_DETECTED',
    remarks: mrpRes.remarks,
    sourceImageId,
    sourceImageType,
  };

  if (mrpRes.packageMRP) {
    mrpField = {
      value: mrpRes.packageMRP,
      originalValue: mrpRes.originalValue,
      confidence: mrpRes.confidence,
      onlineSellingPrice: mrpRes.onlineSellingPrice || null,
      remarks: mrpRes.remarks,
      uncertainCorrection: mrpRes.uncertainCorrection,
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
    sourceImageId,
    sourceImageType,
  };

  if (qtyRes.value) {
    qtyField = {
      value: qtyRes.value,
      originalValue: qtyRes.originalValue,
      confidence: qtyRes.confidence,
      remarks: 'Extracted from label',
      sourceImageId,
      sourceImageType,
    };
  }

  return {
    rawOCRText: text,
    productName: { ...nameRes.productName, sourceImageId, sourceImageType },
    brand: { ...nameRes.brand, sourceImageId, sourceImageType },
    netQuantity: qtyField,
    mrp: mrpField,
    manufacturer: mfgRes.value 
      ? { ...mfgRes, sourceImageId, sourceImageType } 
      : { value: null, originalValue: null, confidence: 0, status: 'NOT_DETECTED', remarks: 'Manufacturer not detected in provided image', sourceImageId, sourceImageType },
    manufactureDate: datesRes.manufactureDate.value
      ? { ...datesRes.manufactureDate, sourceImageId, sourceImageType }
      : { value: null, originalValue: null, confidence: 0, status: 'NOT_DETECTED', remarks: 'Manufacturing date not detected', sourceImageId, sourceImageType },
    expiryDate: datesRes.expiryDate.value
      ? { ...datesRes.expiryDate, sourceImageId, sourceImageType }
      : { value: null, originalValue: null, confidence: 0, status: 'NOT_DETECTED', remarks: 'Expiry date not detected', sourceImageId, sourceImageType },
    consumerCare: careRes.value
      ? { ...careRes, sourceImageId, sourceImageType }
      : { value: null, originalValue: null, confidence: 0, status: 'NOT_DETECTED', remarks: 'Consumer care not detected', sourceImageId, sourceImageType },
    countryOfOrigin: countryRes.value
      ? { ...countryRes, sourceImageId, sourceImageType }
      : { value: null, originalValue: null, confidence: 0, status: 'NOT_DETECTED', remarks: 'Country of origin not detected', sourceImageId, sourceImageType },
  };
}
