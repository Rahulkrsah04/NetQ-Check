// ============================================================
// NetQ Check — Authentication & Role-Based Access Service
// Abstracted Auth service supporting Inspectors, Supervisors & Admins
// ============================================================

export const ROLES = {
  INSPECTOR: 'INSPECTOR',
  SUPERVISOR: 'SUPERVISOR',
  ADMIN: 'ADMIN',
};

export const DEMO_USERS = [
  {
    uid: 'USR-INSP-01',
    email: 'inspector@netqcheck.gov.in',
    displayName: 'Raj Kumar',
    role: ROLES.INSPECTOR,
    designation: 'Legal Metrology Inspector',
    organization: 'Department of Consumer Affairs (Delhi Zone)',
    badgeNumber: 'LMI-DL-2024-88',
  },
  {
    uid: 'USR-SUP-01',
    email: 'supervisor@netqcheck.gov.in',
    displayName: 'Priya Sharma',
    role: ROLES.SUPERVISOR,
    designation: 'Senior Enforcement Officer',
    organization: 'Legal Metrology Enforcement Division',
    badgeNumber: 'SEO-DL-2022-14',
  },
  {
    uid: 'USR-ADM-01',
    email: 'admin@netqcheck.gov.in',
    displayName: 'Anil Mehta',
    role: ROLES.ADMIN,
    designation: 'System Administrator',
    organization: 'National Informatics & Compliance Hub',
    badgeNumber: 'ADM-HQ-2021-01',
  },
];

const AUTH_STORAGE_KEY = 'netq_auth_user_v4';

/**
 * Get currently authenticated user from session/storage
 */
export function getCurrentUser() {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error('Failed to parse saved auth session', err);
  }
  return null;
}

/**
 * Authenticate user by email & password or demo credentials
 */
export async function loginUser(email, password, rememberMe = true) {
  if (!email || !password) throw new Error('Please provide email and password');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  // Match demo user or create Inspector session
  const cleanEmail = email.trim().toLowerCase();
  const matchedDemo = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail);

  const user = matchedDemo || {
    uid: `USR-${Date.now()}`,
    email: cleanEmail,
    displayName: cleanEmail.split('@')[0].replace('.', ' '),
    role: ROLES.INSPECTOR,
    designation: 'Legal Metrology Inspector',
    organization: 'Legal Metrology Inspection Division',
    badgeNumber: `LMI-${Math.floor(Math.random() * 9000 + 1000)}`,
  };

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  return user;
}

/**
 * Log out user session
 */
export function logoutUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * Check if user has required role
 * @param {Object} user
 * @param {string|Array<string>} requiredRoles
 */
export function hasRole(user, requiredRoles) {
  if (!user || !user.role) return false;
  if (user.role === ROLES.ADMIN) return true; // Admin has all permissions
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(user.role);
  }
  return user.role === requiredRoles;
}
