// ============================================================
// NetQ Check — Real Image OCR & Declaration Parser
// Advanced regex & pattern parser for real product labels and Blinkit screenshots
// ============================================================

/**
 * Distinguishes printed package MRP from online Blinkit selling prices
 * @param {string} text - Raw OCR text
 * @returns {Object} { packageMRP, onlineSellingPrice, confidence, isAmbiguous, notVisible }
 */
export function extractMRP(text) {
  if (!text || typeof text !== 'string') {
    return { packageMRP: null, onlineSellingPrice: null, confidence: 0, isAmbiguous: false, notVisible: true };
  }

  const cleanText = text.replace(/\r\n/g, '\n');

  // 1. Look for explicit printed package MRP on physical label
  // Examples: "M.R.P. ₹120.00", "MRP Rs 120", "Maximum Retail Price ₹ 120 (Incl. of all taxes)"
  const packageMrpRegex = /(?:m\.?r\.?p\.?|maximum\s*retail\s*price)\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{1,2})?)(?:\s*\/\-)?(?:\s*\(?(?:incl\.?|inclusive)\s*(?:of\s*)?all\s*taxes\)?)?/i;
  const packageMatch = cleanText.match(packageMrpRegex);

  // 2. Look for online selling price or discount patterns (e.g., Blinkit UI: "₹99", "15% OFF", "₹99 MRP ₹120")
  const blinkitPriceRegex = /(?:blinkit|add\s*to\s*cart|deliver\s*in|mins|off)\s*.*?₹\s*(\d+)/i;
  const blinkitMatch = cleanText.match(blinkitPriceRegex);

  // 3. Standalone price pattern (e.g., "Rs. 99" or "₹120")
  const standalonePriceRegex = /(?:rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi;
  const standaloneMatches = [...cleanText.matchAll(standalonePriceRegex)];

  let packageMRP = null;
  let onlineSellingPrice = null;
  let confidence = 0;
  let isAmbiguous = false;

  if (packageMatch && packageMatch[1]) {
    packageMRP = `₹${packageMatch[1]}`;
    confidence = 0.95;

    // Check if there is a separate online price in the same text
    if (standaloneMatches.length > 1) {
      const otherPrices = standaloneMatches
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(p => p !== parseFloat(packageMatch[1].replace(/,/g, '')));

      if (otherPrices.length > 0) {
        onlineSellingPrice = `₹${otherPrices[0]}`;
      }
    }
  } else if (standaloneMatches.length === 1) {
    // If only one price symbol exists and context is package label, use with moderate confidence
    const priceVal = standaloneMatches[0][1];
    // Check if near Blinkit UI keywords
    if (/blinkit|add|discount|off|delivery/i.test(cleanText)) {
      onlineSellingPrice = `₹${priceVal}`;
      packageMRP = null; // Don't treat Blinkit online price as package MRP
    } else {
      packageMRP = `₹${priceVal}`;
      confidence = 0.75;
    }
  } else if (standaloneMatches.length > 1) {
    // Multiple standalone prices without explicit "MRP" label -> Ambiguous
    isAmbiguous = true;
    confidence = 0.50;
  }

  return {
    packageMRP,
    onlineSellingPrice,
    confidence,
    isAmbiguous,
    notVisible: !packageMRP && !isAmbiguous,
  };
}

/**
 * Extracts Net Quantity from text (e.g., "500 g", "1 kg", "250 ml", "1 L", "100 ml", "2 pcs")
 * @param {string} text
 * @returns {Object} { value, confidence }
 */
export function extractNetQuantity(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, confidence: 0 };
  }

  // Regex specifically matching standard quantities
  const qtyRegex = /(?:net\s*(?:qty|quantity|wt|weight|vol|volume|content)[:\-]?\s*)?(\d+(?:\.\d+)?)\s*(kg|g|gm|gram|grams|ml|l|ltr|litre|liter|mg|pcs|pieces|nos|units)\b/i;
  const match = text.match(qtyRegex);

  if (match) {
    const num = match[1];
    let unit = match[2].toLowerCase();

    // Standardize unit representation
    if (['g', 'gm', 'gram', 'grams'].includes(unit)) unit = 'g';
    else if (['l', 'ltr', 'litre', 'liter'].includes(unit)) unit = 'L';
    else if (['ml'].includes(unit)) unit = 'ml';
    else if (['kg'].includes(unit)) unit = 'kg';
    else if (['pcs', 'pieces', 'nos', 'units'].includes(unit)) unit = 'pcs';

    return {
      value: `${num} ${unit}`,
      confidence: 0.95,
    };
  }

  return { value: null, confidence: 0 };
}

/**
 * Extracts Manufacturer / Packer details from text
 * @param {string} text
 * @returns {Object} { value, confidence }
 */
export function extractManufacturer(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, confidence: 0 };
  }

  const mfgRegex = /(?:mfd\.?\s*by|manufactured\s*by|packed\s*by|marketed\s*by|imported\s*by|packer)[:\-]?\s*([^\n]+(?:\n[^\n]+)?)/i;
  const match = text.match(mfgRegex);

  if (match && match[1] && match[1].trim().length > 3) {
    return {
      value: match[1].trim().replace(/\s+/g, ' '),
      confidence: 0.90,
    };
  }

  return { value: null, confidence: 0 };
}

/**
 * Extracts Manufacturing and Expiry dates
 * @param {string} text
 * @returns {Object} { manufactureDate, expiryDate }
 */
