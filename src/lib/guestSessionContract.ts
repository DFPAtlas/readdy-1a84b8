// ── Guest session credential contract ──
//
// Canonical (mirrored by the guest Edge Functions):
//   * The guest session credential is a high-entropy raw secret that is
//     returned to the browser exactly ONCE (when an invitation is validated).
//   * Only the one-way SHA-256 hash of that raw secret is persisted
//     server-side in `guest_access_sessions.session_hash`.
//   * Every guest Edge Function must hash the supplied raw credential with
//     SHA-256 BEFORE querying the session table.
//
// These helpers are the single source of truth for the contract constants and
// the CORS allowlist parsing logic. The Deno Edge Functions cannot import from
// `src/`, so they mirror this logic inline (see
// supabase/functions/{validate-invitation,guest-portal-loader,submit-rsvp}).

export const GUEST_SESSION_HASH_ALGORITHM = 'SHA-256';

/** Raw session secret entropy in bytes (256 bits). */
export const GUEST_SESSION_SECRET_BYTES = 32;

/** Minimum accepted length of a raw session credential (64 hex chars). */
export const GUEST_SESSION_SECRET_MIN_LENGTH = 32;

/** Env var holding a comma-separated additional CORS allowlist. */
export const GUEST_ALLOWED_ORIGINS_ENV = 'GUEST_ALLOWED_ORIGINS';

/** Env var that opts local development origins into the allowlist. */
export const GUEST_ALLOW_LOCAL_ORIGINS_ENV = 'ALLOW_LOCAL_ORIGINS';

/** Vowora production origins (always allowed). */
export const VOWORA_PRODUCTION_ORIGINS = ['https://vowora.uk', 'https://www.vowora.uk'];

/** Local development origins (allowed by default, or when explicitly enabled). */
export const GUEST_LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

/** Trim whitespace and a single trailing slash so origins compare reliably. */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

/**
 * Resolve the effective CORS allowlist.
 *
 * - If `configured` (the GUEST_ALLOWED_ORIGINS env value) is provided, it
 *   becomes the base list (production defaults are NOT merged in).
 * - Local development origins are included when no explicit allowlist is
 *   configured, or when `allowLocal` is true.
 */
export function parseAllowedOrigins(
  configured: string | null | undefined,
  allowLocal: boolean,
): string[] {
  const fromEnv = (configured ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const base = fromEnv.length > 0 ? fromEnv : [...VOWORA_PRODUCTION_ORIGINS];
  const includeLocal = fromEnv.length === 0 || allowLocal === true;
  const list = includeLocal ? [...base, ...GUEST_LOCAL_ORIGINS] : base;

  return Array.from(new Set(list));
}

/**
 * Return the value to echo in Access-Control-Allow-Origin.
 * A matching request origin is echoed back; anything else falls back to the
 * first allowed origin, which makes the browser block the cross-origin call.
 */
export function resolveAllowedOrigin(
  requestOrigin: string | null | undefined,
  allowedOrigins: string[],
): string {
  const origin = normalizeOrigin(requestOrigin ?? '');
  if (origin && allowedOrigins.includes(origin)) return origin;
  return allowedOrigins[0] ?? VOWORA_PRODUCTION_ORIGINS[0];
}

/** SHA-256 the raw guest session credential, returning lowercase hex. */
export async function hashGuestSessionSecret(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest(GUEST_SESSION_HASH_ALGORITHM, data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}