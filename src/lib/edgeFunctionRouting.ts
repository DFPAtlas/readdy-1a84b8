const LEGACY_EDGE_BASE = 'https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/';

let installed = false;

/**
 * Temporary production compatibility layer for screens that still contain the
 * original Readdy Edge Function origin. Only that exact origin is rewritten.
 * New code should use the configured Supabase URL directly.
 */
export function installEdgeFunctionRouting(): void {
  if (installed || typeof window === 'undefined') return;

  const supabaseUrl = String(import.meta.env.VITE_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  if (!supabaseUrl) return;

  const targetBase = `${supabaseUrl}/functions/v1/`;
  const originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const inputUrl = input instanceof Request ? input.url : String(input);
    if (!inputUrl.startsWith(LEGACY_EDGE_BASE)) {
      return originalFetch(input, init);
    }

    const rewrittenUrl = `${targetBase}${inputUrl.slice(LEGACY_EDGE_BASE.length)}`;
    if (input instanceof Request) {
      const rewrittenRequest = new Request(rewrittenUrl, input);
      return originalFetch(rewrittenRequest, init);
    }

    return originalFetch(rewrittenUrl, init);
  }) as typeof window.fetch;

  installed = true;
}
