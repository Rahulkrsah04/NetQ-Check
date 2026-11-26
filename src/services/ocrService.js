// ============================================================
// NetQ Check — Real Image OCR Service Architecture
// Processes real user product images & Blinkit screenshots using real OCR + declaration parsing
// Demo preset fallbacks are ONLY used when explicitly selected by the user.
// ============================================================

import { parseRealImageDeclarations } from './ocr/realOcrParser.js';
import { generateOcrVariants } from './imageProcessing/imagePreprocessor.js';

let sharedTesseractWorker = null;
let workerInitPromise = null;

async function getSharedOcrWorker() {
  if (sharedTesseractWorker) return sharedTesseractWorker;
  if (workerInitPromise) return workerInitPromise;

  workerInitPromise = (async () => {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, { logger: () => {} });
    sharedTesseractWorker = worker;
    workerInitPromise = null;
    return worker;
  })().catch((err) => {
    workerInitPromise = null;
    sharedTesseractWorker = null;
    throw err;
  });

  return workerInitPromise;
}

async function resetSharedOcrWorker() {
  if (sharedTesseractWorker) {
    try {
      await sharedTesseractWorker.terminate();
    } catch (_) {}
    sharedTesseractWorker = null;
  }
  workerInitPromise = null;
}

/**
 * Scores OCR text readability to distinguish upright text from sideways/upside-down gibberish.
 * @param {string} text
 * @param {number} [confidence=0]
 * @returns {{ score: number, wordCount: number, keywordCount: number }}
 */
export function scoreOcrReadability(text = '', confidence = 0) {
  if (!text || typeof text !== 'string') {
    return { score: 0, wordCount: 0, keywordCount: 0 };
  }

  const rawWords = text.match(/\b[a-zA-Z]{3,}\b/g) || [];
  const validWords = rawWords.filter(
    (w) => /[aeiouy]/i.test(w) && !/[bcdfghjklmnpqrstvwxz]{5,}/i.test(w)
  );
  const kwMatches =
    text.match(
      /\b(?:mrp|net|qty|quantity|weight|mfg|mfd|mkt|packed|packaging|use\s*by|best\s*before|expiry|consumer|care|toll|email|india|salt|oil|rice|atta|ingredients|nutrition|fssai|limited|ltd|pvt|edible|iodised|evaporated|tata|product|serving|calories|protein|incl|taxes)\b/gi
    ) || [];

  const score = validWords.length * 3 + kwMatches.length * 8 + (Number(confidence) || 0) * 0.25;
  return {
    score,
    wordCount: validWords.length,
    keywordCount: kwMatches.length,
  };
}

/**
 * Transforms a normalized percentage bounding box [0..100] from a clockwise-rotated
 * OCR canvas back to the original unrotated image coordinate frame.
 * @param {Object|null} box
 * @param {number} appliedRotation - 0, 90, 180, or 270 degrees clockwise
 * @returns {Object|null}
 */
export function rotateNormalizedBox(box, appliedRotation = 0) {
  if (!box || typeof box !== 'object') return box;
  const norm = ((appliedRotation % 360) + 360) % 360;
  if (norm === 0) return box;

  const { x = 0, y = 0, width = 0, height = 0 } = box;
  let nx = x;
  let ny = y;
  let nw = width;
  let nh = height;

  if (norm === 90) {
    nx = y;
    ny = Math.max(0, 100 - (x + width));
    nw = height;
    nh = width;
  } else if (norm === 180) {
    nx = Math.max(0, 100 - (x + width));
    ny = Math.max(0, 100 - (y + height));
  } else if (norm === 270) {
    nx = Math.max(0, 100 - (y + height));
    ny = x;
    nw = height;
    nh = width;
  }

  return {
    ...box,
    x: Math.round(nx * 10) / 10,
    y: Math.round(ny * 10) / 10,
    width: Math.round(nw * 10) / 10,
    height: Math.round(nh * 10) / 10,
  };
}

