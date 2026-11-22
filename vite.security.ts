import type { Plugin } from "vite";

/**
 * Production-only security meta tags.
 *
 * vowora.uk is served by static hosting that cannot set response headers, so the
 * Content-Security-Policy and Referrer-Policy are delivered as <meta> tags in the
 * built index.html. Headers that browsers ignore in <meta> (frame-ancestors,
 * X-Frame-Options, HSTS, nosniff, Permissions-Policy) are documented in
 * docs/security-headers.md for the host / CDN, and frame-busting on the production
 * host is handled by src/lib/frameGuard.ts.
 *
 * The plugin only runs for `vite build`, so the dev server, Playwright suites and
 * Readdy's live preview are unaffected.
 */
export function buildContentSecurityPolicy(supabaseUrl = ""): string {
  let supabase = ["https://*.supabase.co", "wss://*.supabase.co"];
  try {
    if (supabaseUrl) {
      const { host } = new URL(supabaseUrl);
      supabase = [`https://${host}`, `wss://${host}`];
    }
  } catch {
    // keep the wildcard fallback
  }
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'"],
    // React style attributes and Tailwind runtime classes need inline styles.
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
    // Couple photos, registry item images and Readdy-generated imagery come from many HTTPS hosts.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "media-src": ["'self'", "blob:", "https:"],
    "connect-src": ["'self'", ...supabase, "https://readdy.ai", "data:", "blob:"],
    "frame-src": ["https://www.google.com", "https://maps.google.com"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "upgrade-insecure-requests": [],
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

export function securityMetaPlugin(supabaseUrl: string): Plugin {
  return {
    name: "vowora-security-meta",
    apply: "build",
    transformIndexHtml(html) {
      const content = buildContentSecurityPolicy(supabaseUrl).replace(/"/g, "&quot;");
      const tags =
        `\n    <meta http-equiv="Content-Security-Policy" content="${content}" />` +
        `\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`;
      // Keep <meta charset> first (it must sit in the first 1024 bytes) and put the
      // CSP before any stylesheet or script so it governs them.
      const charset = /<meta charset=[^>]*>/i;
      return charset.test(html)
        ? html.replace(charset, (match) => match + tags)
        : html.replace(/<head>/i, (match) => match + tags);
    },
  };
}
