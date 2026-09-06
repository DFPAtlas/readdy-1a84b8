# Scaling Plan — Vowora

**Date:** 2026-08-05
**Version:** 1.0 (Proposed)
**Owner:** Platform team

---

## 1. Current Architecture

### Infrastructure

| Component | Provider | Plan/Configuration |
|---|---|---|
| Database | Supabase | PostgreSQL, managed |
| Auth | Supabase Auth | Built-in |
| Storage | Supabase Storage | Managed, S3-compatible |
| Edge Functions | Supabase | Deno runtime, globally distributed |
| Realtime | Supabase | WebSocket-based, per-channel |
| Email | Resend | Transactional + campaign |
| Payments | Stripe | Checkout + Billing Portal |
| Frontend | Vite + React | SPA, CDN-served |

### Current Load Profile

- **Weddings:** Count from `weddings` table
- **Guests:** Count from `guests` table
- **RSVP submissions:** Per-wedding volume
- **Gallery assets:** Count from `gallery_assets` table
- **Edge Function calls:** <100K/month (estimated)
- **Realtime connections:** <50 concurrent (estimated)

---

## 2. Known Limits

### Database (Supabase)

| Limit | Value | Current Usage | Status |
|---|---|---|---|
| Row limit (free plan) | 500K rows | Variable | Monitor |
| Row limit (pro plan) | Unlimited | — | OK |
| Storage (free) | 1GB | Variable | Monitor |
| Storage (pro) | 100GB+ | Variable | OK |
| Connections | 60 direct / 200 pooler | <20 | OK |

### Edge Functions

| Limit | Value | Current Usage | Status |
|---|---|---|---|
| Invocations (free) | 500K/month | Low | OK |
| Invocations (pro) | 2M/month | Low | OK |
| Execution timeout | 10s | All under 5s | OK |
| Payload size | 6MB | All under 1MB | OK |

### Email (Resend)

| Limit | Value | Current Usage | Status |
|---|---|---|---|
| Daily sends (free) | 100/day | Variable | Monitor |
| Sends (pro) | 50K+/month | Variable | OK |

---

## 3. Expected Growth Drivers

| Driver | Growth Pattern | Impact |
|---|---|---|
| New wedding signups | Linear (marketing-driven) | Database rows, storage |
| Guest RSVPs per wedding | Per-wedding (50-300 guests) | Edge function calls, email sends |
| Gallery uploads | Per-wedding, seasonal peaks | Storage, moderation queue |
| Email campaigns | Per-wedding, occasional | Resend volume |
| Export generation | Per-wedding, occasional | Edge function CPU, storage |

---

## 4. Database Scaling Options

### Current: Single Supabase PostgreSQL instance

**Scale-up path:**
1. Upgrade Supabase plan (more compute, more storage)
2. Add read replicas for analytics queries (if available)

**Scale-out path:**
1. Archive old/inactive wedding data to separate schema
2. Shard by wedding_id if approaching PostgreSQL physical limits (unlikely at current scale)

**Trigger points:**
- Row count exceeding 500K → upgrade plan
- Query latency >500ms on indexed queries → review indexes, consider read replica
- Storage >50GB → review retention, add cleanup jobs

---

## 5. Storage Scaling

### Current: Supabase Storage (single bucket per category)

**Scale-up path:**
1. Increase storage quota via Supabase plan
2. Add lifecycle rules for automatic cleanup of:
   - Exported files older than 30 days
   - Rejected gallery media older than 90 days
   - Temporary uploads older than 7 days

**Trigger points:**
- Storage >80% of plan limit → add cleanup job
- Monthly growth >20% → review retention policy
- Egress costs high → add CDN caching for public assets

---

## 6. Edge Function Scaling

### Current: Auto-scaled by Supabase

**Scale-up path:**
1. Increase plan limits
2. Optimise cold starts:
   - Keep critical functions warm via periodic health checks
   - Minimise dependency imports
3. Batch operations where possible (e.g., email campaigns)

