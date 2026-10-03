// ============================================================
// NetQ Check — Assessment Repository
// Persistent compliance assessment outcome repository (reproducible)
// ============================================================

import { StorageAdapter } from './storageAdapter.js';
import { recordAuditLog } from '../audit/auditService.js';

export const SEED_ASSESSMENTS = [
  {
    assessmentId: 'ASM-20261001-001',
    scanId: 'SCN-20261001-001',
    productId: 'PRD-FOOD-001',
    userId: 'USR-INSP-01',
    overallStatus: 'COMPLIANT',
    summary: { totalChecks: 8, passedCount: 8, failedCount: 0, reviewCount: 0, complianceScore: 100 },
    checks: [
      { checkId: 'CHK-01', ruleId: 'RULE-MANUFACTURER-01', ruleName: 'Name & Address of Manufacturer / Packer', status: 'PASS', score: 100 },
      { checkId: 'CHK-02', ruleId: 'RULE-NETQTY-01', ruleName: 'Net Quantity Declaration with Standard Unit', status: 'PASS', score: 100 },
      { checkId: 'CHK-03', ruleId: 'RULE-MRP-01', ruleName: 'Maximum Retail Price (MRP) Declaration', status: 'PASS', score: 100 },
      { checkId: 'CHK-04', ruleId: 'RULE-DATE-01', ruleName: 'Date of Manufacture / Packing / Import', status: 'PASS', score: 100 },
      { checkId: 'CHK-05', ruleId: 'RULE-COUNTRY-01', ruleName: 'Country of Origin Declaration', status: 'PASS', score: 100 },
      { checkId: 'CHK-06', ruleId: 'RULE-CCARE-01', ruleName: 'Consumer Care Contact Information', status: 'PASS', score: 100 },
    ],
    issues: [],
    reviewItems: [],
    ruleSetVersion: 'PC_RULES_2011_V1',
    engineVersion: '3.0.0',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    assessmentId: 'ASM-20261002-002',
    scanId: 'SCN-20261002-002',
    productId: 'PRD-MILK-002',
    userId: 'USR-INSP-01',
    overallStatus: 'NEEDS_REVIEW',
    summary: { totalChecks: 8, passedCount: 6, failedCount: 0, reviewCount: 2, complianceScore: 75 },
    checks: [
      { checkId: 'CHK-01', ruleId: 'RULE-MANUFACTURER-01', ruleName: 'Name & Address of Manufacturer / Packer', status: 'PASS', score: 100 },
      { checkId: 'CHK-02', ruleId: 'RULE-NETQTY-01', ruleName: 'Net Quantity Declaration', status: 'PASS', score: 100 },
      { checkId: 'CHK-03', ruleId: 'RULE-MRP-01', ruleName: 'MRP Declaration', status: 'PASS', score: 100 },
      { checkId: 'CHK-04', ruleId: 'RULE-UNITPRICE-01', ruleName: 'Unit Sale Price Declaration', status: 'NEEDS_REVIEW', score: 50 },
    ],
    issues: [],
    reviewItems: ['Unit sale price font height verification required'],
    ruleSetVersion: 'PC_RULES_2011_V1',
    engineVersion: '3.0.0',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    assessmentId: 'ASM-20261003-003',
    scanId: 'SCN-20261003-003',
    productId: 'PRD-COSM-003',
    userId: 'USR-SUP-01',
    overallStatus: 'NON_COMPLIANT',
    summary: { totalChecks: 8, passedCount: 4, failedCount: 2, reviewCount: 2, complianceScore: 50 },
    checks: [
      { checkId: 'CHK-01', ruleId: 'RULE-MANUFACTURER-01', ruleName: 'Name & Address of Manufacturer', status: 'PASS', score: 100 },
      { checkId: 'CHK-02', ruleId: 'RULE-COUNTRY-01', ruleName: 'Country of Origin Declaration', status: 'FAIL', score: 0 },
      { checkId: 'CHK-03', ruleId: 'RULE-CCARE-01', ruleName: 'Consumer Care Contact Details', status: 'FAIL', score: 0 },
    ],
    issues: ['Missing Country of Origin on imported cosmetic', 'Missing Consumer Helpline email address'],
    reviewItems: [],
    ruleSetVersion: 'PC_RULES_2011_V1',
    engineVersion: '3.0.0',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

const adapter = new StorageAdapter('assessments', SEED_ASSESSMENTS);

export function getAllAssessments() {
  return adapter.getAll();
}

export function getAssessmentById(assessmentId) {
  return adapter.getById('assessmentId', assessmentId);
}

export function getAssessmentByScanId(scanId) {
  const all = adapter.getAll();
  return all.find(a => String(a.scanId) === String(scanId)) || null;
}

export function saveAssessment(assessmentData, user = null) {
  const id = assessmentData.assessmentId || `ASM-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random() * 9000 + 1000)}`;

  const record = {
    assessmentId: id,
    scanId: assessmentData.scanId || null,
    productId: assessmentData.productId || null,
    userId: user?.uid || assessmentData.userId || 'USR-ANON',
    overallStatus: assessmentData.overallStatus || 'PENDING',
    summary: assessmentData.summary || {},
    checks: assessmentData.checks || [],
    issues: assessmentData.issues || [],
    reviewItems: assessmentData.reviewItems || [],
    ruleSetVersion: assessmentData.ruleSetVersion || 'PC_RULES_2011_V1',
    engineVersion: assessmentData.engineVersion || '3.0.0',
    createdAt: assessmentData.createdAt || new Date().toISOString(),
  };

  const saved = adapter.save(record, 'assessmentId');

  recordAuditLog('ASSESSMENT_CREATED', 'ASSESSMENT', saved.assessmentId, {
    scanId: saved.scanId,
    overallStatus: saved.overallStatus,
    ruleSetVersion: saved.ruleSetVersion,
  }, user);

  return saved;
}
