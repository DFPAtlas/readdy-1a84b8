# Vowora Launch Day Runbook

**Document version:** 1.0
**Release:** v{RELEASE_VERSION}
**Date:** {LAUNCH_DATE}
**Runbook owner:** {OWNER}

---

## Table of Contents

1. [Pre-launch Freeze](#1-pre-launch-freeze)
2. [Backup](#2-backup)
3. [Database Migration](#3-database-migration)
4. [Edge Function Deployment](#4-edge-function-deployment)
5. [Frontend Deployment](#5-frontend-deployment)
6. [Configuration Verification](#6-configuration-verification)
7. [Live Smoke Tests](#7-live-smoke-tests)
8. [Launch Decision](#8-launch-decision)
9. [Monitoring Period](#9-monitoring-period)
10. [Rollback](#10-rollback)
11. [Post-launch Review](#11-post-launch-review)

---

## 1. Pre-launch Freeze

**Owner:** Tech Lead
**Duration:** 1 hour before deployment

| # | Action | Expected Result | Verification | Failure Action | Done |
|---|--------|----------------|--------------|----------------|------|
| 1.1 | Confirm correct branch selected | `main` or release branch checked out | `git branch` shows expected branch | Switch to correct branch | [ ] |
| 1.2 | Confirm correct commit/tag | Last commit matches approved release | `git log -1` matches planned release SHA | Checkout correct commit | [ ] |
| 1.3 | Verify no uncommitted changes | Clean working directory | `git status` shows "nothing to commit" | Stash or commit changes | [ ] |
| 1.4 | Run TypeScript check | Zero errors | `npm run type-check` exits 0 | Fix errors; do not suppress | [ ] |
| 1.5 | Run lint | Zero warnings | `npm run lint` exits 0 | Fix or document warnings | [ ] |
| 1.6 | Run unit tests | All pass | `npx vitest run` exits 0 | Fix failing tests | [ ] |
| 1.7 | Run production build | Build succeeds | `npm run build` exits 0 | Fix build errors | [ ] |
| 1.8 | Confirm VITE_DEMO_MODE=false | Demo mode disabled | Check `.env` file | Set to false; rebuild | [ ] |
| 1.9 | Confirm public URL is correct | Production domain, not localhost | `echo $VITE_PUBLIC_SITE_URL` | Update .env | [ ] |
| 1.10 | Confirm Stripe mode | Test mode for test launch, live mode understood | Verify Stripe key prefix | Document mode | [ ] |
| 1.11 | Confirm Resend domain verified | Sending domain shows verified | Check Resend dashboard | Complete verification | [ ] |
| 1.12 | Set release identifier | `VITE_RELEASE_VERSION` set in .env | Check `/app/admin/system-readiness` | Set and rebuild | [ ] |
| 1.13 | Document release version | Recorded in this runbook | Fill in header above | - | [ ] |

**Freeze decision:** [ ] PROCEED / [ ] HOLD (reason: _______)

---

## 2. Backup

**Owner:** Tech Lead / DevOps

| # | Action | Expected Result | Verification | Failure Action | Done |
|---|--------|----------------|--------------|----------------|------|
| 2.1 | Create Supabase database backup | Backup created successfully | Check Supabase Dashboard > Database > Backups | Retry; do not proceed without backup | [ ] |
| 2.2 | Record backup timestamp | Timestamp documented | Copy from Supabase dashboard | - | [ ] |
| 2.3 | Record backup identifier | ID documented | Copy from Supabase dashboard | - | [ ] |
| 2.4 | Review storage backup coverage | Critical files covered | List buckets with critical data | Note any gaps | [ ] |
| 2.5 | Confirm restoration instructions exist | Steps documented below | Review steps | Document missing steps | [ ] |
| 2.6 | Record current migration version | Version documented | Query `supabase_migrations` or check dashboard | - | [ ] |

**Backup identifier:** _______
**Backup timestamp:** _______
**Migration version:** _______

### Database Restoration Steps

If database restoration is required:
1. Go to Supabase Dashboard > Database > Backups
2. Locate the backup recorded above
3. Click "Restore" and confirm
4. Wait for restoration to complete
5. Re-deploy Edge Functions (step 4)
6. Re-run configuration verification (step 6)
7. Re-run smoke tests (step 7)

**Backup decision:** [ ] PROCEED / [ ] HOLD (reason: _______)

---

## 3. Database Migration

**Owner:** Tech Lead

| # | Action | Expected Result | Verification | Failure Action | Done |
|---|--------|----------------|--------------|----------------|------|
| 3.1 | List pending migrations | All migrations identified | Compare local migrations to Supabase dashboard | - | [ ] |
| 3.2 | Apply migrations in timestamp order | Each migration succeeds | Supabase dashboard shows applied | Stop if any fails; investigate | [ ] |
| 3.3 | Record applied migration names | Names documented | Copy from dashboard or migration files | - | [ ] |
| 3.4 | Verify RLS remains enabled | All wedding-scoped tables have RLS | Query each table's RLS status | Enable RLS before proceeding | [ ] |
| 3.5 | Verify constraints and indexes | No broken constraints | Query key tables for expected structure | Fix before proceeding | [ ] |
| 3.6 | Verify functions compile | No compilation errors | Check Supabase dashboard > Database > Functions | Fix syntax errors | [ ] |
| 3.7 | Run verification queries | Queries return expected results | See verification queries below | Investigate failures | [ ] |

### Verification Queries

Run these safe SELECT queries after migration:

```sql
-- Verify core tables exist and are queryable
SELECT COUNT(*) AS weddings FROM weddings;
SELECT COUNT(*) AS wedding_members FROM wedding_members;
SELECT COUNT(*) AS guests FROM guests;
SELECT COUNT(*) AS invitations FROM invitations;
SELECT COUNT(*) AS rsvp_submissions FROM rsvp_submissions;
SELECT COUNT(*) AS wedding_events FROM wedding_events;
SELECT COUNT(*) AS gift_registries FROM gift_registries;
SELECT COUNT(*) AS gallery_albums FROM gallery_albums;
SELECT COUNT(*) AS wedding_website_configs FROM wedding_website_configs;
SELECT COUNT(*) AS notifications FROM notifications;
SELECT COUNT(*) AS seating_plans FROM seating_plans;
```

**Migrations applied:** _______

**Migration decision:** [ ] PROCEED / [ ] HOLD (reason: _______)

---

## 4. Edge Function Deployment

**Owner:** Tech Lead

| # | Action | Expected Result | Verification | Failure Action | Done |
|---|--------|----------------|--------------|----------------|------|
| 4.1 | Deploy validate-invitation | Deployed successfully | Invoke with test probe | Re-deploy; check logs | [ ] |
| 4.2 | Deploy submit-rsvp | Deployed successfully | Invoke with test probe | Re-deploy; check logs | [ ] |
| 4.3 | Deploy create-subscription-checkout | Deployed successfully | Check dashboard | Re-deploy; check logs | [ ] |
| 4.4 | Deploy stripe-webhook-handler | Deployed successfully | Check dashboard | Re-deploy; check logs | [ ] |
| 4.5 | Deploy create-billing-portal-session | Deployed successfully | Check dashboard | Re-deploy; check logs | [ ] |
| 4.6 | Deploy invitation-send | Deployed successfully | Check dashboard | Re-deploy; check logs | [ ] |
| 4.7 | Deploy email-campaign-send | Deployed successfully | Check dashboard | Re-deploy; check logs | [ ] |
| 4.8 | Deploy provision-wedding-workspace | Deployed successfully | Check dashboard | Re-deploy; check logs | [ ] |
| 4.9 | Deploy guest-portal-loader | Deployed successfully | Check dashboard | Re-deploy; check logs | [ ] |
| 4.10 | Deploy remaining functions | All deployed successfully | Check dashboard | Re-deploy; check logs | [ ] |
| 4.11 | Verify secrets present for each function | All required secrets configured | Check Supabase Dashboard > Functions > Secrets | Add missing secrets | [ ] |
| 4.12 | Run `/app/admin/system-readiness` health checks | Edge Functions show pass | Navigate to page | Investigate failures | [ ] |

### Required Edge Functions Checklist

| Function | Purpose | Deployed | Secrets OK | Health |
|----------|---------|----------|------------|--------|
| validate-invitation | Token validation | [ ] | [ ] | [ ] |
| submit-rsvp | RSVP submission | [ ] | [ ] | [ ] |
| create-subscription-checkout | Stripe checkout | [ ] | [ ] | [ ] |
| stripe-webhook-handler | Stripe webhook processing | [ ] | [ ] | [ ] |
| create-billing-portal-session | Stripe Billing Portal | [ ] | [ ] | [ ] |
| invitation-send | Send invitations | [ ] | [ ] | [ ] |
| email-campaign-send | Campaign email | [ ] | [ ] | [ ] |
| provision-wedding-workspace | Wedding provisioning | [ ] | [ ] | [ ] |
| guest-portal-loader | Guest portal data | [ ] | [ ] | [ ] |
| gift-fund-create-checkout | Gift fund payments | [ ] | [ ] | [ ] |
| guest-gallery-upload | Gallery uploads | [ ] | [ ] | [ ] |
| stripe-gift-fund-webhook | Gift fund webhooks | [ ] | [ ] | [ ] |

**Function deployment decision:** [ ] PROCEED / [ ] HOLD (reason: _______)

---

## 5. Frontend Deployment

**Owner:** Tech Lead / DevOps

| # | Action | Expected Result | Verification | Failure Action | Done |
|---|--------|----------------|--------------|----------------|------|
| 5.1 | Build production bundle | Build succeeds | `npm run build` exits 0 | Fix build errors | [ ] |
| 5.2 | Verify no localhost references in bundle | No dev URLs | Search build output | Update env; rebuild | [ ] |
| 5.3 | Verify demo mode false in bundle | No demo data paths | Search for demo keywords in build | Set VITE_DEMO_MODE=false; rebuild | [ ] |
| 5.4 | Verify no server secrets in bundle | No secret keys | Search for STRIPE_SECRET, RESEND_API_KEY | Remove from client code | [ ] |
| 5.5 | Deploy to hosting | Deployment succeeds | Check hosting dashboard | Retry; check logs | [ ] |
| 5.6 | Verify public homepage loads | 200 OK, correct content | Open site URL in browser | Check hosting; rollback if needed | [ ] |
| 5.7 | Verify protected routes redirect | Redirect to /login | Open /app/dashboard without auth | Check auth config | [ ] |
| 5.8 | Verify no asset 404s | All assets load | Browser dev tools > Network | Check asset paths | [ ] |
| 5.9 | Record deployment identifier | Identifier documented | Copy from hosting dashboard | - | [ ] |
| 5.10 | Record rollback version | Previous frontend version documented | From hosting dashboard | - | [ ] |

**Deployment identifier:** _______
**Rollback version:** _______

**Frontend deployment decision:** [ ] PROCEED / [ ] HOLD (reason: _______)

---

## 6. Configuration Verification

**Owner:** Tech Lead

Navigate to `/app/admin/system-readiness` and verify:

| # | Check | Expected | Actual | Done |
|---|-------|----------|--------|------|
| 6.1 | Production Mode | PASS | | [ ] |
| 6.2 | Supabase URL | PASS | | [ ] |
| 6.3 | Supabase Anon Key | PASS | | [ ] |
| 6.4 | Public Site URL | PASS or WARN | | [ ] |
| 6.5 | Supabase Connection | PASS | | [ ] |
| 6.6 | Auth Session | PASS | | [ ] |
| 6.7 | Row-Level Security | PASS | | [ ] |
| 6.8 | Storage Buckets | PASS | | [ ] |
| 6.9 | Edge Functions | PASS | | [ ] |
| 6.10 | Subscription Plans | PASS or WARN | | [ ] |
| 6.11 | Public URL Validation | PASS | | [ ] |

**Configuration decision:** [ ] PROCEED / [ ] HOLD (reason: _______)

---

## 7. Live Smoke Tests

**Owner:** QA / Tech Lead
**Important:** Use dedicated test accounts and test weddings only. Never use real customer data.

### Test 1 — Public Website

| # | Action | Expected | Result | Done |
|---|--------|----------|--------|------|
| 7.1.1 | Navigate to homepage | Page loads, no console errors | | [ ] |
| 7.1.2 | Navigate to /pricing | Page loads correctly | | [ ] |
| 7.1.3 | Navigate to /privacy, /terms, /cookies | All legal pages load | | [ ] |
| 7.1.4 | Check metadata (title, description) | Correct for homepage | | [ ] |
| 7.1.5 | Check mobile at 375px | No horizontal overflow | | [ ] |

### Test 2 — Authentication

| # | Action | Expected | Result | Done |
|---|--------|----------|--------|------|
| 7.2.1 | Sign up new test account | Account created, redirected to onboarding | | [ ] |
| 7.2.2 | Log out and log back in | Login succeeds | | [ ] |
| 7.2.3 | Request password reset | Reset email received | | [ ] |
| 7.2.4 | Complete password reset | Password updated, can log in | | [ ] |
| 7.2.5 | Access /app/dashboard without login | Redirected to /login | | [ ] |
| 7.2.6 | Session persists across page navigation | No forced logout | | [ ] |

### Test 3 — Couple Dashboard

| # | Action | Expected | Result | Done |
|---|--------|----------|--------|------|
| 7.3.1 | Log in, navigate to dashboard | Dashboard loads | | [ ] |
| 7.3.2 | Active wedding resolves | Wedding name visible | | [ ] |
| 7.3.3 | Onboarding progress reads real data | Percentage > 0 (not forcing demo) | | [ ] |
| 7.3.4 | Guest and event counts load | Real numbers displayed | | [ ] |
| 7.3.5 | Navigate to each app section | All navigation works | | [ ] |
| 7.3.6 | No demo data appears | No demo wedding, no demo labels | | [ ] |

### Test 4 — Invitation and RSVP

| # | Action | Expected | Result | Done |
|---|--------|----------|--------|------|
| 7.4.1 | Create test guest in test wedding | Guest created | | [ ] |
| 7.4.2 | Create invitation for test guest | Invitation created with token | | [ ] |
| 7.4.3 | Open invitation link | Invitation page loads | | [ ] |
| 7.4.4 | Validate guest access | Guest portal loads, correct wedding data | | [ ] |
| 7.4.5 | Open RSVP form | Events listed, form loads | | [ ] |
| 7.4.6 | Save draft response | Saved successfully | | [ ] |
| 7.4.7 | Submit full response | Confirmation displayed | | [ ] |
| 7.4.8 | View confirmation | Correct response shown | | [ ] |
| 7.4.9 | Couple views response in dashboard | Response visible | | [ ] |
| 7.4.10 | Verify no cross-wedding data | Only test wedding data visible | | [ ] |
| 7.4.11 | Verify no raw tokens in browser console | No token logged | | [ ] |

### Test 5 — Email

| # | Action | Expected | Result | Done |
|---|--------|----------|--------|------|
| 7.5.1 | Send one test invitation email | Email sent | | [ ] |
| 7.5.2 | Verify correct sender address | From verified domain | | [ ] |
| 7.5.3 | Verify links use production URL | No localhost or preview URLs | | [ ] |
| 7.5.4 | Open email and click links | Links resolve correctly | | [ ] |
| 7.5.5 | Check delivery status | Confirmed delivery or accurate failure | | [ ] |

### Test 6 — Stripe (Test Mode)

| # | Action | Expected | Result | Done |
|---|--------|----------|--------|------|
| 7.6.1 | Navigate to pricing page | Plans displayed | | [ ] |
| 7.6.2 | Click subscribe on a plan | Checkout Session created | | [ ] |
| 7.6.3 | Stripe Checkout opens | Checkout page loads | | [ ] |
| 7.6.4 | Complete test payment | Use test card 4242 4242 4242 4242 | | [ ] |
| 7.6.5 | Redirect to success page | Success page loads | | [ ] |
| 7.6.6 | Verify webhook processed | Subscription record updated in Supabase | | [ ] |
| 7.6.7 | Verify entitlement refreshed | Plan features accessible | | [ ] |
| 7.6.8 | Open Billing Portal | Portal loads with subscription | | [ ] |

### Test 7 — Storage

| # | Action | Expected | Result | Done |
|---|--------|----------|--------|------|
| 7.7.1 | Upload test image (safe content) | Upload succeeds, record created | | [ ] |
| 7.7.2 | Verify image loads with correct URL | Image displays on page | | [ ] |
| 7.7.3 | Verify access policy | No cross-wedding access to file | | [ ] |
| 7.7.4 | Delete test item | Record removed, file deleted | | [ ] |

### Test 8 — Publishing

| # | Action | Expected | Result | Done |
|---|--------|----------|--------|------|
| 7.8.1 | Edit wedding website | Save draft | | [ ] |
| 7.8.2 | Publish website | Published version appears | | [ ] |
| 7.8.3 | Make draft-only change | Change not visible to guests | | [ ] |
| 7.8.4 | Verify guest website access | Guest sees published version only | | [ ] |

### Test 9 — Export

| # | Action | Expected | Result | Done |
|---|--------|----------|--------|------|
| 7.9.1 | Generate a test export (guest list) | Real file created | | [ ] |
| 7.9.2 | Download export | File downloads correctly | | [ ] |
| 7.9.3 | Verify content | Correct wedding data in export | | [ ] |
| 7.9.4 | Verify no private fields in guest-safe export | Private data excluded | | [ ] |

### Test 10 — Mobile Critical Routes

| # | Route | 375px Result | Done |
|---|-------|-------------|------|
| 7.10.1 | /login | No overflow, usable | [ ] |
| 7.10.2 | /app/dashboard | No overflow, usable | [ ] |
| 7.10.3 | Guest invitation page | No overflow, usable | [ ] |
| 7.10.4 | Guest RSVP form | No overflow, usable | [ ] |
| 7.10.5 | Wedding website (public) | No overflow, usable | [ ] |
| 7.10.6 | /app/gallery | No overflow, usable | [ ] |
| 7.10.7 | /app/billing | No overflow, usable | [ ] |

**Smoke test decision:** [ ] PROCEED / [ ] HOLD (reason: _______)

---

## 8. Launch Decision

**Owner:** Launch Lead

### Decision Criteria

**GO** — All of:
- [ ] Backup confirmed
- [ ] Migrations applied successfully
- [ ] All required Edge Functions deployed
- [ ] Frontend deployed and verified
- [ ] All critical smoke tests pass (Tests 1-4 minimum)
- [ ] Guest RSVP journey passes
- [ ] Authentication passes
- [ ] No critical security issue
- [ ] Stripe test flow passes (if billing in scope)
- [ ] Email test passes (if invitations in scope)
- [ ] System-readiness shows no FAIL status
- [ ] Rollback version recorded
- [ ] Monitoring active

**HOLD** — Any of:
- [ ] Non-critical smoke test failure that can be resolved quickly
- [ ] Non-blocking configuration gap identified
- [ ] External dependency issue (Stripe/Resend dashboard config pending)
- [ ] Minor visual or copy issue

**ROLLBACK** — Any of:
- [ ] Cross-wedding data exposure detected
- [ ] Guest access leakage detected
- [ ] Broken invitation validation
- [ ] RSVP submissions failing broadly
- [ ] Data corruption detected
- [ ] Authentication unavailable
- [ ] Production build serving demo data
- [ ] Stripe granting incorrect access
- [ ] Webhook processing corrupting subscription state
- [ ] Secret exposure
- [ ] Critical migration failure

### Decision

**Decision:** [ ] GO / [ ] HOLD / [ ] ROLLBACK

**Decision by:** _______
**Date/Time:** _______
**Reason (if not GO):** _______

---

## 9. Monitoring Period

**Owner:** On-call Engineer
**Duration:** 24 hours minimum

### Check Schedule

| Checkpoint | Time | Error Rate | Auth | RSVP | Email | Stripe | Storage | DB |
|------------|------|------------|------|------|-------|--------|---------|-----|
| T+15min | | | | | | | | |
| T+1hr | | | | | | | | |
| T+4hr | | | | | | | | |
| T+12hr | | | | | | | | |
| T+24hr | | | | | | | | |
| Next biz day | | | | | | | | |

### Monitor These Signals

| Signal | Where to check | Action on alert |
|--------|---------------|----------------|
| Frontend errors | Browser console, error boundary logs | Investigate; rollback if widespread |
| Edge Function failures | Supabase Dashboard > Functions > Logs | Investigate; rollback if critical function down |
| Auth failures | Supabase Dashboard > Auth > Logs | Investigate rate; rollback if > 10% |
| RSVP submission failures | submit-rsvp Edge Function logs | Critical — rollback if failing |
| Stripe webhook failures | stripe-webhook-handler logs | Critical — fix webhook or rollback |
| Email delivery failures | Resend dashboard, email-webhook logs | Investigate; warn users if needed |
| Storage errors | Supabase Dashboard > Storage > Logs | Investigate; fix permissions |
| Database errors | Supabase Dashboard > Database > Logs | Investigate; rollback if corruption |

---

## 10. Rollback

**Owner:** Tech Lead

### Decision Triggers

Immediately initiate rollback for any of:
- Cross-wedding or cross-guest data exposure
- Broken invitation validation
- RSVP submissions failing
- Authentication unavailable
- Production serving demo data
- Stripe granting incorrect access
- Secret exposure
- Critical migration failure

### Rollback Procedure

1. **Activate maintenance mode** (if available) — display calm public message
2. **Frontend rollback:** Revert to previous frontend deployment (recorded in step 5.10)
3. **Edge Function rollback:** Re-deploy previous function versions (documented per function)
4. **Configuration rollback:** Revert any config changes
5. **Database:** Do not auto-reverse migrations. Classify each migration:
   - Safe reversible: apply reverse migration
   - Forward-fix required: create fix migration
   - Backup restoration: restore from backup (requires explicit approval)
6. **Validate after rollback:** Re-run Tests 1-4 from smoke tests
7. **Communicate:** Notify stakeholders of rollback and ETA for fix

### Rollback Contacts

| Role | Name | Contact |
|------|------|---------|
| Launch Lead | | |
| Tech Lead | | |
| On-call Engineer | | |

---

## 11. Post-launch Review

**Owner:** Launch Lead
**Timing:** Within 48 hours of launch

### Review Agenda

1. What went well
2. What went wrong
3. Incidents and resolutions
4. Unexpected behaviour
5. Customer feedback (if any)
6. Performance observations
7. Monitoring results
8. Checklist improvements for next launch
9. Documented lessons learned
10. Follow-up actions

### Post-launch Report

Complete `docs/launch-outcome-report.md` within 48 hours.

---

## Appendix A: Contact Information

| Role | Name | Email | Phone |
|------|------|-------|-------|

## Appendix B: Key URLs

| Service | URL |
|---------|-----|
| Production site | |
| Supabase Dashboard | |
| Stripe Dashboard | |
| Resend Dashboard | |
| System Readiness | /app/admin/system-readiness |

## Appendix C: Environment Variables Required

See `docs/production-environment-checklist.md` for complete list.

## Appendix D: Incident Log

See `docs/launch-incident-log.md` for incident recording template.

---

*This runbook was last updated on {DATE}. Do not include real secret values in this document.*