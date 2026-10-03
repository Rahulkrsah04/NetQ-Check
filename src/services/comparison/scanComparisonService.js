// ============================================================
// NetQ Check — Inspection Comparison Service
// Objective diff comparison between current scan and previous historical scans
// ============================================================

/**
 * @typedef {Object} FieldComparisonResult
 * @property {string} fieldKey
 * @property {string} fieldName
 * @property {string|null} previousValue
 * @property {string|null} currentValue
 * @property {'UNCHANGED'|'CHANGED'|'NEW'|'REMOVED'|'CONFLICT'} status
 * @property {string} summaryText
 */

const DISPLAY_NAMES = {
  productName: 'Product Name',
  netQuantity: 'Net Quantity',
  mrp: 'Maximum Retail Price (MRP)',
  manufacturer: 'Manufacturer / Packer',
  manufactureDate: 'Date of Manufacture',
  expiryDate: 'Best Before / Expiry Date',
  consumerCare: 'Consumer Care Contact',
  countryOfOrigin: 'Country of Origin',
  unitSalePrice: 'Unit Sale Price (USP)',
  overallStatus: 'Overall Compliance Status',
};

/**
 * Compares two inspection scan assessments (Current vs Previous)
 * @param {Object} currentScan - Active or selected scan assessment
 * @param {Object} previousScan - Baseline historical scan assessment
 * @returns {Array<FieldComparisonResult>} List of field-level diff results
 */
export function compareScans(currentScan = {}, previousScan = {}) {
  const currentData = currentScan.normalizedData || currentScan.extractedData || {};
  const previousData = previousScan.normalizedData || previousScan.extractedData || {};

  const allKeys = new Set([...Object.keys(currentData), ...Object.keys(previousData), 'overallStatus']);
  const comparisons = [];

  allKeys.forEach((key) => {
    let prevVal = null;
    let currVal = null;

    if (key === 'overallStatus') {
      prevVal = previousScan.overallStatus || previousScan.status || 'N/A';
      currVal = currentScan.overallStatus || currentScan.status || 'N/A';
    } else {
      const prevField = previousData[key];
      const currField = currentData[key];

      prevVal = typeof prevField === 'object' ? prevField?.value : prevField;
      currVal = typeof currField === 'object' ? currField?.value : currField;
    }

    const fieldName = DISPLAY_NAMES[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

    let status = 'UNCHANGED';
    let summaryText = 'No observed changes between scans.';

    if (!prevVal && currVal) {
      status = 'NEW';
      summaryText = `Newly detected declaration in current scan: "${currVal}"`;
    } else if (prevVal && !currVal) {
      status = 'REMOVED';
      summaryText = `Declaration present in previous scan ("${prevVal}") but omitted in current scan.`;
    } else if (prevVal && currVal && String(prevVal).trim() !== String(currVal).trim()) {
      status = 'CHANGED';
      summaryText = `Observed difference: Previous "${prevVal}" → Current "${currVal}"`;
    }

    comparisons.push({
      fieldKey: key,
      fieldName,
      previousValue: prevVal || '—',
      currentValue: currVal || '—',
      status,
      summaryText,
    });
  });

  return comparisons;
}
