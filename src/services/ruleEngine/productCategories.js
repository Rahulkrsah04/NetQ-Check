// ============================================================
// NetQ Check — Product Category System
// Configurable commodity categories & rule set mappings
// ============================================================

export const PRODUCT_CATEGORIES = [
  {
    id: 'FOOD_GROCERY',
    name: 'Food & Grocery',
    description: 'Packaged food grains, spices, snacks, edible oils & grocery items (LM Rules + FSSAI)',
    applicableRuleSetIds: ['PC_RULES_2011_V1', 'FSSAI_PACKAGING_2018'],
    defaultRuleSetVersion: 'PC_RULES_2011_V1',
    keywords: ['rice', 'flour', 'atta', 'oil', 'spice', 'dal', 'pulse', 'grain', 'sugar', 'salt', 'snack', 'food', 'grocery'],
  },
  {
    id: 'BEVERAGES',
    name: 'Beverages',
    description: 'Packaged drinking water, juices, soft drinks, tea, coffee & liquid beverages',
    applicableRuleSetIds: ['PC_RULES_2011_V1', 'BEVERAGE_STANDARDS'],
    defaultRuleSetVersion: 'PC_RULES_2011_V1',
    keywords: ['water', 'juice', 'drink', 'beverage', 'tea', 'coffee', 'soda', 'syrup', 'milk'],
  },
  {
    id: 'PERSONAL_CARE',
    name: 'Personal Care',
    description: 'Shampoo, toothpaste, deodorants, hygiene & personal grooming products',
    applicableRuleSetIds: ['PC_RULES_2011_V1', 'PERSONAL_CARE_RULES'],
    defaultRuleSetVersion: 'PC_RULES_2011_V1',
    keywords: ['shampoo', 'toothpaste', 'soap', 'lotion', 'cream', 'deodorant', 'hygiene', 'wash'],
  },
  {
    id: 'COSMETICS',
    name: 'Cosmetics',
    description: 'Toiletries, skin care, cosmetics & beauty preparations',
    applicableRuleSetIds: ['PC_RULES_2011_V1', 'COSMETICS_RULES_2020'],
    defaultRuleSetVersion: 'PC_RULES_2011_V1',
    keywords: ['cosmetic', 'makeup', 'lipstick', 'serum', 'perfume', 'nail', 'toiletries', 'beauty'],
  },
  {
    id: 'HOUSEHOLD',
    name: 'Household Products',
    description: 'Detergents, surface cleaners, disinfectants, pest control & cleaning supplies',
    applicableRuleSetIds: ['PC_RULES_2011_V1'],
    defaultRuleSetVersion: 'PC_RULES_2011_V1',
    keywords: ['detergent', 'cleaner', 'dishwash', 'disinfectant', 'bleach', 'household', 'soap powder'],
  },
  {
    id: 'ELECTRICAL',
    name: 'Electrical / Consumer Goods',
    description: 'Electrical appliances, consumer electronics, bulbs, batteries & hardware tools',
    applicableRuleSetIds: ['PC_RULES_2011_V1', 'BEE_ENERGY_LABEL'],
    defaultRuleSetVersion: 'PC_RULES_2011_V1',
    keywords: ['electric', 'kettle', 'bulb', 'led', 'cable', 'charger', 'battery', 'appliance', 'electronic', 'hardware'],
  },
  {
    id: 'GENERAL_PACKAGED',
    name: 'Packaged General Goods',
    description: 'Standard packaged commodities governed under Rule 6(1) of Legal Metrology (PC) Rules, 2011',
    applicableRuleSetIds: ['PC_RULES_2011_V1'],
    defaultRuleSetVersion: 'PC_RULES_2011_V1',
    keywords: ['general', 'package', 'item', 'commodity', 'goods'],
  },
  {
    id: 'IMPORTED',
    name: 'Imported Goods',
    description: 'Pre-packaged commodities imported from abroad governed under Rule 6(2)',
    applicableRuleSetIds: ['PC_RULES_2011_V1'],
    defaultRuleSetVersion: 'PC_RULES_2011_V1',
    keywords: ['imported', 'import', 'foreign', 'overseas', 'made in japan', 'made in china', 'made in usa'],
  },
  {
    id: 'OTHER',
    name: 'Other',
    description: 'Miscellaneous or uncategorized pre-packaged commodities',
    applicableRuleSetIds: ['PC_RULES_2011_V1'],
    defaultRuleSetVersion: 'PC_RULES_2011_V1',
    keywords: [],
  },
];

export const CATEGORIES_MAP = Object.fromEntries(PRODUCT_CATEGORIES.map(c => [c.id, c]));

export function getCategoryById(id) {
  return CATEGORIES_MAP[id] || CATEGORIES_MAP.GENERAL_PACKAGED;
}

export function getAllCategories() {
  return PRODUCT_CATEGORIES;
}

/**
 * Auto-detect commodity category based on product text & OCR keywords
 * @param {string} rawText
 * @param {string} productName
 * @returns {Object} Category object
 */
export function detectCategoryFromText(rawText = '', productName = '') {
  const combined = `${productName} ${rawText}`.toLowerCase();

  for (const cat of PRODUCT_CATEGORIES) {
    if (cat.id === 'OTHER' || cat.id === 'GENERAL_PACKAGED') continue;
    const match = cat.keywords.some(kw => combined.includes(kw));
    if (match) {
      return cat;
    }
  }

  return CATEGORIES_MAP.GENERAL_PACKAGED;
}
