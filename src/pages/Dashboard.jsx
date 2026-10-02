import { Link } from 'react-router-dom';
import {
  Camera, TrendingUp, Package,
  ArrowRight, Clock, CheckCircle, XCircle, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DEMO_SCANS, DEMO_STATS, CHART_DATA } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning 👋';
  if (hour < 17) return 'Good Afternoon 👋';
  return 'Good Evening 👋';
};

const STAT_CARDS = [
  {
    label: 'Products Scanned',
    value: DEMO_STATS.totalScans,
    icon: Camera,
    iconBg: 'bg-blue-100 text-blue-700',
    delta: '+12 this month',
    deltaColor: 'text-green-600',
  },
  {
    label: 'Compliant',
    value: DEMO_STATS.compliant,
    icon: CheckCircle,
    iconBg: 'bg-green-100 text-success',
    delta: `${Math.round((DEMO_STATS.compliant / DEMO_STATS.totalScans) * 100)}% pass rate`,
    deltaColor: 'text-green-600',
  },
  {
    label: 'Non-Compliant',
    value: DEMO_STATS.nonCompliant,
    icon: XCircle,
    iconBg: 'bg-red-100 text-error',
    delta: `${Math.round((DEMO_STATS.nonCompliant / DEMO_STATS.totalScans) * 100)}% of scans`,
    deltaColor: 'text-red-600',
  },
  {
    label: 'Needs Review',
    value: DEMO_STATS.needsReview,
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 text-warning',
    delta: 'Manual check required',
    deltaColor: 'text-amber-600',
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">
            {getGreeting()}
          </div>
          <h1 className="page-title">
            {user?.displayName ? `Welcome, ${user.displayName}` : 'Compliance Overview'}
          </h1>
          <p className="page-desc">Monitor product compliance status and recent scan activity under Legal Metrology Rules</p>
        </div>
        <Link to="/scan" id="dashboard-scan-btn" className="btn btn-primary shadow-sm">
          <Camera className="w-4 h-4" />
          New Scan
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map((stat, i) => (
          <div key={i} className="stat-card card">
            <div className="flex items-start justify-between">
              <div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value mt-1">{stat.value}</div>
              </div>
              <div className={`stat-icon ${stat.iconBg}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className={`text-xs font-medium ${stat.deltaColor}`}>{stat.delta}</div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="section-title text-base">Compliance Trend</h2>
              <p className="section-subtitle">Monthly scan results (last 6 months)</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-success inline-block" /> Compliant</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-error inline-block" /> Non-Compliant</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-warning inline-block" /> Needs Review</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CHART_DATA} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Bar dataKey="compliant" fill="#16A34A" radius={[3, 3, 0, 0]} name="Compliant" />
              <Bar dataKey="nonCompliant" fill="#DC2626" radius={[3, 3, 0, 0]} name="Non-Compliant" />
              <Bar dataKey="review" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Needs Review" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="section-title text-base mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { to: '/scan', icon: Camera, label: 'Scan New Product', desc: 'Upload or capture a label', color: 'text-primary bg-teal-50' },
              { to: '/history', icon: Clock, label: 'View Scan History', desc: 'Browse past scans', color: 'text-blue-700 bg-blue-50' },
              { to: '/reports', icon: Package, label: 'Download Reports', desc: 'Export compliance PDFs', color: 'text-success bg-green-50' },
              { to: '/rules', icon: ShieldCheck, label: 'Compliance Rules', desc: 'Legal Metrology checklist', color: 'text-teal-800 bg-teal-100/60' },
            ].map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${action.color}`}>
                  <action.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-navy">{action.label}</div>
                  <div className="text-xs text-gray-400">{action.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title text-base">Recent Scans</h2>
            <p className="section-subtitle">Latest product compliance checks</p>
          </div>
          <Link to="/history" className="btn btn-secondary btn-sm">
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Scan Date</th>
                <th>MRP</th>
                <th>Status</th>
                <th>Issues</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_SCANS.map(scan => (
                <tr key={scan.id}>
                  <td>
                    <div className="font-medium text-navy">{scan.productName}</div>
                  </td>
                  <td className="text-gray-500 text-xs">
                    {format(new Date(scan.scanDate), 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td className="font-medium">{scan.mrp}</td>
                  <td>
                    <StatusBadge status={scan.overallStatus} />
                  </td>
                  <td>
                    {scan.failCount > 0 ? (
                      <span className="text-error font-medium">{scan.failCount} failed</span>
                    ) : scan.reviewCount > 0 ? (
                      <span className="text-warning font-medium">{scan.reviewCount} to review</span>
                    ) : (
                      <span className="text-success font-medium">None</span>
                    )}
                  </td>
                  <td>
                    <Link
                      to={`/result/${scan.id}`}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      View Report →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

