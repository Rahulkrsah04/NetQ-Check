// ============================================================
// NetQ Check — Rule Applicability Engine
// Evaluates context-aware requirement applicability based on
// product category, origin, package size, and commodity attributes.
// ============================================================

import { CATEGORIES_MAP } from '../ruleEngine/productCategories.js';

/**
 * Determine if a specific requirement rule is applicable for a given category and extracted context
 * @param {Object} rule - Requirement rule object from ruleRepository
 * @param {string|Object} productCategory - Category ID or Category Object
 * @param {Object} normalizedData - Normalized extracted field values
 * @returns {{ isApplicable: boolean, applicabilityReason: string, isMandatory: boolean }}
 */
export function determineRuleApplicability(rule, productCategory, normalizedData = {}) {
  const catId = typeof productCategory === 'object' ? productCategory.id : productCategory;
  const category = CATEGORIES_MAP[catId] || CATEGORIES_MAP.GENERAL_PACKAGED;

  // 1. UNIVERSAL Requirements
  if (rule.applicability === 'UNIVERSAL') {
    return {
      isApplicable: true,
      isMandatory: rule.requirementType === 'MANDATORY',
      applicabilityReason: `Statutory declaration required for all retail pre-packaged commodities under ${rule.ruleReference}`,
    };
  }

  // 2. CATEGORY_SPECIFIC Requirements
  if (rule.applicability === 'CATEGORY_SPECIFIC') {
    const isCategoryMatch = rule.applicableCategories.includes('ALL') || rule.applicableCategories.includes(category.id);

    if (rule.id === 'REQ_07') {
      // Country of Origin
      if (category.id === 'IMPORTED') {
        return {
          isApplicable: true,
          isMandatory: true,
          applicabilityReason: 'Mandatory: Country of origin must be stated explicitly on imported commodities under Rule 6(2)',
        };
      } else {
        return {
          isApplicable: false,
          isMandatory: false,
          applicabilityReason: `Not Applicable: Country of origin is optional/informational for domestic ${category.name} (Rule 6(2))`,
        };
      }
    }

    if (rule.id === 'REQ_09') {
      // Batch / Lot Number
      if (['FOOD_GROCERY', 'BEVERAGES', 'COSMETICS', 'PERSONAL_CARE'].includes(category.id)) {
        return {
          isApplicable: true,
          isMandatory: true,
          applicabilityReason: `Mandatory: Batch/Lot traceability number required for ${category.name}`,
        };
      } else {
        return {
          isApplicable: false,
          isMandatory: false,
          applicabilityReason: `Not Applicable: Batch number is optional trace code for ${category.name}`,
        };
      }
    }

    return {
      isApplicable: isCategoryMatch,
      isMandatory: isCategoryMatch && rule.requirementType === 'MANDATORY',
      applicabilityReason: isCategoryMatch
        ? `Applicable requirement for ${category.name}`
        : `Not Applicable for ${category.name}`,
    };
  }

  // 3. CONDITION_BASED Requirements
  if (rule.applicability === 'CONDITION_BASED') {
    if (rule.id === 'REQ_05') {
      // Date of Mfg / Packing / Import / Expiry
      if (['FOOD_GROCERY', 'BEVERAGES', 'COSMETICS', 'PERSONAL_CARE'].includes(category.id)) {
        return {
          isApplicable: true,
          isMandatory: true,
          applicabilityReason: `Mandatory: Expiry or Best Before date required for perishable ${category.name}`,
        };
      } else if (category.id === 'IMPORTED') {
        return {
          isApplicable: true,
          isMandatory: true,
          applicabilityReason: 'Mandatory: Month and Year of Import required for imported pre-packaged commodities',
        };
      } else {
        return {
          isApplicable: true,
          isMandatory: true,
          applicabilityReason: `Mandatory: Month and Year of manufacture or packing required under Rule 6(1)(d)`,
        };
      }
    }

    if (rule.id === 'REQ_08') {
      // Unit Sale Price (USP)
      const qtyData = normalizedData?.netQuantity;
      const numericVal = qtyData?.parsedDetails?.numericValue || 0;
      const unit = qtyData?.parsedDetails?.unit || '';

      const isLargeQty = (unit === 'kg' && numericVal > 1) || (unit === 'g' && numericVal > 1000) ||
                         (unit === 'L' && numericVal > 1) || (unit === 'ml' && numericVal > 1000);

      if (isLargeQty) {
        return {
          isApplicable: true,
          isMandatory: true,
          applicabilityReason: 'Mandatory: Unit Sale Price (USP) required for net quantity exceeding 1 kg / 1 L under Rule 6(1)(g)',
        };
      } else {
        return {
          isApplicable: false,
          isMandatory: false,
          applicabilityReason: 'Not Applicable: Unit Sale Price is optional for single packages <= 1 kg / 1 L where MRP equals unit rate',
        };
      }
    }
  }

  return {
    isApplicable: true,
    isMandatory: rule.requirementType === 'MANDATORY',
    applicabilityReason: `Requirement applicable for ${category.name}`,
  };
}
