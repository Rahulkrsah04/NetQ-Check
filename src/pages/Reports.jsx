import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, FileText, Package, Calendar, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { DEMO_SCANS, DEMO_EXTRACTED_DATA, DEMO_COMPLIANCE_RESULTS } from '../data/mockData';
import { generatePDFReport } from '../services/reportService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Reports() {
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (scan) => {
    setDownloadingId(scan.id);
    try {
      const extractedData = DEMO_EXTRACTED_DATA[scan.id];
      const complianceResults = DEMO_COMPLIANCE_RESULTS[scan.id];
      const summary = {
        total: complianceResults?.length || 0,
        pass: scan.passCount,
        fail: scan.failCount,
        review: scan.reviewCount,
      };
      await generatePDFReport({ scan, extractedData, complianceResults, summary, overallStatus: scan.overallStatus });
      toast.success(`Report downloaded successfully`);
    } catch {
      toast.error('PDF generation failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-desc">Download compliance assessment reports for all scanned products</p>
        </div>
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 gap-4">
        {DEMO_SCANS.map((scan) => {
          const extracted = DEMO_EXTRACTED_DATA[scan.id];
          const compResults = DEMO_COMPLIANCE_RESULTS[scan.id];

          return (
            <div key={scan.id} className="card card-hover">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Icon */}
                <div className="w-12 h-12 bg-navy/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-navy" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-navy">{scan.productName}</h3>
                    <StatusBadge status={scan.overallStatus} size="sm" />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {scan.id}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(scan.scanDate), 'dd MMM yyyy, HH:mm')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" /> MRP: {scan.mrp}
                    </span>
                  </div>

                  {/* Compliance summary inline */}
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs text-success flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {scan.passCount} Passed
                    </span>
                    {scan.failCount > 0 && (
                      <span className="text-xs text-error flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> {scan.failCount} Failed
                      </span>
                    )}
                    {scan.reviewCount > 0 && (
                      <span className="text-xs text-warning flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {scan.reviewCount} Review
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <Link to={`/result/${scan.id}`} className="btn btn-secondary btn-sm" id={`report-view-${scan.id}`}>
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Download}
                    loading={downloadingId === scan.id}
                    onClick={() => handleDownload(scan)}
                    id={`report-download-${scan.id}`}
                  >
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-dashed border-border text-center">
        <p className="text-sm text-gray-500">
          Showing {DEMO_SCANS.length} reports · <Link to="/scan" className="text-primary hover:underline">Scan a new product</Link> to add more
        </p>
      </div>
    </div>
  );
}
