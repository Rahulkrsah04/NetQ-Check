import { runTestSuite } from '../src/services/__tests__/complianceEngine.test.js';

try {
  const result = runTestSuite();
  if (result.passed === result.total) {
    console.log('\n✅ ALL UNIT TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('\n❌ SOME UNIT TESTS FAILED!');
    process.exit(1);
  }
} catch (err) {
  console.error('\n❌ TEST RUNNER EXCEPTION:', err);
  process.exit(1);
}