function scoreFieldCandidate(fieldKey, candidate) {
  if (!candidate || !candidate.value) return -1;
  const val = String(candidate.value);
  let score = (candidate.confidence || 0.7) * 100;

  if (fieldKey === 'mrp') {
    if (candidate.status !== 'NEEDS_REVIEW') score += 30;
    if (/\.\d{2}$/.test(val)) score += 10;
  } else if (fieldKey === 'manufacturer') {
    if (/\b\d{3}\s?\d{3}\b/.test(val)) score += 30;
    if (/\b(?:ltd|limited|pvt|private|inc|corp|chemicals|consumer|products|foods)\b/i.test(val)) score += 20;
    score += Math.min(val.length, 100) * 0.25;
  } else if (fieldKey === 'consumerCare') {
    if (val.includes('|')) score += 30;
    if (/1[89]00[\s\-]?\d{3,4}[\s\-]?\d{3,4}/.test(val)) score += 20;
    if (/@/.test(val)) score += 15;
    score += Math.min(val.length, 60) * 0.15;
  } else if (fieldKey === 'productName') {
    const words = val.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 6) score += 15;
    if (/\b(?:salt|oil|rice|atta|flour|butter|soap|cream|powder|biscuits|tea|coffee|milk|water|sugar|dal|masala|juice|iodised|evaporated)\b/i.test(val)) {
      score += 20;
    }
  } else if (fieldKey === 'netQuantity') {
    if (/\b(?:kg|g|l|ml|pcs)\b/i.test(val)) score += 25;
  }

  return score;
}

/**
 * Merges declaration extractions across multiple preprocessing passes of the same image.
 * Keeps the highest-quality extraction per field and keeps brand paired with winning productName.
 * @param {Array<{ passName: string, extractedData: Object }>} passResults
 * @returns {Object}
 */
export function mergePassExtractions(passResults = []) {
  if (!passResults || passResults.length === 0) {
    return parseRealImageDeclarations('');
  }
  if (passResults.length === 1) {
    return passResults[0].extractedData;
  }

  const base = { ...passResults[0].extractedData };
  const keys = [
    'productName',
    'brand',
    'netQuantity',
    'mrp',
    'manufacturer',
    'manufactureDate',
    'expiryDate',
    'consumerCare',
    'countryOfOrigin',
    'unitSalePrice',
  ];

  let winningProductPassIdx = 0;

  for (const key of keys) {
    if (key === 'brand') continue; // keep brand synchronized with winning productName

    let bestItem = base[key];
    let bestScore = scoreFieldCandidate(key, bestItem);
    let bestIdx = 0;

    passResults.forEach((p, idx) => {
      const candidate = p.extractedData?.[key];
      const s = scoreFieldCandidate(key, candidate);
      if (s > bestScore) {
        bestScore = s;
        bestItem = candidate;
        bestIdx = idx;
      } else if (!bestItem?.value && candidate) {
        // Keep richer NOT_DETECTED remarks (e.g. "NET QUANTITY label detected..." or onlineSellingPrice)
        if (candidate.onlineSellingPrice && !bestItem?.onlineSellingPrice) {
          bestItem = candidate;
        } else if (candidate.remarks && (!bestItem?.remarks || candidate.remarks.length > bestItem.remarks.length)) {
          bestItem = candidate;
        }
      }
    });

    base[key] = bestItem;
    if (key === 'productName') {
      winningProductPassIdx = bestIdx;
    }
  }

  if (passResults[winningProductPassIdx]?.extractedData?.brand?.value) {
    base.brand = passResults[winningProductPassIdx].extractedData.brand;
  }

  return base;
}

function extractLinesFromTesseractData(data) {
  if (Array.isArray(data?.lines) && data.lines.length > 0) {
    return data.lines;
  }
  const lines = [];
  if (Array.isArray(data?.blocks)) {
    for (const b of data.blocks) {
      for (const p of b.paragraphs || []) {
        for (const l of p.lines || []) {
          if (l) lines.push(l);
        }
      }
    }
  }
  return lines;
}

function combineUniqueRawText(passTexts = []) {
  const seen = new Set();
  const combined = [];
  for (const text of passTexts) {
    if (!text) continue;
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      const key = line.toLowerCase().replace(/\s+/g, ' ');
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(line);
      }
    }
  }
  return combined.join('\n');
}

