import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, loginUser, logoutUser, hasRole, DEMO_USERS, ROLES } from '../services/auth/authService';
import { recordAuditLog } from '../services/audit/auditService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const active = getCurrentUser();
    if (active) {
      setUser(active);
    }
    setLoading(false);
  }, []);

  const login = async (email, password, remember = true) => {
    const authenticated = await loginUser(email, password, remember);
    setUser(authenticated);
    recordAuditLog('LOGIN', 'USER', authenticated.uid, { email: authenticated.email, role: authenticated.role }, authenticated);
    return authenticated;
  };

  const switchRole = (newRole) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    localStorage.setItem('netq_auth_user_v4', JSON.stringify(updated));
    recordAuditLog('ROLE_SWITCHED', 'USER', user.uid, { newRole }, updated);
  };

  const logout = () => {
    if (user) {
      recordAuditLog('LOGOUT', 'USER', user.uid, { email: user.email }, user);
    }
    logoutUser();
    setUser(null);
  };

  const checkRole = (roles) => hasRole(user, roles);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        switchRole,
        checkRole,
        demoUsers: DEMO_USERS,
        ROLES,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
