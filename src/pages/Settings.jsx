import { useState } from 'react';
import { User, Bell, Shield, Database, Info, Save, ScrollText, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, switchRole, checkRole, ROLES } = useAuth();
  const [ocrProvider, setOcrProvider] = useState('mock');
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast.success('Platform configuration saved successfully');
  };

  return (
    <div className="max-w-3xl animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Settings & Administration</h1>
          <p className="page-desc">Manage account identity, platform preferences and database configurations</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <h2 className="section-title text-sm">Authenticated Inspector Profile</h2>
            </div>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
              Active Role: {user?.role || 'INSPECTOR'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name</label>
              <input className="form-input text-xs" defaultValue={user?.displayName || 'Raj Kumar'} disabled />
            </div>
            <div>
              <label className="form-label">Government Email</label>
              <input className="form-input text-xs" defaultValue={user?.email || 'inspector@netqcheck.gov.in'} disabled />
            </div>
            <div>
              <label className="form-label">Role Designation</label>
              <input className="form-input text-xs" defaultValue={user?.designation || 'Legal Metrology Inspector'} disabled />
            </div>
            <div>
              <label className="form-label">Enforcement Division</label>
              <input className="form-input text-xs" defaultValue={user?.organization || 'Department of Consumer Affairs'} disabled />
            </div>
          </div>

          {/* Quick Role Switcher for Testing */}
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-teal-700" />
                Demo Role Switcher
              </div>
              <div className="text-[11px] text-slate-500">Switch active session role to test RBAC capabilities</div>
            </div>

            <select
              value={user?.role || ROLES.INSPECTOR}
              onChange={(e) => switchRole(e.target.value)}
              className="form-input text-xs font-semibold text-teal-800 bg-white py-1 px-3 w-40"
            >
              <option value={ROLES.INSPECTOR}>INSPECTOR</option>
              <option value={ROLES.SUPERVISOR}>SUPERVISOR</option>
              <option value={ROLES.ADMIN}>ADMIN</option>
            </select>
          </div>
        </div>

        {/* Audit Log Shortcut for Admins & Supervisors */}
        {checkRole([ROLES.ADMIN, ROLES.SUPERVISOR]) && (
          <div className="card bg-teal-50/60 border-2 border-teal-200 p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <ScrollText className="w-6 h-6 text-teal-700 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Statutory Audit Trail Logs</h3>
                <p className="text-xs text-slate-600">Access immutable system audit trail for legal compliance verification</p>
              </div>
            </div>
            <Link to="/audit" className="btn btn-primary btn-sm flex items-center gap-1.5">
              Open Audit Logs
            </Link>
          </div>
        )}

        {/* OCR Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="section-title text-sm">OCR Vision & Extraction Configuration</h2>
          </div>
          <div>
            <label className="form-label">Active OCR Provider Engine</label>
            <select
              id="ocr-provider-select"
              className="form-input text-xs"
              value={ocrProvider}
              onChange={e => setOcrProvider(e.target.value)}
            >
              <option value="mock">Mock Vision Engine (Development / Testing)</option>
              <option value="tesseract">Tesseract.js WASM Engine (Client-side)</option>
              <option value="google-vision">Google Cloud Vision API (Enterprise Production)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              Configured for automated declaration parsing under Legal Metrology (Packaged Commodities) Rules, 2011.
            </p>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="section-title text-sm">Compliance Notifications</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-navy">Non-Compliance Alerts</div>
              <div className="text-xs text-gray-400">Trigger instant alert when mandatory declarations are missing</div>
            </div>
            <button
              id="notifications-toggle"
              onClick={() => setNotifications(!notifications)}
              className={`w-10 h-5.5 rounded-full transition-colors relative ${notifications ? 'bg-primary' : 'bg-gray-200'}`}
              style={{ height: '22px' }}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifications ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Database & Repository Architecture */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="section-title text-sm">Database & Repository Architecture</h2>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-gray-500">Repository Mode</span>
              <span className="text-teal-800 font-bold">Local Repository Adapter (Phase 4 Ready)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-gray-500">Firebase Migration Interface</span>
              <span className="text-emerald-700 font-semibold">Ready for Firebase Integration</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Rule Engine Version</span>
              <span className="text-slate-900 font-mono font-bold">PC_RULES_2011_V1 (Engine v3.0.0)</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button variant="primary" icon={Save} loading={saving} onClick={handleSave} id="save-settings-btn">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
