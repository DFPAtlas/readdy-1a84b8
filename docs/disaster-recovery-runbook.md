# Disaster Recovery Runbook

**Project:** Vowora  
**Last reviewed:** 2027-08-05  
**Owner:** Platform Operations  
**Status:** Draft — requires management approval

---

## Recovery Objectives

| Objective | Target | Status |
|-----------|--------|--------|
| Recovery Point Objective (RPO) | 24 hours | Proposed |
| Recovery Time Objective (RTO) | 4 hours | Proposed |

RPO is based on Supabase daily automated backups. RTO includes database restoration, Edge Function deployment, frontend build verification, and critical-journey smoke testing. Both targets require administrator confirmation.

---

## Response Procedures

### 1. Database Outage

**Detection:** Operations dashboard shows Supabase database as "fail". Application queries return errors.

**Immediate containment:**
1. Confirm outage via Supabase Dashboard > Database > Health
2. Check if the issue is regional (Supabase status page)
3. If regional: wait for provider recovery, communicate to users
4. If Vowora-specific: check recent migrations, connection pooling, resource limits

**Service impact:** All authenticated operations fail. Guest portal inaccessible. RSVP submissions fail.

**Recovery source:** Latest verified database backup.

**Recovery steps:**
1. If migration caused issue: apply forward-fix or rollback migration
2. If resource limit: upgrade database plan or optimize queries
3. If corruption: restore from latest verified backup in isolated environment, verify, then promote

**Verification:**
- [ ] Database responds to queries
- [ ] Auth works (login/logout)
- [ ] Dashboard loads with real data
- [ ] Guest RSVP submits successfully
- [ ] RLS policies intact

**Communication:** Internal ops channel. If > 30 min, post status update.

**Rollback:** If restore fails, escalate to Supabase support with backup reference.

**Follow-up:** Root cause analysis within 48 hours.

---

### 2. Corrupt Migration

**Detection:** Database errors after migration deploy. Schema inconsistencies. Application features broken.

**Immediate containment:**
1. Stop all further migrations
2. Identify the corrupt migration file and timestamp
3. Assess which tables/columns are affected

**Service impact:** Depends on affected tables. Auth table corruption = critical.

**Recovery source:** Pre-migration backup.

**Recovery steps:**
1. Classify migration as reversible or forward-fix required
2. For reversible changes: apply rollback migration
3. For non-reversible: restore backup → reapply safe migrations → verify
4. Prefer forward-fixes for non-destructive schema issues

**Verification:**
- [ ] All migrations in `supabase/migrations/` apply cleanly
- [ ] Schema matches expected state
- [ ] Application builds against restored schema
- [ ] Critical journeys pass

**Communication:** Notify dev team. Do not deploy further migrations until root cause identified.

**Rollback:** Database restoration if forward-fix not viable.

**Follow-up:** Migration review process. Add guard for detected issues.

---

### 3. Accidental Data Deletion

**Detection:** Customer reports missing data. Admin notices unexpected empty tables. Support case spike.

**Immediate containment:**
1. Confirm scope — which tables, which weddings, which users
2. Stop any running deletion jobs
3. Enable maintenance mode if widespread

**Service impact:** Weddings missing data. RSVPs lost. Guest portals broken.

**Recovery source:** Latest verified backup.

**Recovery steps:**
1. Identify affected records from audit logs
2. Restore backup to isolated environment
3. Extract affected records
4. Re-insert into production (careful with FK constraints)
5. If storage objects also deleted: restore from storage backup

**Verification:**
- [ ] Affected weddings show restored data
- [ ] No cross-wedding data contamination
- [ ] RSVP and invitation data consistent
- [ ] RLS policies unaffected

**Communication:** Direct communication to affected customers. Internal incident log.

**Rollback:** Full database restore if partial recovery fails.

**Follow-up:** Review deletion safeguards. Add confirmation gates.

---

### 4. Storage Outage

**Detection:** Gallery images fail to load. Uploads fail. Export downloads fail.

**Immediate containment:**
1. Check Supabase Storage status
2. Verify bucket policies and access
3. Check storage usage limits

**Service impact:** Gallery inaccessible. Guest uploads fail. Exports unavailable. Wedding websites missing images.

