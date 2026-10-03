// ============================================================
// NetQ Check — Statutory Audit Trail Log Viewer
// Full system audit log viewing & filtering for ADMIN and SUPERVISOR roles
// ============================================================

import React, { useState } from 'react';
import { queryAuditLogs } from '../services/audit/auditService';
import { ScrollText, Search, Filter, ShieldCheck, UserCheck, Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';

const ACTIONS = [
  'ALL',
  'LOGIN',
  'LOGOUT',
  'ROLE_SWITCHED',
  'SCAN_CREATED',
  'OCR_COMPLETED',
  'DATA_EDITED',
  'ASSESSMENT_CREATED',
  'REPORT_GENERATED',
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
];

export default function AuditLogPage() {
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntityType, setSelectedEntityType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const logs = queryAuditLogs({
    action: selectedAction,
    entityType: selectedEntityType,
    search: searchQuery,
  });

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-0.5">
            Security & Statutory Compliance
          </div>
          <h1 className="page-title flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-teal-700" />
            Audit Trail Logs
          </h1>
          <p className="page-desc">Immutable statutory activity logs for system operations and inspector actions</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 text-teal-900 font-mono text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-700" />
          {logs.length} Total Audit Record(s)
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Audit ID, User, Action or Entity ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="form-input text-xs font-medium text-slate-700 py-1.5"
            >
              <option value="ALL">All Actions</option>
              {ACTIONS.filter(a => a !== 'ALL').map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>

            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="form-input text-xs font-medium text-slate-700 py-1.5"
            >
              <option value="ALL">All Entity Types</option>
              <option value="USER">USER</option>
              <option value="PRODUCT">PRODUCT</option>
              <option value="SCAN">SCAN</option>
              <option value="ASSESSMENT">ASSESSMENT</option>
              <option value="REPORT">REPORT</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="card">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800 text-base">No Audit Records Found</h3>
            <p className="text-slate-500 text-xs mt-1">No log entries matched your filter parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Timestamp</th>
                  <th>User / Role</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Entity ID</th>
                  <th>Metadata Context</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.auditId} className="hover:bg-slate-50/70">
                    <td className="font-mono text-teal-800 font-bold text-[11px]">{log.auditId}</td>
                    <td className="text-slate-600 font-mono text-[11px]">
                      {format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm:ss')}
                    </td>
                    <td>
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <div className="text-[10px] text-teal-700 font-semibold">{log.userRole}</div>
                    </td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                        log.action.includes('CREATED') || log.action === 'LOGIN' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                        log.action.includes('LOGOUT') ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono font-semibold text-slate-700">{log.entityType}</span>
                    </td>
                    <td>
                      <span className="font-mono text-slate-600 text-[11px]">{log.entityId}</span>
                    </td>
                    <td>
                      <pre className="text-[10px] font-mono text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 max-w-[260px] truncate">
                        {JSON.stringify(log.metadata)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
