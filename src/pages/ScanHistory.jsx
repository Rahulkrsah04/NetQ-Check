import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, Download } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { DEMO_SCANS } from '../data/mockData';
import { generatePDFReport } from '../services/reportService';
import { DEMO_EXTRACTED_DATA, DEMO_COMPLIANCE_RESULTS } from '../data/mockData';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All Scans' },
  { id: 'COMPLIANT', label: 'Compliant' },
  { id: 'NON_COMPLIANT', label: 'Non-Compliant' },
  { id: 'NEEDS_REVIEW', label: 'Needs Review' },
];

export default function ScanHistory() {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const filteredScans = useMemo(() => {
    return DEMO_SCANS.filter(scan => {
      const matchesFilter = activeFilter === 'ALL' || scan.overallStatus === activeFilter;
      const matchesSearch = !searchQuery ||
        scan.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchQuery]);

  const handleDownload = async (scan) => {
    setDownloadingId(scan.id);
    try {
      const extractedData = DEMO_EXTRACTED_DATA[scan.id];
      const complianceResults = DEMO_COMPLIANCE_RESULTS[scan.id];
      const summary = {
        total: complianceResults?.length || 0,
        pass: complianceResults?.filter(r => r.status === 'PASS').length || 0,
        fail: scan.failCount,
        review: scan.reviewCount,
      };
      await generatePDFReport({ scan, extractedData, complianceResults, summary, overallStatus: scan.overallStatus });
      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Scan History</h1>
          <p className="page-desc">{DEMO_SCANS.length} total scans · {DEMO_SCANS.filter(s => s.overallStatus === 'COMPLIANT').length} compliant</p>
        </div>
        <Link to="/scan" className="btn btn-primary">
          New Scan
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="card mb-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status filters */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.id}
                id={`filter-${f.id.toLowerCase()}`}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === f.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-xs ${activeFilter === f.id ? 'text-white/70' : 'text-gray-400'}`}>
                  {f.id === 'ALL' ? DEMO_SCANS.length :
                   DEMO_SCANS.filter(s => s.overallStatus === f.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xs ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="history-search"
                type="text"
                className="form-input pl-9 text-sm"
                placeholder="Search product name or ID…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {filteredScans.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <h3 className="font-semibold text-navy">No scans found</h3>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Scan Date</th>
                  <th>MRP</th>
                  <th>Status</th>
                  <th>Issues</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map(scan => (
                  <tr key={scan.id}>
                    <td>
                      <div className="font-medium text-navy">{scan.productName}</div>
                      <div className="text-xs text-gray-400">{scan.id}</div>
                    </td>
                    <td className="text-gray-500 text-sm">
                      {format(new Date(scan.scanDate), 'dd MMM yyyy')}
                      <div className="text-xs text-gray-400">{format(new Date(scan.scanDate), 'HH:mm')}</div>
                    </td>
                    <td className="font-medium">{scan.mrp}</td>
                    <td><StatusBadge status={scan.overallStatus} /></td>
                    <td>
                      <div className="text-xs space-y-0.5">
                        {scan.failCount > 0 && <div className="text-error font-medium">{scan.failCount} failed</div>}
                        {scan.reviewCount > 0 && <div className="text-warning font-medium">{scan.reviewCount} to review</div>}
                        {scan.failCount === 0 && scan.reviewCount === 0 && <div className="text-success font-medium">None</div>}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/result/${scan.id}`}
                          className="btn btn-secondary btn-sm"
                          id={`view-${scan.id}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                        <button
                          onClick={() => handleDownload(scan)}
                          disabled={downloadingId === scan.id}
                          className="btn btn-secondary btn-sm"
                          id={`download-${scan.id}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          {downloadingId === scan.id ? '…' : 'PDF'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
