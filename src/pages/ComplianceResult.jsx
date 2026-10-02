import { useParams, useLocation, Link } from 'react-router-dom';
import { Download, ArrowLeft, Package, AlertTriangle, Layers, ShieldAlert, AlertCircle, FileCheck, CheckCircle2, Search, Info } from 'lucide-react';
import { StatusBadge, StatusIcon, OverallStatusCard } from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { DEMO_SCANS, DEMO_EXTRACTED_DATA, DEMO_COMPLIANCE_RESULTS } from '../data/mockData';
import { generatePDFReport } from '../services/reportService';
import { getStatusConfig } from '../services/complianceEngine';
import { REQUIREMENT_TYPES, SEVERITY_LEVELS } from '../services/ruleRepository/ruleRepository';
import { format } from 'date-fns';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ComplianceResult() {
  const { id } = useParams();
  const location = useLocation();
  const [downloading, setDownloading] = useState(false);

  // Get data: from navigation state (new scan) or from demo data (history view)
  const stateData = location.state;
  const isNewScan = !!stateData;

  const scan = isNewScan ? null : DEMO_SCANS.find(s => s.id === id);
  const complianceAssessment = isNewScan ? stateData.complianceResult : null;
  const extractedData = isNewScan ? stateData.extractedData : DEMO_EXTRACTED_DATA[id];
  const complianceResults = isNewScan ? complianceAssessment?.checks || complianceAssessment?.results : DEMO_COMPLIANCE_RESULTS[id];
  const overallStatus = isNewScan ? complianceAssessment?.overallStatus : scan?.overallStatus;
  const categoryInfo = isNewScan ? complianceAssessment?.category : null;
  const imageUrl = isNewScan ? stateData.imageUrl : null;
  const audit = complianceAssessment || {};
  const issues = complianceAssessment?.issues || { critical: [], warning: [], review: [] };

  const summary = isNewScan ? complianceAssessment?.summary : {
    total: complianceResults?.length || 0,
    applicable: complianceResults?.filter(r => r.status !== 'NOT_APPLICABLE').length || 0,
    pass: complianceResults?.filter(r => r.status === 'PASS').length || 0,
    fail: complianceResults?.filter(r => r.status === 'FAIL').length || 0,
    review: complianceResults?.filter(r => r.status === 'REVIEW').length || 0,
    notApplicable: complianceResults?.filter(r => r.status === 'NOT_APPLICABLE').length || 0,
    notDetected: complianceResults?.filter(r => r.status === 'NOT_DETECTED').length || 0,
  };

  if (!extractedData && !isNewScan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-navy">Scan not found</h3>
          <p className="text-gray-500 text-sm mt-1">This scan record does not exist.</p>
          <Link to="/history" className="btn btn-primary mt-4">View History</Link>
        </div>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const filename = await generatePDFReport({
        scan: scan || { id: audit.scanId || 'SCAN-' + Date.now() },
        extractedData,
        complianceResults,
        summary,
        overallStatus,
        category: categoryInfo,
        audit,
      });
      toast.success(`Report downloaded: ${filename}`);
    } catch (err) {
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const productName = extractedData?.productName?.value || scan?.productName || 'Unknown Product';
  const scanDate = scan?.scanDate ? format(new Date(scan.scanDate), 'dd MMM yyyy, HH:mm') : format(new Date(), 'dd MMM yyyy, HH:mm');

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
            <p className="page-desc">Assessment ID: <strong className="font-mono text-navy">{audit.assessmentId || 'ASM-NEW'}</strong> · {scanDate}</p>
          </div>
        </div>
        <div className="flex gap-2">
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
                {categoryInfo && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                    <Layers className="w-3 h-3 text-teal-600" />
                    Commodity Category: {categoryInfo.name}
                  </div>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  <span>Net Qty: <strong className="text-navy">{extractedData?.netQuantity?.value || '—'}</strong></span>
                  <span>MRP: <strong className="text-navy">{extractedData?.mrp?.value || '—'}</strong></span>
                  <span>Mfg/Import: <strong className="text-navy">{extractedData?.manufactureDate?.value || '—'}</strong></span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  <span>Manufacturer/Importer: <strong className="text-navy">{extractedData?.manufacturer?.value || '—'}</strong></span>
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
                const reqTypeLabel = result.ruleType || 'MANDATORY';
                const severityLabel = result.severity || 'HIGH';

                return (
                  <tr key={i} className={result.status === 'NOT_APPLICABLE' ? 'bg-gray-50/60 opacity-75' : ''}>
                    <td className="font-medium text-navy">
                      <div>{result.requirementName || result.requirement}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{result.ruleReference}</div>
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
                      {result.confidence > 0 ? (
                        <span className={`text-[11px] font-semibold ${
                          result.confidence >= 0.85 ? 'text-success' :
                          result.confidence >= 0.6 ? 'text-warning' : 'text-error'
                        }`}>
                          {Math.round(result.confidence * 100)}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="text-[11px] text-gray-600 max-w-[220px]">
                      {result.reason}
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
          {Object.entries(extractedData || {}).map(([key, item]) => (
            <div key={key} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{key}</div>
              <div className="text-navy font-semibold text-xs truncate">Raw: "{item?.value || '—'}"</div>
              <div className="text-teal-800 text-[11px] mt-0.5 font-mono">Norm: {item?.normalizedValue || item?.value || '—'}</div>
              <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-1.5 border-t border-gray-200">
                <span>Source: OCR Vision</span>
                <span>Conf: <strong>{Math.round((item?.confidence || 0) * 100)}%</strong></span>
              </div>
            </div>
          ))}
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
          <div>Assessment ID: <strong className="text-white">{audit.assessmentId || 'ASM-01'}</strong></div>
          <div>Scan ID: <strong className="text-white">{audit.scanId || 'SCAN-01'}</strong></div>
          <div>Inspector ID: <strong className="text-white">{audit.userId || 'INSPECTOR-01'}</strong></div>
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
