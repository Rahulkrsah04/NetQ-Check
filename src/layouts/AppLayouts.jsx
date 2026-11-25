import { useState } from 'react';
import { Outlet, Navigate, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/navigation/Navbar';
import Sidebar from '../components/navigation/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Menu, LogOut, Settings, ChevronDown } from 'lucide-react';
import Logo from '../components/ui/Logo';
import toast from 'react-hot-toast';

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
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

      {/* User profile & Logout bar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* User profile with dropdown toggle */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 sm:p-1.5 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none"
            id="topbar-user-menu-btn"
            title="User Profile Menu"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-navy">{user?.displayName || 'User'}</div>
              <div className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">{user?.role || 'Inspector'}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 font-bold text-sm shadow-xs">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* User Dropdown Menu */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-fade-in">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-800 truncate">{user?.displayName}</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">{user?.email}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200/60 rounded">
                    {user?.role}
                  </span>
                </div>
                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Account Settings</span>
                  </Link>
                </div>
                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    id="topbar-dropdown-logout-btn"
                    className="flex items-center gap-2 w-full px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Logout Bar Button */}
        <button
          onClick={handleLogout}
          id="topbar-logout-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-all shadow-2xs"
          title="Sign Out of NetQ Check"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </header>
  );
}


