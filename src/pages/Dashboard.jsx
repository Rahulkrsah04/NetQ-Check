// ============================================================
// NetQ Check — Executive Inspection Dashboard
// Real database-derived stats, charts & recent inspection records
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, TrendingUp, Package,
  ArrowRight, Clock, CheckCircle, XCircle, AlertTriangle, ShieldCheck, PieChart as PieIcon, Eye, ToggleLeft, ToggleRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getDashboardMetrics } from '../services/analytics/dashboardAnalyticsService';
import { DEMO_SCANS, CHART_DATA } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning 👋';
  if (hour < 17) return 'Good Afternoon 👋';
  return 'Good Evening 👋';
};

export default function Dashboard() {
  const { user } = useAuth();
  const [demoMode, setDemoMode] = useState(false);

  const metrics = getDashboardMetrics();

  const statCards = demoMode ? [
    { label: 'Total Products', value: 3, icon: Package, iconBg: 'bg-blue-100 text-blue-700', delta: 'Demo Catalog' },
    { label: 'Compliant Scans', value: 1, icon: CheckCircle, iconBg: 'bg-green-100 text-teal-700', delta: '33% Pass Rate' },
    { label: 'Non-Compliant Scans', value: 1, icon: XCircle, iconBg: 'bg-red-100 text-red-700', delta: '33% Failure Rate' },
    { label: 'Needs Review', value: 1, icon: AlertTriangle, iconBg: 'bg-amber-100 text-amber-700', delta: '33% Pending Review' },
  ] : [
    { label: 'Total Products', value: metrics.totalProducts, icon: Package, iconBg: 'bg-blue-100 text-blue-700', delta: 'Registered Products' },
    { label: 'Compliant Scans', value: metrics.compliantCount, icon: CheckCircle, iconBg: 'bg-green-100 text-teal-700', delta: `${metrics.complianceRate}% Pass Rate` },
    { label: 'Non-Compliant Scans', value: metrics.nonCompliantCount, icon: XCircle, iconBg: 'bg-red-100 text-red-700', delta: 'Mandatory Non-Compliance' },
    { label: 'Needs Review', value: metrics.needsReviewCount, icon: AlertTriangle, iconBg: 'bg-amber-100 text-amber-700', delta: 'Officer Review Required' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">
            {getGreeting()}
          </div>
          <h1 className="page-title">
            {user?.displayName ? `Welcome, ${user.displayName}` : 'Compliance Overview'}
          </h1>
          <p className="page-desc">
            Platform Inspection Analytics & Mandatory Declarations Intelligence ({user?.role || 'INSPECTOR'})
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Demo Mode Toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              demoMode
                ? 'bg-purple-50 text-purple-800 border-purple-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {demoMode ? <ToggleRight className="w-4 h-4 text-purple-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
            {demoMode ? 'Demo Mode Active' : 'Live Platform Data'}
          </button>

          <Link to="/scan" id="dashboard-scan-btn" className="btn btn-primary shadow-sm flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            New Inspection Scan
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
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
            <div className="text-xs font-medium text-slate-500 mt-2">{stat.delta}</div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Compliance Trend Chart */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="section-title text-base">Compliance Trend Analytics</h2>
              <p className="section-subtitle">Monthly inspection outcomes distribution</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-teal-600 inline-block" /> Compliant</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" /> Non-Compliant</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Needs Review</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={demoMode ? CHART_DATA : [
              { month: 'Current', compliant: metrics.compliantCount, nonCompliant: metrics.nonCompliantCount, review: metrics.needsReviewCount }
            ]} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Bar dataKey="compliant" fill="#0F766E" radius={[3, 3, 0, 0]} name="Compliant" />
              <Bar dataKey="nonCompliant" fill="#DC2626" radius={[3, 3, 0, 0]} name="Non-Compliant" />
              <Bar dataKey="review" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Needs Review" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="section-title text-base mb-4">Quick Platform Actions</h2>
          <div className="space-y-2">
            {[
              { to: '/scan', icon: Camera, label: 'Scan Commodity', desc: 'Upload or capture label', color: 'text-teal-700 bg-teal-50' },
              { to: '/history', icon: Clock, label: 'Inspection History', desc: 'Browse database records', color: 'text-blue-700 bg-blue-50' },
              { to: '/products', icon: Package, label: 'Products Master Catalog', desc: 'View product timelines', color: 'text-purple-700 bg-purple-50' },
              { to: '/rules', icon: ShieldCheck, label: 'Compliance Rules', desc: 'Legal Metrology 2011 repository', color: 'text-emerald-700 bg-emerald-50' },
            ].map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-sm transition-all"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${action.color}`}>
                  <action.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">{action.label}</div>
                  <div className="text-[11px] text-slate-500">{action.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 ml-auto flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title text-base">Recent Inspections</h2>
            <p className="section-subtitle">Real database inspection records</p>
          </div>
          <Link to="/history" className="btn btn-secondary btn-sm flex items-center gap-1">
            View All History
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {metrics.isEmpty && !demoMode ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
            <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 text-sm">No inspections yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">Scan your first commodity label to record persistent inspection data.</p>
            <Link to="/scan" className="btn btn-primary btn-sm">
              Start Scan Now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Inspection ID</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(demoMode ? DEMO_SCANS : metrics.recentInspections).map(scan => (
                  <tr key={scan.scanId || scan.id}>
                    <td className="font-mono text-teal-800 font-bold">{scan.scanId || scan.id}</td>
                    <td className="font-bold text-slate-900">{scan.productName}</td>
                    <td><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px]">{scan.category}</span></td>
                    <td className="text-slate-500">
                      {scan.createdAt ? format(new Date(scan.createdAt), 'dd MMM yyyy, HH:mm') : scan.scanDate}
                    </td>
                    <td>
                      <StatusBadge status={scan.assessmentStatus || scan.status || scan.overallStatus} size="sm" />
                    </td>
                    <td>
                      <Link
                        to={`/result/${scan.assessmentId || scan.scanId || scan.id}`}
                        className="text-xs text-teal-700 hover:underline font-bold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Assessment
                      </Link>
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
