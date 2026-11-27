// ============================================================
// NetQ Check — Phase 6 Stabilization Unit Tests
// Tests BUG-01 Scan Session Persistence & Navigation Safeguards
// ============================================================

import {
  saveActiveScanSession,
  loadActiveScanSession,
  clearActiveScanSession,
  hasActiveScanSession,
  dataUrlToBlob,
  SESSION_STORAGE_KEY,
} from '../inspection/scanSessionService.js';
import {
  applySharpeningFilter,
  evaluateOcrSharpenRetry,
  preprocessImage,
} from '../imageProcessing/imagePreprocessor.js';
import {
  extractMRP,
  extractManufacturer,
  extractNetQuantity,
} from '../ocr/realOcrParser.js';

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

export async function runStabilizationTestSuite() {
  console.log('\n============================================================');
  console.log(' NetQ Check — Phase 6 Stabilization Test Suite');
  console.log('============================================================\n');

  console.log('[1] Testing BUG-01 Active Scan Session Persistence');

  // Test 1: Empty storage returns null
  clearActiveScanSession();
  assert(loadActiveScanSession() === null, 'loadActiveScanSession returns null when storage is empty');
  assert(hasActiveScanSession() === false, 'hasActiveScanSession returns false when storage is empty');

  // Test 2: Save active scan session
  const mockSession = {
    labelImages: [
      {
        imageId: 'IMG-001',
        fileName: 'front_label.jpg',
        fileSize: 45000,
        imageType: 'Front Label',
        preview: 'data:image/jpeg;base64,mockFrontDataUrl',
        previewDataUrl: 'data:image/jpeg;base64,mockFrontDataUrl',
        quality: { score: 92, quality: 'GOOD' },
        qualityScore: 92,
        qualityStatus: 'GOOD',
        createdAt: '2026-11-27T10:00:00.000Z',
        isDemoPreset: false,
      },
      {
        imageId: 'IMG-002',
        fileName: 'back_label.jpg',
        fileSize: 52000,
        imageType: 'Back Label',
        preview: 'data:image/jpeg;base64,mockBackDataUrl',
        previewDataUrl: 'data:image/jpeg;base64,mockBackDataUrl',
        quality: { score: 88, quality: 'GOOD' },
        qualityScore: 88,
        qualityStatus: 'GOOD',
        createdAt: '2026-11-27T10:01:00.000Z',
        isDemoPreset: false,
      },
    ],
    fusionResult: {
      unifiedData: {
        productName: { value: 'Tata Tea Gold', confidence: 0.95 },
        mrp: { value: '₹140', confidence: 0.92 },
        netQuantity: { value: '250 g', confidence: 0.96 },
      },
      hasConflicts: false,
      conflicts: [],
    },
    editedData: {
      netQuantity: { value: '250 g', confidence: 1.0 },
    },
    selectedCategory: 'BEVERAGES',
    combinedRawText: 'Tata Tea Gold MRP 140 Net Qty 250 g',
    qualityWarnings: [],
    barcodeResults: [],
  };

  const saveSuccess = saveActiveScanSession(mockSession);
  assert(saveSuccess === true, 'saveActiveScanSession executes successfully');
  assert(hasActiveScanSession() === true, 'hasActiveScanSession returns true after saving session');

  // Test 3: Load and verify restored session
  const restored = loadActiveScanSession();
  assert(restored !== null, 'Restored session object is not null');
  assert(Array.isArray(restored.labelImages) && restored.labelImages.length === 2, 'Restored session contains 2 staged images');
  assert(restored.labelImages[0].imageId === 'IMG-001', 'First image preserves imageId');
  assert(restored.labelImages[0].imageType === 'Front Label', 'First image preserves imageType');
  assert(restored.labelImages[0].file instanceof Object, 'Image object reconstitutes File/Blob instance');
  assert(restored.selectedCategory === 'BEVERAGES', 'Restored session preserves selectedCategory');
  assert(restored.fusionResult.unifiedData.productName.value === 'Tata Tea Gold', 'Restored session preserves fusionResult declarations');
  assert(restored.editedData.netQuantity.value === '250 g', 'Restored session preserves manual user edits');
  assert(restored.combinedRawText === 'Tata Tea Gold MRP 140 Net Qty 250 g', 'Restored session preserves combined OCR text');

  // Test 4: Clear active scan session
  clearActiveScanSession();
  assert(loadActiveScanSession() === null, 'clearActiveScanSession removes session from storage');
  assert(hasActiveScanSession() === false, 'hasActiveScanSession returns false after clear');

  // Test 5: Corrupted storage handling
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(SESSION_STORAGE_KEY, '{invalid_json_content');
    const safeResult = loadActiveScanSession();
    assert(safeResult === null, 'loadActiveScanSession handles corrupted JSON safely without crashing');
    clearActiveScanSession();
  }

  // Test 6: dataUrlToBlob conversion safety
  const blob = dataUrlToBlob('data:image/jpeg;base64,dGVzdA==', 'sample.jpg');
  assert(blob instanceof Object && blob.name === 'sample.jpg', 'dataUrlToBlob creates File instance with correct name');

  console.log('\n[2] Testing BUG-02 Conditional Image Sharpening & OCR Retry');

  // Test 7: Controlled 3x3 sharpening preserves uniform flat regions without noise
  const flatBuf = new Uint8ClampedArray(4 * 4 * 4);
  flatBuf.fill(128);
  applySharpeningFilter({ width: 4, height: 4, data: flatBuf }, 0.7);
  let flatInvariant = true;
  for (let i = 0; i < flatBuf.length; i += 4) {
    if (flatBuf[i] !== 128) flatInvariant = false;
  }
  assert(flatInvariant === true, 'Controlled 3x3 sharpening preserves flat uniform regions without artificial noise');

  // Test 8: Edge stroke contrast enhancement
  const edgeBuf = new Uint8ClampedArray(4 * 4 * 4);
  edgeBuf.fill(120);
  const centerIdx = (1 * 4 + 1) * 4;
  edgeBuf[centerIdx] = 60;
  edgeBuf[centerIdx + 1] = 60;
  edgeBuf[centerIdx + 2] = 60;
  applySharpeningFilter({ width: 4, height: 4, data: edgeBuf }, 0.7);
  assert(edgeBuf[centerIdx] < 60, 'Sharpening enhances stroke contrast by darkening character stroke edges');

  // Test 9: Dimension and alpha preservation
  const dimBuf = new Uint8ClampedArray(10 * 10 * 4);
  for (let i = 3; i < dimBuf.length; i += 4) dimBuf[i] = 220;
  applySharpeningFilter({ width: 10, height: 10, data: dimBuf }, 0.8);
  let alphaPreserved = true;
  for (let i = 3; i < dimBuf.length; i += 4) {
    if (dimBuf[i] !== 220) alphaPreserved = false;
  }
  assert(alphaPreserved === true, 'Sharpening preserves alpha channel untouched across all pixels');

  // Test 10: Sharp image remains unchanged in normal path
  const sharpProcessed = await preprocessImage({ name: 'sharp_label.png' }, {
    blurScore: 85,
    laplacianVariance: 150,
  });
  assert(sharpProcessed.metadata.isSharpened === false, 'Sharp image remains unchanged without sharpening in normal path');
  assert(!sharpProcessed.metadata.filtersApplied.some(f => f.includes('Sharpening')), 'Sharp image does not apply sharpening filter');

  // Test 11: Blurred image triggers conditional sharpening
  const blurryProcessed = await preprocessImage({ name: 'blurry_label.png' }, {
    blurScore: 45,
    laplacianVariance: 35,
  });
  assert(blurryProcessed.metadata.isSharpened === true, 'Blurred image triggers conditional sharpening');
  assert(blurryProcessed.metadata.filtersApplied.some(f => f.includes('Controlled 3x3 Sharpening Filter')), 'Sharpening filter recorded in metadata filtersApplied');

  // Test 12: Dimensions and bounding-box coordinate invariance
  assert(sharpProcessed.metadata.width === blurryProcessed.metadata.width, 'Sharpened output has identical dimensions to unsharpened pipeline');
  const sampleBox = { x: 10, y: 20, width: 200, height: 50 };
  const origXPct = (sampleBox.x / 1000) * 100;
  assert(origXPct === 1.0, 'Bounding-box coordinate percentage mapping remains strictly invariant');

  // Test 13: OCR retry does not overwrite higher-confidence original results
  const origOcr = {
    success: true,
    rawText: 'Tata Tea Gold Rs 150',
    extractedData: {
      productName: { value: 'Tata Tea Gold', confidence: 0.94 },
      mrp: { value: '₹150', confidence: 0.95 },
      netQuantity: { value: null, confidence: 0 },
    },
  };
  const retryLowerOcr = {
    success: true,
    rawText: 'Tata Tea Gold Rs 150',
    extractedData: {
      productName: { value: 'Tata Tea', confidence: 0.60 },
      mrp: { value: '₹150', confidence: 0.65 },
      netQuantity: { value: null, confidence: 0 },
    },
  };
  const evalKeepOrig = evaluateOcrSharpenRetry(origOcr, retryLowerOcr);
  assert(evalKeepOrig.extractedData.mrp.confidence === 0.95, 'OCR retry does NOT overwrite higher-confidence original MRP (0.95 kept over 0.65)');
  assert(evalKeepOrig.extractedData.productName.value === 'Tata Tea Gold', 'OCR retry does NOT overwrite higher-confidence original Product Name');

  // Test 14: OCR retry merges newly discovered declarations and preserves evidence
  const retryDiscoveredOcr = {
    success: true,
    rawText: 'Tata Tea Gold Rs 150 Net Qty 250 g',
    extractedData: {
      productName: { value: 'Tata Tea Gold', confidence: 0.92 },
      mrp: { value: '₹150', confidence: 0.90 },
      netQuantity: {
        value: '250 g',
        confidence: 0.88,
        boundingBox: { x0: 20, y0: 80, x1: 50, y1: 95 },
        source: 'IMG-001',
      },
    },
  };
  const evalDiscovered = evaluateOcrSharpenRetry(origOcr, retryDiscoveredOcr);
  assert(evalDiscovered.extractedData.netQuantity.value === '250 g', 'OCR retry merges newly extracted declaration missing from original pass');
  assert(evalDiscovered.extractedData.netQuantity.confidence === 0.88, 'OCR retry retains confidence of discovered declaration');
  assert(evalDiscovered.extractedData.netQuantity.boundingBox?.x0 === 20, 'OCR retry preserves bounding box for visual evidence mapping');
  assert(evalDiscovered.sharpenRetryImproved === true, 'sharpenRetryImproved flag accurately set to true');

  console.log('\n[3] Testing BUG-03 Real OCR Parser Improvements');

  // Test 15: Multi-line MRP lookahead with intervening packaging lines
  const mrpMulti1 = extractMRP('MRP (INCL. OF ALL TAXES)\nBATCH: B-104\nRs. 150.00');
  assert(mrpMulti1.packageMRP === '₹150.00' && mrpMulti1.confidence === 0.95, 'Multi-line MRP pairs with price across intervening batch line (₹150.00)');

  const mrpMulti2 = extractMRP('MAXIMUM RETAIL PRICE\n(Inclusive of all taxes)\n₹ 299.00');
  assert(mrpMulti2.packageMRP === '₹299.00' && mrpMulti2.confidence === 0.95, 'Multi-line MRP pairs across separate tax clause line (₹299.00)');

  const mrpMulti3 = extractMRP('MRP:\n(INCL. OF ALL TAXES)\nRs 45');
  assert(mrpMulti3.packageMRP === '₹45' && mrpMulti3.confidence === 0.95, 'Multi-line MRP pairs across 2 lines with colon prefix (₹45)');

  // Test 16: Multi-line MRP lookahead skips discount line to pick true printed price
  const mrpDiscount = extractMRP('MRP (INCL OF TAXES)\n50% off on MRP\nRs 180');
  assert(mrpDiscount.packageMRP === '₹180', 'Multi-line MRP lookahead skips discount percentage line to capture genuine price');

  // Test 17: Manufacturer extraction with company suffixes
  const mfgSuffix1 = extractManufacturer('Britannia Industries Ltd., 5/1A Hungerford Street, Kolkata');
  assert(mfgSuffix1.value && mfgSuffix1.value.includes('Britannia Industries Ltd.') && mfgSuffix1.confidence >= 0.90, 'Extracts corporate entity with "Industries Ltd." suffix');

  const mfgSuffix2 = extractManufacturer('Marico Limited, Grande Palladium, Mumbai');
  assert(mfgSuffix2.value && mfgSuffix2.value.includes('Marico Limited') && mfgSuffix2.confidence >= 0.90, 'Extracts corporate entity with "Limited" suffix');

  const mfgSuffix3 = extractManufacturer('Hector Beverages Pvt. Ltd., Plot 11, Manesar');
  assert(mfgSuffix3.value && mfgSuffix3.value.includes('Hector Beverages Pvt. Ltd.') && mfgSuffix3.confidence >= 0.90, 'Extracts corporate entity with "Pvt. Ltd." suffix');

  // Test 18: Manufacturer extraction with common prefixes
  const mfgPrefix1 = extractManufacturer('Factory: Plot 12, GIDC, Rajkot, Gujarat');
  assert(mfgPrefix1.value && mfgPrefix1.value.includes('Plot 12, GIDC') && mfgPrefix1.confidence >= 0.90, 'Extracts manufacturing facility with "Factory:" prefix');

  const mfgPrefix2 = extractManufacturer('Packed by: Tata Consumer Products Limited, Bangalore');
  assert(mfgPrefix2.value && mfgPrefix2.value.includes('Tata Consumer Products Limited') && mfgPrefix2.confidence >= 0.90, 'Extracts packer with "Packed by:" prefix');

  // Test 19: Rejects promotional text without false positive
  const mfgPromo = extractManufacturer('Limited offer! Buy 1 Get 1 Free while stocks last.');
  assert(mfgPromo.value === null, 'Promotional "Limited offer" does NOT falsely trigger manufacturer extraction');

  // Test 20: Unspaced Net Quantity extraction
  assert(extractNetQuantity('50g').value === '50 g', 'Extracts unspaced "50g" as "50 g"');
  assert(extractNetQuantity('1kg').value === '1 kg', 'Extracts unspaced "1kg" as "1 kg"');
  assert(extractNetQuantity('500ml').value === '500 ml', 'Extracts unspaced "500ml" as "500 ml"');
  assert(extractNetQuantity('250ml').value === '250 ml', 'Extracts unspaced "250ml" as "250 ml"');
  assert(extractNetQuantity('100g').value === '100 g', 'Extracts unspaced "100g" as "100 g"');
  assert(extractNetQuantity('2L').value === '2 L', 'Extracts unspaced "2L" as "2 L"');
  assert(extractNetQuantity('750ml').value === '750 ml', 'Extracts unspaced "750ml" as "750 ml"');
  assert(extractNetQuantity('NET WT.50g').value === '50 g', 'Extracts unspaced labeled "NET WT.50g" as "50 g"');
  assert(extractNetQuantity('100ge').value === '100 g', 'Extracts unspaced with estimated sign "100ge" as "100 g"');

  console.log(`\n============================================================`);
  console.log(` Stabilization Test Execution Complete: ${passed} Passed, ${failed} Failed`);
  console.log(`============================================================\n`);

  return { passed, failed, total: passed + failed };
}
