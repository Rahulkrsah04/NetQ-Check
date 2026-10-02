import { useState } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import Navbar from '../components/navigation/Navbar';
import Sidebar from '../components/navigation/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Menu } from 'lucide-react';
import Logo from '../components/ui/Logo';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <footer className="bg-navy text-white py-10 mt-16">
        <div className="page-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="mb-3">
                <Logo size="md" light={true} showTagline={true} />
              </div>
              <p className="text-white/50 text-xs leading-relaxed">
                Smart Compliance & Inspection System for Packaged Commodities. Automated preliminary screening under Legal Metrology (Packaged Commodities) Rules, 2011.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Quick Links</h4>
              <ul className="space-y-1.5 text-xs text-white/50">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link to="/compliance-rules" className="hover:text-white transition-colors">Compliance Rules</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Legal Notice</h4>
              <p className="text-white/40 text-xs leading-relaxed">
                This tool provides automated preliminary screening only. It does not constitute legal advice. Final determination requires verification against applicable rules and inspection by a qualified officer.
              </p>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-white/30">
            © 2026 NetQ Check. Built for compliance professionals. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export function DashboardLayout() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading NetQ Check…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar (handles desktop + mobile drawer) */}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 min-w-0">
        <DashboardTopbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="p-4 sm:p-6 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function DashboardTopbar({ onOpenMobile }) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile: Hamburger toggle */}
        <button
          onClick={onOpenMobile}
          className="lg:hidden text-navy hover:text-primary p-1.5 rounded-lg border border-border"
          aria-label="Open sidebar menu"
          id="mobile-hamburger-btn"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center">
          <Logo size="sm" showTagline={false} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-semibold text-navy">{user?.displayName || 'User'}</div>
          <div className="text-[10px] text-gray-400">{user?.role || 'Inspector'}</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer border border-primary/20">
          <span className="text-primary font-bold text-sm">{user?.displayName?.charAt(0) || 'U'}</span>
        </div>
      </div>
    </header>
  );
}


