# Vowora Launch Monitoring Checklist

**Release:** v{RELEASE_VERSION}
**Launch date:** {LAUNCH_DATE}
**Monitoring owner:** {OWNER}

---

## Monitoring Signals

### 1. Frontend Error Rate

| Field | Value |
|-------|-------|
| **Where to check** | Browser console (during smoke tests), error boundary logs, Supabase logs |
| **Normal state** | Zero or near-zero unhandled errors on known pages |
| **Warning threshold** | 3+ unhandled errors in 15 minutes on core pages (dashboard, invitation, RSVP) |
| **Critical threshold** | Errors preventing core journey completion (login, RSVP, checkout) |
| **Check frequency** | Continuous during monitoring period |
| **Action on warning** | Investigate in error boundary logs; note in incident log |
| **Action on critical** | Evaluate rollback per runbook |
| **Owner** | On-call Engineer |

### 2. Edge Function Failures

| Field | Value |
|-------|-------|
| **Where to check** | Supabase Dashboard > Functions > Logs for each function |
| **Normal state** | All invocations succeed (may include expected "invalid" responses for probes) |
| **Warning threshold** | >5% error rate on any function |
| **Critical threshold** | validate-invitation, submit-rsvp, or stripe-webhook-handler returning errors >50% |
| **Check frequency** | Every 15 minutes for first hour, then hourly |
| **Action on warning** | Check specific function logs; identify pattern |
| **Action on critical** | Critical — evaluate rollback per runbook |
| **Owner** | On-call Engineer |

### 3. Authentication Errors

| Field | Value |
|-------|-------|
| **Where to check** | Supabase Dashboard > Auth > Logs |
| **Normal state** | Normal sign-in/sign-up rate; minimal auth errors |
| **Warning threshold** | Login failure rate >5% above baseline |
| **Critical threshold** | Login completely broken or >20% failure rate |
| **Check frequency** | Every 30 minutes for first 4 hours |
| **Action on warning** | Investigate error type (wrong password vs system error) |
| **Action on critical** | Rollback per runbook |
| **Owner** | On-call Engineer |

### 4. Invitation Validation Failures

| Field | Value |
|-------|-------|
| **Where to check** | validate-invitation Edge Function logs |
| **Normal state** | Valid tokens succeed; invalid/expired tokens show expected rejection |
| **Warning threshold** | Valid tokens unexpectedly rejected >5% |
| **Critical threshold** | All invitations failing validation |
| **Check frequency** | Every 15 minutes for first 4 hours |
| **Action on warning** | Check token generation and hashing logic |
| **Action on critical** | Critical — rollback immediately |
| **Owner** | On-call Engineer |

### 5. RSVP Submission Failures

| Field | Value |
|-------|-------|
| **Where to check** | submit-rsvp Edge Function logs |
| **Normal state** | Submissions succeed, data written to Supabase |
| **Warning threshold** | >3 submission failures in 15 minutes |
| **Critical threshold** | All RSVP submissions failing |
| **Check frequency** | Every 15 minutes for first 4 hours |
| **Action on warning** | Check error types; investigate specific failures |
| **Action on critical** | Critical — rollback immediately |
| **Owner** | On-call Engineer |

### 6. Stripe Webhook Failures

| Field | Value |
|-------|-------|
| **Where to check** | Stripe Dashboard > Webhooks > Events; stripe-webhook-handler logs |
| **Normal state** | Webhooks received, processed, returning 200 |
| **Warning threshold** | >3 failed webhook deliveries in 30 minutes |
| **Critical threshold** | Webhook signature verification failing OR subscription updates not persisting |
| **Check frequency** | Every 30 minutes |
| **Action on warning** | Check webhook secret and endpoint configuration |
| **Action on critical** | Fix webhook immediately; evaluate rollback |
| **Owner** | On-call Engineer |

### 7. Checkout Failures

| Field | Value |
|-------|-------|
| **Where to check** | create-subscription-checkout Edge Function logs; Stripe Dashboard |
| **Normal state** | Checkout Sessions created successfully |
| **Warning threshold** | >5% checkout creation failures |
| **Critical threshold** | All checkouts failing |
| **Check frequency** | Every 30 minutes |
| **Action on warning** | Check plan mapping and Stripe connectivity |
| **Action on critical** | Block new signups; fix or rollback |
| **Owner** | On-call Engineer |

