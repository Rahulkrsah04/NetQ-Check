// ============================================================
// NetQ Check — Rule Repository Abstraction
// Structured requirement model for Legal Metrology (PC) Rules, 2011
// Local data repository ready for future DB/API migration
// ============================================================

export const RULE_SET_VERSION = 'PC_RULES_2011_V1';

export const REQUIREMENT_TYPES = {
  MANDATORY: { id: 'MANDATORY', label: 'Mandatory', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200' },
  CONDITIONAL: { id: 'CONDITIONAL', label: 'Conditional', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  INFORMATIONAL: { id: 'INFORMATIONAL', label: 'Informational', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
};

export const APPLICABILITY_TYPES = {
  UNIVERSAL: { id: 'UNIVERSAL', label: 'Universal (All Packages)' },
  CATEGORY_SPECIFIC: { id: 'CATEGORY_SPECIFIC', label: 'Category Specific' },
  CONDITION_BASED: { id: 'CONDITION_BASED', label: 'Condition Based' },
};

export const VALIDATION_TYPES = {
  PRESENCE: { id: 'PRESENCE', label: 'Presence Check' },
  TEXT_PATTERN: { id: 'TEXT_PATTERN', label: 'Text Pattern Match' },
  NUMERIC: { id: 'NUMERIC', label: 'Numeric Range Check' },
  CURRENCY: { id: 'CURRENCY', label: 'Currency & Tax Clause' },
  QUANTITY: { id: 'QUANTITY', label: 'SI Unit Quantity Parser' },
  DATE: { id: 'DATE', label: 'MM/YYYY Date Parser' },
  MANUAL_REVIEW: { id: 'MANUAL_REVIEW', label: 'Manual Physical Gauge Review' },
  IMAGE_EVIDENCE: { id: 'IMAGE_EVIDENCE', label: 'Visual Inspection / Crop' },
};

export const SEVERITY_LEVELS = {
  HIGH: { id: 'HIGH', label: 'High (Critical Failure)', badgeClass: 'bg-red-100 text-red-800' },
  MEDIUM: { id: 'MEDIUM', label: 'Medium (Warning)', badgeClass: 'bg-amber-100 text-amber-800' },
  LOW: { id: 'LOW', label: 'Low (Advisory)', badgeClass: 'bg-blue-100 text-blue-800' },
};

export const RULES_REPOSITORY = [
  {
    id: 'REQ_01',
    name: 'Name & Address of Manufacturer / Packer / Importer',
    description: 'The name and complete address of the manufacturer, packer, or importer must appear on every packaged commodity label.',
    category: 'Name & Address',
    requirementType: 'MANDATORY',
    applicability: 'UNIVERSAL',
    validationType: 'TEXT_PATTERN',
    ruleReference: 'Rule 6(1)(a) — Legal Metrology (Packaged Commodities) Rules, 2011',
    severity: 'HIGH',
    requiredEvidence: ['manufacturer_name', 'address', 'pin_code'],
    manualVerificationAllowed: true,
    dataKey: 'manufacturer',
    applicableCategories: ['ALL'],
    patterns: [/(?:mfd|manufactured|packed|packer|importer|marketed).*by/i],
    keywords: ['manufactured by', 'mfd by', 'packed by', 'marketed by', 'importer'],
  },
  {
    id: 'REQ_02',
    name: 'Common or Generic Name of Commodity',
    description: 'Every package shall bear the clear common or generic name of the commodity contained in it, avoiding deceptive trade names.',
    category: 'Common/Generic Name',
    requirementType: 'MANDATORY',
    applicability: 'UNIVERSAL',
    validationType: 'PRESENCE',
    ruleReference: 'Rule 6(1)(b) — Legal Metrology (Packaged Commodities) Rules, 2011',
    severity: 'HIGH',
    requiredEvidence: ['product_name', 'generic_commodity_name'],
    manualVerificationAllowed: true,
    dataKey: 'productName',
    applicableCategories: ['ALL'],
    patterns: [/^.+$/],
    keywords: ['product', 'name', 'item', 'commodity'],
  },
  {
    id: 'REQ_03',
    name: 'Net Quantity Declaration in Standard SI Units',
    description: 'Net quantity must be declared in standard SI units (g, kg, ml, L, or pcs) without non-standard symbols.',
    category: 'Net Quantity',
    requirementType: 'MANDATORY',
    applicability: 'UNIVERSAL',
    validationType: 'QUANTITY',
    ruleReference: 'Rule 6(1)(c) & Rule 11 — Legal Metrology (PC) Rules, 2011',
    severity: 'HIGH',
    requiredEvidence: ['net_quantity_value', 'standard_unit'],
    manualVerificationAllowed: true,
    dataKey: 'netQuantity',
    applicableCategories: ['ALL'],
    patterns: [/\d+\s*(g|kg|ml|l|ltr|litre|liter|mg|pcs|pieces|nos|units|gm)/i],
    keywords: ['net weight', 'net quantity', 'net content', 'weight', 'volume'],
  },
  {
    id: 'REQ_04',
    name: 'Maximum Retail Price (MRP) Declaration',
    description: 'MRP inclusive of all taxes must be declared clearly with currency symbol (₹ or Rs.) and tax inclusion clause.',
    category: 'MRP',
    requirementType: 'MANDATORY',
    applicability: 'UNIVERSAL',
    validationType: 'CURRENCY',
    ruleReference: 'Rule 6(1)(e) — Legal Metrology (Packaged Commodities) Rules, 2011',
    severity: 'HIGH',
    requiredEvidence: ['mrp_amount', 'currency_symbol', 'tax_clause'],
    manualVerificationAllowed: true,
    dataKey: 'mrp',
    applicableCategories: ['ALL'],
    patterns: [/mrp|maximum retail price|₹|rs\.?\s*\d+/i],
    keywords: ['mrp', 'maximum retail price', 'retail price', '₹', 'rs.'],
  },
  {
    id: 'REQ_05',
    name: 'Date of Manufacture / Packing / Import / Expiry',
    description: 'The month and year of manufacture/packing/import is required. Perishable goods require Expiry/Best Before date.',
    category: 'Month & Year',
    requirementType: 'CONDITIONAL',
    applicability: 'CONDITION_BASED',
    validationType: 'DATE',
    ruleReference: 'Rule 6(1)(d) — Legal Metrology (Packaged Commodities) Rules, 2011',
    severity: 'HIGH',
    requiredEvidence: ['date_value', 'date_type'],
    manualVerificationAllowed: true,
    dataKey: 'manufactureDate',
    applicableCategories: ['ALL'],
    patterns: [/(?:mfg|mfd|manufactured|packed|packing|imported|import)\s*(?:date|on|:)?\s*\d{2}[\/\-]\d{4}/i,
               /(?:best before|use by|expiry|exp|bb)\s*:?\s*\d{2}[\/\-]\d{4}/i],
    keywords: ['mfg date', 'manufactured date', 'packed date', 'date of import', 'best before', 'use by', 'expiry'],
  },
  {
    id: 'REQ_06',
    name: 'Consumer Care Contact Information',
    description: 'Name, address, telephone helpline number, and email address of designated consumer complaint office must be declared.',
    category: 'Consumer Care Details',
    requirementType: 'MANDATORY',
    applicability: 'UNIVERSAL',
    validationType: 'TEXT_PATTERN',
    ruleReference: 'Rule 6(1)(f) — Legal Metrology (Packaged Commodities) Rules, 2011',
    severity: 'MEDIUM',
    requiredEvidence: ['helpline_phone', 'consumer_email', 'contact_address'],
    manualVerificationAllowed: true,
    dataKey: 'consumerCare',
    applicableCategories: ['ALL'],
    patterns: [/(?:consumer|helpline|care|toll.?free|contact)\s*(?:no|number|:)?\s*[+\d\s\-]+/i,
               /1[89]00\s*[-\s]?\d{3,4}\s*[-\s]?\d{3,4}/],
    keywords: ['consumer care', 'helpline', 'toll free', 'contact', '1800'],
  },
  {
    id: 'REQ_07',
    name: 'Country of Origin Declaration',
    description: 'For pre-packaged commodities imported from abroad, country of origin is mandatory under Rule 6(2). For domestic products, it is optional/informational.',
    category: 'Country of Origin',
    requirementType: 'CONDITIONAL',
    applicability: 'CATEGORY_SPECIFIC',
    validationType: 'TEXT_PATTERN',
    ruleReference: 'Rule 6(2) — Legal Metrology (Packaged Commodities) Rules, 2011',
    severity: 'HIGH',
    requiredEvidence: ['country_name', 'origin_phrase'],
    manualVerificationAllowed: true,
    dataKey: 'countryOfOrigin',
    applicableCategories: ['IMPORTED', 'OTHER'],
    patterns: [/(?:country of origin|made in|product of)\s*:?\s*[a-z\s]+/i],
    keywords: ['country of origin', 'made in', 'product of'],
  },
  {
    id: 'REQ_08',
    name: 'Unit Sale Price (USP) Declaration',
    description: 'Declaration of price per unit (per g/kg/ml/L/pc) is mandatory for packages containing > 1 kg/L or multi-packs under 2021 Amendment.',
    category: 'Unit Sale Price',
    requirementType: 'CONDITIONAL',
    applicability: 'CONDITION_BASED',
    validationType: 'CURRENCY',
    ruleReference: 'Rule 6(1)(g) — Legal Metrology (PC) Rules, 2011 (Amendment 2021)',
    severity: 'MEDIUM',
    requiredEvidence: ['per_unit_rate', 'unit_of_measurement'],
    manualVerificationAllowed: true,
    dataKey: 'unitSalePrice',
    applicableCategories: ['ALL'],
    patterns: [/(?:unit sale price|usp|rs\.?\s*\d+.*per\s*(?:g|kg|ml|l|piece))/i],
    keywords: ['unit sale price', 'usp', 'per gram', 'per kg', 'per ml', 'per litre'],
  },
  {
    id: 'REQ_09',
    name: 'Batch / Lot Number Declaration',
    description: 'Batch or Lot identification code for quality traceability. Mandatory for Food, Beverages & Cosmetics; Informational for General Goods.',
    category: 'Category Specific & Inspection',
    requirementType: 'CONDITIONAL',
    applicability: 'CATEGORY_SPECIFIC',
    validationType: 'TEXT_PATTERN',
    ruleReference: 'Rule 6(1) & FSSAI / Cosmetics Regulations',
    severity: 'MEDIUM',
    requiredEvidence: ['batch_code'],
    manualVerificationAllowed: true,
    dataKey: 'batchNumber',
    applicableCategories: ['FOOD_GROCERY', 'BEVERAGES', 'COSMETICS', 'PERSONAL_CARE'],
    patterns: [/(?:batch|lot|b\.?no|code)\s*:?\s*[a-z0-9\-\.\s]+/i],
    keywords: ['batch no', 'lot no', 'b.no', 'batch code'],
  },
  {
    id: 'REQ_10',
    name: 'Declaration Font Height & Legibility Inspection',
    description: 'Height of letters and numerals must meet Rule 9 dimensions (1.5mm to 6mm depending on principal display area). Requires officer measurement.',
    category: 'Category Specific & Inspection',
    requirementType: 'INFORMATIONAL',
    applicability: 'UNIVERSAL',
    validationType: 'MANUAL_REVIEW',
    ruleReference: 'Rule 9 — Legal Metrology (Packaged Commodities) Rules, 2011',
    severity: 'LOW',
    requiredEvidence: ['font_gauge_measurement'],
    manualVerificationAllowed: true,
    dataKey: 'fontHeightCheck',
    applicableCategories: ['ALL'],
    patterns: [],
    keywords: [],
  },
];

/**
 * Get active rule set repository
 * @param {string} [version='PC_RULES_2011_V1']
 * @returns {Array} List of requirement rules
 */
export function getRuleSet(version = RULE_SET_VERSION) {
  return RULES_REPOSITORY;
}

export function getRuleById(id) {
  return RULES_REPOSITORY.find(r => r.id === id) || null;
}

export function getRulesByCategory(categoryName) {
  return RULES_REPOSITORY.filter(r => r.category === categoryName);
}
