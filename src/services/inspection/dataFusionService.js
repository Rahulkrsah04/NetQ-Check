// ============================================================
// NetQ Check — Multi-Image Data Fusion & Conflict Detection Engine
// Combines extracted declarations across multiple label images,
// normalizes equivalent values before comparison, and flags genuine conflicts
// ============================================================

import { attachVisualEvidence } from '../evidence/evidenceMapperService.js';

/**
 * Standardizes values for equivalence comparison across multiple images
 * Converts equivalent prices (e.g. "₹120", "120.00", "120 INR")
 * and equivalent quantities (e.g. "1 kg", "1000 g", "1.0 kg") into identical tokens
 * so that false positive conflicts are NOT triggered.
 */
export function normalizeForEquivalence(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim().toLowerCase();

  // 1. Currency normalization (e.g. "₹120", "rs. 120", "120.00 inr" -> "120")
  const priceMatch = str.match(/(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d+)?)/i);
  if (priceMatch && /(?:rs\.?|₹|inr)/i.test(str)) {
    const num = parseFloat(priceMatch[1].replace(/,/g, ''));
    if (!isNaN(num)) {
      return `CURRENCY_${num.toFixed(2)}`;
    }
  }

  // 2. Quantity normalization to base units (e.g. "1 kg" & "1000 g" -> "QTY_1000_G")
  const qtyMatch = str.match(/([\d.]+)\s*(kg|g|gm|gram|grams|ml|l|ltr|litre|liter|mg|pcs|pieces)\b/i);
  if (qtyMatch) {
    const amount = parseFloat(qtyMatch[1]);
    const unit = qtyMatch[2].toLowerCase();

    if (['kg'].includes(unit)) {
      return `QTY_${(amount * 1000).toFixed(1)}_G`;
    }
    if (['g', 'gm', 'gram', 'grams'].includes(unit)) {
      return `QTY_${amount.toFixed(1)}_G`;
    }
    if (['l', 'ltr', 'litre', 'liter'].includes(unit)) {
      return `QTY_${(amount * 1000).toFixed(1)}_ML`;
    }
    if (['ml'].includes(unit)) {
      return `QTY_${amount.toFixed(1)}_ML`;
    }
    if (['pcs', 'pieces'].includes(unit)) {
      return `QTY_${amount}_PCS`;
    }
  }

  // 3. Fallback string normalization: alphanumeric only, collapsed whitespace
  return str.replace(/[^a-z0-9]/g, '');
}

/**
 * Merges extracted data across multiple label images and checks for conflicts
 * @param {Array<Object>} labelScanResults - List of scan outputs per image
 * @returns {Object} Unified data result with conflict flags and source attributions
 */
export function fuseMultiImageScan(labelScanResults = []) {
  if (!labelScanResults || labelScanResults.length === 0) {
    return {
      unifiedData: {},
      conflicts: [],
      hasConflicts: false,
    };
  }

  const unifiedData = {};
  const conflicts = [];
  const fieldSources = {};

  // Collate all values per field across images
  labelScanResults.forEach((scan) => {
    const imageId = scan.imageId || 'IMG-01';
    const imageLabel = scan.imageType || scan.label || 'Front Label';
    const fields = scan.extractedData || {};

    Object.entries(fields).forEach(([key, fieldVal]) => {
      if (key === 'rawOCRText') return;
      const valText = typeof fieldVal === 'object' ? fieldVal?.value : fieldVal;
      if (!valText) return; // Do not treat missing/not-detected fields as conflicts

      if (!fieldSources[key]) {
        fieldSources[key] = [];
      }

      fieldSources[key].push({
        imageId,
        imageLabel,
        value: valText,
        confidence: fieldVal?.confidence || 0.90,
        originalValue: fieldVal?.originalValue || valText,
        rawField: fieldVal,
      });
    });
  });

  // Process unified fields and check for conflicting declarations
  Object.entries(fieldSources).forEach(([key, occurrences]) => {
    if (occurrences.length === 0) return;

    // Check if distinct NON-EQUIVALENT values exist across images
    const uniqueTokens = new Set(occurrences.map(o => normalizeForEquivalence(o.value)));

    if (uniqueTokens.size > 1) {
      // GENUINE CONFLICT DETECTED across images!
      const conflictItem = {
        field: key,
        fieldLabel: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        occurrences,
        warning: 'CONFLICT DETECTED: Different non-equivalent values extracted across label images.',
        actionRequired: 'Manual Verification Required',
      };

      conflicts.push(conflictItem);

      unifiedData[key] = {
        value: occurrences[0].value,
        originalValue: occurrences[0].originalValue,
        confidence: 0.50, // Reduced confidence due to conflict
        conflictDetected: true,
        conflictingValues: occurrences.map(o => `${o.imageLabel}: ${o.value}`),
        sources: occurrences,
        status: 'NEEDS_REVIEW',
        manualVerificationRequired: true,
        remarks: `Conflict detected across images (${occurrences.map(o => `${o.imageLabel}: ${o.value}`).join(' vs ')}). Manual verification required.`,
      };
    } else {
      // Unified consensus value (highest confidence)
      const sortedByConf = [...occurrences].sort((a, b) => b.confidence - a.confidence);
      const primary = sortedByConf[0];

      unifiedData[key] = {
        ...primary.rawField,
        value: primary.value,
        originalValue: primary.originalValue,
        confidence: primary.confidence,
        conflictDetected: false,
        sources: occurrences,
        sourceImageId: primary.imageId,
        sourceImageType: primary.imageLabel,
      };
    }
  });

  return {
    unifiedData,
    conflicts,
    hasConflicts: conflicts.length > 0,
  };
}
