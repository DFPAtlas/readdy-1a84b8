import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { safeReturnPath, accountDestination } from '@/lib/signupIntent';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeReturnPath(params.get("next"));
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
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
        // Supabase handles the OAuth/callback code exchange automatically
        // through the PKCE flow. Just verify we have a session.
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!session) {
          // Try exchanging the code via hash params — Supabase sometimes
          // redirects with the access token in the URL hash
          const hash = window.location.hash;
          if (hash) {
            const { data: { session: hashSession }, error: hashErr } = await supabase.auth.getSession();
            if (hashErr) throw hashErr;
            if (hashSession) {
              setStatus('success');
              setTimeout(() => navigate(next || accountDestination(session?.user?.user_metadata), { replace: true }), 1200);
              return;
            }
          }
          throw new Error('No session established');
        }

        setStatus('success');
        setTimeout(() => navigate(next || accountDestination(session?.user?.user_metadata), { replace: true }), 1200);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Verification failed';
        setErrorMsg(message);
        setStatus('error');
      }
    };

    handleCallback();
  }, [navigate, next]);

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
            <p className="text-sm text-foreground-500 mb-6">Your account has been confirmed. Redirecting you to the dashboard...</p>
            <Link to="/app/dashboard" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
              Go to dashboard <i className="ri-arrow-right-line" />
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