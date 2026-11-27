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
  if (/not_detected|manual verification required|not visible/i.test(str)) {
    return { rawValue: str, normalizedValue: null, amount: null, currency: 'INR', hasTaxClause: false, hasCurrencySymbol: false };
  }

  const digitsMatch = str.match(/\b\d+(?:\.\d{1,2})?\b/);
  let amount = digitsMatch ? parseFloat(digitsMatch[0]) : null;

  // Safeguard: reject numbers longer than 6 digits (phone, barcode, pin code)
  if (digitsMatch && digitsMatch[0].replace('.', '').length > 6) {
    amount = null;
  }

  const hasTaxClause = /inclusive of all taxes|incl\.? of all taxes|incl\.? taxes/i.test(str);
  const hasCurrencySymbol = /₹|rs\.?|inr/i.test(str);

  if (amount === null) return { rawValue: str, normalizedValue: str, amount: null, currency: 'INR', hasTaxClause, hasCurrencySymbol };

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
  if (/not_detected|manual verification required|not visible/i.test(str)) {
    return { rawValue: str, normalizedValue: null, numericValue: null, unit: null, standardSI: null };
  }

  const match = str.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gram|grams|ml|l|ltr|litre|liter|mg|pcs|pieces|nos|units)\b/i);

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

const MONTH_ABBR_MAP = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Normalize raw date string into MM/YYYY or DD/MM/YYYY structure
 */
export function normalizeDate(rawValue) {
  if (!rawValue) return null;
  const str = String(rawValue).trim();

  // Match MM/YYYY, MM/YY, or MMM/YY(YY) (e.g., "08/2026", "SEP/26", "AUG/28")
  const numDateMatch = str.match(/(\d{2})[\/\-](\d{4})/);
  const shortNumDateMatch = !numDateMatch && str.match(/\b(\d{2})[\/\-](\d{2})\b/);
  const monthTextMatch = str.match(/\b([a-z]{3,9})\s*[\/\-\s]\s*(\d{2,4})\b/i);

  let normalizedValue = str;
  let month = null;
  let year = null;

  if (numDateMatch) {
    month = parseInt(numDateMatch[1], 10);
    year = parseInt(numDateMatch[2], 10);
    normalizedValue = `${String(month).padStart(2, '0')}/${year}`;
  } else if (monthTextMatch && MONTH_ABBR_MAP[monthTextMatch[1].toLowerCase()]) {
    month = MONTH_ABBR_MAP[monthTextMatch[1].toLowerCase()];
    const rawYear = parseInt(monthTextMatch[2], 10);
    year = monthTextMatch[2].length === 2 ? 2000 + rawYear : rawYear;
    normalizedValue = `${String(month).padStart(2, '0')}/${year}`;
  } else if (shortNumDateMatch) {
    month = parseInt(shortNumDateMatch[1], 10);
    year = 2000 + parseInt(shortNumDateMatch[2], 10);
    normalizedValue = `${String(month).padStart(2, '0')}/${year}`;
  }

  const isExpiry = /best before|use by|expiry|exp|bb/i.test(str);
  const isMfg = /mfg|mfd|manufactured|packed|packing|packaging/i.test(str);
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
  const digitsMatch = str.match(/(?:1[89]00[-\s]?\d{3,4}[-\s]?\d{3,4})|(?:\+91[-\s]?)?\d{10}/);
  const phone = digitsMatch ? digitsMatch[0] : null;

  return {
    rawValue: str,
    normalizedValue: phone || str,
    phone,
  };
}

/**
 * Normalize address text and extract PIN code if present (handles both 700071 and 700 071)
 */
export function normalizeAddress(rawValue) {
  if (!rawValue) return null;
  const str = String(rawValue).trim();
  const pinMatch = str.match(/\b(\d{3})\s?(\d{3})\b/);
  const pinCode = pinMatch ? `${pinMatch[1]}${pinMatch[2]}` : null;

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
