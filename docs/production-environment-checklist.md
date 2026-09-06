# Vowora — Production Environment Checklist

> Generated: 2026-08-04 | Phase 9C | Version 214

## Client-Safe Variables (`.env`)

These are exposed to the browser. Never store secrets here.

| Variable | Required | Used By | Expected Format | Missing Impact |
|---|---|---|---|---|
| `VITE_DEMO_MODE` | Yes | App entry, demo provider, auth flow | `true` or `false` | Set `false` in production; `true` forces demo-only mode |
| `VITE_PUBLIC_SITE_URL` | Yes | Share links, OG tags, canonical URLs, invite links | `https://vowora.uk` or custom domain | Incorrect URLs in shared invitations, password resets, Stripe redirects |
| `VITE_PUBLIC_SUPABASE_URL` | Yes | Supabase client, auth, DB queries | `https://xxxxxxxx.supabase.co` | App cannot connect to database or auth |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase client (anon role) | `eyJ...` (JWT token) | App cannot authenticate with Supabase |
| `VITE_PUBLIC_GOOGLE_MAPS_KEY` | No | Travel map pages (guest portal) | Google Maps API key | Map features show placeholder |

## Server-Only Secrets (Supabase Dashboard)

Set these in Supabase Dashboard → Project Settings → Edge Function Secrets or API → Secrets.

Never prefix these with `VITE_`. Never place them in `.env`.

| Secret | Required | Used By | Purpose |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Yes (for billing) | `create-subscription-checkout`, `create-billing-portal-session`, `stripe-webhook-handler` | Create Stripe Checkout Sessions & Billing Portal |
| `STRIPE_WEBHOOK_SECRET` | Yes (for billing) | `stripe-webhook-handler` | Verify Stripe webhook signatures |
| `RESEND_API_KEY` | Yes (for email) | `invitation-send`, `email-campaign-send` | Send transactional & invitation emails |
| `RESEND_FROM_DOMAIN` | Yes (for email) | `invitation-send` | Verified sending domain (e.g. `vowora.uk`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | All Edge Functions | Service-role access for server-side operations |
| `VITE_PUBLIC_SUPABASE_URL` | Yes | All Edge Functions | Supabase project URL (referenced server-side) |
| `SUPABASE_URL` | Yes | All Edge Functions | Same as VITE_PUBLIC_SUPABASE_URL, used by Deno client |
| `SITE_URL` | No | `invitation-send` | Override for invite link URLs (falls back to `https://vowora.uk`) |

## Edge Function-Specific Secrets

| Function | Required Secrets |
|---|---|
| `validate-invitation` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `submit-rsvp` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `invitation-send` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_DOMAIN` |
| `email-campaign-send` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_DOMAIN` |
| `create-subscription-checkout` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY` |
| `create-billing-portal-session` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY` |
| `stripe-webhook-handler` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `provision-wedding-workspace` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-portal-loader` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-gallery-upload` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-gallery-interact` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-question-interact` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-settings-interact` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-update-interact` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `gift-fund-connect` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `gift-fund-create-checkout` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `travel-places-discover` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `gallery-moderate` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `settings-invite-member` | `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

## Supabase Auth Configuration

Must be configured in Supabase Dashboard → Authentication → URL Configuration:

| Setting | Value |
|---|---|
| Site URL | `VITE_PUBLIC_SITE_URL` value (e.g. `https://vowora.uk`) |
| Redirect URLs | `VITE_PUBLIC_SITE_URL` + `/auth/callback`, plus any preview/dev URLs needed |

## Pre-Deployment Checklist

- [ ] Set `VITE_DEMO_MODE=false` in production `.env`
- [ ] Set `VITE_PUBLIC_SITE_URL` to the real production domain
- [ ] Add all Edge Function secrets to Supabase Dashboard
- [ ] Deploy all Edge Functions from `supabase/functions/`
- [ ] Apply all database migrations
- [ ] Run `npm run build` — must succeed clean
- [ ] Run `npm run type-check` — must pass
- [ ] Test authentication flow (signup → login → dashboard)
- [ ] Test Stripe checkout in test mode
- [ ] Test invitation send in test mode
- [ ] Verify `/app/admin/system-readiness` shows all green
- [ ] Remove any `localhost` entries from Auth redirect URLs (keep dev URLs separate)