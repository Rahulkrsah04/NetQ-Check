// ============================================================
// NetQ Check — Role-Based Protected Route Component
// Guards pages based on authentication state and user roles (INSPECTOR, SUPERVISOR, ADMIN)
// ============================================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, checkRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center p-8">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Verifying Inspection Platform Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !checkRole(allowedRoles)) {
    return (
      <div className="p-8 max-w-3xl mx-auto my-12 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-red-200 dark:border-red-900/50 text-center">
        <div className="inline-flex p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          Your role (<span className="font-semibold text-teal-600 dark:text-teal-400">{user.role}</span>) does not have authorization to view this page or execute this administrative action.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="#/dashboard"
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}
