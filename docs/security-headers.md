# Security headers and CORS

## What the code now does

### Website (vowora.uk — static hosting via Readdy)

The current host sends no security headers and cannot be configured with a
`_headers`, `vercel.json` or `netlify.toml` file. So:

| Protection | Where it is enforced |
|---|---|
| Content-Security-Policy | `<meta http-equiv>` injected into the built `index.html` by `vite.security.ts` (production builds only) |
| Referrer-Policy | `<meta name="referrer" content="strict-origin-when-cross-origin">`, same plugin |
| Clickjacking | `src/lib/frameGuard.ts` refuses to render vowora.uk inside a third-party frame |
| HSTS, nosniff, X-Frame-Options, Permissions-Policy, `frame-ancestors` | **Not possible in `<meta>`.** Needs a CDN or host rule (below) |

CSP shipped in the build:

```
default-src 'self'; script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;
font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com;
img-src 'self' data: blob: https:; media-src 'self' blob: https:;
connect-src 'self' https://<project>.supabase.co wss://<project>.supabase.co https://readdy.ai data: blob:;
frame-src https://www.google.com https://maps.google.com; worker-src 'self' blob:;
object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests
```

If you add a new third-party script, iframe or API, add its origin in
`vite.security.ts`. Otherwise the browser will block it in production. The dev
server and Readdy preview do not get the CSP, so a missing origin only shows up
after publishing. Check the browser console on vowora.uk after each publish.

### Edge Functions (`supabase/functions/_shared/httpSecurity.ts`)

Every function is served through `secureServe()`, which:

- **CORS:** replaces `Access-Control-Allow-Origin: *` with the caller's origin
  only when it is trusted. Trusted origins are `https://vowora.uk`,
  `https://www.vowora.uk`, plus the `ALLOWED_ORIGINS` secret (comma-separated
  HTTPS origins). `http://localhost` is trusted only when
  `ENVIRONMENT=development|local`.
- **Server-only endpoints** send no CORS headers at all: both Stripe webhooks,
  `email-webhook`, `gallery-scan-worker` and `wedding-sitemap`.
- **Security headers on every response:** `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS, and a `default-src 'none'`
  CSP on non-HTML responses.
- **Request bodies:** for browser endpoints, bodies over 1 MB get a 413. Malformed
  JSON, non-object bodies, and a `wedding_id`/`weddingId` that is not a UUID get
  a 400 before the function runs.
- **Errors:** an uncaught exception returns a generic 500. Details go to the
  function log only.

Webhook bodies are never pre-read, so Stripe and Resend signature checks still
see the raw body.

## Host / CDN rules to add when possible

If vowora.uk is moved behind Cloudflare (free plan is enough), add a
**Transform Rule → Modify Response Header** for `vowora.uk` and `www.vowora.uk`:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()
Content-Security-Policy: frame-ancestors 'none'
```

(The `frame-ancestors` header works alongside the meta CSP, and browsers apply
both.) On Vercel or Netlify, the same values go in `vercel.json` `headers` or a
`_headers` file.

## ALLOWED_ORIGINS

Before deploying these functions, set the `ALLOWED_ORIGINS` secret to any extra
origin that must call them from a browser, such as a staging site or the Readdy
preview URL you test in:

```
supabase secrets set ALLOWED_ORIGINS="https://staging.vowora.uk,https://<your-readdy-preview-host>"
```

An origin that is not listed can still reach the function, but the browser will
refuse to read the response. Calls from the app on that origin will then fail.
