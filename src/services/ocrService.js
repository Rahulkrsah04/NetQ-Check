// ============================================================
// NetQ Check — OCR Service
// Abstraction layer for OCR providers
// Replace MockOCRService with TesseractOCRService or
// GoogleVisionOCRService by changing the provider config
// ============================================================

import { OCR_PROVIDER } from '../config/firebase';

/**
 * @interface IOCRService
 * @method extractText(imageFile) => Promise<OcrResult>
 */

/**
 * @typedef {Object} OcrResult
 * @property {boolean} success
 * @property {string} rawText
 * @property {ExtractedData} extractedData
 * @property {string|null} error
 */

// ==========================================
// Mock OCR Service (for demo / development)
// ==========================================
// ==========================================
// Mock OCR Service (for demo / development)
// ==========================================
class MockOCRService {
  async extractText(imageFile, delay = 1800) {
    // Simulate OCR processing latency
    await sleep(delay);

    const filename = (imageFile?.name || '').toLowerCase();
    const mockData = this._generateMockData(filename);

    return {
      success: true,
      rawText: mockData.rawText,
      extractedData: mockData.fields,
      provider: 'mock',
    };
  }

  _generateMockData(filename) {
    // 1. NON-COMPLIANT / MISSING SCENARIO (Soap)
    if (filename.includes('soap') || filename.includes('freshglow') || filename.includes('fail') || filename.includes('non_compliant')) {
      return {
        rawText: 'FreshGlow Beauty Soap\nNet Vol: 100g\nMRP Rs. 45/-\n(Incl. of all taxes)\nBatch No: B-204',
        fields: {
          productName: { value: 'FreshGlow Beauty Soap', confidence: 0.95 },
          netQuantity: { value: '100 g', confidence: 0.96 },
          mrp: { value: '₹45', confidence: 0.98 },
          manufacturer: { value: null, confidence: 0.0 }, // Missing
          manufactureDate: { value: null, confidence: 0.0 }, // Missing
          expiryDate: { value: null, confidence: 0.0 }, // Missing
          consumerCare: { value: null, confidence: 0.0 }, // Missing
          countryOfOrigin: { value: null, confidence: 0.0 },
          unitSalePrice: { value: '₹0.45 per g', confidence: 0.90 },
        },
      };
    }

    // 2. NEEDS REVIEW SCENARIO (Oil)
    if (filename.includes('oil') || filename.includes('sunpure') || filename.includes('review')) {
      return {
        rawText: 'SunPure Refined Sunflower Oil\n1 Litre | MRP: ₹185 (Incl. of taxes)\nMfd. by SunPure Agro Industries, Rajkot\nMfg Date: 07/2026\nExpiry: 06/2027\nCare: 0281-223344\nCountry: India',
        fields: {
          productName: { value: 'SunPure Refined Sunflower Oil', confidence: 0.92 },
          netQuantity: { value: '1 L', confidence: 0.95 },
          mrp: { value: '₹185', confidence: 0.70 }, // Low confidence (flagged for review)
          manufacturer: { value: 'SunPure Agro Industries, Rajkot', confidence: 0.72 }, // Incomplete address
          manufactureDate: { value: '07/2026', confidence: 0.74 }, // Low OCR confidence
          expiryDate: { value: '06/2027', confidence: 0.70 },
          consumerCare: { value: '0281-223344', confidence: 0.65 }, // Missing email/name
          countryOfOrigin: { value: 'India', confidence: 0.90 },
          unitSalePrice: { value: '₹185.00 per L', confidence: 0.88 },
        },
      };
    }

    // 3. FULLY COMPLIANT SCENARIO (Default - Rice / Wheat)
    return {
      rawText: 'ABC PREMIUM RICE\nNet Wt: 1 Kg\nMRP: ₹120 (Incl. of all taxes)\nMfd. by: ABC Foods Pvt. Ltd., Plot 14, Industrial Area, Bhopal, MP - 462001\nMfg Date: 06/2026 | Best Before: 05/2028\nConsumer Care: 1800-123-4567 | care@abcfoods.com\nUSP: ₹120.00 per kg\nCountry of Origin: India',
      fields: {
        productName: { value: 'ABC Premium Rice', confidence: 0.97 },
        netQuantity: { value: '1 kg', confidence: 0.98 },
        mrp: { value: '₹120', confidence: 0.99 },
        manufacturer: { value: 'ABC Foods Pvt. Ltd., Plot 14, Industrial Area, Bhopal, MP - 462001', confidence: 0.95 },
        manufactureDate: { value: '06/2026', confidence: 0.94 },
        expiryDate: { value: '05/2028', confidence: 0.93 },
        consumerCare: { value: '1800-123-4567 | care@abcfoods.com', confidence: 0.92 },
        countryOfOrigin: { value: 'India', confidence: 0.98 },
        unitSalePrice: { value: '₹120.00 per kg', confidence: 0.96 },
      },
    };
  }
}

