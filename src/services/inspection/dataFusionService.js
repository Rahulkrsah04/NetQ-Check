// ============================================================
// NetQ Check — Multi-Image Data Fusion & Conflict Detection Engine
// Combines extracted declarations across multiple label images and flags conflicts
// ============================================================

import { attachVisualEvidence } from '../evidence/evidenceMapperService.js';

/**
 * Clean & normalize numeric currency or quantity for comparison
 */
function normalizeForComparison(val) {
  if (!val) return '';
  return String(val).toLowerCase().replace(/[^a-z0-9.]/g, '').trim();
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
      const valText = typeof fieldVal === 'object' ? fieldVal?.value : fieldVal;
      if (!valText) return;

      if (!fieldSources[key]) {
        fieldSources[key] = [];
      }

      fieldSources[key].push({
        imageId,
        imageLabel,
        value: valText,
        confidence: fieldVal?.confidence || 0.90,
        rawField: fieldVal,
      });
    });
  });

  // Process unified fields and check for conflicting declarations
  Object.entries(fieldSources).forEach(([key, occurrences]) => {
    if (occurrences.length === 0) return;

    // Check if distinct values exist across images
    const uniqueNormalized = new Set(occurrences.map(o => normalizeForComparison(o.value)));

    if (uniqueNormalized.size > 1) {
      // CONFLICT DETECTED!
      const conflictItem = {
        field: key,
        fieldLabel: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        occurrences,
        warning: 'CONFLICT DETECTED: Different values extracted across label images.',
        actionRequired: 'Manual Verification Required',
      };

      conflicts.push(conflictItem);

      unifiedData[key] = {
        value: occurrences[0].value,
        confidence: 0.50, // Reduced confidence due to conflict
        conflictDetected: true,
        conflictingValues: occurrences.map(o => `${o.imageLabel}: ${o.value}`),
        sources: occurrences,
        status: 'NEEDS_REVIEW',
        remarks: `Conflict detected across images (${occurrences.map(o => `${o.imageLabel}: ${o.value}`).join(' vs ')}). Manual verification required.`,
      };
    } else {
      // Unified consensus value
      const primary = occurrences[0];
      unifiedData[key] = {
        ...primary.rawField,
        value: primary.value,
        confidence: Math.max(...occurrences.map(o => o.confidence)),
        conflictDetected: false,
        sources: occurrences,
      };
    }
  });

  return {
    unifiedData,
    conflicts,
    hasConflicts: conflicts.length > 0,
  };
}
