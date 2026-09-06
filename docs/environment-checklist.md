# Vowora Environment Variable Audit

**Date**: 2026-08-04  
**Version**: 213  

---

## Client-Side Variables (VITE_* prefixed)

| Variable | Required | Source | Used By | In .env.example | Launch Impact |
|----------|----------|--------|---------|----------------|---------------|
| `VITE_DEMO_MODE` | Yes | .env | Demo mode gate for entire app | ✅ | CRITICAL — must be `false` for production |
| `VITE_PUBLIC_SUPABASE_URL` | Yes | .env | Supabase client initialization | ✅ | CRITICAL — app won't function |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | Yes | .env | Supabase client auth | ✅ | CRITICAL — all DB operations fail |
| `VITE_PUBLIC_SITE_URL` | Optional | .env | Canonical URLs, OG tags, share links | ✅ | Low — fallback to window.location |
| `VITE_PUBLIC_GOOGLE_MAPS_KEY` | Optional | .env | Google Maps embed in travel/venue pages | ✅ | Low — maps won't render |

---

## Server-Side Variables (Supabase Edge Function Secrets)

### Stripe

| Variable | Required | Used By | Validated | Launch Impact |
|----------|----------|---------|-----------|---------------|
| `STRIPE_SECRET_KEY` | Yes (paid) | `create-subscription-checkout`, `create-billing-portal-session`, `stripe-webhook-handler`, `stripe-gift-fund-webhook`, `gift-fund-create-checkout` | ✅ Server-side validation at function start | CRITICAL for paid — subscriptions fail |
| `STRIPE_WEBHOOK_SECRET` | Yes (paid) | `stripe-webhook-handler` for signature verification | ✅ Signature verified before processing | CRITICAL for paid — webhooks rejected |

### Email (Resend)

| Variable | Required | Used By | Validated | Launch Impact |
|----------|----------|---------|-----------|---------------|
| `RESEND_API_KEY` | Conditional | `invitation-send`, `email-campaign-send`, other email functions | ✅ Checked before send attempt | Medium — email delivery unavailable |
| `RESEND_FROM_DOMAIN` | Conditional | Email `From:` address construction | ✅ Validated | Medium — emails won't send |

### Supabase

| Variable | Required | Used By | Validated | Launch Impact |
|----------|----------|---------|-----------|---------------|
| `SUPABASE_URL` | Yes | All edge functions for internal Supabase client | ✅ Runtime | CRITICAL — edge functions fail |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Edge functions needing elevated DB access | ✅ Runtime | CRITICAL — RLS-bypassed operations fail |
| `SUPABASE_ANON_KEY` | Yes | Some edge function client init | ✅ Runtime | High — auth in edge functions breaks |
| `VITE_PUBLIC_SUPABASE_URL` | Yes | `validate-invitation`, `invitation-send`, `submit-rsvp`, etc. | ✅ Runtime | CRITICAL |

### Site URL

| Variable | Required | Used By | Validated | Launch Impact |
|----------|----------|---------|-----------|---------------|
| `SITE_URL` | Yes | `invitation-send` for invite links, `validate-invitation` for redirects | ⚠️ Falls back to hardcoded `https://vowora.uk` | High — invitation links may use wrong domain |

---

## Security Verification

### ✅ No Server Secrets in Client Code
| Check | Result |
|-------|--------|
| `STRIPE_SECRET_KEY` in client bundle | ✅ Not found |
| `STRIPE_WEBHOOK_SECRET` in client bundle | ✅ Not found |
| `RESEND_API_KEY` in client bundle | ✅ Not found |
| `SUPABASE_SERVICE_ROLE_KEY` in client bundle | ✅ Not found |
| Raw invitation tokens in client code | ✅ Tokens hashed before storage |
| Guest session hashes in URLs | ✅ Stored in sessionStorage only |

### ✅ Client-Safe Variables Are Public-Only
- All VITE_* variables are public by design (Mapbox token, anon key, site URL)
- No private keys use VITE_ prefix

---

## Demo Mode Configuration

| Setting | Production Value | Demo Value | Validation |
|---------|-----------------|------------|------------|
| `VITE_DEMO_MODE` | `false` | `true` | `src/lib/env.ts` — `=== 'true'` |

**Production gate**: `IS_DEMO_MODE` is a plain boolean. Setting `VITE_DEMO_MODE=false` (or omitting it entirely) disables all demo data, bypass, and simulated flows. The app then uses real Supabase Auth, real DB queries, and real Stripe.

---

## Missing Environment Variables Detection

`src/lib/env.ts` provides `getMissingEnvVars()` which returns an array of missing required variables. This is used by the production configuration check but does not block the build.

---

## Recommendations

1. **`SITE_URL` fallback**: The hardcoded `https://vowora.uk` fallback in `invitation-send` should be replaced with a required check — if SITE_URL is missing, the function should return an explicit error rather than silently using the wrong domain. (Medium)
2. **Add `.env.production` template**: Create a `.env.production.example` with production-appropriate defaults. (Low)
3. **Edge Function env validation**: Add startup validation in all edge functions to fail fast with clear error messages when required secrets are missing. (Low)