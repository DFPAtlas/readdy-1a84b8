# Cost Monitoring Guide — Vowora

**Date:** 2026-08-05
**Version:** 1.0

---

## Overview

This guide explains how to monitor Vowora's platform costs and capacity usage across Supabase, Stripe, and Resend. All figures shown are estimates — always verify against provider dashboards.

---

## Cost Sources

### Supabase

| Metric | Where to Check | Frequency |
|---|---|---|
| Database size | Supabase Dashboard → Database → Settings | Weekly |
| Storage usage | Supabase Dashboard → Storage | Weekly |
| Edge Function invocations | Supabase Dashboard → Edge Functions → Logs | Weekly |
| Realtime messages | Supabase Dashboard → Realtime | Monthly |
| Auth users | Supabase Dashboard → Authentication → Users | Monthly |

### Stripe

| Metric | Where to Check | Frequency |
|---|---|---|
| Transaction volume | Stripe Dashboard → Payments | Monthly |
| Subscription MRR | Stripe Dashboard → Analytics | Monthly |
| Dispute rate | Stripe Dashboard → Disputes | Monthly |
| Processing fees | Stripe Dashboard → Reports | Monthly |

### Resend

| Metric | Where to Check | Frequency |
|---|---|---|
| Email sends (daily/monthly) | Resend Dashboard → Analytics | Weekly |
| Delivery rate | Resend Dashboard → Analytics | Weekly |
| Bounce rate | Resend Dashboard → Analytics | Weekly |
| Domain reputation | Resend Dashboard → Domains | Monthly |

---

## Cost Estimate Categories

### Database

**Estimates based on:**
- Row counts from `guests`, `weddings`, `invitations`, `rsvp_submissions`
- Storage size estimate from `gallery_assets`

**Monitoring queries (Performance Dashboard):**
- Guest count: `SELECT COUNT(*) FROM guests`
- Wedding count: `SELECT COUNT(*) FROM weddings`
- Gallery assets: `SELECT COUNT(*) FROM gallery_assets`

**Thresholds:**
- Database rows > 80% of plan limit → upgrade plan or archive
- Storage > 80% of plan limit → add cleanup

### Edge Functions

**Estimates based on:**
- Operational event count from `operational_events`
- Stripe webhook event volume

**Thresholds:**
- Invocation count > 80% of monthly plan limit → review usage
- Failure rate > 5% → investigate immediately

### Email

**Estimates based on:**
- `send_log` table total count
- Campaign send volume

**Thresholds:**
- Daily sends > 80% of plan limit → upgrade or rate-limit
- Delivery rate < 95% → review reputation

---

## Monthly Review Checklist

### Week 1 — Infrastructure
- [ ] Review Supabase database size
- [ ] Review Supabase storage usage
- [ ] Check Edge Function invocation count
- [ ] Verify backup completion

### Week 2 — Transactions
- [ ] Review Stripe transaction volume
- [ ] Check subscription MRR and churn
- [ ] Review dispute rate
- [ ] Verify webhook processing health

### Week 3 — Communication
- [ ] Review Resend email volume
- [ ] Check delivery and bounce rates
- [ ] Review campaign performance
- [ ] Verify sender domain reputation

### Week 4 — Planning
- [ ] Project next month's growth
- [ ] Review capacity warnings from Performance Dashboard
- [ ] Update scaling plan if needed
- [ ] Review retention and cleanup jobs

---

## Capacity Warning Thresholds

These are proposed thresholds shown on the Performance Dashboard. Adjust based on your plan and growth:

| Warning | Threshold | Action |
|---|---|---|
| Database approaching plan limit | >80% of plan row limit | Consider upgrading plan |
| Storage growth spike | >30% month-over-month | Review gallery upload patterns |
| Edge function failure increase | >5% failure rate | Check logs for timeouts |
| Realtime connection increase | >200 concurrent | Review channel strategy |
| Email quota approaching | >80% of daily limit | Consider plan upgrade |
| Export storage cleanup overdue | Exports >30 days old | Run cleanup job |

---

## Cost Optimisation Tips

1. **Gallery:** Generate thumbnails on upload to reduce storage egress costs for grid views
2. **Exports:** Clean up exports older than 30 days automatically
3. **Analytics events:** Apply 90-day retention to `product_analytics_events`
4. **Operational events:** Apply 90-day retention to low-value diagnostic events
5. **Demo data:** Clear demo data on logout to reduce localStorage footprint
6. **Realtime:** Only subscribe to channels the user is actively viewing
7. **Edge Functions:** Minimise cold starts by keeping critical functions warm

---

## Important Notes

- All monetary estimates are based on current Supabase/Stripe/Resend pricing as of audit date
- Actual costs depend on plan tier and usage patterns
- This guide does not replace provider billing dashboards
- No provider credentials or billing details are exposed in the Performance Dashboard
- Cost figures shown are aggregate estimates only

---

*Review this guide monthly. Update thresholds as your plan and usage evolve.*