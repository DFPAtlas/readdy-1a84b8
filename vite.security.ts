import type { Plugin } from "vite";
import { buildContentSecurityPolicy } from "./src/lib/contentSecurityPolicy";

export { buildContentSecurityPolicy };

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
