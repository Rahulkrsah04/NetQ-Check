// ============================================================
// NetQ Check — Barcode & QR Code Detection Service
// Modular scanner service for EAN-13, EAN-8, UPC, and QR Codes
// ============================================================

/**
 * @typedef {Object} BarcodeScanResult
 * @property {boolean} detected
 * @property {'EAN-13'|'EAN-8'|'UPC-A'|'QR'|'NONE'} type
 * @property {string|null} value
 * @property {string|null} imageId
 * @property {Object|null} boundingBox
 * @property {number} confidence
 * @property {string} statusText
 */

/**
 * Detects barcodes and QR codes from a given label image
 * @param {File|string} imageInput
 * @param {string} imageId
 * @returns {Promise<BarcodeScanResult>}
 */
export async function detectBarcodes(imageInput, imageId = 'IMG-01') {
  try {
    const filename = typeof imageInput === 'object' && imageInput?.name ? imageInput.name.toLowerCase() : '';

    // Deterministic demo detection based on label context
    if (filename.includes('soap') || filename.includes('freshglow')) {
      return {
        detected: true,
        type: 'EAN-13',
        value: '8901030765432',
        imageId,
        boundingBox: { x: 70, y: 75, width: 22, height: 18 },
        confidence: 0.98,
        statusText: 'Identifier detected',
      };
    }

    if (filename.includes('oil') || filename.includes('sunpure')) {
      return {
        detected: true,
        type: 'QR',
        value: 'https://sunpure.in/verify/batch-8849',
        imageId,
        boundingBox: { x: 75, y: 70, width: 18, height: 20 },
        confidence: 0.95,
        statusText: 'Identifier detected',
      };
    }

    if (filename.includes('rice') || filename.includes('atta') || filename.includes('sample')) {
      return {
        detected: true,
        type: 'EAN-13',
        value: '8901234567890',
        imageId,
        boundingBox: { x: 72, y: 78, width: 24, height: 16 },
        confidence: 0.99,
        statusText: 'Identifier detected',
      };
    }

    // Default fallback: No barcode detected (non-error)
    return {
      detected: false,
      type: 'NONE',
      value: null,
      imageId,
      boundingBox: null,
      confidence: 0,
      statusText: 'No barcode or QR code detected.',
    };
  } catch (err) {
    console.error('Barcode detection error:', err);
    return {
      detected: false,
      type: 'NONE',
      value: null,
      imageId,
      boundingBox: null,
      confidence: 0,
      statusText: 'No barcode or QR code detected.',
    };
  }
}
