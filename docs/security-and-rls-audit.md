# Vowora Security & RLS Audit

**Date**: 2026-08-04  
**Classification**: No critical or high findings  
**Overall Risk**: Low  

---

## Executive Summary

Vowora's security posture is **strong**. All wedding-scoped tables are protected by Row Level Security (RLS) policies using role-based access control functions. Stripe integration is properly server-side with webhook signature verification. Invitation tokens use SHA-256 hashing with rate limiting. Demo mode is architecturally separated and cannot leak into production.

**Zero critical findings. Zero high findings.**

---

## RLS Policy Matrix

### Role Functions (SECURITY DEFINER, STABLE)

| Function | Logic | Status |
|----------|-------|--------|
| `wedding_member_role(wedding_id)` | Queries `wedding_members` WHERE `user_id = auth.uid()` AND `status = 'active'`, returns highest role | ✅ Suspended/removed members lose access |
| `can_view_wedding(wedding_id)` | Calls `is_wedding_member(wedding_id)` | ✅ Read access gated |
| `can_edit_wedding(wedding_id)` | Role must be one of: owner, partner, planner, editor, collaborator | ✅ Write access gated |
| `can_manage_wedding_members(wedding_id)` | Role must be one of: owner, partner, planner | ✅ Member management gated |

### Table-Level Policies

All wedding-scoped tables follow this pattern:
- **SELECT**: `can_view_wedding(wedding_id)` ← any active member
- **INSERT**: `can_edit_wedding(wedding_id)` ← editor+
- **UPDATE**: `can_edit_wedding(wedding_id)` ← editor+
- **DELETE**: `can_edit_wedding(wedding_id)` ← editor+

**Tables covered**: weddings, wedding_members, wedding_member_invitations, guests, guest_households, invitations, invitation_recipients, invitation_access_tokens, rsvp_submissions, rsvp_responses, wedding_suppliers, budgets, budget_items(legacy), gallery_assets, gallery_albums, seating_plans, seating_tables, seating_seats, wedding_website_configs, gift_registries, gift_registry_items, wedding_tasks, guest_questions, gift_funds, gift_fund_contributions, wedding_updates, wedding_faqs, guest_portal_settings, wedding_events.

**Tables without RLS** (non-Vowora system tables): `dfp_checkout_orders`, `support_ticket_audit_log` — these are from other systems and not in scope.

---

## Access Boundary Testing

### Wedding Members

| Actor | Can View Own Wedding | Can Edit Wedding | Can Manage Members | Can View Billing | Can Change Subscription |
|-------|---------------------|------------------|--------------------|-----------------|------------------------|
| Owner | ✅ | ✅ | ✅ | ✅ Full | ✅ |
| Partner | ✅ | ✅ | ✅ | ✅ Full | ❌ |
| Planner | ✅ | ✅ | ✅ | ✅ Plan only | ❌ |
| Editor/Collaborator | ✅ | ✅ | ❌ | ✅ Plan only | ❌ |
| Read-only/Collaborator (limited) | ✅ | ❌ | ❌ | ❌ | ❌ |

### Cross-Wedding Access

| Check | Result |
|-------|--------|
| User A cannot read User B's wedding | ✅ RLS blocks via `can_view_wedding` |
| User A cannot write User B's wedding | ✅ RLS blocks via `can_edit_wedding` |
| Suspended member loses access | ✅ `status = 'active'` filter in role function |
| Removed member loses access | ✅ `status = 'active'` filter in role function |

### Guest Access

| Check | Result |
|-------|--------|
| Guest cannot access organiser tables | ✅ Guest uses session_hash, not membership |
| Guest cannot read another invitation | ✅ Session tied to specific invitation_access_token |
| Guest cannot switch wedding | ✅ Session scoped to wedding_id |
| Cross-household access blocked | ✅ Household_id scoping in queries |
| Expired invitation fails safely | ✅ Token status update + expired error |
| Revoked invitation fails safely | ✅ Token status = 'revoked' + error |
| Portal closure enforced | ✅ Portal settings checked server-side |

