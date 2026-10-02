import { CheckCircle, XCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import { getStatusConfig } from '../../services/complianceEngine';

/**
 * StatusBadge — renders colored status pill for compliance/scan statuses
 */
export function StatusBadge({ status, size = 'md' }) {
  const config = getStatusConfig(status);
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-sm px-3 py-1.5' : 'text-xs px-2.5 py-1';
  const dotSize = size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.bg} ${config.text} ${sizeClasses}`}>
      <span className={`rounded-full ${config.dot} ${dotSize}`} />
      {config.label}
    </span>
  );
}

/**
 * StatusIcon — renders appropriate icon for status
 */
export function StatusIcon({ status, className = 'w-5 h-5' }) {
  if (status === 'PASS' || status === 'COMPLIANT') return <CheckCircle className={`${className} text-success`} />;
  if (status === 'FAIL' || status === 'NON_COMPLIANT') return <XCircle className={`${className} text-error`} />;
  if (status === 'REVIEW' || status === 'NEEDS_REVIEW') return <AlertTriangle className={`${className} text-warning`} />;
  return <MinusCircle className={`${className} text-gray-400`} />;
}

/**
 * OverallStatusCard — large result banner for the compliance result page
 */
export function OverallStatusCard({ status, summary }) {
  const config = getStatusConfig(status);
  const borderColor = status === 'COMPLIANT' ? 'border-success' : status === 'NON_COMPLIANT' ? 'border-error' : 'border-warning';
  const bgColor = status === 'COMPLIANT' ? 'bg-green-50' : status === 'NON_COMPLIANT' ? 'bg-red-50' : 'bg-amber-50';

  return (
    <div className={`rounded-xl border-2 ${borderColor} ${bgColor} p-5`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <StatusIcon status={status} className="w-8 h-8" />
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Overall Screening Result</div>
            <div className={`text-xl font-bold ${config.text}`}>{config.label}</div>
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{summary.pass}</div>
            <div className="text-gray-500 text-xs">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-error">{summary.fail}</div>
            <div className="text-gray-500 text-xs">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{summary.review}</div>
            <div className="text-gray-500 text-xs">Review</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-navy">{summary.total}</div>
            <div className="text-gray-500 text-xs">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}
