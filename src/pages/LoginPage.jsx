import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Server,
  KeyRound,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate form fields before submission
  const validate = () => {
    const errors = {};
    if (!username.trim()) {
      errors.username = 'Username or email is required';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(username, password, rememberMe);

      // On successful login, return to the intended page or Overview
      const redirectPath = location.state?.from?.pathname || '/';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Authentication failed. Please verify your credentials.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background ambient accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white shadow-xl shadow-blue-500/20 mb-4 ring-4 ring-slate-800">
          <Building2 className="w-7 h-7" aria-hidden="true" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          Smart Office
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Enterprise
          </span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to your workplace account to access administrative services
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          {/* Server / Network Error Alert */}
          {serverError && (
            <div
              className="mb-6 rounded-xl bg-rose-50 border border-rose-200/80 p-4 flex items-start gap-3 text-left transition-all"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 text-xs sm:text-sm text-rose-800 leading-snug">
                {serverError}
              </div>
              <button
                type="button"
                onClick={() => setServerError(null)}
                className="text-rose-400 hover:text-rose-600 p-0.5 rounded"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Username Input */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Username or Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  disabled={isSubmitting}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) {
                      setFieldErrors((prev) => ({ ...prev, username: null }));
                    }
                  }}
                  placeholder="Enter your assigned username"
                  className={`block w-full rounded-lg border text-sm text-slate-900 bg-white placeholder:text-slate-400 pl-10 pr-3.5 py-2.5 transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.username
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 text-rose-900'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                />
              </div>
              {fieldErrors.username && (
                <p id="username-error" className="mt-1.5 text-xs text-rose-600 font-medium">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: null }));
                    }
                  }}
                  placeholder="Enter your account password"
                  className={`block w-full rounded-lg border text-sm text-slate-900 bg-white placeholder:text-slate-400 pl-10 pr-10 py-2.5 transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.password
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 text-rose-900'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:text-blue-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-rose-600 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={isSubmitting}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember this device</span>
              </label>

              <span
                className="text-slate-400 hover:text-slate-600 cursor-help"
                title="Contact your system administrator if credentials are lost"
              >
                Forgot password?
              </span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                leftIcon={LogIn}
                className="w-full shadow-md"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
              </Button>
            </div>
          </form>

          {/* Backend Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-teal-600" />
              Port 8080 API
            </span>
            <span className="font-mono text-slate-400">POST /api/auth/login</span>
          </div>
        </div>

        {/* Security Trust Badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Stateless JWT</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-blue-400" />
            <span>Role-Based Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
