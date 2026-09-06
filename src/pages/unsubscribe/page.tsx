import { useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isDemoMode } from '@/demo/demoConfig';
import { supabase } from '@/lib/supabase';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';
  const typeParam = searchParams.get('type') || 'all';

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(emailParam);
  const [prefType, setPrefType] = useState<'all' | 'marketing' | 'updates'>(typeParam === 'marketing' ? 'marketing' : typeParam === 'updates' ? 'updates' : 'all');
  const formRef = useRef<HTMLFormElement>(null);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const honeypotEl = formRef.current?.querySelector('[name="company_alt"]') as HTMLInputElement;
    const honeypot = honeypotEl?.value?.trim();
    if (honeypot) {
      setStatus('success');
      setMessage('Your preferences have been updated.');
      return;
    }

    setStatus('submitting');

    try {
      if (!isDemoMode && supabase) {
        // Record suppression in email_suppressions table
        const { error } = await supabase
          .from('email_suppressions')
          .upsert({
            email: email.trim().toLowerCase(),
            suppression_type: prefType,
            suppressed_at: new Date().toISOString(),
            source: 'unsubscribe_page',
            token: tokenParam || null,
          }, { onConflict: 'email' });

        if (error) throw error;
      }

      setStatus('success');
      setMessage(
        prefType === 'all'
          ? 'You have been unsubscribed from all Vowora emails. This change is effective immediately.'
          : prefType === 'marketing'
            ? 'You have been unsubscribed from marketing emails. You will still receive essential service communications.'
            : 'You have been unsubscribed from wedding update emails.'
      );
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again or contact us for help.');
    }
  };

  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="max-w-lg mx-auto px-4 md:px-6">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-4">
              <i className="ri-mail-close-line text-2xl" />
            </div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">Email Preferences</h1>
            <p className="text-sm text-foreground-500">
              Manage which emails you receive from Vowora.
            </p>
          </div>

          <div className="bg-white border border-secondary-200 rounded-xl p-6 md:p-8">
            {status === 'success' ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                  <i className="ri-check-line text-xl" />
                </div>
                <p className="text-sm text-foreground-700 leading-relaxed mb-6">{message}</p>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-primary-500 text-white px-5 py-2.5 text-sm font-label font-medium cursor-pointer hover:bg-primary-600 transition-colors"
                >
                  Return to Vowora
                </Link>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleUnsubscribe} noValidate>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="unsub-email" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                      Email address
                    </label>
                    <input
                      id="unsub-email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                      What would you like to unsubscribe from?
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'all', label: 'All emails', desc: 'Stop receiving all emails from Vowora' },
                        { value: 'marketing', label: 'Marketing emails only', desc: 'Keep essential service emails, stop marketing' },
                        { value: 'updates', label: 'Wedding updates only', desc: 'Stop wedding update emails, keep account notifications' },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            prefType === opt.value
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-secondary-200 hover:border-secondary-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="preference_type"
                            value={opt.value}
                            checked={prefType === opt.value as typeof prefType}
                            onChange={() => setPrefType(opt.value as typeof prefType)}
                            className="mt-0.5 w-4 h-4 text-primary-500 focus:ring-primary-400 cursor-pointer"
                          />
                          <div>
                            <span className="text-sm font-label font-medium text-foreground-900">{opt.label}</span>
                            <p className="text-xs text-foreground-500 mt-0.5">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Honeypot */}
                  <div className="form-hp-field">
                    <label htmlFor="unsub-hp">Company</label>
                    <input id="unsub-hp" name="company_alt" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly />
                  </div>

                  {status === 'error' && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'submitting' || !email.trim()}
                    className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-primary-500 text-white px-5 py-2.5 text-sm font-label font-medium cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-all"
                  >
                    {status === 'submitting' ? 'Updating...' : 'Update preferences'}
                  </button>

                  <p className="text-center text-xs text-foreground-400">
                    Changes take effect immediately.{' '}
                    <Link to="/privacy" className="text-primary-600 hover:underline cursor-pointer">Privacy Policy</Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}