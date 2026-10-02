// ============================================================
// NetQ Check — Evidence Mapping & Confidence Assessment
// Structured evidence model & confidence classification
// ============================================================

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
  const imageRegion = normalizedItem?.imageRegion || null;

  return {
    field: fieldKey,
    value: rawValue,
    rawValue,
    normalizedValue,
    source: 'OCR Vision Engine',
    confidence,
    confidenceLevel,
    imageRegion,
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
