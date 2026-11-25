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

  // 3. Date normalization (e.g. "08/2026" == "08-2026" == "08.2026")
  const dateMatch = str.match(/^(\d{1,2})[\/.\-](\d{2,4})(?:[\/.\-](\d{2,4}))?$/);
  if (dateMatch) {
    if (dateMatch[3]) {
      return `DATE_${dateMatch[1].padStart(2, '0')}_${dateMatch[2].padStart(2, '0')}_${dateMatch[3]}`;
    }
    return `DATE_${dateMatch[1].padStart(2, '0')}_${dateMatch[2]}`;
  }

  // 4. Fallback string normalization: alphanumeric only, collapsed whitespace
  return str.replace(/[^a-z0-9]/g, '');
}

// Statutory quantitative/factual fields that must remain consistent across Front & Back labels.
// Descriptive fields (productName, brand, manufacturer, consumerCare) naturally vary between Front & Back
// panels and are merged by source priority rather than triggering false conflict alerts.
const CONFLICT_CHECK_FIELDS = new Set([
  'mrp',
  'netQuantity',
  'countryOfOrigin',
  'manufactureDate',
  'expiryDate',
  'unitSalePrice',
]);

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
  const notDetectedMetadata = {};

  // Collate all values per field across images
  labelScanResults.forEach((scan) => {
    const imageId = scan.imageId || 'IMG-01';
    const imageLabel = scan.imageType || scan.label || 'Front Label';
    const fields = scan.extractedData || {};

    Object.entries(fields).forEach(([key, fieldVal]) => {
      if (key === 'rawOCRText') return;
      const valText = typeof fieldVal === 'object' ? fieldVal?.value : fieldVal;
      if (!valText) {
        if (typeof fieldVal === 'object' && fieldVal !== null) {
          const prev = notDetectedMetadata[key];
          // Prefer keeping metadata that carries actionable details (e.g., onlineSellingPrice or manual review)
          if (!prev || (!prev.onlineSellingPrice && fieldVal.onlineSellingPrice) || (!prev.manualVerificationRequired && fieldVal.manualVerificationRequired)) {
            notDetectedMetadata[key] = {
              ...fieldVal,
              sourceImageId: imageId,
              sourceImageType: imageLabel,
            };
          }
        }
        return; // Do not treat missing/not-detected fields as conflicts
      }

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

    // Descriptive fields (Product Name, Brand, Manufacturer, Consumer Care) differ naturally
    // between Front and Back packaging; merge by label role priority instead of raising conflict errors.
    if (!CONFLICT_CHECK_FIELDS.has(key)) {
      const sorted = [...occurrences].sort((a, b) => {
        if (key === 'productName' || key === 'brand') {
          const aFront = /front/i.test(a.imageLabel) ? 1 : 0;
          const bFront = /front/i.test(b.imageLabel) ? 1 : 0;
          if (aFront !== bFront) return bFront - aFront;
        } else if (key === 'manufacturer' || key === 'consumerCare') {
          const aBack = /back|side/i.test(a.imageLabel) ? 1 : 0;
          const bBack = /back|side/i.test(b.imageLabel) ? 1 : 0;
          if (aBack !== bBack) return bBack - aBack;
          // Prefer fuller detailed address/contact text when confidence is tied
          if (Math.abs(b.confidence - a.confidence) < 0.05) {
            return String(b.value).length - String(a.value).length;
          }
        }
        return b.confidence - a.confidence;
      });

      const primary = sorted[0];
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
      return;
    }

    // Check if distinct NON-EQUIVALENT statutory values exist across images
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

  // Preserve helpful metadata (like onlineSellingPrice or manualVerificationRequired) for undetected fields
  Object.entries(notDetectedMetadata).forEach(([key, meta]) => {
    if (!unifiedData[key]) {
      unifiedData[key] = meta;
    }
  });

  return {
    unifiedData,
    conflicts,
    hasConflicts: conflicts.length > 0,
  };
}
