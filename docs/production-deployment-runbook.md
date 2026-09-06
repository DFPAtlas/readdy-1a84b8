# Vowora — Production Deployment Runbook

> Generated: 2026-08-04 | Phase 9C | Version 214
> This runbook describes the deployment sequence. Do not include real secret values.

## Prerequisites

- Supabase project provisioned
- Stripe account (test mode for first deployment)
- Resend account with verified domain (for email)
- Vercel/Netlify/Cloudflare or other hosting for frontend

## Step 1 — Backup

```bash
# Supabase backup (via Supabase Dashboard → Database → Backups)
# Or use pg_dump if direct access is available
```

## Step 2 — Database Migrations

Apply all migrations to production Supabase project via Supabase Dashboard → SQL Editor.

Ensure all wedding-scoped tables exist with correct RLS policies.

## Step 3 — Deploy Edge Functions

Deploy each function from `supabase/functions/`:

```bash
# Via Supabase CLI
supabase functions deploy validate-invitation
supabase functions deploy submit-rsvp
supabase functions deploy invitation-send
supabase functions deploy email-campaign-send
supabase functions deploy create-subscription-checkout
supabase functions deploy create-billing-portal-session
supabase functions deploy stripe-webhook-handler
supabase functions deploy provision-wedding-workspace
supabase functions deploy guest-portal-loader
supabase functions deploy guest-gallery-upload
supabase functions deploy guest-gallery-interact
supabase functions deploy guest-question-interact
supabase functions deploy guest-settings-interact
supabase functions deploy guest-update-interact
supabase functions deploy gift-fund-connect
supabase functions deploy gift-fund-create-checkout
supabase functions deploy travel-places-discover
supabase functions deploy gallery-moderate
supabase functions deploy settings-invite-member
```

## Step 4 — Configure Supabase Secrets

Set in Supabase Dashboard → Edge Function Secrets:

| Secret | Source |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `RESEND_FROM_DOMAIN` | Verified domain in Resend |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API |
| `VITE_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_URL` | Same as VITE_PUBLIC_SUPABASE_URL |

## Step 5 — Configure Auth URLs

Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://your-production-domain.com`
- Redirect URLs: Add `https://your-production-domain.com/auth/callback`

## Step 6 — Configure Storage

Verify buckets exist:
- `public` — published website media, gallery (with RLS policies)
- `private` — exports, signed content

## Step 7 — Configure Stripe Webhook

Stripe Dashboard → Webhooks → Add endpoint:
- URL: `https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhook-handler`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- Version: Latest API version

## Step 8 — Configure Stripe Products & Prices

Populate `wedora_subscription_plans` with live price IDs:
- Create products/prices in Stripe Dashboard
- Update `stripe_price_id` and `stripe_product_id` in database

## Step 9 — Configure Resend Domain

- Add domain in Resend Dashboard
- Add DNS records (SPF, DKIM)
- Verify domain
- Use verified domain as `RESEND_FROM_DOMAIN`

## Step 10 — Configure Application Environment

Production `.env`:
```
VITE_DEMO_MODE=false
VITE_PUBLIC_SITE_URL=https://your-production-domain.com
VITE_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
VITE_PUBLIC_GOOGLE_MAPS_KEY=[optional]
```

## Step 11 — Deploy Frontend

```bash
npm install
npm run type-check
npm run build
# Deploy `out/` directory to hosting provider
```

## Step 12 — Run Smoke Tests

1. Visit production URL — homepage should load
2. Sign up → login → onboarding → dashboard
3. Visit `/app/admin/system-readiness` — all checks should pass
4. Test Stripe checkout in test mode
5. Test invitation send with test email
6. Test RSVP flow end-to-end
7. Verify cross-wedding access is blocked

## Step 13 — Monitor Initial Logs

- Supabase Dashboard → Edge Functions → Logs
- Stripe Dashboard → Webhooks → Events
- Resend Dashboard → Emails

## Step 14 — Rollback

If deployment fails:
1. Switch `VITE_DEMO_MODE=true` temporarily for safe fallback
2. Revert Edge Function secrets if needed
3. Deploy previous frontend build
4. No database changes that would prevent rollback

## Post-Deployment

- Configure DMARC for email domain
- Set up monitoring for webhook failures
- Create production backup schedule
- Document any manual configuration steps