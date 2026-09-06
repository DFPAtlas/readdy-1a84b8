# Vowora Rollback Runbook

**Version:** 1.0
**Last updated:** {DATE}

---

## Rollback Decision Matrix

| Trigger | Severity | Action |
|---------|----------|--------|
| Cross-wedding data exposure | Critical | ROLLBACK immediately |
| Cross-guest access detected | Critical | ROLLBACK immediately |
| Broken invitation validation | Critical | ROLLBACK immediately |
| RSVP submissions failing broadly | Critical | ROLLBACK immediately |
| Data corruption detected | Critical | ROLLBACK immediately |
| Authentication unavailable | Critical | ROLLBACK immediately |
| Production build serving demo data | Critical | ROLLBACK immediately |
| Stripe granting incorrect access | Critical | ROLLBACK immediately |
| Webhook processing corrupting subscriptions | Critical | ROLLBACK immediately |
| Secret exposure | Critical | ROLLBACK immediately |
| Critical migration failure | Critical | ROLLBACK (restore backup) |
| Email delivery down but RSVP works | High | HOLD — fix without rollback if possible |
| Export service down | Medium | HOLD — fix forward |
| Non-core page visual issue | Low | HOLD — fix forward |
| Minor copy error | Low | HOLD — fix forward |

---

## Pre-Rollback Information

Record these before initiating rollback:

| Item | Value |
|------|-------|
| Current release version | v{RELEASE_VERSION} |
| Previous stable release version | |
| Current frontend deployment ID | |
| Previous frontend deployment ID | |
| Current migration version | |
| Database backup ID | |
| Database backup timestamp | |

---

## Rollback Procedure

### Step 1: Decide and Communicate

- [ ] Launch Lead approves rollback
- [ ] Notify On-call Engineer
- [ ] Notify stakeholders (via agreed channel)
- [ ] Record reason in incident log

### Step 2: Activate Maintenance Mode (if available)

- [ ] Display calm, clear public message
- [ ] No internal error details exposed
- [ ] Protect existing authenticated sessions
- [ ] Block guest RSVP submissions
- [ ] If maintenance mode unavailable, proceed to next step

### Step 3: Frontend Rollback

- [ ] Revert to previous frontend deployment via hosting dashboard
- [ ] Wait for deployment to complete
- [ ] Verify homepage loads
- [ ] Verify previous version functions

### Step 4: Edge Function Rollback

For each function that needs rollback:

- [ ] Identify previous function version in Supabase Dashboard
- [ ] Re-deploy previous version
- [ ] Verify function responds

### Step 5: Configuration Rollback

- [ ] Revert any environment variable changes
- [ ] Revert any Supabase project setting changes
- [ ] Revert any third-party configuration changes

### Step 6: Database Rollback

Classify each migration that needs reversal:

| Migration | Type | Action |
|-----------|------|--------|
| | Safe reversible / Forward-fix / Restore backup | |

**For safe reversible schema changes:**
- [ ] Apply reverse migration
- [ ] Verify schema matches expected state

**For forward-fix required:**
- [ ] Create and apply fix migration
- [ ] Verify schema is correct

**For backup restoration (requires explicit approval):**
- [ ] Launch Lead approval obtained
- [ ] Restore from backup (recorded above)
- [ ] Wait for restoration to complete
- [ ] Re-deploy all Edge Functions
- [ ] Re-run configuration verification

### Step 7: Validate After Rollback

- [ ] Public homepage loads
- [ ] Login works
- [ ] Dashboard loads
- [ ] Guest invitation validates
- [ ] RSVP works (test submission)
- [ ] Stripe test checkout works (if applicable)
- [ ] No cross-wedding data exposure
- [ ] System-readiness page shows all PASS

### Step 8: Deactivate Maintenance Mode

- [ ] Remove maintenance page
- [ ] Verify full site availability
- [ ] Verify guest RSVP re-enabled

### Step 9: Communicate Completion

- [ ] Notify stakeholders rollback complete
- [ ] Record in incident log
- [ ] Schedule post-mortem if critical incident

---

## Rollback Verification Checklist

| Check | Result |
|-------|--------|
| Public homepage loads | [ ] |
| Authentication works | [ ] |
| Dashboard loads | [ ] |
| Guest invitation validates | [ ] |
| RSVP submission works | [ ] |
| Stripe checkout works (test mode) | [ ] |
| Storage upload works | [ ] |
| No cross-wedding access | [ ] |
| System-readiness all PASS | [ ] |
| No demo data in production | [ ] |

---

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Launch Lead | | | |
| Tech Lead | | | |
| On-call Engineer | | | |
| Supabase Support | - | - | dashboard |
| Stripe Support | - | - | dashboard |
| Resend Support | - | - | dashboard |

---

*This runbook was last updated on {DATE}. Do not include real secret values.*