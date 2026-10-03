// ============================================================
// NetQ Check — Inspection Comparison Modal Component
// Objective diff comparison modal between current inspection and historical baseline
// ============================================================

import React from 'react';
import { X, ArrowRightLeft, CheckCircle2, AlertTriangle, HelpCircle, History } from 'lucide-react';
import { compareScans } from '../../services/comparison/scanComparisonService';

export default function ScanComparisonModal({ isOpen, onClose, currentScan, previousScan }) {
  if (!isOpen || !currentScan || !previousScan) return null;

  const diffs = compareScans(currentScan, previousScan);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400 rounded-lg border border-teal-200 dark:border-teal-800">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Inspection Comparison Analysis
              </h2>
              <p className="text-xs text-slate-500">
                Comparing Current Scan (<span className="font-mono text-teal-700">{currentScan.scanId}</span>) vs Baseline Scan (<span className="font-mono text-slate-700">{previousScan.scanId}</span>)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diff Table Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="alert alert-info text-xs">
            <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>
              This comparison reports observed differences between inspection label scans objectively. It does not infer whether changes are legally permissible.
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Declaration Requirement</th>
                  <th>Baseline Scan ({previousScan.scanId})</th>
                  <th>Current Scan ({currentScan.scanId})</th>
                  <th>Difference Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((diff) => (
                  <tr key={diff.fieldKey} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="font-bold text-slate-900 dark:text-white">{diff.fieldName}</td>
                    <td className="font-mono text-slate-600 dark:text-slate-300">{diff.previousValue}</td>
                    <td className="font-mono text-teal-800 dark:text-teal-300 font-semibold">{diff.currentValue}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                        diff.status === 'UNCHANGED' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        diff.status === 'CHANGED' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                        diff.status === 'NEW' ? 'bg-teal-50 text-teal-800 border-teal-300' :
                        'bg-red-50 text-red-800 border-red-300'
                      }`}>
                        {diff.status}
                      </span>
                    </td>
                    <td className="text-[11px] text-slate-500 max-w-[220px]">{diff.summaryText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
