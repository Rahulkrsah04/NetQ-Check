// ============================================================
// NetQ Check — Phase 5 Comprehensive Automated Test Suite
// Verifies Visual Inspection, Image Quality, Preprocessing, Barcode Scanner,
// Bounding Boxes, Multi-Image Fusion, Conflict Detection & Comparison Engine
// ============================================================

import { analyzeImageQuality } from '../imageProcessing/imageQualityAnalyzer.js';
import { preprocessImage } from '../imageProcessing/imagePreprocessor.js';
import { detectBarcodes } from '../barcode/barcodeService.js';
import { attachVisualEvidence, calculateEvidenceCoverage } from '../evidence/evidenceMapperService.js';
import { fuseMultiImageScan } from '../inspection/dataFusionService.js';
import { compareScans } from '../comparison/scanComparisonService.js';
import { runComplianceCheck } from '../complianceEngine.js';

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

  // 2. Non-Destructive Preprocessing
  console.log('\n[2] Testing Image Preprocessing Pipeline');
  const processed = await preprocessImage({ name: 'sample.png' });
  assert(processed.originalImage !== null, 'Original image reference preserved');
  assert(processed.metadata.filtersApplied.length > 0, 'Preprocessing metadata tracks applied filters');

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
    productName: { value: 'ABC Rice', confidence: 0.98 },
    mrp: { value: 'MRP ₹120 (Incl. of all taxes)', confidence: 0.99 },
  }, [{ imageId: 'IMG-FRONT', imageType: 'Front Label' }]);

  assert(mapped.mrp.evidence && mapped.mrp.evidence.boundingBox !== undefined, 'Extracted MRP field populated with bounding box coordinates');
  assert(mapped.mrp.evidence.imageId === 'IMG-FRONT', 'Field linked to correct image ID');

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
