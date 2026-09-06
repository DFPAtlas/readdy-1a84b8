# Restore Test Template

**Project:** Vowora  
**Test ID:** RT-___  
**Date:** YYYY-MM-DD  
**Requested by:** ___  
**Test environment:** ___

---

## Test Information

| Field | Value |
|-------|-------|
| Backup reference | |
| Backup type | postgresql / storage / edge_functions |
| Backup date | |
| Environment | Isolated (never production) |
| Started at | |
| Completed at | |

---

## Restoration Results

### 1. Database Restoration
- [ ] Passed
- [ ] Failed
- [ ] Skipped
- [ ] Partial

**Notes:** ___

### 2. Storage Restoration
- [ ] Passed
- [ ] Failed
- [ ] Skipped
- [ ] Partial

**Notes:** ___

### 3. Authentication Verification
- [ ] Passed — test user can log in
- [ ] Failed — auth error
- [ ] Skipped

**Notes:** ___

### 4. RLS Verification
- [ ] Passed — cross-wedding access blocked
- [ ] Failed — policy gap found
- [ ] Skipped

**Notes:** ___

### 5. Guest RSVP Verification
- [ ] Passed — token validation safe, RSVP submits correctly
- [ ] Failed — RSVP broken
- [ ] Skipped

**Notes:** ___

### 6. Stripe Isolation
- [ ] Confirmed — Stripe disconnected or test-mode only
- [ ] FAILED — live Stripe accessible

**Notes:** ___

### 7. Email Isolation
- [ ] Confirmed — Resend disabled or test-mode only
- [ ] FAILED — live email enabled

**Notes:** ___

### 8. Demo Mode Separation
- [ ] Confirmed — demo data and production data separate
- [ ] FAILED — demo data mixed with production

**Notes:** ___

### 9. Production Secrets
- [ ] Confirmed — no production secrets in test environment
- [ ] FAILED — secrets copied

**Notes:** ___

### 10. Application Build
- [ ] Passed — application builds against restored schema
- [ ] Failed — build errors

**Notes:** ___

---

## Additional Verification

- [ ] Migration history readable
- [ ] Weddings and memberships exist
- [ ] Guest token validation behaves safely
- [ ] RSVP data remains consistent
- [ ] Storage references resolve correctly

---

## Issues Found

**Issue 1:** ___

**Resolution:** ___

**Issue 2:** ___

**Resolution:** ___

---

## Overall Result

- [ ] Passed
- [ ] Passed with warnings
- [ ] Failed

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Test executor | | |
| Reviewer | | |

---

## Post-Test Actions

- [ ] Test environment deleted
- [ ] Issues recorded in incident log
- [ ] Backup record updated with verification status
- [ ] Follow-up tasks created (if warnings or failures)