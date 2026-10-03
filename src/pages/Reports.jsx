// ============================================================
// NetQ Check — Inspection Reports Center
// Access, regenerate and download compliance reports connected to scan assessments
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, FileText, Package, Calendar, CheckCircle, XCircle, AlertTriangle, Search } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { getAllScans } from '../services/repositories/scanRepository';
import { getAssessmentByScanId, getAssessmentById } from '../services/repositories/assessmentRepository';
import { getProductById } from '../services/repositories/productRepository';
import { saveReport, getAllReports } from '../services/repositories/reportRepository';
import { generatePDFReport } from '../services/reportService';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Reports() {
  const [downloadingId, setDownloadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  const allScans = getAllScans();
  const allReports = getAllReports();

  const filteredScans = allScans.filter(scan => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      scan.scanId.toLowerCase().includes(q) ||
      (scan.normalizedData?.productName || '').toLowerCase().includes(q) ||
      (scan.category || '').toLowerCase().includes(q)
    );
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
        title: `Compliance Inspection Report - ${scan.scanId}`,
      }, user);

      toast.success(`Report saved & downloaded: ${filename}`);
    } catch (err) {
      console.error(err);
      toast.error('PDF generation failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inspection Reports Center</h1>
          <p className="page-desc">Download and view official Legal Metrology preliminary compliance reports ({allReports.length} Generated)</p>
        </div>
        <Link to="/scan" className="btn btn-primary">
          Scan & Generate Report
        </Link>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search report by scan ID, product name or category..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input pl-9 text-xs"
          />
        </div>
      </div>

      {/* Reports List */}
      {filteredScans.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-base">No Reports Found</h3>
          <p className="text-slate-500 text-xs mt-1">No inspection reports match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredScans.map((scan) => {
            const assessment = getAssessmentByScanId(scan.scanId) || getAssessmentById(scan.assessmentId);
            const product = scan.productId ? getProductById(scan.productId) : null;
            const productName = product?.productName || scan.normalizedData?.productName || scan.rawOCRData?.productName || 'Prepacked Commodity';
            const status = assessment?.overallStatus || scan.status;

            return (
              <div key={scan.scanId} className="card card-hover">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="w-12 h-12 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900">{productName}</h3>
                      <StatusBadge status={status} size="sm" />
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-mono">
                      <span>Inspection ID: <strong className="text-teal-700">{scan.scanId}</strong></span>
                      <span>Date: {format(new Date(scan.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                      <span>Category: {scan.category}</span>
                    </div>

                    {assessment?.summary && (
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> {assessment.summary.passedCount || 0} Passed
                        </span>
                        {assessment.summary.failedCount > 0 && (
                          <span className="text-red-700 font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> {assessment.summary.failedCount} Failed
                          </span>
                        )}
                        {assessment.summary.reviewCount > 0 && (
                          <span className="text-amber-700 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> {assessment.summary.reviewCount} Review
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Link
                      to={`/result/${assessment?.assessmentId || scan.scanId}`}
                      className="btn btn-secondary btn-sm text-xs font-semibold text-teal-700"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Download}
                      loading={downloadingId === scan.scanId}
                      onClick={() => handleDownload(scan)}
                    >
                      Download PDF
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
