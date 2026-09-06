# Vowora — Operations Runbooks

Date: 2026-07-23
Phase: Production Prompt 17
Status: Draft — review with on-call team before production use

---

## Runbook 1: Incident Response

### Severity Levels

| Level | Definition | Response Time | Escalation |
|-------|-----------|--------------|------------|
| SEV1 | Complete service outage, data loss, security breach | 15 minutes | CTO + on-call engineer |
| SEV2 | Degraded service, partial outage, failed email delivery | 30 minutes | On-call engineer + lead |
| SEV3 | Non-critical bug, visual issue, minor feature broken | 4 hours | Engineering team |
| SEV4 | Cosmetic issue, enhancement request | Next sprint | Product team |

### Incident Response Flow

```
1. DETECT → Monitor alerts (see Runbook 4)
2. TRIAGE → Determine severity; open incident channel (#incident-YYYY-MM-DD)
3. MITIGATE → Stop the bleeding first (roll back, disable feature, scale up)
4. RESOLVE → Fix root cause
5. POST-MORTEM → Document what happened, why, and what prevents recurrence
```

### Service-Specific Playbooks

#### Supabase Outage
1. Check https://status.supabase.com
2. If Supabase is down: communicate to users via status page, wait for Supabase recovery
3. If only Vowora is affected:
   - Check RLS policies haven't changed
   - Check API rate limits
   - Verify service_role key hasn't been rotated unexpectedly
   - Check database connection pool (max connections)
4. Fallback: None — Supabase is the sole data store

#### Email Delivery Failure (Resend)
1. Check https://status.resend.com
2. Verify `RESEND_API_KEY` and `RESEND_FROM_DOMAIN` in Backend Secrets
3. Check `email_activity_log` for error patterns
4. Verify sending domain DNS is still verified
5. Fallback: Manual email via couple's own email if Resend is down

#### Gallery Upload Failure
1. Check storage bucket exists (`public`, `private`, `wedding-assets`)
2. Verify storage quotas haven't been exceeded
3. Check upload settings (`gallery_upload_settings`) haven't been inadvertently changed
4. Verify `SUPABASE_SERVICE_ROLE_KEY` is valid

#### Edge Function Failure
1. Check Supabase Dashboard → Edge Functions → Logs
2. Search for the specific function name
3. Common causes: invalid JWT, rate limit hit, input validation failure, timeout (60s limit)
4. Deploy fix via `npx supabase functions deploy <function-name>`

---

## Runbook 2: Rollback Procedure

### Frontend Rollback
Vowora uses the Readdy.ai build system. To roll back:
1. Go to Version History in the Readdy dashboard
2. Identify the last known-good version
3. Restore that version
4. Verify the issue is resolved by testing the affected flow
5. If rollback doesn't resolve: the issue may be in Supabase (schema, RLS, or Edge Function change)

### Edge Function Rollback
1. Go to Supabase Dashboard → Edge Functions
2. Find the function → Deployments → select previous deployment → Rollback
3. Test the affected flow

### Database Rollback
Database migration rollback is manual and high-risk. Procedure:
1. Identify the problematic migration
2. Write the reverse DDL (e.g., `DROP COLUMN`, `DROP POLICY`, `ALTER TABLE`)
3. Test on a staging/non-production project first
4. Execute with caution — some changes are irreversible (e.g., dropped columns lose data)

---

## Runbook 3: Database Backup & Restore

### Backup Schedule
Supabase provides automatic daily backups on Pro plan and above. Point-in-time recovery (PITR) is available on Team plan and above.

### Manual Backup (Pre-Migration)
```sql
-- Export schema
pg_dump --schema-only > schema-backup-YYYY-MM-DD.sql

-- Export data (critical tables only)
pg_dump --data-only --table=weddings --table=wedding_members --table=profiles > critical-data-YYYY-MM-DD.sql
```

### Restore Drill
1. Create a new Supabase project (or use staging)
2. Restore from latest backup via Supabase Dashboard → Database → Backups
3. Verify: auth works, weddings load, guest data present, RLS policies active
4. Run sanity checks:
   - Login with a known user
   - Access a wedding workspace
   - View the guest list
   - Submit a test RSVP (guest portal)
5. Document: time taken, any issues encountered, differences from production

### Backup Verification
Monthly: restore the latest backup to a staging project and run the sanity checks above.

---

## Runbook 4: Monitoring & Alerts

### Health Checks

| Component | Check | Frequency | Alert Threshold |
|-----------|-------|-----------|----------------|
| Supabase DB | Connection test via Edge Function | 5 minutes | 3 consecutive failures |
| Supabase Auth | Login test | 15 minutes | 1 failure |
| Edge Functions | HTTP 200 from health endpoint | 5 minutes | 3 consecutive failures |
| Resend | API reachable | 15 minutes | 2 consecutive failures |
| Storage | Upload/download test | 15 minutes | 2 consecutive failures |