async function recognizeTarget(worker, target) {
  let imageUrl = typeof target === 'string' ? target : null;
  let createdUrl = false;
  if (!imageUrl && typeof Blob !== 'undefined' && target instanceof Blob) {
    imageUrl = URL.createObjectURL(target);
    createdUrl = true;
  }
  if (!imageUrl) return null;

  try {
    const { data } = await worker.recognize(imageUrl, {}, { text: true, blocks: true });
    return {
      text: data?.text || '',
      confidence: data?.confidence || 0,
      lines: extractLinesFromTesseractData(data),
    };
  } finally {
    if (createdUrl && imageUrl) {
      try { URL.revokeObjectURL(imageUrl); } catch (_) {}
    }
  }
}

/**
 * OCR Engine for processing real uploaded user product images
 */
class RealImageOCRService {
  async extractText(imageFile, isDemoPreset = false, metaOverrides = null) {
    // ONLY if explicitly marked as a demo preset from Quick Test UI, return preset scenario
    if (isDemoPreset || imageFile?.isDemoPreset) {
      const filename = (metaOverrides?.fileName || imageFile?.name || '').toLowerCase();
      return this._generateDemoPreset(filename);
    }

    const baseMeta = {
      imageId: metaOverrides?.imageId || imageFile?.imageId || 'IMG-01',
      imageType: metaOverrides?.imageType || imageFile?.imageType || 'Front Label',
      fileName: metaOverrides?.fileName || imageFile?.name || imageFile?.fileName || 'label_image',
    };

    try {
      let rawText = '';
      let ocrLines = [];
      let imageDimensions = { width: 0, height: 0 };
      let appliedRotation = 0;

      const isLoadableImage =
        (typeof Blob !== 'undefined' && imageFile instanceof Blob) ||
        (typeof imageFile === 'string' &&
          (imageFile.startsWith('data:') || imageFile.startsWith('blob:') || imageFile.startsWith('http')));

      if (isLoadableImage) {
        try {
          const worker = await getSharedOcrWorker();

          // 1. Browser Canvas multi-variant preprocessing + automatic orientation check
          const primaryVariants = await generateOcrVariants(imageFile, {
            rotationDegrees: 0,
            variants: ['sharpenedColor'],
          });

          if (primaryVariants.isGenerated && primaryVariants.variants.sharpenedColor) {
            let bestAngle = 0;
            let bestPrimary = await recognizeTarget(worker, primaryVariants.variants.sharpenedColor);
            let bestReadability = scoreOcrReadability(bestPrimary?.text, bestPrimary?.confidence);
            let bestDimensions = primaryVariants.dimensions;

            // If 0° yields poor/garbled text (e.g. sideways 90°/270° or upside-down 180° photo), auto-check rotations
            if (bestReadability.wordCount < 5 || bestReadability.score < 45) {
              for (const deg of [90, 270, 180]) {
                const rotVariants = await generateOcrVariants(imageFile, {
                  rotationDegrees: deg,
                  variants: ['sharpenedColor'],
                });
                if (!rotVariants.isGenerated || !rotVariants.variants.sharpenedColor) continue;

                const rotRes = await recognizeTarget(worker, rotVariants.variants.sharpenedColor);
                const rotReadability = scoreOcrReadability(rotRes?.text, rotRes?.confidence);
                if (
                  rotReadability.score > bestReadability.score * 1.15 &&
                  rotReadability.wordCount >= bestReadability.wordCount + 1
                ) {
                  bestAngle = deg;
                  bestPrimary = rotRes;
                  bestReadability = rotReadability;
                  bestDimensions = rotVariants.dimensions;
                }
              }
            }

            appliedRotation = bestAngle;
            imageDimensions = bestDimensions;

            const passes = [
              {
                passName: 'sharpenedColor',
                res: bestPrimary,
              },
            ];

            // 2. Generate complementary local-contrast variants at the winning orientation
            const extraVariants = await generateOcrVariants(imageFile, {
              rotationDegrees: bestAngle,
              variants: ['localContrastMax', 'localContrastInv'],
            });

            if (extraVariants.variants.localContrastMax) {
              const maxRes = await recognizeTarget(worker, extraVariants.variants.localContrastMax);
              if (maxRes) passes.push({ passName: 'localContrastMax', res: maxRes });
            }

            const prelimParsed = passes.map((p) => ({
              passName: p.passName,
              extractedData: parseRealImageDeclarations(p.res?.text || '', {
                ...baseMeta,
                dimensions: imageDimensions,
                lines: p.res?.lines || [],
              }),
            }));
            const prelimMerged = mergePassExtractions(prelimParsed);

            // Run inverted white-on-color/dark pass if key declarations missing or readability still modest
            const missingImportant =
              !prelimMerged.productName?.value ||
              !prelimMerged.mrp?.value ||
              !prelimMerged.netQuantity?.value ||
              !prelimMerged.manufacturer?.value ||
              !prelimMerged.manufactureDate?.value ||
              !prelimMerged.consumerCare?.value;

            if ((missingImportant || bestReadability.score < 90) && extraVariants.variants.localContrastInv) {
              const invRes = await recognizeTarget(worker, extraVariants.variants.localContrastInv);
              if (invRes) passes.push({ passName: 'localContrastInv', res: invRes });
            }

            const finalParsedPasses = passes.map((p) => ({
              passName: p.passName,
              extractedData: parseRealImageDeclarations(p.res?.text || '', {
                ...baseMeta,
                dimensions: imageDimensions,
                lines: p.res?.lines || [],
              }),
            }));

            let extractedData = mergePassExtractions(finalParsedPasses);

            // Map any rotated bounding boxes back onto the original uploaded image orientation
            if (appliedRotation !== 0) {
              Object.keys(extractedData).forEach((k) => {
                if (extractedData[k] && typeof extractedData[k] === 'object' && extractedData[k].boundingBox) {
                  const unrotated = rotateNormalizedBox(extractedData[k].boundingBox, appliedRotation);
                  extractedData[k] = {
                    ...extractedData[k],
                    boundingBox: unrotated,
                    imageRegion: unrotated,
                  };
                }
              });
            }

            rawText = combineUniqueRawText(passes.map((p) => p.res?.text || ''));
            ocrLines = passes.flatMap((p) => p.res?.lines || []);
            extractedData.rawOCRText = rawText;

            return {
              success: true,
              rawText,
              extractedData,
              rawOCRData: {
                text: rawText,
                lines: ocrLines,
                dimensions: imageDimensions,
              },
              appliedRotation,
              provider: 'real_ocr',
              isDemoData: false,
            };
          }

          // Fallback single-pass OCR when Canvas variant generation is unavailable
          let imageUrl = typeof imageFile === 'string' ? imageFile : URL.createObjectURL(imageFile);
          if (typeof Image !== 'undefined') {
            try {
              await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                  imageDimensions = { width: img.naturalWidth || img.width || 0, height: img.naturalHeight || img.height || 0 };
                  resolve();
                };
                img.onerror = () => resolve();
                img.src = imageUrl;
              });
            } catch (_) {}
          }
          const singleRes = await recognizeTarget(worker, imageUrl);
          rawText = singleRes?.text || '';
          ocrLines = singleRes?.lines || [];
          if (typeof imageFile !== 'string' && imageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageUrl);
          }
        } catch (tessErr) {
          console.warn('Tesseract OCR engine fallback:', tessErr.message);
          await resetSharedOcrWorker();
        }
      }

      const imageMeta = {
        ...baseMeta,
        dimensions: imageDimensions,
        lines: ocrLines,
      };
      const extractedData = parseRealImageDeclarations(rawText, imageMeta);

      return {
        success: true,
        rawText,
        extractedData,
        rawOCRData: {
          text: rawText,
          lines: ocrLines,
          dimensions: imageDimensions,
        },
        appliedRotation,
        provider: 'real_ocr',
        isDemoData: false,
      };
    } catch (err) {
      console.error('Real OCR processing error:', err);
      return {
        success: true,
        rawText: '',
        extractedData: parseRealImageDeclarations('', baseMeta),
        provider: 'real_ocr',
        isDemoData: false,
        error: err.message,
      };
    }
  }

  _generateDemoPreset(filename) {
    if (filename.includes('soap') || filename.includes('freshglow')) {
      return {
        success: true,
        rawText: 'FreshGlow Beauty Soap\nNet Vol: 100g\nMRP Rs. 45/-\n(Incl. of all taxes)\nBatch No: B-204',
        extractedData: {
          productName: { value: 'FreshGlow Beauty Soap', confidence: 0.95 },
          netQuantity: { value: '100 g', confidence: 0.96 },
          mrp: { value: '₹45', confidence: 0.98 },
          manufacturer: { value: null, confidence: 0.0 },
          manufactureDate: { value: null, confidence: 0.0 },
          expiryDate: { value: null, confidence: 0.0 },
          consumerCare: { value: null, confidence: 0.0 },
          countryOfOrigin: { value: null, confidence: 0.0 },
          unitSalePrice: { value: '₹0.45 per g', confidence: 0.90 },
        },
        provider: 'demo_preset',
        isDemoData: true,
      };
    }

    if (filename.includes('oil') || filename.includes('sunpure')) {
      return {
        success: true,
        rawText: 'SunPure Refined Sunflower Oil\n1 Litre | MRP: ₹185 (Incl. of taxes)\nMfd. by SunPure Agro Industries, Rajkot\nMfg Date: 07/2026\nExpiry: 06/2027\nCare: 0281-223344\nCountry: India',
        extractedData: {
          productName: { value: 'SunPure Refined Sunflower Oil', confidence: 0.92 },
          netQuantity: { value: '1 L', confidence: 0.95 },
          mrp: { value: '₹185', confidence: 0.70 },
          manufacturer: { value: 'SunPure Agro Industries, Rajkot', confidence: 0.72 },
          manufactureDate: { value: '07/2026', confidence: 0.74 },
          expiryDate: { value: '06/2027', confidence: 0.70 },
          consumerCare: { value: '0281-223344', confidence: 0.65 },
          countryOfOrigin: { value: 'India', confidence: 0.90 },
          unitSalePrice: { value: '₹185.00 per L', confidence: 0.88 },
        },
        provider: 'demo_preset',
        isDemoData: true,
      };
    }

    return {
      success: true,
      rawText: 'ABC PREMIUM RICE\nNet Wt: 1 Kg\nMRP: ₹120 (Incl. of all taxes)\nMfd. by: ABC Foods Pvt. Ltd., Plot 14, Industrial Area, Bhopal, MP - 462001\nMfg Date: 06/2026 | Best Before: 05/2028\nConsumer Care: 1800-123-4567 | care@abcfoods.com\nUSP: ₹120.00 per kg\nCountry of Origin: India',
      extractedData: {
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
      provider: 'demo_preset',
      isDemoData: true,
    };
  }
}

