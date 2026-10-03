// ============================================================
// NetQ Check — Multi-Image Gallery Component
// Gallery view displaying Front, Back, Side label images with quality, OCR & barcode badges
// ============================================================

import React, { useState } from 'react';
import { Camera, Eye, Trash2, RefreshCw, CheckCircle, AlertTriangle, QrCode, Sparkles, Layers } from 'lucide-react';

export default function ImageGallery({ images = [], onRemove, onReplace, onAddMore }) {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-700" />
          Product Label Image Gallery ({images.length})
        </h3>

        {onAddMore && (
          <button
            onClick={onAddMore}
            className="btn btn-secondary btn-sm text-xs text-teal-700 font-semibold"
          >
            + Add Label Image
          </button>
        )}
      </div>

      {images.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
          <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No label images uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {images.map((img, idx) => {
            const qualityScore = img.qualityScore || img.quality?.score || 85;
            const qualityText = img.qualityStatus || img.quality?.quality || 'GOOD';
            const barcodeDetected = img.barcodeResult?.detected || false;

            return (
              <div
                key={img.imageId || idx}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group"
              >
                <div>
                  {/* Thumbnail Container */}
                  <div className="relative w-full h-36 bg-slate-950 rounded-lg overflow-hidden mb-3 border border-slate-800 flex items-center justify-center">
                    <img
                      src={img.url || img.preview}
                      alt={img.fileName || img.imageType}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Label Badge */}
                    <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-white border border-slate-700">
                      {img.imageType || 'Front Label'}
                    </div>

                    {/* Action buttons overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedImage(img)}
                        className="p-2 bg-white text-slate-900 rounded-full hover:bg-teal-50 shadow"
                        title="Fullscreen Preview"
                      >
                        <Eye className="w-4 h-4 text-teal-700" />
                      </button>
                      {onRemove && (
                        <button
                          onClick={() => onRemove(img.imageId || idx)}
                          className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 shadow"
                          title="Remove Image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata & Status */}
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {img.fileName || `Label #${idx + 1}`}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500">Quality Score:</span>
                      <span className={`font-semibold ${
                        qualityScore >= 80 ? 'text-teal-700' : qualityScore >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {qualityText} ({qualityScore}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Barcode / QR:</span>
                      <span className={`font-semibold flex items-center gap-1 ${
                        barcodeDetected ? 'text-teal-700' : 'text-slate-400'
                      }`}>
                        <QrCode className="w-3 h-3" />
                        {barcodeDetected ? img.barcodeResult.type || 'Detected' : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white font-bold text-sm bg-slate-800 px-3 py-1 rounded"
            >
              Close ✕
            </button>
            <img
              src={selectedImage.url || selectedImage.preview}
              alt="Fullscreen Preview"
              className="max-h-[80vh] w-auto rounded-lg shadow-2xl border border-slate-700"
            />
          </div>
        </div>
      )}
    </div>
  );
}
