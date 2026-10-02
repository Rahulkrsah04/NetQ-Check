import { CheckCircle, AlertTriangle, XCircle, Circle } from 'lucide-react';

/**
 * ProgressStepper — shows OCR processing steps with status indicators
 */
export function ProgressStepper({ steps, currentStep, stepStatuses }) {
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => {
        const status = stepStatuses?.[idx] || (idx < currentStep ? 'done' : idx === currentStep ? 'active' : 'pending');

        return (
          <div key={idx} className="flex items-center gap-3">
            <StepDot status={status} number={idx + 1} />
            <div className="flex-1">
              <div className={`text-sm font-medium transition-colors ${
                status === 'active' ? 'text-primary' :
                status === 'done' ? 'text-success' :
                status === 'error' ? 'text-error' : 'text-gray-400'
              }`}>
                {step}
              </div>
              {status === 'active' && (
                <div className="mt-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-primary rounded-full w-1/2 animate-pulse" />
                </div>
              )}
            </div>
            {status === 'done' && <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />}
            {status === 'error' && <XCircle className="w-4 h-4 text-error flex-shrink-0" />}
            {status === 'active' && <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

function StepDot({ status, number }) {
  const base = 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all';
  if (status === 'done') return <div className={`${base} bg-green-100 text-green-700`}><CheckCircle className="w-4 h-4" /></div>;
  if (status === 'active') return <div className={`${base} bg-primary text-white`}>{number}</div>;
  if (status === 'error') return <div className={`${base} bg-red-100 text-red-700`}><XCircle className="w-4 h-4" /></div>;
  return <div className={`${base} bg-gray-100 text-gray-400`}>{number}</div>;
}

/**
 * LinearProgress — simple progress bar
 */
export function LinearProgress({ value, max = 100, color = 'primary' }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorClass = color === 'success' ? 'bg-success' : color === 'warning' ? 'bg-warning' : color === 'error' ? 'bg-error' : 'bg-primary';
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} rounded-full transition-all duration-300`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * ConfidenceBar — shows OCR confidence percentage inline
 */
export function ConfidenceBar({ confidence }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 85 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-error';
  const barColor = pct >= 85 ? 'success' : pct >= 60 ? 'warning' : 'error';

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <LinearProgress value={pct} color={barColor} />
      <span className={`text-xs font-semibold ${color} w-8 text-right`}>{pct}%</span>
    </div>
  );
}