// ==========================================
// Tesseract.js OCR Service
// ==========================================
class TesseractOCRService {
  async extractText(imageFile) {
    try {
      // Dynamically import tesseract to avoid bundle bloat when not used
      const { createWorker } = await import('tesseract.js');

      const worker = await createWorker('eng', 1, {
        logger: () => {}, // suppress logs
      });

      const imageUrl = URL.createObjectURL(imageFile);
      const { data } = await worker.recognize(imageUrl);
      await worker.terminate();
      URL.revokeObjectURL(imageUrl);

      const rawText = data.text;
      const extractedData = this._parseText(rawText);

      return {
        success: true,
        rawText,
        extractedData,
        provider: 'tesseract',
        confidence: data.confidence / 100,
      };
    } catch (err) {
      return {
        success: false,
        rawText: '',
        extractedData: {},
        error: err.message,
        provider: 'tesseract',
      };
    }
  }

  _parseText(text) {
    const extracted = {};

    // Product Name — first non-empty line heuristic
    const lines = text.split('\n').filter(l => l.trim().length > 2);
    if (lines.length > 0) {
      extracted.productName = { value: lines[0].trim(), confidence: 0.70 };
    }

    // Net Quantity
    const qtyMatch = text.match(/(\d+\.?\d*)\s*(g|kg|ml|l|ltr|litre|liter|gm)\b/i);
    if (qtyMatch) {
      extracted.netQuantity = { value: `${qtyMatch[1]} ${qtyMatch[2]}`, confidence: 0.85 };
    }

    // MRP
    const mrpMatch = text.match(/(?:mrp|maximum retail price|rs\.?|₹)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (mrpMatch) {
      extracted.mrp = { value: `₹${mrpMatch[1]}`, confidence: 0.88 };
    }

    // Manufacturer
    const mfgMatch = text.match(/(?:mfd|manufactured|packed|marketed)\s*by\s*:?\s*([^\n]+)/i);
    if (mfgMatch) {
      extracted.manufacturer = { value: mfgMatch[1].trim(), confidence: 0.78 };
    }

    // Manufacture date
    const mfgDate = text.match(/(?:mfg|mfd|manufactured|packed)\s*(?:date|:)?\s*(\d{2}[\/\-]\d{4})/i);
    if (mfgDate) {
      extracted.manufactureDate = { value: mfgDate[1], confidence: 0.82 };
    }

    // Expiry date
    const expDate = text.match(/(?:best before|exp|expiry|use by|bb)\s*:?\s*(\d{2}[\/\-]\d{4})/i);
    if (expDate) {
      extracted.expiryDate = { value: expDate[1], confidence: 0.83 };
    }

    // Consumer care
    const careMatch = text.match(/(?:consumer|helpline|care|toll.?free)\s*(?:no|number|:)?\s*([+\d][\d\s\-]{8,14})/i);
    if (careMatch) {
      extracted.consumerCare = { value: careMatch[1].trim(), confidence: 0.80 };
    }

    // Country of origin
    const countryMatch = text.match(/(?:country of origin|made in|product of)\s*:?\s*([a-z]+)/i);
    if (countryMatch) {
      extracted.countryOfOrigin = { value: countryMatch[1].trim(), confidence: 0.85 };
    }

    return extracted;
  }
}

// ==========================================
// Factory — returns the right service
// ==========================================
function createOCRService() {
  if (OCR_PROVIDER === 'tesseract') return new TesseractOCRService();
  return new MockOCRService();
}

export const ocrService = createOCRService();

// ==========================================
// OCR Processing Pipeline
// ==========================================
export async function processImage(imageFile, onProgress) {
  const steps = [
    'Image Processing',
    'OCR Text Extraction',
    'Declaration Detection',
    'Compliance Preparation',
    'Report Ready',
  ];

  const updateStep = (index, status) => {
    if (onProgress) onProgress({ stepIndex: index, stepName: steps[index], status, totalSteps: steps.length });
  };

  try {
    // Step 1
    updateStep(0, 'active');
    await sleep(600);
    updateStep(0, 'done');

    // Step 2
    updateStep(1, 'active');
    const result = await ocrService.extractText(imageFile, 1800);
    updateStep(1, 'done');

    if (!result.success) {
      throw new Error(result.error || 'OCR extraction failed');
    }

    // Step 3
    updateStep(2, 'active');
    await sleep(500);
    updateStep(2, 'done');

    // Step 4
    updateStep(3, 'active');
    await sleep(400);
    updateStep(3, 'done');

    // Step 5
    updateStep(4, 'active');
    await sleep(300);
    updateStep(4, 'done');

    return result;
  } catch (err) {
    throw new Error(`Image processing failed: ${err.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
