import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { confirmationDestination } from '@/lib/authCallback';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");
  const [destination, setDestination] = useState('/app/onboarding');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // Demo mode — redirect to login
    if (isDemoMode) {
      navigate('/login', { replace: true });
      return;
    }

    const handleCallback = async () => {
      try {
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        if (params.get('error') || fragment.get('error')) throw new Error('Confirmation link unavailable');
        const tokenHash = params.get('token_hash');
        const type = params.get('type');
        if (tokenHash) {
          if (!type || !['signup', 'email', 'invite', 'magiclink'].includes(type)) throw new Error('Invalid confirmation type');
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
          if (error) throw error;
        }
        // getSession waits for the SDK's implicit-token / PKCE initialization.
        let { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session && params.get('code')) {
          const result = await supabase.auth.exchangeCodeForSession(params.get('code')!);
          if (result.error) throw result.error;
          session = result.data.session;
        }
        if (!session) throw new Error('No session established');
        const { data: profile, error: profileError } = await supabase.from('profiles').select('onboarding_completed').eq('id', session.user.id).maybeSingle();
        if (profileError) throw profileError;
        const target = confirmationDestination(next, session.user.user_metadata, profile?.onboarding_completed === true);
        setDestination(target);
        setStatus('success');
        navigate(target, { replace: true });
      } catch {
        setStatus('error');
      }
    };

    handleCallback();
  }, [navigate, next, params]);

  return (
    <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="font-heading text-3xl font-semibold text-foreground-900 inline-block mb-8 cursor-pointer">
          Vowora
        </Link>

        {status === 'verifying' && (
          <div className="bg-white border border-secondary-100 rounded-xl p-8">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-5">
              <i className="ri-loader-4-line animate-spin text-2xl" />
            </div>
            <h1 className="font-heading text-xl text-foreground-900 mb-2">Verifying your email</h1>
            <p className="text-sm text-foreground-500">Please wait while we confirm your account...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white border border-secondary-100 rounded-xl p-8">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-5">
              <i className="ri-check-line text-2xl" />
            </div>
            <h1 className="font-heading text-xl text-foreground-900 mb-2">Email verified</h1>
            <p className="text-sm text-foreground-500 mb-6">Your account has been confirmed. Continuing to your account...</p>
            <Link to={destination} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
              Continue to your account <i className="ri-arrow-right-line" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white border border-secondary-100 rounded-xl p-8">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-red-50 text-red-500 mb-5">
              <i className="ri-error-warning-line text-2xl" />
            </div>
            <h1 className="font-heading text-xl text-foreground-900 mb-2">Verification failed</h1>
            <p className="text-sm text-foreground-500 mb-6">
              We could not verify your email address. The link may have expired or already been used.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
                Go to login
              </Link>
              <Link to="/" className="text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer">
                Back to Vowora
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}