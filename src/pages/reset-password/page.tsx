import type * as React from "react";
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useAuth } from '@/context/AuthProvider';

const RINGS_BG = 'https://storage.readdy-site.link/project_files/db465b55-2978-4a6e-8202-84a3a77c69f8/065bb409-a687-4c47-ac84-cf74a32a70b0_compressed_pexels-nick-greaux-15231247.webp';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword, authError, clearAuthError } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'checking' | 'ready' | 'success' | 'expired'>('checking');
  const checkedRef = useRef(false);

  // Check for a valid recovery session on mount
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    if (isDemoMode) {
      setStatus('ready');
      return;
    }

    const checkRecoverySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setStatus('expired');
          return;
        }

        // Check if this is a recovery session (has aal2 or recovery in user metadata)
        // The session type check: password recovery sessions have specific properties
        setStatus('ready');
      } catch {
        setStatus('expired');
      }
    };

    checkRecoverySession();
  }, []);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!password) errors.password = 'New password is required';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearAuthError();
    if (!validate()) return;
    setLoading(true);

    if (isDemoMode) {
      await new Promise((r) => setTimeout(r, 800));
      setLoading(false);
      setStatus('success');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    const ok = await updatePassword(password);
    setLoading(false);
    if (ok) {
      setStatus('success');
      setTimeout(() => navigate('/app/dashboard'), 2000);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={RINGS_BG} alt="" className="w-full h-full object-cover" aria-hidden="true" />
        <div className="absolute inset-0 bg-white/70" />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="font-heading text-3xl font-semibold text-foreground-900 cursor-pointer">
              Vowora
            </Link>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm p-6 md:p-8">
            {status === 'checking' && (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
                  <i className="ri-loader-4-line animate-spin text-xl" />
                </div>
                <p className="text-sm text-foreground-500">Verifying your reset link...</p>
              </div>
            )}

            {status === 'expired' && (
              <div className="text-center py-6">
                <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4">
                  <i className="ri-time-line text-2xl" />
                </div>
                <h1 className="font-heading text-xl text-foreground-900 mb-2">Link expired</h1>
                <p className="text-sm text-foreground-600 mb-6">
                  This password reset link has expired or is no longer valid. Please request a new one.
                </p>
                <Link to="/forgot-password" className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
                  Request new link
                </Link>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center py-6">
                <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-4">
                  <i className="ri-shield-check-line text-2xl" />
                </div>
                <h1 className="font-heading text-xl text-foreground-900 mb-2">Password updated</h1>
                <p className="text-sm text-foreground-600">
                  Your password has been changed successfully.
                  {!isDemoMode && ' Redirecting you to the dashboard...'}
                </p>
                {isDemoMode && (
                  <Link to="/login" className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap mt-6">
                    Back to login
                  </Link>
                )}
              </div>
            )}

            {status === 'ready' && (
              <>
                <h1 className="font-heading text-xl text-foreground-900 mb-2">Set a new password</h1>
                <p className="text-sm text-foreground-600 mb-6">
                  Choose a strong password for your account.
                </p>

                {isDemoMode && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-700">
                      Demo Mode: Password reset is simulated. No real email was sent.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="reset-password" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                        New password
                      </label>
                      <div className="relative">
                        <input
                          id="reset-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all pr-10 ${fieldErrors.password ? 'border-primary-400 ring-1 ring-primary-200' : 'border-secondary-200'}`}
                          placeholder="At least 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-base`} />
                        </button>
                      </div>
                      {fieldErrors.password && <p className="text-xs text-primary-600 mt-1">{fieldErrors.password}</p>}
                    </div>

                    <div>
                      <label htmlFor="reset-confirm" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                        Confirm new password
                      </label>
                      <div className="relative">
                        <input
                          id="reset-confirm"
                          name="confirm_password"
                          type={showConfirm ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all pr-10 ${fieldErrors.confirmPassword ? 'border-primary-400 ring-1 ring-primary-200' : 'border-secondary-200'}`}
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
                          aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        >
                          <i className={`${showConfirm ? 'ri-eye-off-line' : 'ri-eye-line'} text-base`} />
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && <p className="text-xs text-primary-600 mt-1">{fieldErrors.confirmPassword}</p>}
                    </div>

                    {authError && (
                      <div className="p-3 rounded-md bg-primary-50 border border-primary-200 text-sm text-primary-800">
                        {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-primary-500 text-white px-6 py-3 text-sm font-medium font-label cursor-pointer hover:bg-primary-600 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Updating password...' : 'Set new password'}
                    </button>
                  </div>
                </form>
              </>
            )}

            <div className="mt-5 pt-5 border-t border-secondary-100 text-center">
              <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer">
                Back to log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}