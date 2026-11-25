import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Mail, Lock, User, ArrowRight, CheckCircle, UserCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_USERS, ROLES } from '../services/auth/authService';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [selectedRole, setSelectedRole] = useState(ROLES.INSPECTOR);
  const [email, setEmail] = useState('inspector@netqcheck.gov.in');
  const [password, setPassword] = useState('demo123');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const activeDemoUser = DEMO_USERS.find(u => u.role === selectedRole) || DEMO_USERS[0];

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
    const matched = DEMO_USERS.find(u => u.role === role);
    if (matched) {
      setEmail(matched.email);
      setPassword('demo123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password, true, selectedRole);
        toast.success(`Welcome back to NetQ Check (${selectedRole})!`);
        navigate('/dashboard');
      } else if (mode === 'register') {
        await register(email, password, name, selectedRole);
        toast.success(`Account created successfully as ${selectedRole}!`);
        navigate('/dashboard');
      } else {
        // Forgot password demo
        toast.success('Demo mode: Password reset link sent to your email.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role = selectedRole) => {
    const matched = DEMO_USERS.find(u => u.role === role) || DEMO_USERS[0];
    setError('');
    setLoading(true);
    try {
      await login(matched.email, 'demo123', true, matched.role);
      toast.success(`Signed in as ${matched.displayName} (${matched.role})!`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding & all login versions */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy flex-col items-center justify-center px-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative text-center w-full max-w-sm">
          <div className="flex items-center justify-center mb-6">
            <Logo size="xl" light={true} showTagline={true} />
          </div>
          <p className="text-white/60 text-sm mb-8 max-w-sm mx-auto">Packaged Commodity Compliance & Verification Portal</p>

          <div className="space-y-2.5 text-left max-w-xs mx-auto mb-8">
            {[
              'Scan product labels with OCR parser',
              'Check against Legal Metrology Rules, 2011',
              'Download verified compliance reports as PDF',
              'Track audit history and inspection stats',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-white/75">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>

          {/* All Login Versions / Roles Switcher on Branding Card */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-left max-w-xs mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs text-white/50 mb-1 font-semibold tracking-wider">
              <span>AVAILABLE LOGIN VERSIONS</span>
              <span className="text-[10px] text-teal-300 font-mono">Password: demo123</span>
            </div>
            {DEMO_USERS.map((demo) => {
              const isSelected = selectedRole === demo.role;
              return (
                <div
                  key={demo.role}
                  onClick={() => handleRoleChange(demo.role)}
                  className={`p-2 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-teal-500/20 border-teal-400 text-white shadow-sm'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/70'
                  }`}
                  title={`Click to select ${demo.role} login`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      {demo.role}
                    </span>
                    <span className="text-[10px] text-white/60">{demo.displayName}</span>
                  </div>
                  <div className="text-[11px] font-mono text-white/80 mt-0.5 truncate">{demo.email}</div>
                  <div className="text-[10px] text-white/40 mt-0.5 truncate">{demo.designation}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right panel — form with role switcher */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center mb-8 justify-center">
            <Logo size="lg" showTagline={true} />
          </div>

          <div className="mb-5">
            <h2 className="text-2xl font-bold text-navy">
              {mode === 'login' ? 'Sign in to your account' : mode === 'register' ? 'Create an account' : 'Reset password'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'login' ? 'Choose your login version or enter credentials' :
               mode === 'register' ? 'Fill in the details below to get started' :
               'Enter your email and we\'ll send a reset link'}
            </p>
          </div>

          {/* Role / Login Version Switcher Box — Shifted directly to Login Page */}
          {mode !== 'forgot' && (
            <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-600" />
                  Role: <span className="text-teal-700 font-bold">{selectedRole}</span>
                </span>
                <select
                  id="login-role-select"
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-xs cursor-pointer"
                  title="Switch login version / role"
                >
                  <option value={ROLES.INSPECTOR}>INSPECTOR</option>
                  <option value={ROLES.SUPERVISOR}>SUPERVISOR</option>
                  <option value={ROLES.ADMIN}>ADMIN</option>
                </select>
              </div>

              {/* Quick Role Switcher Chips */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {DEMO_USERS.map((demo) => {
                  const isSelected = selectedRole === demo.role;
                  return (
                    <button
                      key={demo.role}
                      type="button"
                      id={`role-chip-${demo.role.toLowerCase()}`}
                      onClick={() => handleRoleChange(demo.role)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center border ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      {demo.role}
                    </button>
                  );
                })}
              </div>

              {/* Active user preview */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                <span>User: <strong className="text-slate-700">{activeDemoUser.displayName}</strong></span>
                <span className="text-slate-400 text-[10px]">{activeDemoUser.designation}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-error mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="login-name" className="form-label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="login-name"
                    type="text"
                    className="form-input pl-9"
                    placeholder="Your full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="form-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="login-email"
                  type="email"
                  className="form-input pl-9"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label htmlFor="login-password" className="form-label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    className="form-input pl-9 pr-10"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  id="forgot-password-btn"
                  onClick={() => { setMode('forgot'); setError(''); }}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
              id="login-submit-btn"
            >
              {mode === 'login' ? `Sign In as ${selectedRole}` : mode === 'register' ? `Create Account (${selectedRole})` : 'Send Reset Link'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {mode === 'login' && (
            <button
              type="button"
              id="use-demo-btn"
              onClick={() => handleQuickLogin(selectedRole)}
              disabled={loading}
              className="w-full mt-3 py-2 px-3 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200/80 rounded-lg hover:bg-teal-100/80 transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              1-Click Demo Sign In ({activeDemoUser.displayName} — {selectedRole})
            </button>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <button
                  id="switch-to-register"
                  onClick={() => { setMode('register'); setError(''); }}
                  className="text-primary font-medium hover:underline"
                >
                  Create Account
                </button>
              </>
            ) : mode === 'register' ? (
              <>Already have an account?{' '}
                <button
                  id="switch-to-login"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-primary font-medium hover:underline"
                >
                  Sign In
                </button>
              </>
            ) : (
              <button
                onClick={() => { setMode('login'); setError(''); }}
                className="text-primary font-medium hover:underline"
              >
                Back to Sign In
              </button>
            )}
          </div>

          <div className="mt-8 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-xs text-amber-700 text-center leading-relaxed">
              This is a demonstration application. No real legal authority is implied. Compliance results require verification by qualified officers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
