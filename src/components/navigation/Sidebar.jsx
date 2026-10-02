import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Camera, History, FileText, ShieldCheck,
  Package, Settings, LogOut, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../ui/Logo';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scan', label: 'Scan Product', icon: Camera },
  { to: '/history', label: 'Scan History', icon: History },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/rules', label: 'Compliance Rules', icon: ShieldCheck },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-navy/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-navy flex flex-col z-50 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 flex-shrink-0">
          <Logo size="md" light={true} showTagline={true} />
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden text-white/60 hover:text-white p-1"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              id={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="px-3 pb-4 flex-shrink-0 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-xs">
                {user?.displayName?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.displayName || 'User'}</div>
              <div className="text-white/40 text-[10px] truncate">{user?.email || ''}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            id="sidebar-logout-btn"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/10 transition-all mt-1"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

