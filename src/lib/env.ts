// ── Central environment configuration ──
// All environment-dependent values should flow through this module.
// Never read import.meta.env directly in page or component code.

// ── Demo Mode ──
// Set VITE_DEMO_MODE=true for client demonstrations (no Supabase required)
export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// ── Public Site URL ──
// The canonical public-facing URL of the application.
// Used for share links, Open Graph tags, canonical URLs, etc.
// In local development this may be http://localhost:5173
export const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL || '';

// ── Supabase ──
export const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';

// ── Google Maps ──
export const GOOGLE_MAPS_KEY = import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_KEY || '';

// ── Release Version ──
// Set before each production deployment. Format: YYYY.MM.DD.N or semver.
// Displayed in system-readiness Launch Control for deployment tracking.
export const RELEASE_VERSION = import.meta.env.VITE_RELEASE_VERSION || 'dev';

// ── Build Timestamp ──
// Set at build time (e.g. via Vite define). Falls back to current time for dev.
export const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP || new Date().toISOString();

// ── Validation ──
export function isProductionConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getMissingEnvVars(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('VITE_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('VITE_PUBLIC_SUPABASE_ANON_KEY');
  return missing;
}