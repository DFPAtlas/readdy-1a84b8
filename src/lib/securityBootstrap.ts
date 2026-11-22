/**
 * Runtime security setup for the production host.
 *
 * Readdy publishes vowora.uk with its own Vite config and entry file, so the
 * build-time meta tags (vite.security.ts) and the guard in main.tsx are not in
 * the published site. This module is imported by AuthProvider, which wraps every
 * page, so it always ships. On vowora.uk / www.vowora.uk only it:
 *  - refuses to run inside a third-party frame (clickjacking)
 *  - adds the Content-Security-Policy and Referrer-Policy meta tags; browsers
 *    enforce a CSP meta tag for everything loaded after it is inserted.
 * Readdy preview, local dev and tests run on other hosts and are untouched.
 */
import { applyFrameGuard, FRAME_GUARDED_HOSTS } from './frameGuard';
import { buildContentSecurityPolicy } from './contentSecurityPolicy';

export function ensureMeta(doc: Document, selector: string, attrs: Record<string, string>): boolean {
  if (doc.head.querySelector(selector)) return false;
  const meta = doc.createElement('meta');
  for (const [name, value] of Object.entries(attrs)) meta.setAttribute(name, value);
  doc.head.prepend(meta);
  return true;
}

export function applySecurityBootstrap(win: Window = window, supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || ''): void {
  if (!FRAME_GUARDED_HOSTS.includes(win.location.hostname)) return;
  applyFrameGuard(win);
  const doc = win.document;
  ensureMeta(doc, 'meta[http-equiv="Content-Security-Policy"]', {
    'http-equiv': 'Content-Security-Policy',
    content: buildContentSecurityPolicy(supabaseUrl),
  });
  ensureMeta(doc, 'meta[name="referrer"]', { name: 'referrer', content: 'strict-origin-when-cross-origin' });
}

if (typeof window !== 'undefined') {
  try {
    applySecurityBootstrap();
  } catch {
    // never block the app over a hardening step
  }
}
