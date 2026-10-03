// ============================================================
// NetQ Check — Phase 4 Comprehensive Automated Test Suite
// Verifies Repositories, Product Matcher, RBAC Auth, Audit Logging & Analytics
// ============================================================

import { loginUser, getCurrentUser, logoutUser, hasRole, ROLES } from '../auth/authService.js';
import { recordAuditLog, queryAuditLogs, getAuditLogs } from '../audit/auditService.js';
import { getAllProducts, getProductById, saveProduct } from '../repositories/productRepository.js';
import { getAllScans, getScanById, createScan } from '../repositories/scanRepository.js';
import { getAllAssessments, saveAssessment } from '../repositories/assessmentRepository.js';
import { findMatchingProducts } from '../products/productMatcher.js';
import { getDashboardMetrics } from '../analytics/dashboardAnalyticsService.js';

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

export async function runPhase4TestSuite() {
  console.log('\n============================================================');
  console.log(' NetQ Check — Phase 4 Test Suite Execution');
  console.log('============================================================\n');

  // 1. Authentication & RBAC Tests
  console.log('[1] Testing Authentication & Role-Based Access Control (RBAC)');
  const inspector = await loginUser('inspector@netqcheck.gov.in', 'password123');
  assert(inspector && inspector.role === ROLES.INSPECTOR, 'Inspector login succeeds and assigns INSPECTOR role');
  assert(hasRole(inspector, ROLES.INSPECTOR), 'Inspector has INSPECTOR permission');
  assert(!hasRole(inspector, ROLES.ADMIN), 'Inspector does NOT have ADMIN permission');

  const admin = await loginUser('admin@netqcheck.gov.in', 'password123');
  assert(admin && admin.role === ROLES.ADMIN, 'Admin login succeeds and assigns ADMIN role');
  assert(hasRole(admin, ROLES.INSPECTOR) && hasRole(admin, ROLES.ADMIN), 'Admin bypasses all role checks');

  // 2. Audit Trail Logging Tests
  console.log('\n[2] Testing Statutory Audit Trail Service');
  const audit = recordAuditLog('SCAN_CREATED', 'SCAN', 'SCN-TEST-101', { category: 'PACKAGED_FOOD' }, inspector);
  assert(audit && audit.auditId.startsWith('AUD-'), 'Audit log generated with valid ID format');
  assert(audit.action === 'SCAN_CREATED', 'Audit log records correct action');
  
  const queried = queryAuditLogs({ action: 'SCAN_CREATED' });
  assert(queried.some(q => q.entityId === 'SCN-TEST-101'), 'Audit log query retrieves recorded action');

  // 3. Product Repository & Matching Engine Tests
  console.log('\n[3] Testing Product Catalog Repository & Product Matcher');
  const initialProducts = getAllProducts();
  assert(initialProducts.length > 0, 'Seed products loaded in master repository');

  const matches = findMatchingProducts({
    productName: 'Aashirvaad Whole Wheat Atta 5kg',
    manufacturerName: 'ITC Limited',
    categoryId: 'PACKAGED_FOOD',
  });
  assert(matches.length > 0, 'Product Matcher correctly detects existing product in catalog');
  assert(matches[0].confidence > 0.7, 'Matching confidence score is higher than 70% threshold');
  assert(matches[0].product.productName.includes('Aashirvaad'), 'Matched product name aligns with target');

  // 4. Rescan / Product Persistence Tests
  console.log('\n[4] Testing Rescan & Product Persistence Workflow');
  const savedProd = saveProduct({
    productName: 'Amul Butter 500g',
    categoryId: 'MILK_DAIRY',
    manufacturer: 'GCMMF',
    brand: 'Amul',
    latestStatus: 'COMPLIANT',
  }, inspector);
  assert(savedProd && savedProd.productId.startsWith('PRD-'), 'New master product saved with unique PRD- ID');

  const newScan = createScan({
    productId: savedProd.productId,
    images: ['https://example.com/amul.jpg'],
    category: 'MILK_DAIRY',
    status: 'COMPLIANT',
  }, inspector);
  assert(newScan && newScan.scanId.startsWith('SCN-'), 'New scan record saved with unique SCN- ID');

  const newAssessment = saveAssessment({
    scanId: newScan.scanId,
    productId: savedProd.productId,
    overallStatus: 'COMPLIANT',
    summary: { passedCount: 6, failedCount: 0 },
    ruleSetVersion: 'PC_RULES_2011_V1',
    engineVersion: '3.0.0',
  }, inspector);
  assert(newAssessment && newAssessment.ruleSetVersion === 'PC_RULES_2011_V1', 'Assessment saved with version locking');

  // 5. Dashboard Analytics & Empty State Tests
  console.log('\n[5] Testing Real Database Dashboard Analytics');
  const metrics = getDashboardMetrics();
  assert(metrics.totalProducts >= 3, 'Dashboard metrics count total products accurately');
  assert(metrics.totalInspections >= 3, 'Dashboard metrics count total inspections accurately');
  assert(metrics.recentInspections.length > 0, 'Dashboard returns recent inspection records');

  console.log('\n============================================================');
  console.log(` Test Execution Complete: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  return { passed, failed };
}
