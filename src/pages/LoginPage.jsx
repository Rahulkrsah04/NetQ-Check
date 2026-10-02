import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('Welcome back to NetQ Check!');
        navigate('/dashboard');
      } else if (mode === 'register') {
        await register(email, password, name);
        toast.success('Account created successfully!');
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

  const useDemoAccount = () => {
    setEmail('inspector@netqcheck.gov.in');
    setPassword('demo123');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy flex-col items-center justify-center px-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative text-center">
          <div className="flex items-center justify-center mb-6">
            <Logo size="xl" light={true} showTagline={true} />
          </div>
          <p className="text-white/60 text-sm mb-10 max-w-sm mx-auto">Packaged Commodity Compliance & Verification Portal</p>

          <div className="space-y-3 text-left max-w-xs mx-auto">
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

          <div className="mt-10 p-4 bg-white/5 border border-white/10 rounded-xl text-left max-w-xs mx-auto">
            <div className="text-xs text-white/40 mb-2 font-medium">DEMO CREDENTIALS</div>
            <div className="text-xs text-white/70 font-mono">Email: inspector@netqcheck.gov.in</div>
            <div className="text-xs text-white/70 font-mono">Password: (any 6+ characters)</div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center mb-8 justify-center">
            <Logo size="lg" showTagline={true} />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-navy">
              {mode === 'login' ? 'Sign in to your account' : mode === 'register' ? 'Create an account' : 'Reset password'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'login' ? 'Enter your credentials to continue' :
               mode === 'register' ? 'Fill in the details below to get started' :
               'Enter your email and we\'ll send a reset link'}
            </p>
          </div>

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
              {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {mode === 'login' && (
            <button
              type="button"
              id="use-demo-btn"
              onClick={useDemoAccount}
              className="w-full mt-3 py-2 text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Use demo account credentials
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
