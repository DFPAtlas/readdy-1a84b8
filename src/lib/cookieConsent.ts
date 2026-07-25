// ── Cookie Consent Types ──

export type CookieCategory = 'essential' | 'analytics' | 'marketing';

export interface CookieConsentState {
  version: number;
  timestamp: string;
  consented: boolean;
  categories: Record<CookieCategory, boolean>;
}

export const COOKIE_CONSENT_VERSION = 1;

export const COOKIE_CATEGORY_LABELS: Record<CookieCategory, { label: string; description: string; required: boolean }> = {
  essential: {
    label: 'Essential',
    description: 'Required for the website to function. These cannot be disabled.',
    required: true,
  },
  analytics: {
    label: 'Analytics',
    description: 'Help us understand how visitors use the website so we can improve it.',
    required: false,
  },
  marketing: {
    label: 'Marketing',
    description: 'Used to deliver relevant advertisements and measure campaign effectiveness.',
    required: false,
  },
};

export const COOKIE_STORAGE_KEY = 'wedora_cookie_consent';

export function loadConsentState(): CookieConsentState | null {
  try {
    const raw = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsentState(state: CookieConsentState): void {
  try {
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — consent persists only for session
  }
}

export function hasConsentFor(category: CookieCategory): boolean {
  const state = loadConsentState();
  if (!state) return category === 'essential';
  return state.categories[category] || false;
}