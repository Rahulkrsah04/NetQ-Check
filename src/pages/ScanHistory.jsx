// ============================================================
// NetQ Check — Inspection History Page
// Real database query for scan history with multi-parameter search & filtering
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, Download, History, PlusCircle, ArrowUpDown, Calendar, UserCheck } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { searchScans } from '../services/repositories/scanRepository';
import { getAssessmentByScanId, getAssessmentById } from '../services/repositories/assessmentRepository';
import { getProductById } from '../services/repositories/productRepository';
import { PRODUCT_CATEGORIES } from '../services/ruleEngine/productCategories';
import { generatePDFReport } from '../services/reportService';
import { saveReport } from '../services/repositories/reportRepository';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ScanHistory() {
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('NEWEST'); // NEWEST | OLDEST
  const [downloadingId, setDownloadingId] = useState(null);

  const { user } = useAuth();

  const rawScans = searchScans({
    search: searchQuery,
    category: activeCategory,
    status: activeStatus,
  });

  const sortedScans = [...rawScans].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
  });

  const handleDownload = async (scan) => {
    setDownloadingId(scan.scanId);
    try {
      const assessment = getAssessmentByScanId(scan.scanId) || getAssessmentById(scan.assessmentId);
      const product = scan.productId ? getProductById(scan.productId) : null;
      const extractedData = scan.normalizedData || {};
      const complianceResults = assessment?.checks || [];
      const summary = assessment?.summary || {
        total: complianceResults.length,
        pass: complianceResults.filter(r => r.status === 'PASS').length,
        fail: complianceResults.filter(r => r.status === 'FAIL').length,
        review: complianceResults.filter(r => r.status === 'NEEDS_REVIEW').length,
      };

      const filename = await generatePDFReport({
        scan,
        extractedData,
        complianceResults,
        summary,
        overallStatus: assessment?.overallStatus || scan.status,
        audit: assessment,
      });

      saveReport({
        assessmentId: assessment?.assessmentId || scan.assessmentId,
        scanId: scan.scanId,
        productId: product?.productId || scan.productId,
        title: `Inspection Report - ${scan.scanId}`,
      }, user);

      toast.success(`Report saved & downloaded: ${filename}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inspection History</h1>
          <p className="page-desc">{sortedScans.length} total inspections recorded in platform</p>
        </div>
        <Link to="/scan" className="btn btn-primary flex items-center gap-1.5 shadow-sm">
          <PlusCircle className="w-4 h-4" />
          New Inspection Scan
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="history-search"
              type="text"
              className="form-input pl-9 text-xs"
              placeholder="Search by Inspection ID, Product Name, Brand, Inspector..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <select
              value={activeCategory}
              onChange={e => setActiveCategory(e.target.value)}
              className="form-input text-xs font-medium text-slate-700 py-1.5"
            >
              <option value="ALL">All Categories</option>
              {PRODUCT_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={activeStatus}
              onChange={e => setActiveStatus(e.target.value)}
              className="form-input text-xs font-medium text-slate-700 py-1.5"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="NON_COMPLIANT">Non-Compliant</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
            </select>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
              className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}
            </button>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="card">
        {sortedScans.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800 text-base">No Inspection Records</h3>
            <p className="text-slate-500 text-xs mt-1">No inspections matched your filter criteria or database is empty.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Inspection ID</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Inspector</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Issues / Summary</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedScans.map(scan => {
                  const assessment = getAssessmentByScanId(scan.scanId) || getAssessmentById(scan.assessmentId);
                  const prod = scan.productId ? getProductById(scan.productId) : null;
                  const productName = prod?.productName || scan.normalizedData?.productName || scan.rawOCRData?.productName || 'Prepacked Commodity';
                  const status = assessment?.overallStatus || scan.status;

                  return (
                    <tr key={scan.scanId} className="hover:bg-slate-50/70">
                      <td className="font-mono text-teal-800 font-bold">{scan.scanId}</td>
                      <td>
                        <div className="font-bold text-slate-900 line-clamp-1">{productName}</div>
                        {prod && (
                          <Link to={`/products/${prod.productId}`} className="text-[10px] text-teal-600 hover:underline">
                            View Timeline
                          </Link>
                        )}
                      </td>
                      <td>
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {scan.category}
                        </span>
                      </td>
                      <td className="text-slate-700 font-medium">
                        {scan.userName || 'Raj Kumar'}
                      </td>
                      <td className="text-slate-600">
                        {format(new Date(scan.createdAt), 'dd MMM yyyy')}
                        <div className="text-[10px] text-slate-400">{format(new Date(scan.createdAt), 'HH:mm')}</div>
                      </td>
                      <td>
                        <StatusBadge status={status} size="sm" />
                      </td>
                      <td>
                        {assessment?.summary ? (
                          <div className="text-[11px] space-y-0.5">
                            {assessment.summary.failedCount > 0 && (
                              <div className="text-red-600 font-semibold">{assessment.summary.failedCount} Failed Check(s)</div>
                            )}
                            {assessment.summary.reviewCount > 0 && (
                              <div className="text-amber-600 font-semibold">{assessment.summary.reviewCount} Need Review</div>
                            )}
                            {assessment.summary.failedCount === 0 && assessment.summary.reviewCount === 0 && (
                              <div className="text-teal-700 font-semibold">100% Passed</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/result/${assessment?.assessmentId || scan.scanId}`}
                            className="btn btn-secondary btn-sm text-xs font-semibold text-teal-700 hover:bg-teal-50"
                            id={`view-${scan.scanId}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Link>
                          <button
                            onClick={() => handleDownload(scan)}
                            disabled={downloadingId === scan.scanId}
                            className="btn btn-secondary btn-sm text-xs font-semibold"
                            id={`download-${scan.scanId}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            {downloadingId === scan.scanId ? '…' : 'PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
