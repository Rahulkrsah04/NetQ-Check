// ============================================================
// NetQ Check — Audit Logging Service
// Persistent audit trail for compliance, system security & inspector actions
// ============================================================

import { getCurrentUser } from '../auth/authService.js';

const AUDIT_STORAGE_KEY = 'netq_audit_logs_v4';

/**
 * Get all audit log records from persistent storage
 */
export function getAuditLogs() {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : getSeedAuditLogs();
  } catch (err) {
    console.error('Failed to read audit logs:', err);
    return [];
  }
}

/**
 * Record a new audit log event
 * @param {string} action - Event action type (LOGIN, SCAN_CREATED, ASSESSMENT_CREATED, etc.)
 * @param {string} entityType - Target entity (USER, PRODUCT, SCAN, ASSESSMENT, REPORT, RULE)
 * @param {string} entityId - Target entity ID
 * @param {Object} metadata - Additional context details
 * @param {Object} userOverride - Optional explicit user performing action
 */
export function recordAuditLog(action, entityType, entityId, metadata = {}, userOverride = null) {
  const activeUser = userOverride || getCurrentUser() || {
    uid: 'SYSTEM',
    displayName: 'System Process',
    role: 'SYSTEM',
  };

  const auditRecord = {
    auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: activeUser.uid,
    userName: activeUser.displayName || activeUser.email || 'Anonymous',
    userRole: activeUser.role || 'INSPECTOR',
    action,
    entityType,
    entityId: entityId || 'N/A',
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
  };

  try {
    const logs = getAuditLogs();
    logs.unshift(auditRecord); // latest first
    // Limit log entries to last 1000 for storage sanity
    const trimmed = logs.slice(0, 1000);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }

  return auditRecord;
}

/**
 * Filter audit logs by criteria
 */
export function queryAuditLogs({ action, entityType, userId, search, startDate, endDate }) {
  let logs = getAuditLogs();

  if (action && action !== 'ALL') {
    logs = logs.filter(l => l.action === action);
  }
  if (entityType && entityType !== 'ALL') {
    logs = logs.filter(l => l.entityType === entityType);
  }
  if (userId) {
    logs = logs.filter(l => l.userId === userId);
  }
  if (search) {
    const q = search.toLowerCase();
    logs = logs.filter(
      l =>
        l.auditId.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q)
    );
  }
  if (startDate) {
    logs = logs.filter(l => new Date(l.timestamp) >= new Date(startDate));
  }
  if (endDate) {
    logs = logs.filter(l => new Date(l.timestamp) <= new Date(endDate));
  }

  return logs;
}

/**
 * Seed initial audit records for realistic audit trail
 */
function getSeedAuditLogs() {
  return [
    {
      auditId: 'AUD-1727800000-101',
      userId: 'USR-ADM-01',
      userName: 'Anil Mehta',
      userRole: 'ADMIN',
      action: 'SYSTEM_INIT',
      entityType: 'SYSTEM',
      entityId: 'SYS-01',
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      metadata: { version: 'Phase 4 Inspection Platform' },
    },
    {
      auditId: 'AUD-1727800000-102',
      userId: 'USR-INSP-01',
      userName: 'Raj Kumar',
      userRole: 'INSPECTOR',
      action: 'LOGIN',
      entityType: 'USER',
      entityId: 'USR-INSP-01',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      metadata: { method: 'Badge Credentials' },
    },
    {
      auditId: 'AUD-1727800000-103',
      userId: 'USR-INSP-01',
      userName: 'Raj Kumar',
      userRole: 'INSPECTOR',
      action: 'SCAN_CREATED',
      entityType: 'SCAN',
      entityId: 'SCN-20261001-001',
      timestamp: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(),
      metadata: { category: 'PACKAGED_FOOD', productName: 'Aashirvaad Whole Wheat Atta' },
    },
    {
      auditId: 'AUD-1727800000-104',
      userId: 'USR-INSP-01',
      userName: 'Raj Kumar',
      userRole: 'INSPECTOR',
      action: 'ASSESSMENT_CREATED',
      entityType: 'ASSESSMENT',
      entityId: 'ASM-20261001-001',
      timestamp: new Date(Date.now() - 86400000 * 2 + 2000000).toISOString(),
      metadata: { status: 'COMPLIANT', score: 100 },
    },
  ];
}
