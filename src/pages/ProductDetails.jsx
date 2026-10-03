// ============================================================
// NetQ Check — Product Details & Inspection Timeline Page
// Displays master product details and complete scan history timeline
// ============================================================

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductById } from '../services/repositories/productRepository';
import { getScansByProductId } from '../services/repositories/scanRepository';
import { getAssessmentByScanId } from '../services/repositories/assessmentRepository';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ArrowLeft, Package, Calendar, Layers, Factory, History, FileText, ChevronRight, AlertCircle, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ProductDetails() {
  const { id } = useParams();
  const product = getProductById(id);
  const scans = getScansByProductId(id);

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Product Not Found</h3>
          <p className="text-slate-500 text-sm mt-1 mb-4">No master product entry was found with ID: {id}</p>
          <Link to="/products" className="btn btn-primary">
            Back to Products Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/products" className="btn btn-secondary btn-sm">
            <ArrowLeft className="w-4 h-4" />
            Products
          </Link>
          <div>
            <h1 className="page-title">{product.productName}</h1>
            <p className="page-desc">Product Master ID: <span className="font-mono font-semibold text-slate-700">{product.productId}</span></p>
          </div>
        </div>
        <Link to="/scan" className="btn btn-primary btn-sm flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4" />
          New Inspection Scan
        </Link>
      </div>

      {/* Product Overview Card */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden flex-shrink-0">
            {product.image ? (
              <img src={product.image} alt={product.productName} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-12 h-12 text-slate-400" />
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200 uppercase tracking-wide">
                  {product.categoryId}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{product.productName}</h2>
                <p className="text-xs text-slate-500">{product.genericName}</p>
              </div>
              <StatusBadge status={product.latestStatus || 'COMPLIANT'} size="lg" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Factory className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Manufacturer</div>
                  <div className="font-semibold text-slate-800">{product.manufacturer || 'N/A'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Last Scanned Date</div>
                  <div className="font-semibold text-slate-800">
                    {product.lastScannedAt ? format(new Date(product.lastScannedAt), 'dd MMM yyyy, HH:mm') : 'Never'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <History className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total Inspections</div>
                  <div className="font-bold text-teal-700 text-sm">{scans.length || product.totalScans || 0} Scans</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inspection History Timeline */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="section-title text-base mb-0">Inspection Timeline</h2>
            <p className="text-xs text-slate-500">Historical compliance assessments recorded for this commodity</p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 px-3 py-1 rounded-full text-slate-700">
            {scans.length} Record(s)
          </span>
        </div>

        {scans.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No Historical Scans</h4>
            <p className="text-xs text-slate-500 mt-1">This product catalog entry has no recorded inspection scans yet.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {scans.map((scan, idx) => {
              const assessment = getAssessmentByScanId(scan.scanId);
              const status = assessment?.overallStatus || scan.status;

              return (
                <div key={scan.scanId} className="relative group">
                  {/* Timeline dot */}
                  <div className={`absolute -left-[1.625rem] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-2 ${
                    status === 'COMPLIANT' ? 'bg-emerald-500 ring-emerald-200' :
                    status === 'NON_COMPLIANT' ? 'bg-red-500 ring-red-200' : 'bg-amber-500 ring-amber-200'
                  }`} />

                  <div className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          Scan #{String(scans.length - idx).padStart(3, '0')}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          [{scan.scanId}]
                        </span>
                        <StatusBadge status={status} size="sm" />
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                        <span>Inspector: <strong className="text-slate-800">{scan.userName || 'Raj Kumar'}</strong></span>
                        <span>Date: <strong>{format(new Date(scan.createdAt), 'dd MMM yyyy, HH:mm')}</strong></span>
                        <span>Ruleset: <code className="text-teal-700 bg-teal-50 px-1 rounded">{scan.ruleSetVersion || 'PC_RULES_2011_V1'}</code></span>
                      </div>

                      {assessment?.summary && (
                        <div className="text-[11px] text-slate-500 pt-1">
                          Checks: Passed {assessment.summary.passedCount || 0} / Failed {assessment.summary.failedCount || 0} / Review {assessment.summary.reviewCount || 0}
                        </div>
                      )}
                    </div>

                    <Link
                      to={`/result/${assessment?.assessmentId || scan.scanId}`}
                      className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 border-teal-200"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Assessment
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
