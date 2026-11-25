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

  const login = async (email, password, remember = true, roleOverride = null) => {
    const authenticated = await loginUser(email, password, remember, roleOverride);
    setUser(authenticated);
    recordAuditLog('LOGIN', 'USER', authenticated.uid, { email: authenticated.email, role: authenticated.role }, authenticated);
    return authenticated;
  };

  const register = async (email, password, name, role = ROLES.INSPECTOR) => {
    const cleanEmail = email.trim().toLowerCase();
    const newUser = {
      uid: `USR-${Date.now()}`,
      email: cleanEmail,
      displayName: name || cleanEmail.split('@')[0],
      role: role || ROLES.INSPECTOR,
      designation: role === ROLES.ADMIN ? 'System Administrator' : role === ROLES.SUPERVISOR ? 'Senior Enforcement Officer' : 'Legal Metrology Inspector',
      organization: 'Legal Metrology Department',
      badgeNumber: `REG-${Math.floor(Math.random() * 9000 + 1000)}`,
    };
    setUser(newUser);
    localStorage.setItem('netq_auth_user_v4', JSON.stringify(newUser));
    recordAuditLog('REGISTER', 'USER', newUser.uid, { email: newUser.email, role: newUser.role }, newUser);
    return newUser;
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
        register,
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
