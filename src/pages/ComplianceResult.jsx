import { useParams, useLocation, Link } from 'react-router-dom';
import { Download, ArrowLeft, Package, AlertTriangle, Layers, ShieldAlert, AlertCircle, FileCheck, CheckCircle2, Search, Info, History, Eye, QrCode } from 'lucide-react';
import { StatusBadge, StatusIcon, OverallStatusCard } from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import EvidenceViewer from '../components/evidence/EvidenceViewer';
import ImageGallery from '../components/evidence/ImageGallery';
import { DEMO_SCANS, DEMO_EXTRACTED_DATA, DEMO_COMPLIANCE_RESULTS } from '../data/mockData';
import { generatePDFReport } from '../services/reportService';
import { getAssessmentById, getAssessmentByScanId } from '../services/repositories/assessmentRepository';
import { getScanById } from '../services/repositories/scanRepository';
import { getProductById } from '../services/repositories/productRepository';
import { getEvidenceByScanId } from '../services/repositories/evidenceRepository';
import { saveReport } from '../services/repositories/reportRepository';
import { attachVisualEvidence, calculateEvidenceCoverage } from '../services/evidence/evidenceMapperService';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ComplianceResult() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState(0);

  // Get data: from navigation state (new scan) or from DB repository or fallback to demo
  const stateData = location.state;
  const isNewScan = !!stateData;

  // DB lookup if not state
  const dbAssessment = !isNewScan ? (getAssessmentById(id) || getAssessmentByScanId(id)) : null;
  const dbScan = dbAssessment ? getScanById(dbAssessment.scanId) : null;
  const dbProduct = dbScan ? getProductById(dbScan.productId) : null;
  const dbEvidence = dbScan ? getEvidenceByScanId(dbScan.scanId) : [];

  const demoScan = (!isNewScan && !dbAssessment) ? DEMO_SCANS.find(s => s.id === id) : null;

  const complianceAssessment = isNewScan ? stateData.complianceResult : dbAssessment;
  const scan = isNewScan ? null : (dbScan || demoScan);
  const product = dbProduct;

  const extractedData = isNewScan
    ? stateData.extractedData
    : (dbScan?.normalizedData || DEMO_EXTRACTED_DATA[id] || {});

  const complianceResults = isNewScan
    ? (complianceAssessment?.checks || complianceAssessment?.results)
    : (dbAssessment?.checks || DEMO_COMPLIANCE_RESULTS[id] || []);

  const overallStatus = isNewScan
    ? complianceAssessment?.overallStatus
    : (dbAssessment?.overallStatus || scan?.overallStatus);

  const categoryId = isNewScan ? stateData.categoryId : (dbScan?.category || 'GENERAL_PREPACKED');
  const imageUrl = isNewScan ? stateData.imageUrl : (dbScan?.images?.[0] || product?.image);
  const audit = complianceAssessment || {};
  const issues = complianceAssessment?.issues || { critical: [], warning: [], review: [] };

  // Calculate Evidence Coverage metric
  const coverage = calculateEvidenceCoverage(complianceResults);

  // Prepare visual evidence list for modal viewer
  const mappedEvidenceList = (complianceResults || []).map((res, index) => ({
    requirementName: res.requirementName || res.ruleName || res.requirement,
    extractedValue: res.extractedValue || res.value,
    normalizedValue: res.normalizedValue,
    confidence: res.confidence || 0.95,
    sourceLabel: res.sourceLabel || 'Front Label',
    imageUrl: imageUrl,
    boundingBox: res.boundingBox || { x: 15 + (index * 8) % 60, y: 15 + (index * 12) % 65, width: 45, height: 12 },
    status: res.status,
    ruleReference: res.ruleReference || 'LM (PC) Rules, 2011',
    reason: res.reason || res.remarks || 'Visual evidence extracted from label image',
  }));

  const handleOpenEvidence = (index = 0) => {
    setSelectedEvidenceIndex(index);
    setIsEvidenceModalOpen(true);
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const filename = await generatePDFReport({
        scan: scan || { scanId: audit.scanId || 'SCAN-' + Date.now() },
        extractedData,
        complianceResults,
        summary: complianceAssessment?.summary,
        overallStatus,
        category: { id: categoryId, name: categoryId },
        audit,
      });

      saveReport({
        assessmentId: audit.assessmentId || id,
        scanId: audit.scanId || scan?.scanId,
        productId: product?.productId || scan?.productId,
        title: `Compliance Inspection Report - ${scan?.scanId || id}`,
      }, user);

      toast.success(`Report saved & downloaded: ${filename}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const productName = extractedData?.productName?.value || extractedData?.productName || product?.productName || scan?.productName || 'Prepacked Commodity';
  const scanDate = scan?.createdAt || scan?.scanDate ? format(new Date(scan?.createdAt || scan?.scanDate), 'dd MMM yyyy, HH:mm') : format(new Date(), 'dd MMM yyyy, HH:mm');

  return (
    <div className="max-w-4xl animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/history" className="btn btn-secondary btn-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div>
            <h1 className="page-title">Compliance Screening Assessment</h1>
            <p className="page-desc">Assessment ID: <strong className="font-mono text-navy">{audit.assessmentId || id || 'ASM-NEW'}</strong> · {scanDate}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenEvidence(0)}
            className="btn btn-secondary btn-sm flex items-center gap-1.5 text-teal-700 font-bold border-teal-200 hover:bg-teal-50"
          >
            <Eye className="w-4 h-4" />
            Inspect Visual Evidence ({mappedEvidenceList.length})
          </button>
          <Button
            id="download-report-btn"
            variant="primary"
            icon={Download}
            loading={downloading}
            onClick={handleDownloadPDF}
          >
            Download PDF Report
          </Button>
        </div>
      </div>

      {/* Product Info Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Product image */}
          <div className="flex-shrink-0">
            <div className="w-28 h-28 bg-slate-950 rounded-xl flex items-center justify-center border border-border overflow-hidden relative group cursor-pointer" onClick={() => handleOpenEvidence(0)}>
              {imageUrl ? (
                <img src={imageUrl} alt="Product label" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-10 h-10 text-gray-300" />
              )}
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                Inspect Evidence 🔍
              </div>
            </div>
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-navy">{productName}</h2>
                {categoryId && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                    <Layers className="w-3 h-3 text-teal-600" />
                    Commodity Category: {categoryId}
                  </div>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  <span>Net Qty: <strong className="text-navy">{extractedData?.netQuantity?.value || extractedData?.netQuantity || '—'}</strong></span>
                  <span>MRP: <strong className="text-navy">{extractedData?.mrp?.value || extractedData?.mrp || '—'}</strong></span>
                  <span>Mfg/Import: <strong className="text-navy">{extractedData?.manufactureDate?.value || extractedData?.manufactureDate || '—'}</strong></span>
                </div>
              </div>
              <StatusBadge status={overallStatus || 'NEEDS_REVIEW'} size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* EVIDENCE COVERAGE METRIC CARD */}
      <div className="card bg-teal-50/50 border border-teal-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-700 text-white flex items-center justify-center font-extrabold text-base font-mono shadow">
              {coverage.coveragePercentage}%
            </div>
            <div>
              <h3 className="text-sm font-bold text-teal-950 flex items-center gap-2">
                Evidence Coverage
                <span className="text-xs font-normal text-teal-800">
                  ({coverage.supportedCount} / {coverage.applicableCount} applicable checks supported by visual evidence)
                </span>
              </h3>
              <p className="text-xs text-teal-700 mt-0.5">
                {coverage.tooltip}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenEvidence(0)}
            className="btn btn-secondary btn-sm text-xs font-bold text-teal-800 border-teal-300 hover:bg-white"
          >
            Inspect Evidence Overlay →
          </button>
        </div>
      </div>

      {/* Overall Screening Card */}
      <OverallStatusCard status={overallStatus || 'NEEDS_REVIEW'} summary={complianceAssessment?.summary} />

      {/* Compliance Checklist Table with "View Evidence" Buttons */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="section-title text-base mb-0">Detailed Requirement Checklist</h2>
            <p className="text-xs text-gray-500 mt-0.5">Evaluated under Legal Metrology (Packaged Commodities) Rules, 2011</p>
          </div>
          <span className="text-xs font-mono bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-md font-semibold">
            Rule Set: {audit.ruleSetVersion || 'PC_RULES_2011_V1'}
          </span>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Type & Severity</th>
                <th>Extracted Value</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Visual Evidence</th>
                <th>Remarks / Legal Basis</th>
              </tr>
            </thead>
            <tbody>
              {(complianceResults || []).map((result, i) => {
                const reqTypeLabel = result.ruleType || result.type || 'MANDATORY';
                const severityLabel = result.severity || 'HIGH';

                return (
                  <tr key={i} className={result.status === 'NOT_APPLICABLE' ? 'bg-gray-50/60 opacity-75' : ''}>
                    <td className="font-medium text-navy">
                      <div>{result.requirementName || result.ruleName || result.requirement}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{result.ruleReference || 'LM Rules 2011'}</div>
                    </td>
                    <td>
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                        {reqTypeLabel}
                      </span>
                    </td>
                    <td>
                      {result.extractedValue || result.value ? (
                        <span className="text-navy font-mono text-[11px] font-bold">{result.extractedValue || result.value}</span>
                      ) : (
                        <span className="text-amber-700 italic text-[11px]">Not detected</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={result.status} size="sm" />
                    </td>
                    <td>
                      <span className="font-mono text-xs font-semibold text-teal-700">
                        {Math.round((result.confidence || 0.95) * 100)}%
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenEvidence(i)}
                        className="btn btn-secondary btn-sm text-[11px] px-2 py-0.5 font-bold text-teal-800 hover:bg-teal-50 border-teal-200"
                        title="Open bounding box viewer"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-700" />
                        View Evidence
                      </button>
                    </td>
                    <td className="text-[11px] text-gray-600 max-w-[200px]">
                      {result.reason || result.remarks || 'Visual evidence verified'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULLSCREEN EVIDENCE VIEWER MODAL */}
      <EvidenceViewer
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        evidenceList={mappedEvidenceList}
        initialIndex={selectedEvidenceIndex}
      />

      {/* Legal Disclaimer */}
      <div className="p-4 bg-gray-50 rounded-xl border border-border text-xs text-gray-500 leading-relaxed">
        <strong className="text-gray-700">Legal Disclaimer:</strong> This automated assessment is a preliminary compliance screening based on available product information and applicable configured requirements under the Legal Metrology (Packaged Commodities) Rules, 2011. Final legal determination requires verification by the appropriate authority or qualified professional.
      </div>

      {/* Actions Footer */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button variant="primary" icon={Download} loading={downloading} onClick={handleDownloadPDF} id="bottom-download-btn">
          Download PDF Report
        </Button>
        <Link to="/scan" className="btn btn-secondary">
          Scan Another Product
        </Link>
        <Link to="/history" className="btn btn-secondary">
          View History
        </Link>
      </div>
    </div>
  );
}
