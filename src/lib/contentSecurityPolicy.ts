/**
 * The Content-Security-Policy for vowora.uk. Shared by the build plugin
 * (vite.security.ts) and the runtime bootstrap (securityBootstrap.ts), because
 * Readdy's publish pipeline builds with its own Vite config and entry file.
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
