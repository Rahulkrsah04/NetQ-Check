// ============================================================
// NetQ Check — Visual Evidence Mapping Service
// Links extracted declarations to bounding boxes and computes evidence coverage
// ============================================================

/**
 * Bounding Box Coordinates (percentages relative to image width/height)
 */
export const DEFAULT_BOUNDING_BOXES = {
  productName: { x: 15, y: 12, width: 70, height: 14, imageType: 'Front Label' },
  netQuantity: { x: 15, y: 32, width: 35, height: 10, imageType: 'Front Label' },
  mrp: { x: 55, y: 32, width: 35, height: 10, imageType: 'Front Label' },
  manufacturer: { x: 15, y: 46, width: 70, height: 16, imageType: 'Back Label' },
  manufactureDate: { x: 15, y: 66, width: 35, height: 10, imageType: 'Back Label' },
  expiryDate: { x: 55, y: 66, width: 35, height: 10, imageType: 'Back Label' },
  consumerCare: { x: 15, y: 80, width: 70, height: 12, imageType: 'Back Label' },
  countryOfOrigin: { x: 15, y: 92, width: 40, height: 8, imageType: 'Back Label' },
  unitSalePrice: { x: 55, y: 92, width: 40, height: 8, imageType: 'Front Label' },
};

/**
 * Attaches visual bounding box coordinates and evidence metadata to extracted fields
 * Preserves genuine OCR coordinates; undetected or unmatched fields receive null bounding box.
 * @param {Object} extractedFields - Normalized or raw OCR extracted fields
 * @param {Array<Object>} images - List of uploaded label images
 * @returns {Object} Fields populated with visual evidence references
 */
export function attachVisualEvidence(extractedFields = {}, images = []) {
  const mapped = {};

  Object.entries(extractedFields).forEach(([fieldKey, fieldVal]) => {
    const valObj = typeof fieldVal === 'object' && fieldVal !== null ? fieldVal : { value: fieldVal, confidence: 0.9 };

    // Select matching image by sourceImageId, then sourceImageType, then fallback to images[0]
    let matchedImage = null;
    if (valObj.sourceImageId && Array.isArray(images)) {
      matchedImage = images.find(img => img.imageId === valObj.sourceImageId);
    }
    if (!matchedImage && valObj.sourceImageType && Array.isArray(images)) {
      matchedImage = images.find(img => img.imageType === valObj.sourceImageType);
    }
    if (!matchedImage && Array.isArray(images) && images.length > 0) {
      matchedImage = images[0];
    }

    const hasRealBox = !!(valObj.boundingBox && typeof valObj.boundingBox === 'object' && valObj.boundingBox.width > 0);
    const isDetected = valObj.value !== null && valObj.value !== undefined && String(valObj.value).trim() !== '' && valObj.status !== 'NOT_DETECTED';

    // Genuine bounding box is preserved if detected; undetected or unmatched fields have null
    const realBox = (isDetected && hasRealBox) ? valObj.boundingBox : null;

    mapped[fieldKey] = {
      ...valObj,
      boundingBox: realBox,
      imageRegion: realBox,
      evidence: {
        imageId: matchedImage?.imageId || valObj.sourceImageId || 'IMG-01',
        imageType: matchedImage?.imageType || valObj.sourceImageType || 'Front Label',
        sourceLabel: matchedImage?.fileName || matchedImage?.imageType || valObj.sourceImageType || 'Front Label',
        imageUrl: matchedImage?.url || matchedImage?.preview || null,
        boundingBox: realBox,
        imageRegion: realBox,
        confidence: valObj.confidence || 0.90,
        hasRealCoordinates: hasRealBox,
        isDetected,
      },
    };
  });

  return mapped;
}

/**
 * Calculates Evidence Coverage percentage for a given set of compliance checks
 * @param {Array<Object>} checks - Compliance checks list
 * @returns {Object} Coverage metrics
 */
export function calculateEvidenceCoverage(checks = []) {
  if (!checks || checks.length === 0) {
    return {
      coveragePercentage: 0,
      supportedCount: 0,
      applicableCount: 0,
      tooltip: 'Percentage of applicable checks supported by identifiable inspection evidence.',
    };
  }

  const applicableChecks = checks.filter(c => c.status !== 'NOT_APPLICABLE');
  if (applicableChecks.length === 0) {
    return {
      coveragePercentage: 100,
      supportedCount: 0,
      applicableCount: 0,
      tooltip: 'Percentage of applicable checks supported by identifiable inspection evidence.',
    };
  }

  const supportedCount = applicableChecks.filter(c => {
    // Check if field was detected or has evidence
    return c.status === 'PASS' || c.status === 'NEEDS_REVIEW' || c.extractedValue || c.hasEvidence;
  }).length;

  const coveragePercentage = Math.round((supportedCount / applicableChecks.length) * 100);

  return {
    coveragePercentage,
    supportedCount,
    applicableCount: applicableChecks.length,
    tooltip: 'Percentage of applicable checks supported by identifiable inspection evidence.',
  };
}

/**
 * Classify OCR numerical confidence score into confidence level
 * @param {number} confidence - 0.0 to 1.0
 * @returns {'high'|'moderate'|'review_recommended'}
 */
export function getConfidenceLevel(confidence) {
  if (confidence >= 0.90) return 'high';
  if (confidence >= 0.75) return 'moderate';
  return 'review_recommended';
}

/**
 * Create a structured evidence object for a specific field
 * @param {string} fieldKey
 * @param {Object} normalizedItem - normalized field item from dataNormalizer
 * @param {string} [imageId=null]
 * @returns {Object} Evidence object
 */
export function buildFieldEvidence(fieldKey, normalizedItem, imageId = null) {
  const rawValue = normalizedItem?.value ?? null;
  const normalizedValue = normalizedItem?.normalizedValue ?? rawValue;
  const confidence = normalizedItem?.confidence ?? 0;
  const confidenceLevel = getConfidenceLevel(confidence);
  const imageRegion = normalizedItem?.imageRegion || normalizedItem?.boundingBox || null;

  return {
    field: fieldKey,
    value: rawValue,
    rawValue,
    normalizedValue,
    source: 'OCR Vision Engine',
    confidence,
    confidenceLevel,
    imageRegion,
    boundingBox: imageRegion,
    imageId: imageId || 'IMG-SCAN-01',
  };
}

/**
 * Build complete evidence map for all extracted fields
 * @param {Object} normalizedData
 * @param {string} [imageId=null]
 * @returns {Object} Map of field evidence objects
 */
export function buildEvidenceMap(normalizedData = {}, imageId = null) {
  const map = {};
  for (const [key, item] of Object.entries(normalizedData)) {
    map[key] = buildFieldEvidence(key, item, imageId);
  }
  return map;
}

