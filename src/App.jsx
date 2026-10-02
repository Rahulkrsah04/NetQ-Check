import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { PublicLayout, DashboardLayout } from './layouts/AppLayouts';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ComplianceRulesPublic from './pages/ComplianceRulesPublic';

// Authenticated Pages
import Dashboard from './pages/Dashboard';
import ScanProduct from './pages/ScanProduct';
import ComplianceResult from './pages/ComplianceResult';
import ScanHistory from './pages/ScanHistory';
import Reports from './pages/Reports';
import ComplianceRulesPage from './pages/ComplianceRulesPage';
import ProductsPage from './pages/ProductsPage';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/how-it-works" element={<LandingPage />} />
            <Route path="/compliance-rules" element={<ComplianceRulesPublic />} />
            <Route path="/about" element={<LandingPage />} />
          </Route>

          {/* Auth Routes (no layout) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Dashboard Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scan" element={<ScanProduct />} />
            <Route path="/result/:id" element={<ComplianceResult />} />
            <Route path="/history" element={<ScanHistory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/rules" element={<ComplianceRulesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#172033',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
            },
            success: {
              iconTheme: { primary: '#16A34A', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#DC2626', secondary: '#fff' },
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}
