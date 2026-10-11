import { accountDestination, safeReturnPath } from './signupIntent';

export function rootAuthCallbackPath(url: URL, basePath = '/') {
  const base = basePath.replace(/\/$/, '');
  if (url.pathname !== `${base}/` && url.pathname !== base) return null;
  const fragment = new URLSearchParams(url.hash.slice(1));
  const hasAuth = ['access_token', 'refresh_token', 'error_description', 'error_code'].some(key => fragment.has(key))
    || url.searchParams.has('code') || url.searchParams.has('token_hash');
  if (!hasAuth) return null;
  const recovery = (fragment.get('type') || url.searchParams.get('type')) === 'recovery';
  return `${base}${recovery ? '/reset-password' : '/auth/callback'}${url.search}${url.hash}`;
}

export function confirmationDestination(next: string | null, metadata: Record<string, unknown> | undefined, onboardingCompleted: boolean) {
  const requested = safeReturnPath(next);
  // An email confirmation must continue the account journey, never marketing.
  if (requested?.startsWith('/join/') || requested?.startsWith('/app/')) return requested;
  const initial = accountDestination(metadata);
  if (initial.startsWith('/join/')) return initial;
  return onboardingCompleted ? '/app/dashboard' : initial;
}
