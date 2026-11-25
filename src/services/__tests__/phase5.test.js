// ============================================================
// NetQ Check — Phase 5 Comprehensive Automated Test Suite
// Verifies Visual Inspection, Image Quality, Preprocessing, Barcode Scanner,
// Bounding Boxes, Multi-Image Fusion, Conflict Detection & Comparison Engine
// ============================================================

import {
  analyzeImageQuality,
  calculateQualityAnalysisDimensions,
  calculateLuminanceAndContrast,
  calculateLaplacianBlurScore,
  calculateResolutionScore,
  calculateCompositeQuality,
} from '../imageProcessing/imageQualityAnalyzer.js';
import {
  preprocessImage,
  calculateScaledDimensions,
  applyLuminanceGrayscale,
  applyAdaptiveContrastStretching,
} from '../imageProcessing/imagePreprocessor.js';
import { detectBarcodes } from '../barcode/barcodeService.js';
import { attachVisualEvidence, calculateEvidenceCoverage } from '../evidence/evidenceMapperService.js';
import { fuseMultiImageScan } from '../inspection/dataFusionService.js';
import { compareScans } from '../comparison/scanComparisonService.js';
import { runComplianceCheck } from '../complianceEngine.js';
import { resolveFieldBoundingBox, parseRealImageDeclarations } from '../ocr/realOcrParser.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    failed++;
  }
}

