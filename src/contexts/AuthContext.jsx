import { createContext, useContext, useState, useEffect } from 'react';

// ============================================================
// NetQ Check — Auth Context
// Provides demo authentication. Replace with Firebase Auth
// by setting VITE_USE_FIREBASE=true in .env
// ============================================================

const AuthContext = createContext(null);

const DEMO_USER = {
  uid: 'demo_user_001',
  email: 'inspector@netqcheck.gov.in',
  displayName: 'Inspector Demo',
  role: 'inspector',
  organization: 'Legal Metrology Inspection Authority',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for persisted session
    const saved = sessionStorage.getItem('lm_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Demo login — accepts any credentials with basic validation
    if (!email || !password) throw new Error('Please enter email and password');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');

    const demoUser = { ...DEMO_USER, email };
    setUser(demoUser);
    sessionStorage.setItem('lm_user', JSON.stringify(demoUser));
    return demoUser;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('lm_user');
  };

  const register = async (email, password, name) => {
    if (!email || !password || !name) throw new Error('All fields are required');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');

    const newUser = { ...DEMO_USER, email, displayName: name };
    setUser(newUser);
    sessionStorage.setItem('lm_user', JSON.stringify(newUser));
    return newUser;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