### Key Metrics to Monitor

| Metric | Source | Warning | Critical |
|--------|--------|---------|----------|
| Edge Function error rate | Supabase Dashboard | >5% in 5min | >10% in 5min |
| Edge Function latency p95 | Supabase Dashboard | >3s | >10s |
| Database connections | Supabase Dashboard | >80% of max | >95% of max |
| Storage usage | Supabase Dashboard | >80% of quota | >95% of quota |
| Failed email sends | `email_activity_log` | >10 in 1 hour | >50 in 1 hour |
| Failed RSVP submissions | `guest_portal_activity` (error events) | >5 in 1 hour | >20 in 1 hour |
| Upload failures | Edge Function error logs | >10 in 1 hour | >50 in 1 hour |
| Rate-limited requests | `invitation_access_activity` (rate_limited events) | >20 in 1 hour | >100 in 1 hour |

### Alert Runbook

#### Alert: High Edge Function Error Rate
1. Check Supabase Dashboard → Edge Functions → Logs for the specific function
2. Filter for errors in the last 15 minutes
3. Common causes: invalid input, missing env vars, Supabase API errors
4. If caused by deploy: rollback edge function (Runbook 2)
5. If caused by Supabase: check status.supabase.com

#### Alert: Email Delivery Degraded
1. Check `email_activity_log` for `status = 'failed'`
2. Group by error message
3. Common causes: invalid recipient, domain DNS issue, Resend outage, rate limit
4. If >50 failed in 1 hour: escalate to SEV2, pause email campaigns

#### Alert: Storage Quota Near Limit
1. Check Supabase Dashboard → Storage for usage breakdown
2. Identify largest buckets: typically `private` (gallery assets)
3. Options: upgrade plan, clean up orphaned assets, adjust upload limits
4. Before emergency: don't delete — increase quota first

---

## Runbook 5: Account Support

### Common Support Actions (Admin)

| Action | How | Permission Required |
|--------|-----|-------------------|
| Reset user password | User self-service via `/forgot-password` | None |
| Manually verify user email | Supabase Dashboard → Authentication → Users → Confirm email | Admin |
| Check wedding ownership | Query `wedding_members` for `user_id` + `wedding_id` | Service role |
| Invite collaborator | Settings → Collaborators in-app | Owner role |
| Revoke guest token | Set `invitation_access_tokens.status = 'revoked'` | Admin |
| Extend guest token | Update `expires_at` on token | Admin |
| Force wedding deletion | `wedding_deletion_requests` with 30-day cooling off | Owner role |
| View RSVP submissions | RSVP responses page in-app | Planner+ role |

### No Silent Impersonation
Vowora does NOT support admin user impersonation. All admin actions are:
- Audited in relevant activity log tables
- Performed by the admin's own identity (never as another user)
- Logged with actor user ID, timestamp, and action summary

### Data Access Requests (GDPR)
1. User submits privacy request via contact form (Privacy Request subject)
2. Admin verifies identity (email confirmation + additional verification)
3. For data export: query all tables for the user's `user_id`, export as JSON/CSV
4. For data deletion: schedule via `wedding_deletion_requests`, 30-day cooling off
5. Log all access in `privacy_requests` table

---

## Runbook 6: Dependency & Security Maintenance

### Monthly Checklist
- [ ] Run `npx vitest run` — all tests must pass
- [ ] Run `npm run lint` — zero warnings
- [ ] Run `npm run type-check` — zero errors
- [ ] Run `npm run build` — clean build
- [ ] Check Supabase Dashboard for failed Edge Function invocations
- [ ] Check `email_activity_log` for delivery errors
- [ ] Review failed RSVP submissions
- [ ] Rotate secrets if any exposure suspected

### Quarterly Checklist
- [ ] Full backup restore drill (Runbook 3)
- [ ] Dependency audit (`npm audit`)
- [ ] Remove unused dependencies
- [ ] Review and update RLS policies
- [ ] Test all Edge Functions manually
- [ ] Review security audit findings
- [ ] Update runbooks with any new procedures

---

## Quick Reference: Key Tables for Troubleshooting

| Table | Use |
|-------|-----|
| `guest_portal_activity` | Guest portal events, errors |
| `email_activity_log` | Email send status, failures |
| `invitation_access_activity` | Token validation, rate limits, access patterns |
| `guest_access_sessions` | Active guest sessions, expiry |
| `rsvp_submissions` | RSVP status, late submissions |
| `wedding_deletion_requests` | Scheduled deletions |
| `privacy_requests` | GDPR data requests |
| `budget_activity_log` | Budget mutations |
| `seating_activity_log` | Seating plan changes |

---

Last Updated: 2026-07-23
Review Cycle: Quarterly