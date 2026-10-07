// ============================================================
// NetQ Check — Real Image OCR & Declaration Parser Test Suite
// Verifies real OCR pattern extraction, Blinkit UI price separation,
// NOT_DETECTED fallbacks, and absence of hardcoded demo values.
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
} from '../ocr/realOcrParser.js';
import { ocrService } from '../ocrService.js';

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
  console.log(' NetQ Check — Real Image OCR Bug Fix Test Suite');
  console.log('============================================================\n');

  // Test 1: Real image text with MRP ₹120 → extracts ₹120
  console.log('[1] Test Case 1: Real image text with MRP ₹120');
  const text1 = 'FORTUNE REFINED SOYABEAN OIL\nNet Qty: 1 L\nMRP: ₹120 (Incl. of all taxes)\nMfd Date: 05/2026';
  const parsed1 = parseRealImageDeclarations(text1);
  assert(parsed1.mrp.value === '₹120', 'Extracts exact printed package MRP ₹120');

  // Test 2: Real image text with quantity 500 g → extracts 500 g
  console.log('\n[2] Test Case 2: Real image text with quantity 500 g');
  const text2 = 'Tata Salt Vacuum Evaporated Iodised Salt\nNet Wt: 500 g\nMRP: ₹28';
  const parsed2 = parseRealImageDeclarations(text2);
  assert(parsed2.netQuantity.value === '500 g', 'Extracts exact net quantity 500 g');

  // Test 3: Blinkit screenshot with Blinkit selling price ₹99 & printed MRP ₹120
  console.log('\n[3] Test Case 3: Blinkit screenshot (Selling price ₹99 vs Package MRP ₹120)');
  const blinkitText = 'Blinkit\nDeliver in 10 mins\nFortune Sunlite Sunflower Oil 1L\n₹99 (15% OFF)\nPhysical Package Image: M.R.P. ₹120 (Incl. of all taxes)';
  const parsed3 = parseRealImageDeclarations(blinkitText);
  assert(parsed3.mrp.value === '₹120', 'Identifies printed package MRP ₹120 instead of Blinkit selling price ₹99');
  assert(parsed3.mrp.onlineSellingPrice === '₹99', 'Separates Blinkit online selling price ₹99');

  // Test 4: Image without visible MRP → NOT_DETECTED
  console.log('\n[4] Test Case 4: Image without visible MRP');
  const frontOnlyText = 'Aashirvaad Superior MP Atta\n10 kg\nWholesome taste and purity';
  const parsed4 = parseRealImageDeclarations(frontOnlyText);
  assert(parsed4.mrp.value === null, 'Returns null value for missing MRP');
  assert(parsed4.mrp.remarks.includes('MRP not visible'), 'Returns advisory: "MRP not visible in provided image — upload back/side label image."');

  // Test 5: Image without visible quantity → NOT_DETECTED
  console.log('\n[5] Test Case 5: Image without visible quantity');
  const noQtyText = 'Nivea Soft Light Moisturising Cream\nMRP ₹199 (Incl. of all taxes)\nBeiersdorf India Pvt Ltd';
  const parsed5 = parseRealImageDeclarations(noQtyText);
  assert(parsed5.netQuantity.value === null, 'Returns null for missing net quantity');
  assert(parsed5.netQuantity.confidence === 0, 'Confidence is 0 for NOT_DETECTED net quantity');

  // Test 6: Ambiguous MRP → Manual Verification Required
  console.log('\n[6] Test Case 6: Ambiguous MRP');
  const ambiguousText = 'Packaged Commodity\nRs. 150 / Rs. 200 / Rs. 250\nBatch 404';
  const parsed6 = parseRealImageDeclarations(ambiguousText);
  assert(parsed6.mrp.value === null && parsed6.mrp.manualVerificationRequired === true, 'Flags ambiguous price list with manualVerificationRequired = true');
  assert(parsed6.mrp.remarks.includes('Manual Verification Required'), 'Returns "Manual Verification Required" remarks');

  // Test 7: Verify NO hardcoded demo values returned for real user image uploads
  console.log('\n[7] Test Case 7: Real user image upload does NOT return hardcoded demo values');
  const realFile = { name: 'real_blinkit_screenshot_102.png', size: 145000 };
  const realOcrResult = await ocrService.extractText(realFile, false); // isDemoPreset = false
  assert(realOcrResult.isDemoData === false, 'Result explicitly marked as real OCR data (isDemoData = false)');
  assert(realOcrResult.extractedData.mrp.value !== '₹720', 'Does NOT return hardcoded demo MRP ₹720');
  assert(realOcrResult.extractedData.productName.value !== 'ABC Premium Rice', 'Does NOT return hardcoded demo product name ABC Premium Rice');

  console.log('\n============================================================');
  console.log(` Test Execution Complete: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  return { passed, failed };
}
