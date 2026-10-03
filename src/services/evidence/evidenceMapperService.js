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
 * @param {Object} extractedFields - Normalized or raw OCR extracted fields
 * @param {Array<Object>} images - List of uploaded label images
 * @returns {Object} Fields populated with visual evidence references
 */
export function attachVisualEvidence(extractedFields = {}, images = []) {
  const mapped = {};

  Object.entries(extractedFields).forEach(([fieldKey, fieldVal]) => {
    const valObj = typeof fieldVal === 'object' && fieldVal !== null ? fieldVal : { value: fieldVal, confidence: 0.9 };
    const defaultCoords = DEFAULT_BOUNDING_BOXES[fieldKey] || { x: 20, y: 20, width: 60, height: 15, imageType: 'Front Label' };

    // Select primary image or matching image type
    const matchedImage = images.find(img => img.imageType === defaultCoords.imageType) || images[0] || null;

    mapped[fieldKey] = {
      ...valObj,
      evidence: {
        imageId: matchedImage?.imageId || 'IMG-01',
        imageType: defaultCoords.imageType,
        sourceLabel: matchedImage?.fileName || defaultCoords.imageType,
        imageUrl: matchedImage?.url || matchedImage?.preview || null,
        boundingBox: valObj.boundingBox || {
          x: defaultCoords.x,
          y: defaultCoords.y,
          width: defaultCoords.width,
          height: defaultCoords.height,
        },
        confidence: valObj.confidence || 0.90,
        isDemoEvidence: !valObj.hasRealCoordinates,
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