**Recovery source:** Storage backup (Supabase Storage backup or S3-compatible backup).

**Recovery steps:**
1. If bucket policy issue: restore correct policies
2. If usage limit: upgrade or clean up expired files
3. If data loss: restore from storage backup

**Verification:**
- [ ] Gallery images load correctly
- [ ] Guest upload works end-to-end
- [ ] Export files accessible
- [ ] Wedding websites display images
- [ ] No cross-wedding file access

**Communication:** Notify users if impact exceeds 30 minutes.

**Rollback:** Restore storage backup.

**Follow-up:** Storage cleanup audit. Capacity planning.

---

### 5. Authentication Outage

**Detection:** Login failures spike. Session refresh errors. Users locked out.

**Immediate containment:**
1. Check Supabase Auth status
2. Verify Auth configuration (redirect URLs, JWT settings)
3. Check if issue is Supabase-wide or Vowora-specific

**Service impact:** All authenticated access broken. Dashboard, admin, guest portal all unavailable.

**Recovery source:** Auth configuration backup.

**Recovery steps:**
1. Supabase-wide: wait for provider recovery
2. Config issue: restore from configuration backup
3. Apply any required Auth setting changes

**Verification:**
- [ ] Login works (email/password)
- [ ] Signup works
- [ ] Password reset works
- [ ] Session refresh works
- [ ] Protected routes redirect correctly
- [ ] Guest token validation works

**Communication:** Status page update. Internal ops channel.

**Rollback:** Restore previous Auth configuration.

**Follow-up:** Auth monitoring alert threshold review.

---

### 6. Stripe Webhook Outage

**Detection:** Dashboard shows Stripe webhook failures. Subscription status stale. New payments not reflected.

**Immediate containment:**
1. Check Stripe Dashboard > Webhooks > Events
2. Verify webhook endpoint URL and secret
3. Check Edge Function logs for `stripe-webhook-handler`

**Service impact:** Subscriptions not updating. Billing portal shows stale data. New customers not provisioned.

**Recovery source:** Stripe Dashboard for missed events.

**Recovery steps:**
1. Fix webhook endpoint or secret
2. Resend missed events from Stripe Dashboard (last 48 hours)
3. Verify each event processes correctly
4. Manual reconciliation for events older than 48 hours

**Verification:**
- [ ] Stripe Dashboard shows successful deliveries
- [ ] Subscription records match Stripe state
- [ ] Checkout creates correct session
- [ ] Webhook updates subscription status

**Communication:** Notify finance/billing admin if > 1 hour.

**Rollback:** Not applicable — forward recovery.

**Follow-up:** Webhook monitoring enhancement.

---

### 7. Email Delivery Outage

**Detection:** Send log shows high failure rate. Invitations not delivered. Notifications fail.

**Immediate containment:**
1. Check Resend Dashboard > Activity
2. Verify sending domain (SPF/DKIM/DMARC)
3. Check rate limits and quota

**Service impact:** Invitations undelivered. RSVP confirmations lost. Notifications not received.

**Recovery source:** Resend retry queue.

**Recovery steps:**
1. Fix domain configuration if expired/invalid
2. If rate limited: pause campaign sends, prioritize transactional emails
3. Resend failed emails from send_log where safe

**Verification:**
- [ ] Test email delivers to admin inbox
- [ ] Correct sender domain and branding
- [ ] Links resolve to production URL
- [ ] Invitation send works end-to-end

**Communication:** Notify affected senders. Do not re-blast to previously delivered recipients.

**Rollback:** Not applicable.

**Follow-up:** Email delivery monitoring. Rate limit planning.

---

### 8. Frontend Deployment Failure

**Detection:** Build fails. Deployment returns errors. Site serves stale or broken version.

**Immediate containment:**
1. Check build logs
2. Verify previous deployment still serving
3. Identify failing change

**Service impact:** New features unavailable. Bug fixes not deployed. Worst case: broken pages.

**Recovery source:** Previous stable deployment.

**Recovery steps:**
1. Rollback to previous stable deployment
2. Fix the issue in a new branch
3. Run full build and smoke test
4. Re-deploy

