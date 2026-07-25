import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  type CookieCategory,
  type CookieConsentState,
  COOKIE_CONSENT_VERSION,
  COOKIE_CATEGORY_LABELS,
  loadConsentState,
  saveConsentState,
} from '@/lib/cookieConsent';

interface CookieConsentBannerProps {
  onConsentChange?: (state: CookieConsentState) => void;
}

export function CookieConsentBanner({ onConsentChange }: CookieConsentBannerProps) {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [categories, setCategories] = useState<Record<CookieCategory, boolean>>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const existing = loadConsentState();
    if (!existing) {
      // Small delay so the banner doesn't flash on SSR-like first paint
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
    // Already consented — notify parent
    onConsentChange?.(existing);
  }, [onConsentChange]);

  const applyConsent = useCallback((finalCategories: Record<CookieCategory, boolean>) => {
    const state: CookieConsentState = {
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      consented: true,
      categories: finalCategories,
    };
    saveConsentState(state);
    setVisible(false);
    onConsentChange?.(state);
  }, [onConsentChange]);

  const handleAcceptAll = () => {
    const allAccepted = { essential: true, analytics: true, marketing: true };
    applyConsent(allAccepted);
  };

  const handleAcceptSelected = () => {
    applyConsent(categories);
  };

  const handleRejectAll = () => {
    const onlyEssential = { essential: true, analytics: false, marketing: false };
    applyConsent(onlyEssential);
  };

  const toggleCategory = (cat: CookieCategory) => {
    if (COOKIE_CATEGORY_LABELS[cat].required) return;
    setCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/30" aria-hidden="true" />

      {/* Banner */}
      <div
        role="dialog"
        aria-labelledby="cookie-consent-title"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-[101] bg-white border-t border-secondary-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
      >
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-5">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2
                id="cookie-consent-title"
                className="font-heading text-base font-semibold text-foreground-900 mb-1.5"
              >
                This website uses cookies
              </h2>
              <p className="text-sm text-foreground-600 leading-relaxed">
                We use cookies to keep the website working, understand how it&rsquo;s used, and to deliver relevant content.
                Essential cookies are always on. You can choose which other categories to allow.
                See our{' '}
                <Link to="/cookies" className="text-primary-600 underline font-medium cursor-pointer whitespace-nowrap">
                  Cookie Notice
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary-600 underline font-medium cursor-pointer whitespace-nowrap">
                  Privacy Policy
                </Link>{' '}
                for details.
              </p>
            </div>

            {/* Action buttons — compact on mobile */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs px-3 py-2 rounded-lg border border-secondary-200 text-foreground-600 font-label font-medium hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                {showDetails ? 'Hide details' : 'Customise'}
              </button>
              <button
                onClick={handleRejectAll}
                className="text-xs px-3 py-2 rounded-lg border border-secondary-200 text-foreground-600 font-label font-medium hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Reject all
              </button>
              <button
                onClick={handleAcceptAll}
                className="text-xs px-4 py-2 rounded-lg bg-primary-500 text-white font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Accept all
              </button>
            </div>
          </div>

          {/* Detail accordion */}
          {showDetails && (
            <div className="mt-4 pt-4 border-t border-secondary-100 space-y-3">
              {(Object.entries(COOKIE_CATEGORY_LABELS) as [CookieCategory, typeof COOKIE_CATEGORY_LABELS['essential']][]).map(([key, info]) => (
                <div key={key} className="flex items-start gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={categories[key]}
                    disabled={info.required}
                    onClick={() => toggleCategory(key)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 mt-0.5 ${
                      info.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${categories[key] ? 'bg-primary-500' : 'bg-secondary-300'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform mt-0.5 ${
                        categories[key] ? 'translate-x-[18px]' : 'translate-x-[2px]'
                      }`}
                    />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-label font-semibold text-foreground-900">
                      {info.label}
                      {info.required && <span className="text-foreground-400 font-normal ml-1">(always required)</span>}
                    </p>
                    <p className="text-xs text-foreground-500 mt-0.5 leading-relaxed">{info.description}</p>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleAcceptSelected}
                  className="text-xs px-4 py-2 rounded-lg bg-primary-500 text-white font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Confirm my choices
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}