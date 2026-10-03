// ============================================================
// NetQ Check — Image Canvas & Visual Evidence Viewer
// Interactive image view container with Zoom, Pan and Bounding Box overlays
// ============================================================

import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import BoundingBox from './BoundingBox';

export default function ImageCanvas({ imageUrl, boundingBox, fieldLabel, confidence, status, imageLabel = 'Product Label' }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.3, 0.8));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-[400px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 select-none">
      {/* Top Bar Controls */}
      <div className="absolute top-3 left-3 z-20 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-lg border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2">
        <span>{imageLabel}</span>
        <span className="text-[10px] text-teal-400 bg-teal-950 px-1.5 py-0.5 rounded border border-teal-800">
          Visual Evidence Mode
        </span>
      </div>

      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur p-1 rounded-lg border border-slate-700">
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-slate-800 text-slate-300 rounded transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-slate-800 text-slate-300 rounded transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-slate-800 text-slate-300 rounded transition"
          title="Reset Zoom & Pan"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Image & Overlay Canvas Container */}
      <div
        className="relative transition-transform duration-200 ease-out flex items-center justify-center max-w-full max-h-full p-4"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        {imageUrl ? (
          <div className="relative inline-block max-w-full max-h-[350px]">
            <img
              src={imageUrl}
              alt="Label Evidence"
              className="max-h-[340px] w-auto object-contain rounded border border-slate-800 shadow-2xl"
            />

            {/* Bounding Box Overlay */}
            {boundingBox && (
              <BoundingBox
                box={boundingBox}
                fieldLabel={fieldLabel}
                confidence={confidence}
                status={status}
              />
            )}
          </div>
        ) : (
          <div className="text-slate-500 text-xs">No image preview available</div>
        )}
      </div>
    </div>
  );
}