export function extractDates(text) {
  if (!text || typeof text !== 'string') {
    return { manufactureDate: { value: null, confidence: 0 }, expiryDate: { value: null, confidence: 0 } };
  }

  const mfgRegex = /(?:mfg|mfd|manufactured|packed|pkd)\s*(?:date|:)?\s*(\d{2}[\/\-]\d{4}|\d{2}[\/\-]\d{2})/i;
  const expRegex = /(?:best\s*before|use\s*by|exp|expiry|bb)\s*:?\s*(\d{2}[\/\-]\d{4}|\d{2}[\/\-]\d{2})/i;

  const mfgMatch = text.match(mfgRegex);
  const expMatch = text.match(expRegex);

  return {
    manufactureDate: mfgMatch ? { value: mfgMatch[1], confidence: 0.90 } : { value: null, confidence: 0 },
    expiryDate: expMatch ? { value: expMatch[1], confidence: 0.90 } : { value: null, confidence: 0 },
  };
}

/**
 * Extracts Consumer Care / Helpline details
 * @param {string} text
 * @returns {Object} { value, confidence }
 */
export function extractConsumerCare(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, confidence: 0 };
  }

  const careRegex = /(?:consumer|customer|helpline|care|feedback|toll\s*free)\s*(?:no|number|cell|email|:)?\s*([+\d\s\-]{8,14}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
  const match = text.match(careRegex);

  if (match && match[1]) {
    return {
      value: match[1].trim(),
      confidence: 0.88,
    };
  }

  return { value: null, confidence: 0 };
}

/**
 * Extracts Country of Origin
 * @param {string} text
 * @returns {Object} { value, confidence }
 */
export function extractCountryOfOrigin(text) {
  if (!text || typeof text !== 'string') {
    return { value: null, confidence: 0 };
  }

  const countryRegex = /(?:country\s*of\s*origin|made\s*in|product\s*of)\s*:?\s*([a-zA-Z\s]+)/i;
  const match = text.match(countryRegex);

  if (match && match[1] && match[1].trim().length > 2) {
    return {
      value: match[1].trim(),
      confidence: 0.92,
    };
  }

  return { value: null, confidence: 0 };
}

/**
 * Extracts Product Name and Brand while filtering out Blinkit UI noise
 * @param {string} text
 * @returns {Object} { productName, brand }
 */
export function extractProductNameAndBrand(text) {
  if (!text || typeof text !== 'string') {
    return { productName: { value: null, confidence: 0 }, brand: { value: null, confidence: 0 } };
  }

  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2)
    // Filter out Blinkit UI chrome lines
    .filter(l => !/^(blinkit|search|cart|home|deliver|mins|add|checkout|bill|order|total)$/i.test(l));

  if (lines.length > 0) {
    const name = lines[0];
    const brand = name.split(' ')[0] || null;
    return {
      productName: { value: name, confidence: 0.80 },
      brand: { value: brand, confidence: 0.75 },
    };
  }

  return { productName: { value: null, confidence: 0 }, brand: { value: null, confidence: 0 } };
}

/**
 * Master parser for real user uploaded images.
 * NO HARDCODED DEMO FALLBACKS!
 * @param {string} rawText - Actual OCR text extracted from image
 * @returns {Object} Extracted fields object
 */
export function parseRealImageDeclarations(rawText) {
  const text = rawText || '';

  const mrpRes = extractMRP(text);
  const qtyRes = extractNetQuantity(text);
  const mfgRes = extractManufacturer(text);
  const datesRes = extractDates(text);
  const careRes = extractConsumerCare(text);
  const countryRes = extractCountryOfOrigin(text);
  const nameRes = extractProductNameAndBrand(text);

  // MRP field formatting & remarks
  let mrpField = { value: null, confidence: 0, remarks: 'NOT_DETECTED' };
  if (mrpRes.packageMRP) {
    mrpField = {
      value: mrpRes.packageMRP,
      confidence: mrpRes.confidence,
      onlineSellingPrice: mrpRes.onlineSellingPrice || null,
      remarks: mrpRes.onlineSellingPrice ? `Package MRP: ${mrpRes.packageMRP} (Online Selling Price: ${mrpRes.onlineSellingPrice})` : 'Extracted from physical package label',
    };
  } else if (mrpRes.isAmbiguous) {
    mrpField = {
      value: null,
      confidence: 0.50,
      status: 'NOT_DETECTED',
      remarks: 'Manual Verification Required — Ambiguous MRP detected on image',
      manualVerificationRequired: true,
    };
  } else {
    mrpField = {
      value: null,
      confidence: 0,
      status: 'NOT_DETECTED',
      remarks: 'MRP not visible in provided image — upload back/side label image.',
    };
  }

  // Quantity field formatting
  let qtyField = { value: null, confidence: 0, remarks: 'NOT_DETECTED' };
  if (qtyRes.value) {
    qtyField = {
      value: qtyRes.value,
      confidence: qtyRes.confidence,
      remarks: 'Extracted from label',
    };
  } else {
    qtyField = {
      value: null,
      confidence: 0,
      status: 'NOT_DETECTED',
      remarks: 'Net Quantity not detected in provided image',
    };
  }

  return {
    productName: nameRes.productName,
    brand: nameRes.brand,
    netQuantity: qtyField,
    mrp: mrpField,
    manufacturer: mfgRes.value ? mfgRes : { value: null, confidence: 0, remarks: 'NOT_DETECTED' },
    manufactureDate: datesRes.manufactureDate,
    expiryDate: datesRes.expiryDate,
    consumerCare: careRes.value ? careRes : { value: null, confidence: 0, remarks: 'NOT_DETECTED' },
    countryOfOrigin: countryRes.value ? countryRes : { value: null, confidence: 0, remarks: 'NOT_DETECTED' },
  };
}