### 8. Email Delivery Failures

| Field | Value |
|-------|-------|
| **Where to check** | Resend Dashboard > Activity; email-webhook Edge Function logs |
| **Normal state** | Emails sent and delivered (or accurately bouncing for invalid addresses) |
| **Warning threshold** | Delivery failure rate >10% above normal bounce rate |
| **Critical threshold** | All emails failing to send |
| **Check frequency** | Every hour |
| **Action on warning** | Check Resend domain verification and quotas |
| **Action on critical** | Pause email sending; investigate provider |
| **Owner** | On-call Engineer |

### 9. Storage Upload Failures

| Field | Value |
|-------|-------|
| **Where to check** | Supabase Dashboard > Storage > Logs; gallery upload function logs |
| **Normal state** | Uploads succeed with correct file sizes and types |
| **Warning threshold** | >5% upload failures |
| **Critical threshold** | All uploads failing |
| **Check frequency** | Every hour |
| **Action on warning** | Check bucket policies and storage quotas |
| **Action on critical** | Fix permissions; evaluate rollback |
| **Owner** | On-call Engineer |

### 10. Export Failures

| Field | Value |
|-------|-------|
| **Where to check** | Export function logs |
| **Normal state** | Export requests generate downloadable files |
| **Warning threshold** | >3 export failures in 1 hour |
| **Critical threshold** | All exports failing |
| **Check frequency** | Every 2 hours |
| **Action on warning** | Check export generation logic |
| **Action on critical** | Fix or disable export temporarily |
| **Owner** | On-call Engineer |

### 11. Database Errors

| Field | Value |
|-------|-------|
| **Where to check** | Supabase Dashboard > Database > Logs |
| **Normal state** | Normal query volume, no constraint violations |
| **Warning threshold** | Unusual constraint violations or query errors |
| **Critical threshold** | Data corruption, missing tables, RLS bypass detected |
| **Check frequency** | Every 30 minutes for first 4 hours, then every 2 hours |
| **Action on warning** | Investigate specific error types |
| **Action on critical** | Critical — evaluate rollback per runbook |
| **Owner** | On-call Engineer |

### 12. Realtime Connection Issues

| Field | Value |
|-------|-------|
| **Where to check** | Supabase Dashboard > Realtime; gallery live wall behaviour |
| **Normal state** | Connections established, realtime updates working |
| **Warning threshold** | Connection drops >10% of clients |
| **Critical threshold** | Realtime completely unavailable |
| **Check frequency** | Every hour |
| **Action on warning** | Check realtime configuration |
| **Action on critical** | Note but not rollback-critical unless core feature breaks |
| **Owner** | On-call Engineer |

### 13. Custom Domain Failures

| Field | Value |
|-------|-------|
| **Where to check** | Domain Edge Function logs (if applicable) |
| **Normal state** | Domain verification and routing working |
| **Warning threshold** | New domain verifications failing |
| **Critical threshold** | Existing custom domains not resolving |
| **Check frequency** | Every 2 hours |
| **Action on warning** | Check provider credentials |
| **Action on critical** | Fix DNS/provider; evaluate rollback |
| **Owner** | On-call Engineer |

---

## Monitoring Checkpoints

| Time | Signals Checked | Issues Found | Action Taken |
|------|-----------------|-------------|--------------|
| T+15min | | | |
| T+1hr | | | |
| T+4hr | | | |
| T+12hr | | | |
| T+24hr | | | |
| Next biz day | | | |

---

## Escalation Path

| Level | When | Who |
|-------|------|-----|
| Level 1 | Warning threshold breached | On-call Engineer |
| Level 2 | Critical threshold breached | Tech Lead + On-call Engineer |
| Level 3 | Rollback decision needed | Launch Lead |
| Level 4 | Data loss or security incident | Launch Lead + Security Lead |

---

*This checklist was last updated on {DATE}. Thresholds are initial estimates and should be refined based on observed production patterns.*