// ============================================================
// NetQ Check — Visual Evidence Side Panel
// Context details side panel for active visual evidence verification
// ============================================================

import React from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { FileText, ShieldCheck, ChevronLeft, ChevronRight, Layers, Eye } from 'lucide-react';

export default function EvidencePanel({ activeEvidence, onPrev, onNext, hasPrev, hasNext }) {
  if (!activeEvidence) {
    return (
      <div className="p-6 text-center text-slate-500 text-xs">
        Select a compliance requirement to inspect visual evidence.
      </div>
    );
  }

  const {
    requirementName = 'Requirement Check',
    extractedValue = '—',
    normalizedValue = '—',
    confidence = 0.95,
    sourceLabel = 'Front Label',
    status = 'PASS',
    ruleReference = 'LM (PC) Rules, 2011',
    reason = 'Declaration detected on label',
  } = activeEvidence;

  return (
    <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col justify-between h-full space-y-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
              Visual Evidence Inspector
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">{requirementName}</h3>
          </div>
          <StatusBadge status={status} size="sm" />
        </div>

        {/* Declaration Values */}
        <div className="space-y-2 bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Detected Value</span>
            <div className="font-mono text-sm font-bold text-teal-300 mt-0.5">{extractedValue || 'Not Detected'}</div>
          </div>
          {normalizedValue && normalizedValue !== extractedValue && (
            <div className="pt-2 border-t border-slate-900">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Normalized Value</span>
              <div className="font-mono text-xs font-semibold text-slate-200 mt-0.5">{normalizedValue}</div>
            </div>
          )}
        </div>

        {/* Evidence Source Details */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Confidence Score</span>
            <span className={`font-bold font-mono ${
              confidence >= 0.85 ? 'text-emerald-400' : confidence >= 0.6 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {Math.round(confidence * 100)}%
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Source Image</span>
            <span className="font-semibold text-slate-200">{sourceLabel}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Legal Rule Reference</span>
            <span className="font-mono text-[11px] text-teal-300">{ruleReference}</span>
          </div>
        </div>

        {/* Legal Reason / Remarks */}
        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
          <strong className="text-slate-200 block mb-0.5">Assessment Notes:</strong>
          {reason}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="btn btn-secondary btn-sm text-xs text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <span className="text-[11px] text-slate-400 font-mono">Evidence Nav</span>

        <button
          onClick={onNext}
          disabled={!hasNext}
          className="btn btn-secondary btn-sm text-xs text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