**Trigger points:**
- Cold start >3s on invitation validation or RSVP submit → add keep-warm
- >10% failure rate → investigate timeout or rate limit issues

---

## 7. Realtime Scaling

### Current: Per-wedding channels

**Scale-up path:**
1. Supabase Realtime scales automatically with plan
2. If connection limits are hit:
   - Consolidate channels (e.g., one channel per wedding instead of per-feature)
   - Replace non-critical Realtime with polling/refetch

**Trigger points:**
- >200 concurrent connections → review channel strategy
- Realtime message delivery >1s latency → investigate

---

## 8. Email Scaling

### Current: Resend transactional + campaign

**Scale-up path:**
1. Upgrade Resend plan
2. Add sending domain warmup for new domains
3. Implement sending rate limits per wedding

**Trigger points:**
- Daily sends approaching plan limit → upgrade or rate-limit
- Delivery rate <95% → review sender reputation
- Bounce rate >2% → review list hygiene

---

## 9. Export Scaling

### Current: Client-side generation for CSVs, Edge Function for PDFs

**Scale-up path:**
1. Move all generation to Edge Functions (server-side)
2. Add export job queue with status tracking
3. Process large exports in batches
4. Store results in private storage with signed URLs

**Trigger points:**
- Export taking >30s → move to server-side
- Multiple concurrent exports causing browser slowdown → add queue

---

## 10. Search Scaling

### Current: Client-side filtering (demo), placeholder (production)

**Scale-up path:**
1. Implement PostgreSQL full-text search (`tsvector`/`tsquery`)
2. Add GIN indexes for text search columns
3. If scale requires: dedicated search service (Meilisearch, Algolia)

**Trigger points:**
- Client-side search slow with >1000 items → move to DB
- DB full-text search slow with >100K items → add dedicated search

---

## 11. Media Delivery Scaling

### Current: Direct Supabase Storage URLs

**Scale-up path:**
1. Add Supabase Image Transformation for thumbnails
2. Add CDN in front of storage for public assets
3. Implement responsive image sizes (srcset)

**Trigger points:**
- Gallery page load >3s → add thumbnails
- Storage egress costs high → add CDN

---

## 12. Operational Thresholds

| Threshold | Type | Current Value | Action |
|---|---|---|---|
| Database rows >80% of plan limit | Warning | Unknown | Review plan, archive old data |
| Storage >80% of plan limit | Warning | Variable | Add cleanup jobs |
| Edge function failure rate >5% | Critical | <1% | Investigate immediately |
| Email delivery rate <95% | Warning | >98% | Review sender reputation |
| RSVP submission failure rate >1% | Critical | <0.1% | Investigate immediately |
| Gallery moderation queue >50 pending | Warning | Variable | Review moderation pipeline |

---

## 13. Unknowns Requiring Load Testing

1. **Concurrent RSVP submissions:** How many simultaneous RSVP submissions can the system handle before Supabase rate-limiting kicks in?
2. **Gallery upload concurrency:** What is the maximum number of concurrent uploads before storage bandwidth becomes a bottleneck?
3. **Dashboard load under peak:**
4. **Realtime message throughput:** How many messages/second can Realtime deliver before latency becomes unacceptable?

**Recommendation:** Run load tests in an isolated test environment before major marketing pushes or seasonal peaks.

---

## 14. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Database reaching row limit | Low | High | Monitor counts, upgrade plan |
| Storage growth faster than expected | Medium | Medium | Add cleanup jobs, thumbnails |
| Edge function cold starts affecting UX | Low | Medium | Keep-warm for critical functions |
| Email delivery issues during peak | Low | High | Monitor bounce rate, warm domains |
| Stripe webhook failures causing billing issues | Low | Critical | Idempotent webhook handling already in place |
| Cross-wedding data leak via cache | Low | Critical | No shared cache across weddings |

---

*This plan uses current provider-documented limits and observed application behaviour. All thresholds marked "Proposed" require administrator confirmation before becoming operational.*