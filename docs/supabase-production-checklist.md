# Vowora — Supabase Production Checklist

> Generated: 2026-08-04 | Phase 9C | Version 214

## Database Migrations

Ensure all migrations are applied to the production Supabase project. Key wedding-scoped tables:

| Table | Purpose | RLS |
|---|---|---|
| `weddings` | Core wedding records | Yes — `can_view_wedding` / `can_edit_wedding` |
| `wedding_members` | Membership & roles | Yes |
| `wedding_member_invitations` | Collaborator invites | Yes |
| `wedding_website_configs` | Published website config | Yes |
| `wedding_events` | Schedule events | Yes |
| `wedding_venues` | Venue records | Yes |
| `guests` | Guest records | Yes |
| `guest_households` | Household grouping | Yes |
| `invitations` | Invitation records | Yes |
| `invitation_access_tokens` | Hashed access tokens | Yes |
| `invitation_recipients` | Guest-invitation links | Yes |
| `invitation_access_activity` | Security audit log | Yes |
| `guest_access_sessions` | Guest portal sessions | Yes |
| `rsvp_submissions` | RSVP submissions | Yes |
| `rsvp_responses` | Individual responses | Yes |
| `rsvp_event_responses` | Per-event responses | Yes |
| `rsvp_custom_answers` | Custom question answers | Yes |
| `seating_plans` | Seating plans | Yes |
| `seating_tables` | Table records | Yes |
| `seating_seats` | Seat records | Yes |
| `seating_assignments` | Guest-table assignments | Yes |
| `gallery_albums` | Photo albums | Yes |
| `gallery_assets` | Uploaded media | Yes |
| `budgets` | Budget records | Yes |
| `budget_items` | Budget line items | Yes |
| `wedding_tasks` | Task records | Yes |
| `wedding_suppliers` | Supplier records | Yes |
| `wedding_updates` | Couple updates | Yes |
| `wedora_subscription_plans` | Plan definitions | Limited |
| `wedora_subscriptions` | Active subscriptions | Yes |
| `wedora_customers` | Stripe customer mapping | Yes |
| `wedora_billing_events` | Webhook event log | Yes |

## Edge Functions

All must be deployed to production:

| Function Slug | Purpose | Auth | Secrets Required |
|---|---|---|---|
| `validate-invitation` | Validate invitation tokens, create guest sessions | Public (anon) | `SUPABASE_SERVICE_ROLE_KEY`, `VITE_PUBLIC_SUPABASE_URL` |
| `submit-rsvp` | Process RSVP submissions | Guest session hash | `SUPABASE_SERVICE_ROLE_KEY`, `VITE_PUBLIC_SUPABASE_URL` |
| `invitation-send` | Send invitations via Resend, generate tokens | JWT verified | `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_DOMAIN` |
| `email-campaign-send` | Send email campaigns via Resend | JWT verified | `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_DOMAIN` |
| `create-subscription-checkout` | Create Stripe Checkout Session | JWT verified | `STRIPE_SECRET_KEY` |
| `create-billing-portal-session` | Create Stripe Billing Portal | JWT verified | `STRIPE_SECRET_KEY` |
| `stripe-webhook-handler` | Process Stripe webhook events | None (sig verified) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` |
| `provision-wedding-workspace` | Create wedding workspace on onboarding | JWT verified | `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-portal-loader` | Load guest portal data | Guest session hash | `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-gallery-upload` | Handle guest gallery uploads | Guest session hash | `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-gallery-interact` | Gallery likes, comments, reports | Guest session hash | `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-question-interact` | Guest Q&A interactions | Guest session hash | `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-settings-interact` | Guest notification preferences | Guest session hash | `SUPABASE_SERVICE_ROLE_KEY` |
| `guest-update-interact` | Guest update interactions | Guest session hash | `SUPABASE_SERVICE_ROLE_KEY` |
| `gift-fund-connect` | Gift fund connections | JWT verified | `SUPABASE_SERVICE_ROLE_KEY` |
| `gift-fund-create-checkout` | Gift fund Stripe checkout | JWT verified | `STRIPE_SECRET_KEY` |
| `travel-places-discover` | Travel recommendations | Guest session hash | `SUPABASE_SERVICE_ROLE_KEY` |
| `gallery-moderate` | Gallery moderation | JWT verified | `SUPABASE_SERVICE_ROLE_KEY` |
| `settings-invite-member` | Invite collaborators | JWT verified | `SUPABASE_SERVICE_ROLE_KEY` |

## Auth Configuration

| Setting | Value |
|---|---|
| Site URL | Production domain |
| Redirect URLs | Production domain + `/auth/callback` |
| JWT Expiry | Default (1 hour) |
| Email confirmations | Enabled in production |

## Storage Buckets

| Bucket | Purpose | Public |
|---|---|---|
| `public` | Published website media, gallery | Yes (with policies) |
| `private` | Export files, signed content | No |

## Realtime

Enabled for tables requiring live updates:
- `gallery_assets` (live wall)
- `wedding_updates` (couple announcements)

## Pre-Deployment Verification

- [ ] All migrations applied successfully
- [ ] RLS enabled on all wedding-scoped tables
- [ ] All Edge Functions deployed
- [ ] All Supabase Dashboard secrets configured
- [ ] Auth redirect URLs set to production domain
- [ ] Storage policies verified
- [ ] Realtime enabled for required tables only
- [ ] Database indexes on foreign keys and frequent query columns