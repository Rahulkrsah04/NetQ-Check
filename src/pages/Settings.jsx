import { useState } from 'react';
import { User, Bell, Shield, Database, Info, Save } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  const [ocrProvider, setOcrProvider] = useState('mock');
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    toast.success('Settings saved');
  };

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-desc">Manage your account and application preferences</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-primary" />
            <h2 className="section-title text-sm">Profile Information</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name</label>
              <input className="form-input" defaultValue={user?.displayName} disabled />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" defaultValue={user?.email} disabled />
            </div>
            <div>
              <label className="form-label">Role</label>
              <input className="form-input" defaultValue={user?.role || 'Inspector'} disabled />
            </div>
            <div>
              <label className="form-label">Organization</label>
              <input className="form-input" defaultValue={user?.organization || '—'} disabled />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Profile editing is disabled in demo mode. Connect Firebase Auth to enable.</p>
        </div>

        {/* OCR Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="section-title text-sm">OCR Configuration</h2>
          </div>
          <div>
            <label className="form-label">OCR Provider</label>
            <select
              id="ocr-provider-select"
              className="form-input"
              value={ocrProvider}
              onChange={e => setOcrProvider(e.target.value)}
            >
              <option value="mock">Mock OCR (Demo / Development)</option>
              <option value="tesseract">Tesseract.js (In-browser OCR)</option>
              <option value="google-vision">Google Cloud Vision API (Coming soon)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              "Mock OCR" generates realistic demo data without calling any external service. Switch to Tesseract for real OCR from uploaded images.
            </p>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="section-title text-sm">Notifications</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-navy">Compliance Alerts</div>
              <div className="text-xs text-gray-400">Notify when a scan detects non-compliant products</div>
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

        {/* Database */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="section-title text-sm">Database & Storage</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-gray-500">Mode</span>
              <span className="text-navy font-medium">Demo (Local Storage)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-gray-500">Firebase Status</span>
              <span className="text-warning font-medium">Not Connected</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Total Scans Stored</span>
              <span className="text-navy font-medium">5 (demo)</span>
            </div>
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            To connect Firebase: fill in your credentials in <code className="font-mono bg-blue-100 px-1 rounded">.env</code> file and set <code className="font-mono bg-blue-100 px-1 rounded">VITE_USE_FIREBASE=true</code>
          </div>
        </div>

        {/* About */}
        <div className="card bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <h2 className="section-title text-sm">About NetQ Check</h2>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between"><span>Version</span><span className="font-medium text-navy">1.0.0 (Release)</span></div>
            <div className="flex justify-between"><span>Legal Reference</span><span className="font-medium text-navy">LM (PC) Rules, 2011</span></div>
            <div className="flex justify-between"><span>Build</span><span className="font-medium text-navy">React + Vite + Tailwind</span></div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" icon={Save} loading={saving} onClick={handleSave} id="save-settings-btn">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