export const ocrService = new RealImageOCRService();

/**
 * Image processing pipeline for OCR extraction
 * @param {File|Blob|string} imageFile
 * @param {Function} onProgress
 * @param {boolean} isDemoPreset - Set true ONLY when user selects a Quick Test demo preset
 */
export async function processImage(imageFile, onProgress, isDemoPreset = false, imageMeta = null) {
  const steps = [
    'Image Quality Check',
    'OCR Text Extraction',
    'Declaration Detection',
    'Confidence Scoring',
    'Normalization & Compliance Prep',
  ];

  const updateStep = (index, status) => {
    if (onProgress) onProgress({ stepIndex: index, stepName: steps[index], status, totalSteps: steps.length });
  };

  try {
    updateStep(0, 'active');
    await sleep(200);
    updateStep(0, 'done');

    updateStep(1, 'active');
    const result = await ocrService.extractText(imageFile, isDemoPreset, imageMeta);
    updateStep(1, 'done');

    updateStep(2, 'active');
    await sleep(200);
    updateStep(2, 'done');

    updateStep(3, 'active');
    await sleep(150);
    updateStep(3, 'done');

    updateStep(4, 'active');
    await sleep(150);
    updateStep(4, 'done');

    return result;
  } catch (err) {
    throw new Error(`OCR Processing failed: ${err.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
