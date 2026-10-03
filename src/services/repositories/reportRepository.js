// ============================================================
// NetQ Check — Report Repository
// Persistent inspection report metadata storage
// ============================================================

import { StorageAdapter } from './storageAdapter.js';
import { recordAuditLog } from '../audit/auditService.js';

const adapter = new StorageAdapter('reports', []);

export function getAllReports() {
  return adapter.getAll();
}

export function getReportById(reportId) {
  return adapter.getById('reportId', reportId);
}

export function getReportByAssessmentId(assessmentId) {
  const all = adapter.getAll();
  return all.find(r => String(r.assessmentId) === String(assessmentId)) || null;
}

export function saveReport(reportData, user = null) {
  const reportId = reportData.reportId || `RPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const record = {
    reportId,
    assessmentId: reportData.assessmentId,
    scanId: reportData.scanId,
    productId: reportData.productId,
    generatedBy: user?.displayName || user?.email || reportData.generatedBy || 'Inspector',
    generatedById: user?.uid || reportData.generatedById || 'USR-ANON',
    title: reportData.title || `Compliance Inspection Report ${reportId}`,
    createdAt: new Date().toISOString(),
    pdfUrl: reportData.pdfUrl || null,
  };

  const saved = adapter.save(record, 'reportId');

  recordAuditLog('REPORT_GENERATED', 'REPORT', saved.reportId, {
    assessmentId: saved.assessmentId,
    scanId: saved.scanId,
  }, user);

  return saved;
}
