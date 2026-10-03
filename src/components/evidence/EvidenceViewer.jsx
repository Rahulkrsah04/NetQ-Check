// ============================================================
// NetQ Check — Visual Evidence Viewer Modal Component
// Full-screen interactive modal combining Image Canvas and Evidence Side Panel
// ============================================================

import React, { useState } from 'react';
import { X, Eye, ShieldCheck, Layers, FileCheck } from 'lucide-react';
import ImageCanvas from './ImageCanvas';
import EvidencePanel from './EvidencePanel';

export default function EvidenceViewer({ isOpen, onClose, evidenceList = [], initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!isOpen || evidenceList.length === 0) return null;

  const currentItem = evidenceList[currentIndex] || evidenceList[0];

  const handlePrev = () => setCurrentIndex(prev => Math.max(0, prev - 1));
  const handleNext = () => setCurrentIndex(prev => Math.min(evidenceList.length - 1, prev + 1));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-950 text-teal-400 rounded-lg border border-teal-800">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Visual Evidence Verification
                <span className="text-xs font-mono font-normal text-slate-400">
                  ({currentIndex + 1} of {evidenceList.length})
                </span>
              </h2>
              <p className="text-xs text-slate-400">Inspection evidence mapping under LM (PC) Rules, 2011</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close evidence viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Canvas (Left) + Evidence Panel (Right) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image Canvas */}
          <div className="lg:col-span-2">
            <ImageCanvas
              imageUrl={currentItem.imageUrl || currentItem.evidence?.imageUrl}
              boundingBox={currentItem.boundingBox || currentItem.evidence?.boundingBox}
              fieldLabel={currentItem.requirementName || currentItem.fieldLabel || 'Declaration'}
              confidence={currentItem.confidence}
              status={currentItem.status}
              imageLabel={currentItem.sourceLabel || currentItem.evidence?.imageType || 'Product Label'}
            />
          </div>

          {/* Side Details Panel */}
          <div className="lg:col-span-1">
            <EvidencePanel
              activeEvidence={currentItem}
              onPrev={handlePrev}
              onNext={handleNext}
              hasPrev={currentIndex > 0}
              hasNext={currentIndex < evidenceList.length - 1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
