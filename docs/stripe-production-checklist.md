# Vowora — Stripe Production Checklist

> Generated: 2026-08-04 | Phase 9C | Version 214

## Required Secrets

Set in Supabase Dashboard → Edge Function Secrets:

| Secret | Used By |
|---|---|
| `STRIPE_SECRET_KEY` | `create-subscription-checkout`, `create-billing-portal-session`, `stripe-webhook-handler`, `gift-fund-create-checkout` |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook-handler` |

## Webhook Endpoint

Configure in Stripe Dashboard → Webhooks:

```
https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhook-handler
```

## Required Webhook Events

These events are handled by `stripe-webhook-handler`:

| Event | Handler Action |
|---|---|
| `checkout.session.completed` | Creates/updates `wedora_subscriptions` with Stripe subscription data; syncs `subscription_records` |
| `customer.subscription.updated` | Updates subscription status, period dates, trial info, cancellation flags |
| `customer.subscription.deleted` | Marks subscription as cancelled/ended |
| `invoice.paid` | Links billing event to subscription |
| `invoice.payment_failed` | Logs payment failure against subscription |

## Product & Price Mapping

Plan definitions stored in `wedora_subscription_plans`:

| Column | Purpose |
|---|---|
| `plan_code` | Internal key (`free`, `essential`, `complete`, `luxury`) |
| `stripe_price_id` | Stripe Price ID used for Checkout |
| `stripe_product_id` | Stripe Product ID (for webhook lookups) |
| `stripe_account_id` | Stripe account identifier |
| `is_active` | Whether plan is purchasable |
| `trial_days` | Optional trial period |

## Architecture

### Checkout Flow
1. Client sends `planKey` + `weddingId` to `create-subscription-checkout`
2. Function verifies JWT, checks wedding membership
3. Function resolves `stripe_price_id` from `wedora_subscription_plans` (server-side)
4. Client never sends arbitrary Stripe price IDs
5. Function creates/get reuses Stripe Customer
6. Checkout Session created with `{CHECKOUT_SESSION_ID}` placeholder
7. Success URL → `/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`
8. Success page does NOT activate plan — webhook does

### Webhook Flow
1. Stripe POSTs to `stripe-webhook-handler`
2. Function verifies `stripe-signature` against `STRIPE_WEBHOOK_SECRET`
3. Idempotency check against `wedora_billing_events.stripe_event_id`
4. Processes events based on type
5. Updates `wedora_subscriptions` and `subscription_records`
6. Uses `SUPABASE_SERVICE_ROLE_KEY` for database writes

### Billing Portal
1. Client calls `create-billing-portal-session`
2. Function verifies JWT
3. Function reads `stripe_customer_id` from `wedora_customers` (server-side)
4. Creates Billing Portal session
5. Returns URL — client redirects

## Test Procedure

1. Set `STRIPE_SECRET_KEY` to test-mode key (`sk_test_...`)
2. Set `STRIPE_WEBHOOK_SECRET` to test-mode webhook secret (`whsec_...`)
3. Ensure `wedora_subscription_plans` has valid test-mode `stripe_price_id` values
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete checkout → verify subscription appears in Supabase
6. Verify webhook events appear in `wedora_billing_events`

## Live Activation

1. Replace `STRIPE_SECRET_KEY` with live key (`sk_live_...`)
2. Replace `STRIPE_WEBHOOK_SECRET` with live webhook secret
3. Update `wedora_subscription_plans.stripe_price_id` to live price IDs
4. Configure live webhook endpoint in Stripe Dashboard
5. Test with a real card (refund immediately)
6. Monitor webhook delivery in Stripe Dashboard

## Rollback

- Keep test-mode configuration documented
- Switch secrets back to test-mode in Supabase Dashboard
- No database rollback needed — subscription records are keyed by Stripe IDs

## Safety Rules

- [ ] `STRIPE_SECRET_KEY` never exposed in client code or `VITE_` variables
- [ ] Client sends internal plan keys, not Stripe price IDs
- [ ] Webhook signature always verified
- [ ] Idempotency enforced via `wedora_billing_events`
- [ ] Success URL does not grant access — webhook does
- [ ] Demo mode never creates real Stripe sessions
- [ ] Billing Portal always uses server-resolved customer ID