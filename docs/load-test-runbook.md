# Load Test Runbook — Vowora

**Date:** 2026-08-05
**Status:** Proposed — not yet executed

---

## Important: Safety Rules

⚠️ **NEVER load test production without explicit approval.**
⚠️ **Use dedicated test weddings and users only.**
⚠️ **Do not send real emails during tests.**
⚠️ **Do not create live Stripe charges.**
⚠️ **Rate-limit all test requests.**
⚠️ **Clean up all test data after test completion.**
⚠️ **Record environment, release version, and date for every test.**

---

## Test Environment Setup

### Prerequisites
- Dedicated Supabase project or isolated test schema
- Test Stripe account (test mode keys)
- Test Resend domain or email suppression enabled
- Test wedding with known data volume

### Test Data Preparation
1. Create 3 test weddings: small (50 guests), medium (200 guests), large (500 guests)
2. Populate guests with realistic but anonymised data
3. Create invitations, RSVP responses, gallery assets, tasks
4. Seed operational events for operations dashboard testing
5. Record baseline query performance before load

---

## Test Scenarios

### 1. Public Wedding Page Read

**Goal:** Verify public wedding pages serve quickly under concurrent load.

**Setup:**
- Publish test wedding websites
- Warm cache if applicable

**Test:**
- 50 concurrent requests to `/w/{test-slug}`
- Measure: TTFB, response size, error rate

**Acceptance criteria:**
- TTFB < 500ms (p95)
- Zero errors
- Response size < 100KB

---

### 2. Invitation Validation

**Goal:** Verify invitation token validation handles concurrent access.

**Setup:**
- Generate 100 test invitation tokens
- Record token-to-wedding mapping

**Test:**
- 20 concurrent POST requests to `validate-invitation` Edge Function
- Each request uses a different valid token

**Acceptance criteria:**
- All responses return correct wedding data
- No cross-wedding data leakage
- Response time < 2s (p95)
- Zero errors

---

### 3. Guest RSVP Submission

**Goal:** Verify RSVP submissions remain consistent under load.

**Setup:**
- Create 50 test guest access sessions
- Prepare RSVP payloads for each guest

**Test:**
- 10 concurrent POST requests to `submit-rsvp` Edge Function
- Mix of attending/declined responses

**Acceptance criteria:**
- All submissions recorded correctly
- No duplicate RSVP entries
- Response time < 3s (p95)
- Zero data corruption

---

### 4. Dashboard Summary

**Goal:** Verify dashboard loads quickly with realistic data volume.

**Setup:**
- Use large test wedding (500 guests, 20 tasks, 50 payments)

**Test:**
- 5 concurrent dashboard page loads
- Measure: Time to interactive, query count, total data transferred

**Acceptance criteria:**
- Page interactive within 3s
- Query count < 20 (including sequential queries)
- Total data transferred < 500KB

---

### 5. Guest List Pagination

**Goal:** Verify guest list pagination handles large datasets.

**Setup:**
- Use large test wedding (500 guests)
- Apply no filters

**Test:**
- Navigate through 25 pages (20 per page)
- Measure: Page load time, query consistency

**Acceptance criteria:**
- Each page loads within 1s
- No duplicate or missing guests across pages
- Stable ordering

---

### 6. Search

**Goal:** Verify search performance with large dataset.

**Setup:**
- Use large test wedding (500 guests, 50 tasks, 20 suppliers)

**Test:**
- Search for common names, tasks, suppliers
- Measure: Response time, result accuracy

**Acceptance criteria:**
- Results return within 500ms
- No cross-wedding results
- All relevant items found

---

### 7. Gallery Listing

**Goal:** Verify gallery listing handles many assets.

**Setup:**
- Create 200 test gallery assets for a wedding
- Mix of approved, pending, and rejected

**Test:**
- Load gallery page with all tabs
- Measure: Media tab load time, moderation tab load time

**Acceptance criteria:**
- Media tab loads within 2s
- Moderation tab loads within 1s
- Thumbnails display correctly

---

### 8. Notification Listing

**Goal:** Verify notification list handles many notifications.

**Setup:**
- Seed 500 notifications for a test user

**Test:**
- Load notifications page
- Mark all as read
- Measure: Load time, mark-all-read completion time

**Acceptance criteria:**
- Page loads within 1s
- Mark all read completes within 2s
- No duplicate notifications

---

### 9. Stripe Webhook Idempotency

**Goal:** Verify webhook handler handles duplicate events correctly.

**Setup:**
- Use Stripe test mode
- Create a test checkout session

**Test:**
- Send the same `checkout.session.completed` event 3 times
- Verify only one subscription is created

**Acceptance criteria:**
- No duplicate subscriptions
- All retries return success
- Event logs show deduplication

---

### 10. Export Generation

**Goal:** Verify exports handle large datasets without browser freeze.

**Setup:**
- Use large test wedding
- Request CSV export of all guests

**Test:**
- Trigger export generation
- Measure: Time to completion, browser responsiveness

**Acceptance criteria:**
- Export completes within 10s
- Browser remains responsive
- CSV contains all guest data, no sensitive fields

---

## Test Execution Checklist

- [ ] Test environment isolated from production
- [ ] Test data prepared and verified
- [ ] Stripe in test mode
- [ ] Resend email sending disabled (suppression on)
- [ ] Rate limiting configured
- [ ] Monitoring in place (Supabase dashboard, Edge Function logs)
- [ ] Test results documented
- [ ] Test data cleaned up
- [ ] Environment restored to baseline

---

## Results Template

| Test # | Scenario | Concurrency | p50 | p95 | p99 | Errors | Pass/Fail | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Public wedding page | 50 | | | | | | |
| 2 | Invitation validation | 20 | | | | | | |
| 3 | RSVP submission | 10 | | | | | | |
| 4 | Dashboard | 5 | | | | | | |
| 5 | Guest pagination | 1 | | | | | | |
| 6 | Search | 1 | | | | | | |
| 7 | Gallery listing | 1 | | | | | | |
| 8 | Notifications | 1 | | | | | | |
| 9 | Webhook idempotency | 3x retry | | | | | | |
| 10 | Export | 1 | | | | | | |

---

*This runbook is for non-destructive testing in isolated environments only. Never execute against production without explicit written approval from platform owner.*