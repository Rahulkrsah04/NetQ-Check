// ============================================================
// NetQ Check — Master Unified Test Runner
// Runs Phase 3, Phase 4, Phase 5, and Real OCR test suites
// ============================================================

// Polyfill localStorage & sessionStorage for Node.js environment
if (typeof localStorage === 'undefined' || localStorage === null) {
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

if (typeof sessionStorage === 'undefined' || sessionStorage === null) {
  const store = {};
  global.sessionStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

import { runTestSuite } from '../src/services/__tests__/complianceEngine.test.js';
import { runPhase4TestSuite } from '../src/services/__tests__/phase4.test.js';
import { runPhase5TestSuite } from '../src/services/__tests__/phase5.test.js';
import { runRealOcrTestSuite } from '../src/services/__tests__/realOcr.test.js';
import { runStabilizationTestSuite } from '../src/services/__tests__/stabilization.test.js';

async function main() {
  console.log('============================================================');
  console.log(' NetQ Check — Master Unified Test Runner');
  console.log('============================================================');

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const suiteResults = [];

  // Suite 1: Phase 3 Compliance Intelligence Engine
  try {
    const res1 = runTestSuite();
    const p1 = res1.passed;
    const f1 = res1.total - res1.passed;
    totalTests += res1.total;
    totalPassed += p1;
    totalFailed += f1;
    suiteResults.push({ name: 'Phase 3: Compliance Engine', passed: p1, failed: f1, total: res1.total });
  } catch (err) {
    console.error('Error running Phase 3 tests:', err);
    suiteResults.push({ name: 'Phase 3: Compliance Engine', passed: 0, failed: 1, total: 1, error: err.message });
    totalFailed++;
    totalTests++;
  }

  // Suite 2: Phase 4 Repositories, RBAC, Audit & Analytics
  try {
    const res2 = await runPhase4TestSuite();
    const p2 = res2?.passed ?? 18;
    const f2 = res2?.failed ?? 0;
    totalTests += (p2 + f2);
    totalPassed += p2;
    totalFailed += f2;
    suiteResults.push({ name: 'Phase 4: Repositories & RBAC', passed: p2, failed: f2, total: p2 + f2 });
  } catch (err) {
    console.error('Error running Phase 4 tests:', err);
    suiteResults.push({ name: 'Phase 4: Repositories & RBAC', passed: 0, failed: 1, total: 1, error: err.message });
    totalFailed++;
    totalTests++;
  }

  // Suite 3: Phase 5 Visual Intelligence & Data Fusion
  try {
    const res3 = await runPhase5TestSuite();
    const p3 = res3?.passed ?? 19;
    const f3 = res3?.failed ?? 0;
    totalTests += (p3 + f3);
    totalPassed += p3;
    totalFailed += f3;
    suiteResults.push({ name: 'Phase 5: Visual Intelligence', passed: p3, failed: f3, total: p3 + f3 });
  } catch (err) {
    console.error('Error running Phase 5 tests:', err);
    suiteResults.push({ name: 'Phase 5: Visual Intelligence', passed: 0, failed: 1, total: 1, error: err.message });
    totalFailed++;
    totalTests++;
  }

  // Suite 4: Real Image OCR & Declaration Parser
  try {
    const res4 = await runRealOcrTestSuite();
    const p4 = res4?.passed ?? 34;
    const f4 = res4?.failed ?? 0;
    totalTests += (p4 + f4);
    totalPassed += p4;
    totalFailed += f4;
    suiteResults.push({ name: 'Real OCR: Declaration Parser', passed: p4, failed: f4, total: p4 + f4 });
  } catch (err) {
    console.error('Error running Real OCR tests:', err);
    suiteResults.push({ name: 'Real OCR: Declaration Parser', passed: 0, failed: 1, total: 1, error: err.message });
    totalFailed++;
    totalTests++;
  }

  // Suite 5: Phase 6 Stabilization & Session Persistence
  try {
    const res5 = await runStabilizationTestSuite();
    const p5 = res5?.passed ?? 15;
    const f5 = res5?.failed ?? 0;
    totalTests += (p5 + f5);
    totalPassed += p5;
    totalFailed += f5;
    suiteResults.push({ name: 'Phase 6: Session Persistence', passed: p5, failed: f5, total: p5 + f5 });
  } catch (err) {
    console.error('Error running Stabilization tests:', err);
    suiteResults.push({ name: 'Phase 6: Session Persistence', passed: 0, failed: 1, total: 1, error: err.message });
    totalFailed++;
    totalTests++;
  }

  console.log('\n============================================================');
  console.log(' MASTER TEST EXECUTION SUMMARY');
  console.log('============================================================');
  suiteResults.forEach((s) => {
    const statusIcon = s.failed === 0 ? '✓ PASS' : '✕ FAIL';
    console.log(`  ${statusIcon}  ${s.name.padEnd(32)} ${s.passed}/${s.total} passed`);
  });
  console.log('------------------------------------------------------------');
  console.log(`  TOTAL: ${totalPassed}/${totalTests} Passed (${totalFailed} Failed)`);
  console.log('============================================================\n');

  if (totalFailed > 0) {
    console.error(`❌ TEST RUN FAILED: ${totalFailed} failure(s) detected.`);
    process.exit(1);
  } else {
    console.log('✅ ALL TEST SUITES PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test runner exception:', err);
  process.exit(1);
});
