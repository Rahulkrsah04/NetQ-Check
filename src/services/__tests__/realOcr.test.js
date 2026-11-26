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
import { ocrService, scoreOcrReadability, rotateNormalizedBox, mergePassExtractions } from '../ocrService.js';
import { fuseMultiImageScan, normalizeForEquivalence } from '../inspection/dataFusionService.js';
import { normalizeMRP, normalizeQuantity, normalizeDate, normalizeAddress } from '../normalization/dataNormalizer.js';
import { validateDate, validateAddress } from '../validators/reusableValidators.js';

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

  // [13] Mobile Status Bar & Shopping App Noise Filtering + Vitamins Safe Context
  console.log('\n[13] Test Case 13: Mobile Screenshot Status Bar & Nutrition Label Robustness');
  const mobileScreenshotText = '2:17 al 56 E10\nDeliver in 10 mins\nVeeba Crunchy Peanut Butter\n380 g\nMRP (Incl. of all taxes) ₹199\nAdd to cart';
  const parsedMobile = parseRealImageDeclarations(mobileScreenshotText, { imageId: 'IMG-M1', imageType: 'Front Label' });
  assert(parsedMobile.productName.value === 'Veeba Crunchy Peanut Butter', 'Skips status bar ("2:17 al 56 E10") and UI chrome ("Deliver in 10 mins") to pick real Product Name');
  assert(parsedMobile.mrp.value === '₹199', 'Extracts MRP when "(Incl. of all taxes)" sits between MRP and currency amount');
  assert(parsedMobile.netQuantity.value === '380 g', 'Extracts 380 g net quantity cleanly');

  const foodWithVitaminsText = 'Nutrition Facts\nPer 100 g: Energy 350 kcal, Protein 12 g, Vitamins A & C\nNet Quantity: 380 g\nDate of Packing: 08/2026\nBest Before 6 Months from Packaging\nManufactured & Packed By:\nITC Limited, Kolkata - 700071\nCountry of Origin: India\nConsumer Care Cell: Toll Free 1800-425-4444\nUnit Sale Price: Rs. 54.00 per kg';
  const parsedNutrition = parseRealImageDeclarations(foodWithVitaminsText, { imageId: 'IMG-M2', imageType: 'Back Label' });
  assert(parsedNutrition.netQuantity.value === '380 g', 'Prioritizes labeled Net Quantity (380 g) over Nutrition table ("100 g", "12 g")');
  assert(parsedNutrition.manufactureDate.value === '08/2026', 'Extracts "Date of Packing: 08/2026" cleanly');
  assert(parsedNutrition.expiryDate.value === '6 Months from Packaging', 'Extracts "Best Before 6 Months from Packaging" shelf-life statement');
  assert(parsedNutrition.countryOfOrigin.value === 'India', 'Extracts clean Country of Origin ("India") without bleeding across newline into Consumer Care');
  assert(parsedNutrition.manufacturer.value === 'ITC Limited, Kolkata - 700071', 'Extracts clean multi-line Manufacturer without bleeding into Country of Origin');
  assert(parsedNutrition.unitSalePrice.value && parsedNutrition.unitSalePrice.value.includes('54.00'), 'Extracts Unit Sale Price declaration when present');

  const vitaminsSinglePriceText = 'Whole Wheat Biscuits\nRich in Vitamins & Fiber\n₹45\nNet Wt: 200 g';
  const parsedVitaminsPrice = parseRealImageDeclarations(vitaminsSinglePriceText);
  assert(!parsedVitaminsPrice.mrp.remarks.includes('Online selling price'), '"Vitamins" in nutrition text does NOT falsely trigger Blinkit e-commerce mode');
  assert(parsedVitaminsPrice.mrp.value === '₹45' && parsedVitaminsPrice.mrp.status === 'NEEDS_REVIEW', 'Single standalone price on physical pack surfaces ₹45 flagged as NEEDS_REVIEW');

  // [14] Multi-Image Descriptive Fields (Product Name / Manufacturer) Do NOT Cause False Conflict Errors
  console.log('\n[14] Test Case 14: Multi-Image Front vs Back Descriptive Merging (No False Conflict)');
  const scanFrontReal = {
    imageId: 'IMG-FR',
    imageType: 'Front Label',
    extractedData: {
      productName: { value: 'Veeba Peanut Butter', confidence: 0.80 },
      netQuantity: { value: '380 g', confidence: 0.95 },
      mrp: { value: '₹199', confidence: 0.95 },
      manufactureDate: { value: '08/2026', confidence: 0.90 },
    },
  };
  const scanBackReal = {
    imageId: 'IMG-BK',
    imageType: 'Back Label',
    extractedData: {
      productName: { value: 'Nutritional Information', confidence: 0.80 },
      netQuantity: { value: '380 g', confidence: 0.95 },
      manufacturer: { value: 'VRB Consumer Products Pvt Ltd, Rajasthan - 301705', confidence: 0.90 },
      manufactureDate: { value: '08-2026', confidence: 0.90 },
    },
  };
  const fusedReal = fuseMultiImageScan([scanFrontReal, scanBackReal]);
  assert(fusedReal.hasConflicts === false, 'Front vs Back differing Product Name / equivalent date (08/2026 == 08-2026) does NOT trigger false conflict error');
  assert(fusedReal.unifiedData.productName.value === 'Veeba Peanut Butter', 'Multi-image fusion prefers Front Label for Product Name');
  assert(fusedReal.unifiedData.manufacturer.value.includes('VRB Consumer Products'), 'Multi-image fusion retains Back Label Manufacturer details');

  // [15] Real-world Packaged Salt Label: Gibberish Rejection, Nutrition Safety, Mkt/Mfg By, Date of Packaging & Consumer Care
  console.log('\n[15] Test Case 15: Packaged Salt OCR Robustness (Gibberish, Nutrition mg, MRP variants, Date of Packaging, Consumer Care)');
  const sidewaysGarbageText = 'v. ay AND \\ . ps\nPe Be \\ pr\n—cnccmmee |\ns ITE > red\nLon -';
  const parsedGarbage = parseRealImageDeclarations(sidewaysGarbageText);
  assert(parsedGarbage.productName.value === null, 'Rejects sideways OCR symbol/fragment gibberish ("v. ay AND \\ . ps") instead of falsely verifying as Product Name');

  const saltBackOcrText = [
    'DID YOU KNOW?',
    '3 | Tata Salt is made with Vacuum Evaporation technology',
    'Mkt by: Tata Consumer Products Limited, Tata Centre',
    '1st Floor, 43, Jawaharlal Nehru Road, Kolkata - 700 071.',
    'Mfg by: Tata Chemicals Limited, Mithapur - 361 345, Gujarat.',
    'values por 100g Por Sorve (%) RDA',
    'Added Sugars 9, Total Fat 0 g',
    'Sodium 38000 mg [19], lodine 2 mg [14]',
    'CONSUMER CARE DETAILS: CUSTOMER CARE EXECUTIVE',
    'TATA CONSUMER PRODUCTS LTD., KIRLOSKAR BUSINESS PARK, HEBBAL, BENGALURU - 560 024.',
    'OLL FREE NUMBER: 1800 108 4488',
    'EMAIL: care@tataconsumer.com',
    'MRP 2 32.00 incl of all taxes',
    'NET QUANTITY:',
    'Date of',
    'Packaging: sEp/26',
    'Use By: AUG/28',
  ].join('\n');
  const parsedSalt = parseRealImageDeclarations(saltBackOcrText, { imageId: 'IMG-SALT-B', imageType: 'Back Label' });
  assert(parsedSalt.productName.value === 'Tata Salt', 'Extracts "Tata Salt" from back-label inline brand context');
  assert(parsedSalt.mrp.value === '₹32.00', 'Extracts MRP ₹32.00 cleanly even when ₹ is OCR-corrupted as "2" and ignores "Sugars 9"');
  assert(parsedSalt.netQuantity.value === null, 'Does NOT mistake "38000 mg", "2 mg", "100g", or "0 g" from Nutrition Facts for Net Quantity');
  assert(parsedSalt.netQuantity.remarks.includes('NET QUANTITY label detected'), 'Provides actionable remark when NET QUANTITY heading is present without legible value');
  assert(parsedSalt.manufacturer.value && parsedSalt.manufacturer.value.includes('Tata Consumer Products Limited') && parsedSalt.manufacturer.value.includes('700 071'), 'Extracts multi-line Mkt by manufacturer with spaced PIN code 700 071');
  assert(parsedSalt.manufactureDate.value === 'SEP/26', 'Extracts "Date of\\nPackaging: sEp/26" as SEP/26');
  assert(parsedSalt.expiryDate.value === 'AUG/28', 'Extracts "Use By: AUG/28" as AUG/28');
  assert(parsedSalt.consumerCare.value && parsedSalt.consumerCare.value.includes('1800 108 4488') && parsedSalt.consumerCare.value.includes('care@tataconsumer.com'), 'Extracts both toll-free helpline and email from multi-line Consumer Care block');

  // [16] OCR Readability Scoring, Orientation Bbox Inverse Mapping, & Date/PIN Normalization
  console.log('\n[16] Test Case 16: Readability Scoring, Rotation Bbox Mapping & MMM/YY Normalization');
  const garbageScore = scoreOcrReadability('Pe Be \\ pr —cnccmmee |', 36);
  const uprightScore = scoreOcrReadability('Vacuum Evaporated Iodised Edible Common Salt MRP 32.00', 60);
  assert(uprightScore.score > garbageScore.score * 2 && uprightScore.wordCount >= 6, 'scoreOcrReadability strongly prefers upright readable text over sideways gibberish');

  const rot90Box = rotateNormalizedBox({ x: 90, y: 20, width: 10, height: 40 }, 90);
  assert(rot90Box.x === 20 && rot90Box.y === 0 && rot90Box.width === 40 && rot90Box.height === 10, 'rotateNormalizedBox maps 90° CW box back to original image coordinates');

  const mergedPasses = mergePassExtractions([
    { passName: 'pass1', extractedData: parseRealImageDeclarations('MRP ¥ 32,00 incl of all tax\nDate of Packaging: SEP/26') },
    { passName: 'pass2', extractedData: parseRealImageDeclarations('Mkt by: Tata Consumer Products Ltd, Kolkata - 700 071\nTOLL FREE 1800 108 4488\nEMAIL: care@tataconsumer.com') },
  ]);
  assert(mergedPasses.mrp.value === '₹32.00' && mergedPasses.manufactureDate.value === 'SEP/26' && mergedPasses.manufacturer.value.includes('700 071') && mergedPasses.consumerCare.value.includes('1800 108 4488'), 'mergePassExtractions fuses best fields across complementary OCR preprocessing passes');

  const normSepDate = normalizeDate('SEP/26');
  assert(normSepDate.month === 9 && normSepDate.year === 2026 && normSepDate.normalizedValue === '09/2026', 'normalizeDate parses MMM/YY format (SEP/26 -> 09/2026)');
  assert(validateDate('SEP/26', normSepDate).isValid === true, 'validateDate accepts MMM/YY packaged label format (SEP/26)');

  const normPinAddr = normalizeAddress('Tata Consumer Products Ltd, Kolkata - 700 071');
  assert(normPinAddr.pinCode === '700071' && validateAddress(normPinAddr.rawValue, normPinAddr).isWarning !== true, 'normalizeAddress and validateAddress accept spaced Indian PIN codes (700 071)');

  console.log('\n============================================================');
  console.log(` Test Execution Complete: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  return { passed, failed };
}
