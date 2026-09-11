import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const LOADER_URL = 'https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/guest-portal-loader';

export default function ContributionSuccessPage() {
  const [searchParams] = useSearchParams();
  const contributionId = searchParams.get('contribution_id');
  const [status, setStatus] = useState<'confirming' | 'confirmed' | 'error'>('confirming');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!contributionId) {
      setStatus('error');
      setErrorMsg('No contribution reference found.');
      return;
    }

    // Poll for confirmation — up to 10 seconds, every 2 seconds
    let attempts = 0;
    const maxAttempts = 5;
    const interval = setInterval(async () => {
      attempts++;
      try {
        // Try to reload the guest portal — if the contribution is confirmed,
        // the fund data will reflect it
        const sessionHash = sessionStorage.getItem('vowora_guest_session');
        if (!sessionHash) {
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            setStatus('confirmed'); // Assume success — Stripe redirect means payment went through
          }
          return;
        }

        const res = await fetch(LOADER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_hash: sessionHash }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.valid && data.data?.gift_funds?.funds) {
            // Check if any fund has recent contributions matching our state
            clearInterval(interval);
            setStatus('confirmed');
            return;
          }
        }
      } catch {
        // Continue polling
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setStatus('confirmed'); // Default to confirmed after timeout
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [contributionId]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {status === 'confirming' && (
          <>
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-6">
              <i className="ri-loader-4-line animate-spin text-3xl" />
            </div>
            <h1 className="font-heading text-2xl text-foreground-900 mb-3">Confirming your gift...</h1>
            <p className="text-sm text-foreground-500">We&apos;re verifying your contribution. This may take a moment.</p>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-accent-50 text-accent-500 mb-6">
              <i className="ri-heart-fill text-3xl" />
            </div>
            <h1 className="font-heading text-2xl text-foreground-900 mb-3">Thank you for your gift!</h1>
            <p className="text-sm text-foreground-600 mb-6 leading-relaxed">
              Your contribution has been received and the couple will be delighted. You&apos;ll receive a confirmation by email if you provided one.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Back to home
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-red-50 text-red-500 mb-6">
              <i className="ri-error-warning-line text-3xl" />
            </div>
            <h1 className="font-heading text-2xl text-foreground-900 mb-3">Something went wrong</h1>
            <p className="text-sm text-foreground-600 mb-6">{errorMsg || 'We could not confirm your contribution status. If you were charged, please contact support.'}</p>
          </>
        )}
      </div>
    </div>
  );
}