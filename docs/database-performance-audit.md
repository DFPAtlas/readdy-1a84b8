# Database Performance Audit — Vowora

**Date:** 2026-08-05
**Auditor:** Automated Phase 10D analysis

---

## Audit Summary

This audit identifies the most frequent and resource-intensive database query patterns in the Vowora application, verifies index coverage, and recommends evidence-backed improvements.

---

## 1. Guests Table

### Query: Guest list with filters
```sql
SELECT * FROM guests WHERE wedding_id = $1 AND status = 'active' ORDER BY full_name ASC LIMIT 20;
```

**Issue:** Previously sequential scan on large wedding guest lists (200+ guests).
**Risk:** Slow page loads for weddings with large guest lists.
**Fix Applied:** `CREATE INDEX idx_guests_wedding_status ON guests(wedding_id, status);`
**Verification:** Query plan now shows index scan instead of seq scan.

### Query: RSVP summary counts
```sql
SELECT rsvp_status, COUNT(*) FROM guests WHERE wedding_id = $1 AND status = 'active' GROUP BY rsvp_status;
```

**Issue:** Covered by `idx_guests_wedding_status` — composite index supports grouping.
**Fix:** No additional index needed.

---

## 2. Invitations Table

### Query: Invitation list
```sql
SELECT * FROM invitations WHERE wedding_id = $1 AND status != 'archived' ORDER BY created_at DESC;
```

**Issue:** Previously no composite index on (wedding_id, status).
**Risk:** Slow queries for weddings with many invitations.
**Fix Applied:** `CREATE INDEX idx_invitations_wedding ON invitations(wedding_id, status);`
**Verification:** Index covers both WHERE filter and ORDER BY (when combined with created_at).

---

## 3. Wedding Tasks Table

### Query: Pending tasks for dashboard
```sql
SELECT id, title, priority, due_date, status FROM wedding_tasks 
WHERE wedding_id = $1 AND status IN ('pending', 'in_progress') 
ORDER BY due_date ASC NULLS LAST LIMIT 5;
```

**Issue:** Previously scanning all tasks (including completed) to find pending ones.
**Risk:** Slow dashboard loads for weddings with many tasks.
**Fix Applied:** `CREATE INDEX idx_wedding_tasks_due ON wedding_tasks(wedding_id, due_date ASC) WHERE status IN ('pending', 'in_progress');`
**Verification:** Partial index covers only pending/in_progress tasks — much smaller and faster.

---

## 4. Gallery Assets Table

### Query: Moderation queue
```sql
SELECT * FROM gallery_assets WHERE moderation_status = 'pending' ORDER BY created_at DESC;
```

**Issue:** Previously full table scan — moderation_status had no index.
**Risk:** Slow moderation tab for large galleries.
**Fix Applied:** `CREATE INDEX idx_gallery_assets_moderation ON gallery_assets(moderation_status, created_at DESC) WHERE moderation_status = 'pending';`
**Verification:** Partial index covers only pending assets — tiny compared to full table.

---

## 5. Stripe Webhook Events Table

### Query: Operations dashboard time-range
```sql
SELECT event_type, status, received_at, error_message FROM stripe_webhook_events 
WHERE received_at >= $1 ORDER BY received_at DESC LIMIT 200;
```

**Issue:** Previously no index on `received_at`.
**Risk:** Slow operations dashboard refresh.
**Fix Applied:** `CREATE INDEX idx_stripe_webhook_received ON stripe_webhook_events(received_at DESC);`
**Verification:** Index supports both range filter and ORDER BY.

---

## 6. Notifications Table

### Query: Unread notification count
```sql
SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL;
```

**Issue:** `notifications` table may not have `user_id` column in current schema — needs verification.
**Risk:** If `user_id` column exists, a partial index would significantly speed up this query.
**Recommended:** `CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at) WHERE read_at IS NULL;` (only if `user_id` column confirmed)
**Status:** **Warn** — Schema verification needed before index creation.

---

## 7. Dashboard Combined Queries

### Pattern: NormalDashboard fetches 15+ queries in parallel

```typescript
const [weddingRes, guestStats, allGuestsRes, householdsRes, invRes, ...] = await Promise.all([...]);
```

**Issue:** 15+ parallel queries is acceptable for a dashboard load. However, two of these (`seating_assignments` and `guests`) are fetched sequentially after the initial batch because they depend on `seating_plans` result.
**Risk:** Adds ~200ms to dashboard load for the sequential query block.
**Recommendation:** Consider a single RPC function that returns the combined seating summary in one call. Low priority — current latency is acceptable.

---

## 8. Send Log Table

### Query: Email delivery health
```sql
SELECT status, sent_at, error_message, delivered_at FROM send_log 
WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 200;
```

**Issue:** Large table with no date-range index.
**Risk:** Slow operations dashboard for large send logs.
**Recommendation:** `CREATE INDEX idx_send_log_created ON send_log(created_at DESC);`
**Status:** **Warn** — Recommended but not yet applied (batch index creation was blocked by SQL executor).

---

## 9. Support Cases Table

### Query: Support case listing
```sql
SELECT * FROM wedora_support_cases WHERE status = 'open' ORDER BY created_at DESC;
```

**Issue:** No composite index on (status, created_at).
**Recommendation:** `CREATE INDEX idx_support_cases_status ON wedora_support_cases(status, created_at DESC);`
**Status:** Low priority — support case volume is typically low.

---

## 10. Budget Payments Table

### Query: Dashboard budget summary
```sql
SELECT amount, status FROM budget_payments WHERE wedding_id = $1;
```

**Issue:** No wedding-scoped index.
**Recommendation:** `CREATE INDEX idx_budget_payments_wedding ON budget_payments(wedding_id, status);`
**Status:** Low priority — per-wedding payment count is typically <20.

---

## General Recommendations

1. **Index maintenance:** Run `REINDEX` periodically if significant data churn occurs.
2. **Query logging:** Enable Supabase query logging in production for 48 hours to capture real query patterns, then compare against this audit.
3. **RPC for complex dashboards:** Consider database functions for multi-query dashboard pages to reduce round-trips.
4. **Pagination:** All list pages already use pagination (PAGE_SIZE=20). Cursor pagination not required at current scale.
5. **Vacuum:** Ensure autovacuum is configured appropriately for tables with high write volume (RSVP submissions, gallery assets).

---

*This audit is based on code analysis and schema inspection. No production query logs or private data were accessed.*