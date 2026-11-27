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

  console.log(`\n============================================================`);
  console.log(` Stabilization Test Execution Complete: ${passed} Passed, ${failed} Failed`);
  console.log(`============================================================\n`);

  return { passed, failed, total: passed + failed };
}
