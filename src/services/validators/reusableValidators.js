// ============================================================
// NetQ Check — Reusable Validation Engine
// Independent validation functions for compliance rule evaluation
// ============================================================

/**
 * Check if a mandatory value is present and non-empty
 */
export function validatePresence(rawValue) {
  if (!rawValue || String(rawValue).trim() === '') {
    return { isValid: false, reason: 'Declaration is missing or empty' };
  }
  return { isValid: true, reason: 'Declaration present' };
}

/**
 * Validate MRP currency symbol, amount, and tax inclusion clause
 */
export function validateMRP(rawValue, parsedDetails = null) {
  const presence = validatePresence(rawValue);
  if (!presence.isValid) return presence;

  const str = String(rawValue);
  const hasAmount = parsedDetails?.amount !== null || /\d+/.test(str);
  const hasCurrencySymbol = /₹|rs\.?|inr/i.test(str);
  const hasTaxClause = /inclusive of all taxes|incl\.? of all taxes|incl\.? taxes/i.test(str);

  if (!hasAmount) {
    return { isValid: false, reason: 'MRP numeric value not detected' };
  }

  if (!hasCurrencySymbol) {
    return { isValid: false, reason: 'MRP currency symbol (₹ or Rs.) missing' };
  }

  if (!hasTaxClause) {
    return { isValid: true, isWarning: true, reason: 'MRP present with currency symbol; tax clause ("inclusive of all taxes") recommended under Rule 6(1)(e)' };
  }

  return { isValid: true, reason: 'MRP declared in standard format inclusive of all taxes' };
}

/**
 * Validate Unit Sale Price (USP) per unit rate
 */
export function validateUSP(rawValue, parsedDetails = null) {
  const presence = validatePresence(rawValue);
  if (!presence.isValid) return presence;

  const str = String(rawValue);
  const hasRate = /\d+/.test(str);
  const hasCurrency = /₹|rs\.?|inr/i.test(str);

  if (!hasRate) {
    return { isValid: false, reason: 'Unit Sale Price numeric rate not detected' };
  }

  if (!hasCurrency) {
    return { isValid: false, reason: 'Unit Sale Price currency symbol missing' };
  }

  return { isValid: true, reason: 'Unit Sale Price declared in standard rate format' };
}

/**
 * Validate Net Quantity SI unit declaration
 */
export function validateQuantity(rawValue, parsedDetails = null) {
  const presence = validatePresence(rawValue);
  if (!presence.isValid) return presence;

  const str = String(rawValue);
  const match = parsedDetails?.unit || str.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|ml|l|ltr|litre|liter|mg|pcs|pieces|nos|units)/i);

  if (!match) {
    return { isValid: false, reason: 'Net quantity does not use standard SI units (g, kg, ml, L, or pcs)' };
  }

  return { isValid: true, reason: 'Net quantity declared in standard SI units' };
}

/**
 * Validate manufacturing / packing / import / expiry date format
 */
export function validateDate(rawValue, parsedDetails = null) {
  const presence = validatePresence(rawValue);
  if (!presence.isValid) return presence;

  const str = String(rawValue);
  const dateMatch = str.match(/(?:\d{2}[\/\-]\d{4})|(?:\d{2}[\/\-]\d{2})/);

  if (!dateMatch) {
    return { isValid: false, reason: 'Date declaration format invalid. Standard MM/YYYY or DD/MM/YYYY required under Rule 6(1)(d)' };
  }

  return { isValid: true, reason: 'Date declared in valid MM/YYYY format' };
}

/**
 * Validate text pattern matching regex
 */
export function validateText(rawValue, patterns = []) {
  const presence = validatePresence(rawValue);
  if (!presence.isValid) return presence;

  if (!patterns || patterns.length === 0) {
    return { isValid: true, reason: 'Declaration present' };
  }

  const str = String(rawValue);
  const matches = patterns.some(p => p.test(str));

  if (!matches) {
    return { isValid: true, isWarning: true, reason: 'Declaration detected but format may vary from recommended standard pattern' };
  }

  return { isValid: true, reason: 'Declaration matches expected legal text pattern' };
}

/**
 * Validate Consumer Care phone / helpline contact
 */
export function validatePhone(rawValue, parsedDetails = null) {
  const presence = validatePresence(rawValue);
  if (!presence.isValid) return presence;

  const str = String(rawValue);
  const hasPhone = parsedDetails?.phone || /(?:1[89]00[-\s]?\d{3,4}[-\s]?\d{3,4})|(?:\+?91[-\s]?)?\d{8,11}|helpline|consumer|care|contact/i.test(str);

  if (!hasPhone) {
    return { isValid: false, reason: 'Consumer care helpline phone number / toll-free 1800 number not detected' };
  }

  return { isValid: true, reason: 'Consumer care contact helpline number detected' };
}

/**
 * Validate Manufacturer / Importer address
 */
export function validateAddress(rawValue, parsedDetails = null) {
  const presence = validatePresence(rawValue);
  if (!presence.isValid) return presence;

  const str = String(rawValue);
  const hasPin = parsedDetails?.pinCode || /\b\d{6}\b/.test(str);

  if (!hasPin) {
    return { isValid: true, isWarning: true, reason: 'Manufacturer address detected; PIN code recommended for full address compliance' };
  }

  return { isValid: true, reason: 'Manufacturer address with PIN code detected' };
}

/**
 * Validate Currency format
 */
export function validateCurrency(rawValue) {
  return validateMRP(rawValue);
}

/**
 * Handler for manual physical gauge review
 */
export function validateManualReview(rawValue) {
  return { isValid: true, isManualReview: true, reason: 'Requires physical gauge measurement by Legal Metrology inspection officer' };
}

/**
 * Validate Image evidence presence
 */
export function validateImageEvidence(evidence) {
  if (!evidence || !evidence.imageRegion) {
    return { isValid: false, reason: 'Bounding box / cropped image region evidence not available' };
  }
  return { isValid: true, reason: 'Image evidence region available' };
}