**Verification:**
- [ ] Homepage loads
- [ ] Auth works
- [ ] Dashboard loads
- [ ] Guest RSVP works
- [ ] No console errors
- [ ] Correct public URL
- [ ] No demo data in production

**Communication:** Only if public impact is visible.

**Rollback:** Restore previous deployment.

**Follow-up:** Deployment pipeline review. Add pre-deploy checks.

---

### 9. Custom Domain Failure

**Detection:** Wedding website not accessible via custom domain. SSL errors. DNS resolution failures.

**Immediate containment:**
1. Check DNS records (CNAME/A)
2. Verify SSL certificate
3. Check domain provider status

**Service impact:** Custom-branded wedding websites inaccessible. Falls back to default URL.

**Recovery source:** DNS configuration backup.

**Recovery steps:**
1. Verify DNS propagation
2. Re-issue SSL certificate if expired
3. Update DNS records if hosting changed
4. Test from multiple locations

**Verification:**
- [ ] Custom domain resolves
- [ ] SSL valid
- [ ] Website content matches
- [ ] Guest RSVP works on custom domain

**Communication:** Notify affected couple if > 2 hours.

**Rollback:** Default Vowora URL always available as fallback.

**Follow-up:** Domain monitoring automation.

---

### 10. Secret Exposure

**Detection:** Secret found in logs, code, or public repository. Security alert.

**Immediate containment:**
1. Revoke exposed secret immediately
2. Rotate all related credentials
3. Audit access logs for unauthorized use
4. Enable maintenance mode if critical secret exposed

**Service impact:** Potential unauthorized access. Service disruption during rotation.

**Recovery source:** Configuration backup.

**Recovery steps:**
1. Revoke and rotate: Stripe key, Resend API key, Supabase keys
2. Update all Edge Function secrets
3. Deploy updated functions
4. Verify all services reconnect
5. Conduct security review

**Verification:**
- [ ] All services operational with new credentials
- [ ] No unauthorized access detected
- [ ] Logs clean of secrets
- [ ] Incident report filed

**Communication:** Internal security team only. External only if data breach confirmed.

**Rollback:** Not applicable — rotation is permanent.

**Follow-up:** Secret scanning in CI/CD. Pre-commit hooks. Access audit.

---

### 11. Cross-Wedding Access Incident

**Detection:** Customer reports seeing another wedding's data. RLS test fails. Audit log shows unauthorized access.

**Immediate containment:**
1. Verify RLS policies on all tables
2. Identify the access path
3. Disable affected feature or enable maintenance mode
4. Preserve all access logs

**Service impact:** CRITICAL. Data privacy breach. Potential regulatory notification.

**Recovery source:** Previous RLS configuration backup.

**Recovery steps:**
1. Fix RLS policy gap
2. Audit all tables for similar patterns
3. Identify affected users and records
4. Run full restore test to verify fix
5. File incident report
6. Legal review for notification requirements

**Verification:**
- [ ] RLS blocks cross-wedding access
- [ ] Test accounts can only access authorized data
- [ ] All table RLS policies verified
- [ ] Penetration test on affected path

**Communication:** Legal review before external communication.

**Rollback:** RLS policy restoration.

**Follow-up:** RLS audit schedule. Automated RLS verification tests.

---

### 12. Ransomware / Destructive Account Compromise

**Detection:** Unauthorized admin access. Mass data deletion. Unusual database activity.

**Immediate containment:**
1. Revoke all service-role keys
2. Suspend affected user accounts
3. Enable maintenance mode
4. Contact Supabase support

**Service impact:** CRITICAL. Potential total data loss.

**Recovery source:** Latest verified backup.

**Recovery steps:**
1. Isolate affected systems
2. Restore from latest clean backup
3. Rotate ALL credentials
4. Full security audit
5. Gradual service restoration

**Verification:**
- [ ] Database restored to pre-incident state
- [ ] All credentials rotated
- [ ] No unauthorized access paths remain
- [ ] Full restore test passes
- [ ] RLS verified across all tables

**Communication:** Internal security team. Legal review. Regulatory if required.

**Rollback:** Full database and storage restoration.

**Follow-up:** Security audit. Access control review. MFA enforcement.