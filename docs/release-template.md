# Vowora Release Template

**Release:** v{RELEASE_VERSION}
**Date:** {RELEASE_DATE}
**Deployer:** {DEPLOYER}
**Environment:** staging | production

---

## Release Summary

{One paragraph describing what this release contains. Focus on user-visible changes, not implementation details.}

---

## Changes

### User-Facing Changes

| Change | Description | Affected Routes |
|--------|-------------|-----------------|
| | | |
| | | |

### Backend Changes

| Change | Description | Service |
|--------|-------------|---------|
| | | |

### Database Migrations

| Migration | Description | Reversible? |
|-----------|-------------|-------------|
| | | Yes / No / Forward-fix |

### Edge Functions

| Function | Change | Deployed? |
|----------|--------|-----------|
| | | |

### Configuration Changes

| Setting | Old Value | New Value | Reason |
|---------|-----------|-----------|--------|
| | | | |

### Security Changes

| Change | Severity | Description |
|--------|----------|-------------|
| | | |

---

## Test Results

| Test Suite | Result | Notes |
|------------|--------|-------|
| TypeScript | PASS / FAIL | |
| Lint | PASS / FAIL | |
| Unit Tests | PASS / FAIL (X/Y passing) | |
| Security Scan | PASS / FAIL | |
| Build | PASS / FAIL | |
| Browser Smoke Tests | PASS / FAIL | |
| Environment Validation | PASS / FAIL | |

---

## Rollback Information

| Item | Value |
|------|-------|
| Previous stable release | v{PREV_VERSION} |
| Current release | v{RELEASE_VERSION} |
| Rollback frontend target | {DEPLOYMENT_ID} |
| Rollback Edge Function versions | {VERSION_LIST} |
| Migration rollback plan | {REVERSIBLE / FORWARD-FIX / RESTORE_BACKUP} |

---

## Known Limitations

| Limitation | Impact | Mitigation | Target Fix |
|------------|--------|------------|------------|
| | | | |

---

## Post-Deployment Verification

- [ ] Public homepage loads (HTTP 200)
- [ ] Auth: login, signup, password reset work
- [ ] Guest invitation validation works
- [ ] RSVP submission works
- [ ] Wedding website builder loads
- [ ] Gallery: upload and moderation work
- [ ] Billing: Stripe checkout works (test mode for staging)
- [ ] System-readiness all PASS
- [ ] No demo data in production
- [ ] Release version visible in /app/admin/system-readiness
- [ ] No console errors on critical routes
- [ ] Mobile: no horizontal overflow at 375px
- [ ] 404 page displays correctly
- [ ] Legal pages accessible

---

## Monitoring Period

| Checkpoint | Status | Notes |
|------------|--------|-------|
| T+15 min | |
| T+1 hour | |
| T+4 hours | |
| T+24 hours | |
| Next business day | |

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| Reviewer | | | |
| Deployer | | | |
| QA (if applicable) | | | |

---

*This template was last updated 2026-08-05. Fill in all sections before deploying to production.*