export async function runPhase5TestSuite() {
  console.log('\n============================================================');
  console.log(' NetQ Check — Phase 5 Visual Intelligence Test Suite');
  console.log('============================================================\n');

  // 1. Image Quality Classification
  console.log('[1] Testing Image Quality Analysis & Flagging');
  const goodQuality = await analyzeImageQuality({ name: 'front_label_hd.png', size: 300000 });
  assert(goodQuality.quality === 'GOOD' && goodQuality.score >= 80, 'HD label image correctly classified as GOOD quality');

  const poorQuality = await analyzeImageQuality({ name: 'blurry_label.png', size: 10000 });
  assert(poorQuality.quality === 'POOR' && poorQuality.warning !== null, 'Blurry low-res image flagged with POOR quality warning');

  // Stage 2B: Genuine Pixel Analysis & Dimension Measurements
  const scaledDims = calculateQualityAnalysisDimensions(4000, 3000, 800);
  assert(scaledDims.width === 800 && scaledDims.height === 600, 'Analysis dimensions scale down 4000x3000 to 800x600');

  const smallDims = calculateQualityAnalysisDimensions(600, 400, 800);
  assert(smallDims.width === 600 && smallDims.height === 400, 'Conservative dimensions keep sub-800px image unscaled');

  const highRes = calculateResolutionScore(1920, 1080);
  assert(highRes.score === 25, 'High resolution image receives full 25 points');

  const lowRes = calculateResolutionScore(300, 200);
  assert(lowRes.score <= 5, 'Very low resolution image (<400px) penalized in resolution score');

  // Pixel Luminance & Contrast Statistics
  const darkPixels = { data: new Uint8ClampedArray(100 * 4) }; // all zeros
  const darkStats = calculateLuminanceAndContrast(darkPixels);
  assert(darkStats.meanLuminance === 0 && darkStats.shadowRatio === 1, 'Dark pixel buffer correctly identifies zero luminance and 100% shadow');

  const glarePixels = { data: new Uint8ClampedArray(100 * 4).fill(255) };
  const glareStats = calculateLuminanceAndContrast(glarePixels);
  assert(glareStats.meanLuminance === 255 && glareStats.glareRatio === 1, 'Overexposed pixel buffer correctly identifies 255 luminance and 100% glare');

  const halfDarkHalfWhite = new Uint8ClampedArray(100 * 4);
  for (let i = 50 * 4; i < 100 * 4; i++) halfDarkHalfWhite[i] = 255;
  const contrastStats = calculateLuminanceAndContrast({ data: halfDarkHalfWhite });
  assert(contrastStats.rmsContrast >= 100, 'High-contrast pixel buffer yields high RMS contrast (≥100)');

  // Laplacian Blur / Sharpness Metric
  const uniformPixels = { data: new Uint8ClampedArray(20 * 20 * 4).fill(128) };
  const flatBlur = calculateLaplacianBlurScore(uniformPixels, 20, 20);
  assert(flatBlur.laplacianVariance === 0 && flatBlur.blurScore === 10, 'Flat uniform image yields zero Laplacian variance and minimum blur score');

  const edgePixels = new Uint8ClampedArray(20 * 20 * 4);
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const val = (x % 2 === 0) ? 255 : 0;
      const idx = (y * 20 + x) * 4;
      edgePixels[idx] = val;
      edgePixels[idx + 1] = val;
      edgePixels[idx + 2] = val;
      edgePixels[idx + 3] = 255;
    }
  }
  const edgeBlur = calculateLaplacianBlurScore({ data: edgePixels }, 20, 20);
  assert(edgeBlur.laplacianVariance > 100 && edgeBlur.blurScore >= 80, 'High-contrast alternating edge pattern produces high Laplacian variance (≥100) and sharp score');

  // Composite Quality Scoring & Warning Flagging
  const compDark = calculateCompositeQuality(
    { width: 1200, height: 800 },
    { meanLuminance: 30, rmsContrast: 20, shadowRatio: 0.8, glareRatio: 0 },
    { laplacianVariance: 20, blurScore: 30 }
  );
  assert(compDark.quality === 'POOR' && compDark.warning.includes('underexposed'), 'Composite scoring flags underexposed image with POOR quality and lighting warning');

  const compGood = calculateCompositeQuality(
    { width: 1920, height: 1080 },
    { meanLuminance: 140, rmsContrast: 65, shadowRatio: 0.05, glareRatio: 0.05 },
    { laplacianVariance: 210, blurScore: 90 }
  );
  assert(compGood.quality === 'GOOD' && compGood.score >= 85 && compGood.warning === null, 'Composite scoring awards GOOD quality (≥85) to sharp, well-lit label');

  // 2. Non-Destructive Preprocessing
  console.log('\n[2] Testing Image Preprocessing Pipeline');
  const processed = await preprocessImage({ name: 'sample.png' });
  assert(processed.originalImage !== null, 'Original image reference preserved');
  assert(processed.metadata.filtersApplied.length > 0, 'Preprocessing metadata tracks applied filters');

  // Dimension scaling tests
  const scaled = calculateScaledDimensions(4000, 3000, 2000);
  assert(scaled.width === 2000 && scaled.height === 1500 && scaled.isScaled, 'Dimension scaling caps longest dimension at 2000px and preserves 4:3 aspect ratio');

  const normalScale = calculateScaledDimensions(1200, 800, 2000);
  assert(normalScale.width === 1200 && normalScale.height === 800 && !normalScale.isScaled, 'Conservative scaling preserves images under 2000px without forced resizing');

  // Luminance grayscale conversion tests (ITU-R BT.601 standard weights)
  const mockPixelData = new Uint8ClampedArray([
    255, 0, 0, 255,     // Red: Y ≈ 76
    0, 255, 0, 255,     // Green: Y ≈ 150
    0, 0, 255, 255,     // Blue: Y ≈ 29
    255, 255, 255, 255, // White: Y = 255
  ]);
  applyLuminanceGrayscale({ data: mockPixelData });
  assert(mockPixelData[0] === 76 && mockPixelData[1] === 76 && mockPixelData[2] === 76, 'Luminance grayscale converts pure red using BT.601 weights (0.299R)');
  assert(mockPixelData[4] === 150 && mockPixelData[5] === 150 && mockPixelData[6] === 150, 'Luminance grayscale converts pure green using BT.601 weights (0.587G)');
  assert(mockPixelData[8] === 29 && mockPixelData[9] === 29 && mockPixelData[10] === 29, 'Luminance grayscale converts pure blue using BT.601 weights (0.114B)');
  assert(mockPixelData[3] === 255 && mockPixelData[7] === 255 && mockPixelData[11] === 255, 'Luminance grayscale preserves alpha channel');

  // Adaptive contrast stretching flat safeguard test
  const flatData = new Uint8ClampedArray([100, 100, 100, 255, 102, 102, 102, 255, 101, 101, 101, 255, 100, 100, 100, 255]);
  applyAdaptiveContrastStretching({ data: flatData });
  assert(flatData[0] === 100 && flatData[4] === 102, 'Adaptive contrast stretching ignores flat/narrow-range images without dividing by zero');

  // Adaptive contrast stretching dynamic expansion test
  const wideData = new Uint8ClampedArray(400); // 100 pixels
  for (let i = 0; i < 400; i += 4) {
    const val = 40 + Math.floor((i / 400) * 160); // values from 40 to 200
    wideData[i] = val; wideData[i + 1] = val; wideData[i + 2] = val; wideData[i + 3] = 255;
  }
  applyAdaptiveContrastStretching({ data: wideData });
  assert(wideData[0] === 0 && wideData[396] === 255, 'Adaptive contrast stretching stretches dynamic range toward 0-255');

  // Fallback behavior test
  const fallbackRes = await preprocessImage(null);
  assert(fallbackRes.originalImage !== null && !fallbackRes.isPreprocessed, 'Handles invalid/null inputs gracefully with fallback object');

  // 3. Barcode & QR Code Detection Abstraction
  console.log('\n[3] Testing Barcode & QR Scanner Service');
  const barcodeRes = await detectBarcodes({ name: 'soap_label.png' }, 'IMG-01');
  assert(barcodeRes.detected && barcodeRes.type === 'EAN-13', 'EAN-13 barcode correctly detected');
  assert(barcodeRes.statusText === 'Identifier detected', 'Barcode output explicitly uses "Identifier detected" disclaimer');

  const qrRes = await detectBarcodes({ name: 'sunpure_oil.png' }, 'IMG-02');
  assert(qrRes.detected && qrRes.type === 'QR', 'QR Code correctly detected on product label');

  const noBarcode = await detectBarcodes({ name: 'plain_box.png' }, 'IMG-03');
  assert(!noBarcode.detected && noBarcode.statusText === 'No barcode or QR code detected.', 'Missing barcode handled gracefully as non-error status');

  // 4. Bounding Box & Evidence Mapping
  console.log('\n[4] Testing OCR Bounding Boxes & Evidence Mapping');
  const mapped = attachVisualEvidence({
    productName: { value: 'ABC Rice', confidence: 0.98, boundingBox: { x: 10, y: 10, width: 50, height: 10 } },
    mrp: { value: 'MRP ₹120 (Incl. of all taxes)', confidence: 0.99, boundingBox: { x: 20, y: 30, width: 40, height: 8 } },
  }, [{ imageId: 'IMG-FRONT', imageType: 'Front Label' }]);

  assert(mapped.mrp.evidence && mapped.mrp.evidence.boundingBox !== null, 'Extracted MRP field populated with bounding box coordinates');
  assert(mapped.mrp.evidence.imageId === 'IMG-FRONT', 'Field linked to correct image ID');

  // Stage 2C: Pixel-to-Percentage Normalization
  const singleLine = [{ text: 'MRP ₹120.00', bbox: { x0: 200, y0: 400, x1: 600, y1: 500 } }];
  const normBbox = resolveFieldBoundingBox(singleLine, '120.00', { width: 1000, height: 2000 }, { padX: 0, padY: 0 });
  assert(normBbox && normBbox.x === 20 && normBbox.y === 20 && normBbox.width === 40 && normBbox.height === 5,
    'Pixel coordinates normalize accurately to percentages on 1000x2000 canvas');

  // Stage 2C: Preprocessing Scale Alignment (Ratio Invariance)
  const origNorm = resolveFieldBoundingBox([{ text: 'Net Qty', bbox: { x0: 800, y0: 400, x1: 1600, y1: 600 } }], 'Net Qty', { width: 4000, height: 2000 }, { padX: 0, padY: 0 });
  const prepNorm = resolveFieldBoundingBox([{ text: 'Net Qty', bbox: { x0: 400, y0: 200, x1: 800, y1: 300 } }], 'Net Qty', { width: 2000, height: 1000 }, { padX: 0, padY: 0 });
  assert(origNorm.x === prepNorm.x && origNorm.width === prepNorm.width && origNorm.y === prepNorm.y && origNorm.height === prepNorm.height,
    'Normalized percentage bounding box is strictly invariant across preprocessing downscaling');

  // Stage 2C: Multi-Line Bounding Box Union
  const multiLines = [
    { text: 'Mfd. by ABC Foods Pvt. Ltd.', bbox: { x0: 100, y0: 200, x1: 500, y1: 250 } },
    { text: 'Plot 14, Industrial Area, Bhopal', bbox: { x0: 80, y0: 260, x1: 600, y1: 310 } },
  ];
  const unionBbox = resolveFieldBoundingBox(multiLines, /abc foods|industrial/i, { width: 1000, height: 1000 }, { multiLine: true, padX: 0, padY: 0 });
  assert(unionBbox && unionBbox.pixelBox.x0 === 80 && unionBbox.pixelBox.y0 === 200 && unionBbox.pixelBox.x1 === 600 && unionBbox.pixelBox.y1 === 310,
    'Multi-line manufacturer address calculates correct enclosing union bounding box');

  // Stage 2C: Reliable Text-to-Line Matching via parseRealImageDeclarations
  const ocrOutput = parseRealImageDeclarations(
    'Aashirvaad Atta\nNet Wt: 5 kg\nMRP: ₹270 (Incl. of all taxes)',
    {
      imageId: 'IMG-TEST-01',
      dimensions: { width: 1000, height: 1000 },
      lines: [
        { text: 'Aashirvaad Atta', bbox: { x0: 100, y0: 50, x1: 800, y1: 150 } },
        { text: 'Net Wt: 5 kg', bbox: { x0: 100, y0: 250, x1: 500, y1: 320 } },
        { text: 'MRP: ₹270 (Incl. of all taxes)', bbox: { x0: 100, y0: 400, x1: 600, y1: 480 } },
      ],
    }
  );
  assert(ocrOutput.mrp.boundingBox && ocrOutput.mrp.boundingBox.isRealCoordinate, 'Real OCR lines match MRP declaration and generate genuine bounding box');
  assert(ocrOutput.netQuantity.boundingBox && ocrOutput.netQuantity.boundingBox.isRealCoordinate, 'Real OCR lines match Net Qty declaration and generate genuine bounding box');

  // Stage 2C: Ambiguous or Unmatched Text Returns Null Bbox
  const unmatched = resolveFieldBoundingBox([{ text: 'Barcode 8901234567890', bbox: { x0: 100, y0: 100, x1: 200, y1: 200 } }], 'Nonexistent Pattern', { width: 1000, height: 1000 });
  assert(unmatched === null, 'Unmatched or ambiguous declaration safely returns null bounding box');

  // Stage 2C: NOT_DETECTED Fields Have Null Bbox (No Phantom Boxes)
  assert(ocrOutput.manufactureDate.value === null && ocrOutput.manufactureDate.boundingBox === null,
    'NOT_DETECTED declaration (manufactureDate) has strictly null bounding box');

  // Stage 2C: Front/Back Image Evidence Attribution
  const multiImages = [
    { imageId: 'IMG-FRONT', imageType: 'Front Label', preview: 'blob:front' },
    { imageId: 'IMG-BACK', imageType: 'Back Label', preview: 'blob:back' },
  ];
  const evidenceAttached = attachVisualEvidence({
    mrp: { value: '₹270', boundingBox: { x: 10, y: 10, width: 40, height: 5 }, sourceImageId: 'IMG-FRONT' },
    manufacturer: { value: 'ITC Ltd', boundingBox: { x: 15, y: 50, width: 60, height: 15 }, sourceImageId: 'IMG-BACK' },
    manufactureDate: { value: null, status: 'NOT_DETECTED' },
  }, multiImages);

  assert(evidenceAttached.mrp.evidence.imageId === 'IMG-FRONT' && evidenceAttached.mrp.evidence.imageUrl === 'blob:front',
    'Front label MRP evidence correctly routes to Front label image ID and preview URL');
  assert(evidenceAttached.manufacturer.evidence.imageId === 'IMG-BACK' && evidenceAttached.manufacturer.evidence.imageUrl === 'blob:back',
    'Back label Manufacturer evidence correctly routes to Back label image ID and preview URL');
  assert(evidenceAttached.manufactureDate.evidence.boundingBox === null,
    'attachVisualEvidence ensures undetected declaration has null bounding box');

  // Stage 2C: Legacy String / Object Compatibility
  const legacyAttached = attachVisualEvidence({ productName: 'Simple String' }, multiImages);
  assert(legacyAttached.productName.value === 'Simple String', 'attachVisualEvidence preserves backward compatibility with legacy string values');

  // 5. Evidence Coverage Calculation
  console.log('\n[5] Testing Evidence Coverage Metric');
  const coverage = calculateEvidenceCoverage([
    { status: 'PASS', extractedValue: '₹120' },
    { status: 'PASS', extractedValue: '1 kg' },
    { status: 'FAIL', extractedValue: null },
    { status: 'NOT_APPLICABLE', extractedValue: null },
  ]);
  assert(coverage.applicableCount === 3, 'Calculates applicable checks excluding NOT_APPLICABLE');
  assert(coverage.coveragePercentage === 67, 'Computes 67% evidence coverage accurately');

  // 6. Multi-Image Data Fusion & Conflict Detection (Scenario 4)
  console.log('\n[6] Testing Multi-Image Data Fusion & Conflicting MRP Detection (Scenario 4)');
  const fusionResult = fuseMultiImageScan([
    {
      imageId: 'IMG-FRONT',
      imageType: 'Front Label',
      extractedData: { productName: { value: 'ABC Rice' }, mrp: { value: '₹120', confidence: 0.95 } },
    },
    {
      imageId: 'IMG-BACK',
      imageType: 'Back Label',
      extractedData: { manufacturer: { value: 'ABC Foods Ltd' }, mrp: { value: '₹125', confidence: 0.95 } },
    },
  ]);

  assert(fusionResult.hasConflicts, 'Conflict detection flags mismatch between Front (₹120) and Back (₹125) MRP');
  assert(fusionResult.unifiedData.mrp.status === 'NEEDS_REVIEW', 'Conflicting field automatically assigned NEEDS_REVIEW status');

  // 7. Compliance Engine Scenarios (1-5)
  console.log('\n[7] Testing Compliance Engine Phase 5 Scenarios');

  // Scenario 1: Valid evidence -> PASS
  const sc1 = runComplianceCheck({
    productName: { value: 'ABC Premium Rice', confidence: 0.98 },
    netQuantity: { value: '1 kg', confidence: 0.98 },
    mrp: { value: 'MRP ₹120 (Incl. of all taxes)', confidence: 0.99 },
    manufacturer: { value: 'Mfd. by ABC Foods Pvt. Ltd., Plot 14, Industrial Area, Bhopal, MP - 462001', confidence: 0.95 },
    manufactureDate: { value: '06/2026', confidence: 0.95 },
    expiryDate: { value: '05/2028', confidence: 0.93 },
    consumerCare: { value: 'Consumer Helpline: 1800-123-4567 | care@abcfoods.com', confidence: 0.95 },
    countryOfOrigin: { value: 'India', confidence: 0.98 },
    unitSalePrice: { value: '₹120.00 per kg', confidence: 0.96 },
    batchNumber: { value: 'Batch No: B-2026-99', confidence: 0.95 },
  }, 'FOOD_GROCERY');
  assert(sc1.overallStatus === 'COMPLIANT', 'Scenario 1: Valid evidence yields COMPLIANT status');

  // Scenario 2: Missing mandatory declaration -> FAIL
  const sc2 = runComplianceCheck({
    productName: { value: 'FreshGlow Soap', confidence: 0.95 },
    netQuantity: { value: '100 g', confidence: 0.95 },
    mrp: { value: 'MRP ₹45 (Incl. of all taxes)', confidence: 0.95 },
    manufacturer: { value: null, confidence: 0 }, // Missing
  }, 'COSMETICS');
  assert(sc2.overallStatus === 'NON_COMPLIANT', 'Scenario 2: Missing mandatory declaration yields NON_COMPLIANT status');

  // Scenario 3: Low confidence -> REVIEW
  const sc3 = runComplianceCheck({
    productName: { value: 'SunPure Refined Sunflower Oil', confidence: 0.92 },
    netQuantity: { value: '1 L', confidence: 0.95 },
    mrp: { value: 'MRP ₹185 (Incl. of all taxes)', confidence: 0.65 }, // Low OCR confidence (< 0.75)
    manufacturer: { value: 'Mfd. by SunPure Agro, Rajkot', confidence: 0.72 },
    manufactureDate: { value: '07/2026', confidence: 0.74 },
    consumerCare: { value: 'Care: 0281-223344', confidence: 0.65 },
    batchNumber: { value: 'Batch No: B-88', confidence: 0.95 },
  }, 'FOOD_GROCERY');
  assert(sc3.overallStatus === 'NEEDS_REVIEW', 'Scenario 3: Low OCR confidence yields NEEDS_REVIEW status');

  // Scenario 5: Non-applicable requirement -> NOT_APPLICABLE
  const sc5 = runComplianceCheck({
    productName: { value: 'Aashirvaad Whole Wheat Atta 5kg', confidence: 0.98 },
    netQuantity: { value: '5 kg', confidence: 0.98 },
    mrp: { value: 'MRP ₹270 (Incl. of all taxes)', confidence: 0.98 },
    manufacturer: { value: 'Mfd. by ITC Limited, Haridwar, UK', confidence: 0.95 },
    manufactureDate: { value: '06/2026', confidence: 0.95 },
    consumerCare: { value: 'Care: 1800-345-8888 | care@itc.in', confidence: 0.95 },
    countryOfOrigin: { value: 'India', confidence: 0.98 },
    batchNumber: { value: 'Batch No: B-102', confidence: 0.95 },
  }, 'FOOD_GROCERY');
  
  const notApplicableChecks = sc5.checks.filter(c => c.status === 'NOT_APPLICABLE');
  assert(notApplicableChecks.length > 0, 'Scenario 5: Non-applicable category rules set to NOT_APPLICABLE');

  // 8. Inspection Scan Comparison
  console.log('\n[8] Testing Scan Comparison Tool');
  const comparisons = compareScans(
    { scanId: 'SCN-002', normalizedData: { mrp: { value: '₹125' }, netQuantity: { value: '1 kg' } }, overallStatus: 'COMPLIANT' },
    { scanId: 'SCN-001', normalizedData: { mrp: { value: '₹120' }, netQuantity: { value: '1 kg' } }, overallStatus: 'COMPLIANT' }
  );

  const mrpDiff = comparisons.find(c => c.fieldKey === 'mrp');
  assert(mrpDiff && mrpDiff.status === 'CHANGED', 'Scan Comparison correctly identifies CHANGED MRP (₹120 → ₹125)');

  console.log('\n============================================================');
  console.log(` Test Execution Complete: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  return { passed, failed };
}