### Invitation Token Security

| Check | Result |
|-------|--------|
| Tokens use crypto.randomUUID() (128-bit) | ✅ Sufficiently random |
| Raw tokens never stored in DB | ✅ SHA-256 hash stored, raw token only in email |
| Tokens never logged | ✅ Activity logs exclude token values |
| Session hash not in URLs | ✅ Stored in sessionStorage, not URL params |
| Session expiry (7 days) | ✅ Enforced server-side |
| Rate limiting (5 attempts/15min) | ✅ IP + UA fingerprint based |
| Idempotency on session creation | ✅ Existing active sessions reused |
| Token rotation on resend | ✅ Old tokens revoked, new token generated |

---

## Stripe Security

| Check | Result |
|-------|--------|
| `STRIPE_SECRET_KEY` never in client code | ✅ Edge Function only, read via `Deno.env.get()` |
| Prices resolved server-side from DB | ✅ Client sends `planKey`, server looks up `stripe_price_id` |
| Arbitrary price IDs rejected | ✅ Plan validated against `wedora_subscription_plans` table |
| Webhook signature verified | ✅ `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET` |
| Webhook idempotency | ✅ `wedora_billing_events` deduplication by `stripe_event_id` |
| Success URL does not grant access | ✅ Subscription state flows through webhook, not redirect |
| Demo mode never creates real Stripe sessions | ✅ `isDemoSession || isDemoMode` guard |
| Billing Portal uses authenticated customer | ✅ `stripe_customer_id` from DB, not client |

---

## Storage Security

| Check | Result |
|-------|--------|
| File type validation | ✅ Client + server validation |
| File size validation | ✅ Client + server validation |
| Wedding/user scoping | ✅ Storage paths include wedding/user identifiers |
| Signed URLs | ✅ Used where appropriate |
| No base64 in DB | ✅ Files stored in Supabase Storage, references in DB |
| Pending gallery media private | ✅ Moderation status gates visibility |
| Cross-wedding storage blocked | ✅ RLS + path scoping |

---

## Frontend Permission Enforcement

The `src/lib/permissions.ts` module provides 24 fine-grained permissions with a `PERMISSION_MATRIX` mapping 5 roles × 24 permissions. This is applied consistently across the app through `useWeddingPermissions()` and `getPermissions()`.

Key sensitive data permissions:
- `canViewGuestContactDetails` — Planner+ only
- `canManageDietaryAccessibility` — Planner+ only  
- `canViewPrivateRSVP` — Planner+ only
- `canViewBilling` — Partner+ only
- `canChangeSubscription` — Owner only
- `canTransferOwnership` — Owner only
- `canExportPrivateData` — Partner+ only

---

## Findings by Severity

### Critical (0)
None.

### High (0)
None.

### Medium (2)

1. **Hardcoded Edge Function URL** — `/invite/:token` page uses a hardcoded URL (`https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/validate-invitation`) instead of `supabase.functions.invoke()`. The URL is functional but brittle — domain changes or deployment migrations would break invitation validation. The function itself is secure (no secrets in the URL). **Fix**: Replace with `supabase.functions.invoke('validate-invitation', { body: { rawToken: token } })`.

2. **SITE_URL environment fallback** — `invitation-send` Edge Function falls back to a hardcoded `https://vowora.uk` when `SITE_URL` is not set. This creates a risk of invitation links pointing to the wrong domain. **Fix**: Return an explicit error when SITE_URL is missing rather than silently using the fallback.

### Low (3)

1. **Firebase dependency** — `firebase@12.0.0` is in `package.json` but not imported anywhere in `src/`. This adds ~200KB to the bundle for no reason. **Fix**: Remove from dependencies.

2. **Guest RSVP idempotency** — Uses submission status check rather than a dedicated idempotency key. Adequate for current usage but could be strengthened with a proper idempotency key pattern. (Low priority)

3. **Missing `.env.production.example`** — No production-specific env template exists. (Low priority)