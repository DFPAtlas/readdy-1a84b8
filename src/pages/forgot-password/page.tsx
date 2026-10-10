import type * as React from "react";
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { isDemoMode } from '@/demo/demoConfig';
import { useAuth } from '@/context/AuthProvider';

const RINGS_BG = 'https://storage.readdy-site.link/project_files/db465b55-2978-4a6e-8202-84a3a77c69f8/065bb409-a687-4c47-ac84-cf74a32a70b0_compressed_pexels-nick-greaux-15231247.webp';

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle');
  const formRef = useRef<HTMLFormElement>(null);
  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');

    if (isDemoMode) {
      await new Promise((r) => setTimeout(r, 800));
      setStatus('sent');
      return;
    }

    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const email = (data.get('email') as string).trim().toLowerCase();

    if (email) {
      await requestPasswordReset(email);
    }
    setStatus('sent');
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
            {status === 'sent' ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-4">
                  <i className="ri-mail-check-line text-2xl" />
                </div>
                <h1 className="font-heading text-xl text-foreground-900 mb-2">Check your email</h1>
                <p className="text-sm text-foreground-600 mb-6">
                  If an account exists with that email address, we have sent a password reset link. Please check your inbox and spam folder.
                </p>
                {isDemoMode && (
                  <p className="text-xs text-amber-600 mb-4 font-label">
                    Demo Mode: No real email was sent. This is a simulated experience.
                  </p>
                )}
                <Link to="/login" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-secondary-200 text-foreground-700 px-5 py-2.5 text-sm font-medium font-label cursor-pointer hover:bg-secondary-50 transition-all">
                  Back to log in
                </Link>
              </div>
            ) : (
              <>
                <h1 className="font-heading text-xl text-foreground-900 mb-2">Reset your password</h1>
                <p className="text-sm text-foreground-600 mb-6">
                  Enter your email address and we will send you a link to reset your password.
                </p>

                <form ref={formRef} onSubmit={handleSubmit} noValidate>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="forgot-email" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                        Email address
                      </label>
                      <input
                        id="forgot-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                        placeholder="your@email.com"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-primary-500 text-white px-6 py-3 text-sm font-medium font-label cursor-pointer hover:bg-primary-600 transition-all disabled:opacity-50"
                    >
                      {status === 'submitting' ? (
                        <><i className="ri-loader-4-line animate-spin mr-2" /> Sending...</>
                      ) : (
                        'Send reset link'
                      )}
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

          <div className="mt-6 p-4 rounded-lg bg-white/60 backdrop-blur-sm border border-white/40 text-center">
            <p className="text-xs text-foreground-500">
              For your security, we never reveal whether an email address is registered with Vowora.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}