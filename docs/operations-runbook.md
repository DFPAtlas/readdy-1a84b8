# Vowora Operations Runbook

## Purpose

This runbook describes operational procedures for the Vowora platform. It covers health monitoring, routine checks, alert response, and maintenance workflows.

**This document contains no secret values, API keys, or private customer data.**

---

## 1. Accessing Operations Tools

### Operations Dashboard

Route: `/app/admin/operations`
Access: Wedding owners and partners only

The Operations Dashboard provides real-time health summaries across:
- Platform availability
- Stripe webhook health
- Email delivery health
- RSVP submission health
- Gallery moderation
- Security events
- Support case volume

### Other Admin Pages

| Route | Purpose |
|---|---|
| `/app/admin/operations` | Operations dashboard — health checks and critical journeys |
| `/app/admin/incidents` | Incident management — create, track, resolve incidents |
| `/app/admin/support` | Support centre — manage customer support cases |
| `/app/admin/releases` | Release centre — track releases and hotfixes |
| `/app/admin/system-readiness` | System readiness — deployment health checks and launch checklist |

---

## 2. Daily Health Check

### Morning Check (recommended 09:00 UTC)

1. Open `/app/admin/operations`
2. Set time range to "24 hours"
3. Verify overall platform status is "Healthy" (green)
4. Review each health category for warnings or failures:
   - Stripe Webhooks: failed events should be 0 or single digits
   - Email Delivery: failed should be < 10
   - RSVP Submissions: should show submitted count
   - Security Events: blocked events are normal; spikes need investigation
5. Check Open Incidents card — should be "0 critical, 0 high"
6. Check Open Support Cases — click through for details

### If Warnings Appear

1. Click into the warning category for detail
2. Open the related data source (Supabase dashboard, Stripe dashboard, Resend dashboard)
3. Create an incident in `/app/admin/incidents` if the issue is ongoing
4. Document the finding and resolution

---

## 3. Stripe Monitoring

### Webhook Health

1. Navigate to Operations Dashboard → check "Stripe Webhooks" card
2. Failed count > 5 in 24h: investigate in Stripe Dashboard > Webhooks
3. Zero events in 24h: verify webhook endpoint is registered and receiving

### Subscription Health

1. Check `wedora_subscriptions` table in Supabase
2. Look for subscriptions in unexpected states
3. Verify Stripe webhook events match subscription records

### Checkout Health

1. Monitor Checkout Session creation errors
2. Verify success/cancel redirects work
3. Test with Stripe test mode if needed

---

## 4. Email Monitoring

### Delivery Health

1. Operations Dashboard → Email Delivery card
2. Failed count > 10 in 24h: investigate in Resend Dashboard
3. 0 delivered in 24h: verify Resend configuration

### Investigation Steps

1. Check Resend Dashboard for bounce/complaint details
2. Verify RESEND_API_KEY and RESEND_FROM_DOMAIN in Supabase Secrets
3. Check `send_log` table for detailed error messages
4. Test with a dedicated test email address

---

## 5. RSVP Monitoring

### Submission Health

1. Operations Dashboard → RSVP Submissions card
2. Submitted count should show activity
3. Zero submissions with active invitations: check invitation tokens

### Investigation

1. Check `rsvp_submissions` table for error patterns
2. Verify `submit-rsvp` Edge Function is deployed and responding
3. Test a guest RSVP flow with a dedicated test wedding

---

## 6. Security Event Monitoring

### Daily Review

1. Operations Dashboard → Security Events card
2. Blocked events are expected (rate limiting, invalid tokens)
3. Spikes in blocked events warrant investigation
4. Check `guest_access_security_events` table for patterns

### Alert Thresholds

- > 50 blocked events/hour: create a low-severity incident
- > 200 blocked events/hour: create a medium-severity incident
- Pattern of cross-wedding access attempts: create a high-severity incident

---

## 7. Routine Maintenance

### Weekly

- Review all open incidents — close resolved ones
- Review open support cases — triage new ones
- Check release centre for any pending hotfixes
- Review Edge Function logs in Supabase dashboard

### Monthly

- Review data retention — archive old operational events
- Verify RLS policies on all operational tables
- Test rollback procedure
- Review and update documentation

### Quarterly

- Full security audit
- Penetration test on guest access boundaries
- Test disaster recovery
- Review incident patterns for systemic issues

---

## 8. Data Sources

| Data Source | Table/Service | Dashboard Card |
|---|---|---|
| Stripe | `stripe_webhook_events` | Stripe Webhooks |
| Email | `send_log` | Email Delivery |
| RSVP | `rsvp_submissions` | RSVP Submissions |
| Security | `guest_access_security_events` | Security Events |
| Gallery | `gallery_reports` | Gallery Reports |
| Incidents | `operational_incidents` | Open Incidents |
| Support | `wedora_support_cases` | Open Support |
| Releases | `operational_releases` | Release Centre |

---

## 9. Emergency Contacts

*Do not include real contact details in this document. Maintain a separate secure contact list.*

---

## 10. Runbook Maintenance

This runbook should be reviewed and updated after every:
- Major platform incident
- New feature deployment
- Quarterly review
- Change in operational team structure

Last updated: 2026-08-04
Version: 1.0