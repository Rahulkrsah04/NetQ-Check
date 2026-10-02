// ============================================================
// NetQ Check — Extracted Data Normalization Layer
// Normalizes raw OCR values (MRP, Quantity, Date, Phone, Address)
// while preserving original rawValue for legal auditability.
// ============================================================

/**
 * Normalize raw MRP text into standard currency format
 */
export function normalizeMRP(rawValue) {
  if (!rawValue) return null;
  const str = String(rawValue).trim();
  const digitsMatch = str.match(/\d+(?:\.\d{1,2})?/);
  const amount = digitsMatch ? parseFloat(digitsMatch[0]) : null;

  const hasTaxClause = /inclusive of all taxes|incl\.? of all taxes|incl\.? taxes/i.test(str);
  const hasCurrencySymbol = /₹|rs\.?|inr/i.test(str);

  if (amount === null) return { rawValue: str, normalizedValue: str, amount: null, currency: 'INR', hasTaxClause };

  return {
    rawValue: str,
    normalizedValue: `${amount} INR`,
    amount,
    currency: 'INR',
    hasTaxClause,
    hasCurrencySymbol,
  };
}

/**
 * Normalize raw net quantity text into standard SI unit representation
 */
export function normalizeQuantity(rawValue) {
  if (!rawValue) return null;
  const str = String(rawValue).trim();
  const match = str.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gram|grams|ml|l|ltr|litre|liter|mg|pcs|pieces|nos|units)/i);

  if (!match) return { rawValue: str, normalizedValue: str, numericValue: null, unit: null, standardSI: null };

  const num = parseFloat(match[1]);
  let unit = match[2].toLowerCase();

  // Standardize unit string
  if (['g', 'gm', 'gram', 'grams'].includes(unit)) unit = 'g';
  else if (['l', 'ltr', 'litre', 'liter'].includes(unit)) unit = 'L';
  else if (['ml'].includes(unit)) unit = 'ml';
  else if (['kg'].includes(unit)) unit = 'kg';
  else if (['pcs', 'pieces', 'nos', 'units'].includes(unit)) unit = 'pcs';

  // Standard SI representation
  let standardSI = `${num} ${unit}`;
  let baseUnitValue = num;

  if (unit === 'g' && num >= 1000) {
    standardSI = `${(num / 1000).toFixed(1)} kg`;
    baseUnitValue = num / 1000;
  } else if (unit === 'ml' && num >= 1000) {
    standardSI = `${(num / 1000).toFixed(1)} L`;
    baseUnitValue = num / 1000;
  }

  return {
    rawValue: str,
    normalizedValue: `${num} ${unit}`,
    numericValue: num,
    unit,
    baseUnitValue,
    standardSI,
  };
}

/**
 * Normalize raw date string into MM/YYYY or DD/MM/YYYY structure
 */
export function normalizeDate(rawValue) {
  if (!rawValue) return null;
  const str = String(rawValue).trim();

  // Match MM/YYYY or DD/MM/YYYY
  const dateMatch = str.match(/(\d{2})[\/\-](\d{4})/);
  let normalizedValue = str;
  let month = null;
  let year = null;

  if (dateMatch) {
    month = parseInt(dateMatch[1], 10);
    year = parseInt(dateMatch[2], 10);
    normalizedValue = `${String(month).padStart(2, '0')}/${year}`;
  }

  const isExpiry = /best before|use by|expiry|exp|bb/i.test(str);
  const isMfg = /mfg|mfd|manufactured|packed|packing/i.test(str);
  const isImport = /imported|import/i.test(str);

  return {
    rawValue: str,
    normalizedValue,
    month,
    year,
    dateType: isExpiry ? 'EXPIRY' : isImport ? 'IMPORT' : isMfg ? 'MFG' : 'UNKNOWN',
  };
}

/**
 * Normalize consumer care helpline or phone number
 */
export function normalizePhone(rawValue) {
  if (!rawValue) return null;
  const str = String(rawValue).trim();
  const digitsMatch = str.match(/(?:1[89]00[-\s]?\d{3}[-\s]?\d{4})|(?:\+91[-\s]?)?\d{10}/);
  const phone = digitsMatch ? digitsMatch[0] : null;

  return {
    rawValue: str,
    normalizedValue: phone || str,
    phone,
  };
}

/**
 * Normalize address text and extract PIN code if present
 */
export function normalizeAddress(rawValue) {
  if (!rawValue) return null;
  const str = String(rawValue).trim();
  const pinMatch = str.match(/\b\d{6}\b/);
  const pinCode = pinMatch ? pinMatch[0] : null;

  return {
    rawValue: str,
    normalizedValue: str.replace(/\s+/g, ' '),
    pinCode,
  };
}

/**
 * Normalize full extracted data map
 * @param {Object} extractedData
 * @returns {Object} Map of normalized fields
 */
export function normalizeExtractedData(extractedData = {}) {
  const normalized = {};

  for (const [key, item] of Object.entries(extractedData)) {
    const rawVal = item?.value ?? null;
    const confidence = item?.confidence ?? 0;
    let parsedDetails = null;
    let normalizedVal = rawVal;

    if (rawVal) {
      if (key === 'mrp' || key === 'unitSalePrice') {
        parsedDetails = normalizeMRP(rawVal);
        normalizedVal = parsedDetails?.normalizedValue || rawVal;
      } else if (key === 'netQuantity') {
        parsedDetails = normalizeQuantity(rawVal);
        normalizedVal = parsedDetails?.normalizedValue || rawVal;
      } else if (key === 'manufactureDate' || key === 'expiryDate') {
        parsedDetails = normalizeDate(rawVal);
        normalizedVal = parsedDetails?.normalizedValue || rawVal;
      } else if (key === 'consumerCare') {
        parsedDetails = normalizePhone(rawVal);
        normalizedVal = parsedDetails?.normalizedValue || rawVal;
      } else if (key === 'manufacturer') {
        parsedDetails = normalizeAddress(rawVal);
        normalizedVal = parsedDetails?.normalizedValue || rawVal;
      }
    }

    normalized[key] = {
      key,
      value: rawVal,
      normalizedValue: normalizedVal,
      parsedDetails,
      confidence,
      imageRegion: item?.imageRegion || null,
    };
  }

  return normalized;
}
