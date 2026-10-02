// ============================================================
// NetQ Check — Compliance Intelligence Engine Unit Tests
// Tests core engine scenarios under Legal Metrology (PC) Rules, 2011
// ============================================================

import { runComplianceCheck } from '../complianceEngine.js';
import { normalizeMRP, normalizeQuantity, normalizeDate } from '../normalization/dataNormalizer.js';
import { getCategoryById, detectCategoryFromText } from '../ruleEngine/productCategories.js';

export function runTestSuite() {
  const testResults = [];

  function assert(condition, message, debugObj = null) {
    if (condition) {
      testResults.push({ pass: true, message });
    } else {
      testResults.push({ pass: false, message });
      console.error(`[FAIL] ${message}`);
      if (debugObj) {
        console.error('DEBUG INFO non-pass checks:', JSON.stringify(debugObj.filter(c => c.status !== 'PASS'), null, 2));
      }
    }
  }

  console.log('=== RUNNING NETQ CHECK PHASE 3 UNIT TESTS ===\n');

  // Test 1: Data Normalization
  const mrpNorm = normalizeMRP('MRP ₹120 (Inclusive of all taxes)');
  assert(mrpNorm.amount === 120 && mrpNorm.hasTaxClause === true, 'MRP Normalization extracts numeric amount & tax clause', mrpNorm);

  const qtyNorm = normalizeQuantity('1000 g');
  assert(qtyNorm.numericValue === 1000 && qtyNorm.standardSI === '1.0 kg', 'Quantity Normalization converts 1000g to 1.0 kg', qtyNorm);

  const dateNorm = normalizeDate('MFG 08/2026');
  assert(dateNorm.normalizedValue === '08/2026' && dateNorm.dateType === 'MFG', 'Date Normalization parses MM/YYYY structure', dateNorm);

  // Test 2: Category Detection
  const foodCat = detectCategoryFromText('Basmati Rice Premium Quality', 'ABC Rice');
  assert(foodCat.id === 'FOOD_GROCERY', 'Category auto-detection detects FOOD_GROCERY from keywords', foodCat);

  // Test 3: Scenario 1 — All Applicable Requirements Pass -> COMPLIANT
  const compliantInput = {
    productName: { value: 'ABC Premium Rice', confidence: 0.95 },
    netQuantity: { value: '5 kg', confidence: 0.95 },
    mrp: { value: '₹350.00 (Inclusive of all taxes)', confidence: 0.95 },
    manufacturer: { value: 'ABC Foods Ltd, Industrial Area, New Delhi 110001', confidence: 0.95 },
    manufactureDate: { value: '08/2026', confidence: 0.90 },
    consumerCare: { value: 'Helpline: 1800-111-2222, email: care@abcfoods.com', confidence: 0.95 },
    unitSalePrice: { value: 'Rs. 70 per kg', confidence: 0.90 },
    batchNumber: { value: 'B.No. 2026-08', confidence: 0.95 },
  };
  const res1 = runComplianceCheck({ extractedData: compliantInput, productCategory: 'FOOD_GROCERY' });
  assert(res1.overallStatus === 'COMPLIANT', `Scenario 1: All applicable requirements pass returns COMPLIANT (got: ${res1.overallStatus})`, res1.checks);

  // Test 4: Scenario 2 — Mandatory Declaration Missing -> NON_COMPLIANT
  const nonCompliantInput = {
    productName: { value: 'FreshGlow Soap', confidence: 0.95 },
    netQuantity: { value: '125 g', confidence: 0.95 },
    mrp: { value: null, confidence: 0 }, // Missing MRP
    manufacturer: { value: 'Glow Cosmetics Pvt Ltd', confidence: 0.90 },
    manufactureDate: { value: '05/2026', confidence: 0.90 },
    consumerCare: { value: null, confidence: 0 }, // Missing Consumer Care
    batchNumber: { value: 'LOT-9921', confidence: 0.90 },
  };
  const res2 = runComplianceCheck({ extractedData: nonCompliantInput, productCategory: 'COSMETICS' });
  assert(res2.overallStatus === 'NON_COMPLIANT', 'Scenario 2: Missing mandatory declaration returns NON_COMPLIANT', res2);
  assert(res2.summary.fail >= 1, 'Scenario 2 counts failed mandatory declarations');

  // Test 5: Scenario 3 — Low OCR Confidence -> NEEDS_REVIEW
  const reviewInput = {
    productName: { value: 'SunPure Oil', confidence: 0.95 },
    netQuantity: { value: '1 L', confidence: 0.90 },
    mrp: { value: '₹190.00', confidence: 0.55 }, // Low confidence
    manufacturer: { value: 'SunPure Oils Ltd', confidence: 0.90 },
    manufactureDate: { value: '04/2026', confidence: 0.60 }, // Low confidence
    consumerCare: { value: '1800-222-3333', confidence: 0.90 },
    batchNumber: { value: 'B.No. 4022', confidence: 0.90 },
  };
  const res3 = runComplianceCheck({ extractedData: reviewInput, productCategory: 'FOOD_GROCERY' });
  assert(res3.overallStatus === 'NEEDS_REVIEW', `Scenario 3: Low OCR confidence returns NEEDS_REVIEW (got: ${res3.overallStatus})`, res3.checks);

  // Test 6: Scenario 4 — Not Applicable Requirement -> NOT_APPLICABLE & Does NOT cause failure
  const domesticInput = {
    productName: { value: 'Standard Domestic Notebook', confidence: 0.95 },
    netQuantity: { value: '100 pcs', confidence: 0.95 },
    mrp: { value: '₹150.00 (Incl. of all taxes)', confidence: 0.95 },
    manufacturer: { value: 'Delhi Paper Mills, Delhi 110006', confidence: 0.95 },
    manufactureDate: { value: '01/2026', confidence: 0.95 },
    consumerCare: { value: '1800-444-5555', confidence: 0.95 },
    countryOfOrigin: { value: null, confidence: 0 }, // Missing, but product is domestic GENERAL_PACKAGED
  };
  const res4 = runComplianceCheck({ extractedData: domesticInput, productCategory: 'GENERAL_PACKAGED' });
  const countryCheck = res4.checks.find(c => c.requirementId === 'REQ_07');
  assert(countryCheck.status === 'NOT_APPLICABLE', 'Scenario 4: Country of Origin for domestic product is marked NOT_APPLICABLE', countryCheck);
  assert(res4.overallStatus === 'COMPLIANT', `Scenario 4: NOT_APPLICABLE requirement does NOT cause failure or reduce status (got: ${res4.overallStatus})`, res4.checks);

  const totalPassed = testResults.filter(r => r.pass).length;
  console.log(`\n=== UNIT TEST SUMMARY: ${totalPassed}/${testResults.length} PASSED ===`);
  return { total: testResults.length, passed: totalPassed, results: testResults };
}
