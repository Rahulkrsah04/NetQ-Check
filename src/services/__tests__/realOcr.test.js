// ============================================================
// NetQ Check — Real Image OCR & Declaration Parser Test Suite
// Verifies real OCR pattern extraction, Blinkit UI price separation,
// barcode/phone/PIN rejection, safe OCR corrections, NOT_DETECTED fallbacks,
// multi-image source attribution, equivalent value normalization, and no demo fallbacks.
// ============================================================

import {
  extractMRP,
  extractNetQuantity,
  extractManufacturer,
  extractDates,
  extractConsumerCare,
  extractCountryOfOrigin,
  extractProductNameAndBrand,
  parseRealImageDeclarations,
  safeContextualClean,
} from '../ocr/realOcrParser.js';
import { ocrService } from '../ocrService.js';
import { fuseMultiImageScan, normalizeForEquivalence } from '../inspection/dataFusionService.js';
import { normalizeMRP, normalizeQuantity } from '../normalization/dataNormalizer.js';

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

export async function runRealOcrTestSuite() {
  console.log('\n============================================================');
  console.log(' NetQ Check — Real Image OCR & Field Extraction Test Suite');
  console.log('============================================================\n');

  // [1] Package-Printed MRP Extraction
  console.log('[1] Test Case 1: Real image text with printed package MRP');
  const text1 = 'FORTUNE REFINED SOYABEAN OIL\nNet Qty: 1 L\nMRP: ₹120 (Incl. of all taxes)\nMfd Date: 05/2026';
  const parsed1 = parseRealImageDeclarations(text1, { imageId: 'IMG-01', imageType: 'Back Label' });
  assert(parsed1.mrp.value === '₹120', 'Extracts exact printed package MRP ₹120');
  assert(parsed1.mrp.sourceImageType === 'Back Label', 'Preserves source image type (Back Label)');

  // [2] Net Quantity with SI Units
  console.log('\n[2] Test Case 2: Real image text with quantity 500 g');
  const text2 = 'Tata Salt Vacuum Evaporated Iodised Salt\nNet Wt: 500 g\nMRP: ₹28';
  const parsed2 = parseRealImageDeclarations(text2, { imageId: 'IMG-02', imageType: 'Front Label' });
  assert(parsed2.netQuantity.value === '500 g', 'Extracts exact net quantity 500 g');
  assert(parsed2.netQuantity.originalValue.includes('500 g'), 'Preserves original raw token in originalValue');

  // [3] Blinkit Screenshot Price Separation
  console.log('\n[3] Test Case 3: Blinkit screenshot (Selling price ₹99 vs Package MRP ₹120)');
  const blinkitText = 'Blinkit\nDeliver in 10 mins\nFortune Sunlite Sunflower Oil 1L\n₹99 (15% OFF)\nPhysical Package Image: M.R.P. ₹120 (Incl. of all taxes)';
  const parsed3 = parseRealImageDeclarations(blinkitText);
  assert(parsed3.mrp.value === '₹120', 'Identifies printed package MRP ₹120 instead of Blinkit selling price ₹99');
  assert(parsed3.mrp.onlineSellingPrice === '₹99', 'Separates Blinkit online selling price ₹99');
  assert(parsed3.mrp.remarks.includes('Online Selling Price: ₹99'), 'Mentions separated online price in remarks');

  // [4] Distinction between MRP and Non-Price Identifiers (Barcode, Phone, PIN, FSSAI)
  console.log('\n[4] Test Case 4: Distinction from Barcodes, Phone Numbers, PIN codes, and FSSAI');
  const nonPriceText = 'Sunrise Haldi Powder\nFSSAI Lic: 10014022002650\nBarcode: 8901030383848\nPIN: 700001\nCustomer Care: 1800-102-1234\nMRP: ₹42 (Incl. of all taxes)';
  const parsed4 = parseRealImageDeclarations(nonPriceText);
  assert(parsed4.mrp.value === '₹42', 'Extracts true MRP ₹42');
  assert(parsed4.mrp.value !== '₹8901030383848', 'Does NOT mistake barcode for MRP');
  assert(parsed4.mrp.value !== '₹1800', 'Does NOT mistake toll-free number for MRP');
  assert(parsed4.mrp.value !== '₹700001', 'Does NOT mistake PIN code for MRP');

  // [5] Image Without Visible MRP -> NOT_DETECTED (No Guessing)
  console.log('\n[5] Test Case 5: Image without visible MRP -> NOT_DETECTED');
  const frontOnlyText = 'Aashirvaad Superior MP Atta\n10 kg\nWholesome taste and purity';
  const parsed5 = parseRealImageDeclarations(frontOnlyText);
  assert(parsed5.mrp.value === null, 'Returns null value for missing MRP');
  assert(parsed5.mrp.status === 'NOT_DETECTED', 'Status marked explicitly as NOT_DETECTED');
  assert(parsed5.mrp.remarks.includes('MRP not visible in provided image'), 'Returns advisory: "MRP not visible in provided image — upload back/side label image."');

  // [6] Image Without Visible Net Quantity -> NOT_DETECTED
  console.log('\n[6] Test Case 6: Image without visible quantity -> NOT_DETECTED');
  const noQtyText = 'Nivea Soft Light Moisturising Cream\nMRP ₹199 (Incl. of all taxes)\nBeiersdorf India Pvt Ltd';
  const parsed6 = parseRealImageDeclarations(noQtyText);
  assert(parsed6.netQuantity.value === null, 'Returns null for missing net quantity');
  assert(parsed6.netQuantity.confidence === 0, 'Confidence is 0 for NOT_DETECTED net quantity');
  assert(parsed6.netQuantity.status === 'NOT_DETECTED', 'Status marked as NOT_DETECTED');

  // [7] Ambiguous Unlabelled Prices -> NEEDS_REVIEW with Manual Verification
  console.log('\n[7] Test Case 7: Ambiguous price without packaging context');
  const ambiguousText = 'Packaged Commodity\nRs. 150 / Rs. 200 / Rs. 250\nBatch 404';
  const parsed7 = parseRealImageDeclarations(ambiguousText);
  assert(parsed7.mrp.value === null && parsed7.mrp.manualVerificationRequired === true, 'Flags ambiguous price list with manualVerificationRequired = true');
  assert(parsed7.mrp.status === 'NEEDS_REVIEW', 'Sets status to NEEDS_REVIEW');

  // [8] OCR Correction Safety: Contextual character repair
  console.log('\n[8] Test Case 8: OCR Correction Safety');
  const rawOcrNoise = 'M.R.P. : Rs. l20\nNet Qty: O500 g';
  const cleanedText = safeContextualClean(rawOcrNoise);
  assert(cleanedText.includes('120'), 'Safely repairs optical confusion l20 -> 120 in M.R.P. context');
  assert(cleanedText.includes('0500'), 'Safely repairs optical confusion O500 -> 0500 in Net Qty context');

  // [9] Data Normalizer Safeguards
  console.log('\n[9] Test Case 9: Data Normalizer Safeguards');
  const normMrpNotDetected = normalizeMRP('NOT_DETECTED');
  assert(normMrpNotDetected.amount === null && normMrpNotDetected.normalizedValue === null, 'normalizeMRP returns null amount for NOT_DETECTED');
  const normMrpValid = normalizeMRP('MRP: ₹120.00 (Incl. of all taxes)');
  assert(normMrpValid.amount === 120 && normMrpValid.hasTaxClause === true, 'normalizeMRP parses amount 120 and recognizes tax clause');
  const normBarcodeLong = normalizeMRP('8901234567890');
  assert(normBarcodeLong.amount === null, 'normalizeMRP rejects barcode digits longer than 6 digits');

  // [10] Multi-Image Data Fusion: Equivalent Values Normalization (No False Conflict)
  console.log('\n[10] Test Case 10: Multi-Image Equivalent Values Normalization');
  const scanFrontEquiv = {
    imageId: 'IMG-F',
    imageType: 'Front Label',
    extractedData: {
      mrp: { value: '₹120', confidence: 0.95 },
      netQuantity: { value: '1 kg', confidence: 0.95 },
    },
  };
  const scanBackEquiv = {
    imageId: 'IMG-B',
    imageType: 'Back Label',
    extractedData: {
      mrp: { value: '120.00 INR', confidence: 0.90 },
      netQuantity: { value: '1000 g', confidence: 0.92 },
    },
  };
  const fusedEquiv = fuseMultiImageScan([scanFrontEquiv, scanBackEquiv]);
  assert(fusedEquiv.hasConflicts === false, 'Recognizes ₹120 == 120.00 INR and 1 kg == 1000 g without false conflict');
  assert(fusedEquiv.unifiedData.mrp.value === '₹120', 'Unified MRP retains primary high-confidence representation');

  // [11] Multi-Image Data Fusion: Genuine Conflict Detection
  console.log('\n[11] Test Case 11: Multi-Image Genuine Conflict Detection');
  const scanFrontConflict = {
    imageId: 'IMG-F',
    imageType: 'Front Label',
    extractedData: { mrp: { value: '₹120', confidence: 0.95 } },
  };
  const scanBackConflict = {
    imageId: 'IMG-B',
    imageType: 'Back Label',
    extractedData: { mrp: { value: '₹125', confidence: 0.95 } },
  };
  const fusedConflict = fuseMultiImageScan([scanFrontConflict, scanBackConflict]);
  assert(fusedConflict.hasConflicts === true, 'Flags genuine conflict between Front ₹120 and Back ₹125');
  assert(fusedConflict.unifiedData.mrp.manualVerificationRequired === true, 'Conflicting MRP requires manual verification');
  assert(fusedConflict.unifiedData.mrp.status === 'NEEDS_REVIEW', 'Conflicting MRP set to NEEDS_REVIEW');

  // [12] Real User Upload Never Receives Demo Presets
  console.log('\n[12] Test Case 12: Real user image upload does NOT return hardcoded demo values');
  const realFile = { name: 'real_user_packaged_item.jpg', size: 182000 };
  const realOcrResult = await ocrService.extractText(realFile, false); // isDemoPreset = false
  assert(realOcrResult.isDemoData === false, 'Result explicitly marked as real OCR data (isDemoData = false)');
  assert(realOcrResult.extractedData.mrp.value !== '₹720', 'Does NOT return hardcoded demo MRP ₹720');
  assert(realOcrResult.extractedData.mrp.value !== '₹185', 'Does NOT return hardcoded demo MRP ₹185');
  assert(realOcrResult.extractedData.mrp.value !== '₹45', 'Does NOT return hardcoded demo MRP ₹45');
  assert(realOcrResult.extractedData.productName.value !== 'ABC Premium Rice', 'Does NOT return hardcoded demo product name ABC Premium Rice');

  console.log('\n============================================================');
  console.log(` Test Execution Complete: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  return { passed, failed };
}
