import { useParams, useLocation, Link } from 'react-router-dom';
import { Download, ArrowLeft, Package, AlertTriangle, Layers, ShieldAlert, AlertCircle, FileCheck, CheckCircle2, Search, Info, History } from 'lucide-react';
import { StatusBadge, StatusIcon, OverallStatusCard } from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { DEMO_SCANS, DEMO_EXTRACTED_DATA, DEMO_COMPLIANCE_RESULTS } from '../data/mockData';
import { generatePDFReport } from '../services/reportService';
import { getAssessmentById, getAssessmentByScanId } from '../services/repositories/assessmentRepository';
import { getScanById } from '../services/repositories/scanRepository';
import { getProductById } from '../services/repositories/productRepository';
import { getEvidenceByScanId } from '../services/repositories/evidenceRepository';
import { saveReport } from '../services/repositories/reportRepository';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ComplianceResult() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

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

  const summary = isNewScan ? complianceAssessment?.summary : (dbAssessment?.summary || {
    total: complianceResults?.length || 0,
    applicable: complianceResults?.filter(r => r.status !== 'NOT_APPLICABLE').length || 0,
    pass: complianceResults?.filter(r => r.status === 'PASS').length || 0,
    fail: complianceResults?.filter(r => r.status === 'FAIL').length || 0,
    review: complianceResults?.filter(r => r.status === 'REVIEW').length || 0,
    notApplicable: complianceResults?.filter(r => r.status === 'NOT_APPLICABLE').length || 0,
    notDetected: complianceResults?.filter(r => r.status === 'NOT_DETECTED').length || 0,
  });

  if (!extractedData && !isNewScan && !dbAssessment && !demoScan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3 text-center" />
          <h3 className="font-semibold text-navy">Inspection record not found</h3>
          <p className="text-gray-500 text-sm mt-1">This scan assessment record does not exist or has been archived.</p>
          <Link to="/history" className="btn btn-primary mt-4">View Inspection History</Link>
        </div>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const filename = await generatePDFReport({
        scan: scan || { scanId: audit.scanId || 'SCAN-' + Date.now() },
        extractedData,
        complianceResults,
        summary,
        overallStatus,
        category: { id: categoryId, name: categoryId },
        audit,
      });

      // Save report metadata into database repository
      saveReport({
        assessmentId: audit.assessmentId || id,
        scanId: audit.scanId || scan?.scanId,
        productId: product?.productId || scan?.productId,
        title: `Compliance Inspection Report - ${productName}`,
      }, user);

      toast.success(`Report generated & saved: ${filename}`);
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
          {product && (
            <Link to={`/products/${product.productId}`} className="btn btn-secondary btn-sm flex items-center gap-1.5">
              <History className="w-4 h-4 text-teal-600" />
              Product History
            </Link>
          )}
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
            <div className="w-28 h-28 bg-gray-100 rounded-xl flex items-center justify-center border border-border overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt="Product label" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-10 h-10 text-gray-300" />
              )}
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
                <div className="mt-1 text-sm text-gray-500">
                  <span>Manufacturer/Importer: <strong className="text-navy">{extractedData?.manufacturer?.value || extractedData?.manufacturerName || product?.manufacturer || '—'}</strong></span>
                </div>
              </div>
              <StatusBadge status={overallStatus || 'NEEDS_REVIEW'} size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Overall Screening Card */}
      <OverallStatusCard status={overallStatus || 'NEEDS_REVIEW'} summary={summary} />

      {/* Smart Issue Classification */}
      {(issues.critical?.length > 0 || issues.warning?.length > 0 || issues.review?.length > 0) && (
        <div className="card space-y-3">
          <h3 className="text-sm font-bold text-navy flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Smart Issue Screening Classification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Critical */}
            <div className={`p-3 rounded-xl border ${issues.critical?.length > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-red-600" /> Critical Failures</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-red-800 font-mono text-[11px]">{issues.critical?.length || 0}</span>
              </div>
              <p className="text-[11px] opacity-80">Applicable high-severity mandatory declarations missing or non-compliant.</p>
            </div>

            {/* Warnings */}
            <div className={`p-3 rounded-xl border ${issues.warning?.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Warnings</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-amber-800 font-mono text-[11px]">{issues.warning?.length || 0}</span>
              </div>
              <p className="text-[11px] opacity-80">Format discrepancies or tax clause omissions requiring attention.</p>
            </div>

            {/* Review Items */}
            <div className={`p-3 rounded-xl border ${issues.review?.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5 text-blue-600" /> Officer Review</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-blue-800 font-mono text-[11px]">{issues.review?.length || 0}</span>
              </div>
              <p className="text-[11px] opacity-80">Physical measurements or low OCR confidence requiring officer verification.</p>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Checklist Table */}
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
                <th>Normalized Data</th>
                <th>Status</th>
                <th>Confidence</th>
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
                      <div className="space-y-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                          reqTypeLabel === 'MANDATORY' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                          reqTypeLabel === 'CONDITIONAL' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {reqTypeLabel}
                        </span>
                        <div className="text-[10px] text-gray-500">Sev: <strong className={severityLabel === 'HIGH' ? 'text-red-700' : 'text-amber-700'}>{severityLabel}</strong></div>
                      </div>
                    </td>
                    <td>
                      {result.extractedValue || result.value ? (
                        <span className="text-navy font-mono text-[11px]">{result.extractedValue || result.value}</span>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">Not detected</span>
                      )}
                    </td>
                    <td>
                      {result.normalizedValue ? (
                        <span className="text-teal-900 font-mono text-[11px] font-semibold">{result.normalizedValue}</span>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={result.status} size="sm" />
                    </td>
                    <td>
                      {(result.confidence || 0.95) > 0 ? (
                        <span className={`text-[11px] font-semibold ${
                          (result.confidence || 0.95) >= 0.85 ? 'text-success' :
                          (result.confidence || 0.95) >= 0.6 ? 'text-warning' : 'text-error'
                        }`}>
                          {Math.round((result.confidence || 0.95) * 100)}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="text-[11px] text-gray-600 max-w-[220px]">
                      {result.reason || result.remarks || 'Verification complete'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence & Normalization Details */}
      <div className="card">
        <h3 className="text-sm font-bold text-navy mb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-primary" />
          Evidence Mapping & Data Normalization
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {Object.entries(extractedData || {}).map(([key, item]) => {
            const rawVal = typeof item === 'object' ? item?.value : item;
            const normVal = typeof item === 'object' ? (item?.normalizedValue || item?.value) : item;
            const conf = typeof item === 'object' ? (item?.confidence || 0.95) : 0.95;

            return (
              <div key={key} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{key}</div>
                <div className="text-navy font-semibold text-xs truncate">Raw: "{rawVal || '—'}"</div>
                <div className="text-teal-800 text-[11px] mt-0.5 font-mono">Norm: {normVal || '—'}</div>
                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-1.5 border-t border-gray-200">
                  <span>Source: OCR Vision</span>
                  <span>Conf: <strong>{Math.round(conf * 100)}%</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit Trail Metadata Footer */}
      <div className="p-4 bg-navy text-white rounded-xl text-xs space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/10 pb-2">
          <span className="font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400" /> Statutory Audit Trail Record
          </span>
          <span className="font-mono text-[11px] text-teal-300">Engine Version: {audit.engineVersion || '3.0.0'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-300 font-mono">
          <div>Assessment ID: <strong className="text-white">{audit.assessmentId || id || 'ASM-01'}</strong></div>
          <div>Scan ID: <strong className="text-white">{audit.scanId || scan?.scanId || 'SCAN-01'}</strong></div>
          <div>Inspector ID: <strong className="text-white">{audit.userId || scan?.userId || user?.uid || 'INSPECTOR-01'}</strong></div>
          <div>Rule Set: <strong className="text-white">{audit.ruleSetVersion || 'PC_RULES_2011_V1'}</strong></div>
        </div>
      </div>

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
