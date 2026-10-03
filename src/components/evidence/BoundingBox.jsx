// ============================================================
// NetQ Check — Bounding Box Overlay Component
// Visual bounding box overlay displaying detected text region
// ============================================================

import React from 'react';

export default function BoundingBox({ box, fieldLabel, confidence, status = 'PASS' }) {
  if (!box) return null;

  const { x = 10, y = 10, width = 50, height = 15 } = box;

  // Determine color scheme based on status
  const borderColor = status === 'FAIL' ? 'border-red-500 bg-red-500/15' :
                    status === 'NEEDS_REVIEW' ? 'border-amber-500 bg-amber-500/15' :
                    'border-teal-500 bg-teal-500/15';

  const badgeColor = status === 'FAIL' ? 'bg-red-600 text-white' :
                   status === 'NEEDS_REVIEW' ? 'bg-amber-600 text-white' :
                   'bg-teal-700 text-white';

  return (
    <div
      className={`absolute border-2 rounded shadow-lg transition-all duration-300 pointer-events-auto group ${borderColor}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
    >
      {/* Label Badge */}
      <div className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold shadow-md whitespace-nowrap flex items-center gap-1 ${badgeColor}`}>
        <span>{fieldLabel}</span>
        {confidence > 0 && <span className="opacity-80">({Math.round(confidence * 100)}%)</span>}
      </div>

      {/* Pulse effect */}
      <div className="absolute inset-0 border border-white/60 rounded animate-pulse" />
    </div>
  );
}
