# Account Deletion Runbook

**Project:** Vowora  
**Last updated:** 2027-08-05  
**Owner:** Platform Operations

---

## Purpose

This runbook defines the end-to-end procedure for handling customer account deletion requests. Account deletion is a staged process with a mandatory 30-day cooling-off period. All deletions are processed server-side via the `process-data-deletion-request` Edge Function — never from the browser.

---

## Prerequisites

Before processing an account deletion:

1. [ ] User has submitted request via `/app/account/privacy`
2. [ ] User identity verified (authenticated, recent re-auth)
3. [ ] User has NO owned weddings (or has transferred ownership)
4. [ ] No active subscriptions linked to the account
5. [ ] No pending invoices or disputes
6. [ ] No open support or security incidents
7. [ ] No active legal or security retention holds
8. [ ] User has entered confirmation phrase "DELETE MY ACCOUNT"
9. [ ] User has acknowledged consequences

---

## Staged Workflow

### Stage 1: Request Submitted
- User submits deletion request
- System records request in `privacy_requests` table
- Status: `submitted`
- 30-day cooling-off period begins
- User notified: "Your deletion request has been received. A 30-day cooling-off period is now active."

### Stage 2: Ownership & Billing Checks
- Admin verifies user owns no weddings
- Admin verifies no active subscriptions
- If weddings owned: user must transfer or delete first
- If subscription active: user must cancel billing first
- Status: `verification_required` → `verified`

### Stage 3: Cooling-off Period
- 30 days from request submission
- User can cancel at any time
- Scheduled deletion date is visible
- Status: `processing`
- Admin monitors for cancellation

### Stage 4: Scheduled Deletion
- Cooling-off period expires
- System or admin initiates deletion
- `process-data-deletion-request` Edge Function executes

### Stage 5: Final Deletion
- Profile data removed from `profiles`, `user_settings`
- Notifications and notification deliveries removed
- Wedding memberships where user is sole owner: handled separately
- Wedding memberships where user is collaborator: preserved (shared data NOT deleted)
- Status: `completed`

### Stage 6: Audit Complete
- Completion recorded
- User notified
- Retention holds checked for any remaining records
- Payment records retained per statutory period (6 years)
- Suppression list entry added (if applicable)

---

## What Gets Deleted

### Account-level data:
- Profile (name, email, phone, avatar)
- User settings and preferences
- Notification preferences and history
- Activity logs associated with the user

### What survives (shared data):
- Wedding data where user was a collaborator (not sole owner)
- Guest records that belong to shared weddings
- Payment records (retained 6 years per HMRC)
- Email suppression list entries
- Audit logs (anonymised)

---

## What Gets Anonymised (not deleted)

Where records must remain for financial, dispute, fraud, audit, or security purposes:
- Personal identifiers removed
- User-facing names replaced with anonymised label (e.g., "Deleted User [UUID]")
- Contact details removed
- Payment references kept only where required
- Financial amounts, dates, and statuses preserved
- Reason for retention recorded

---

## Cancellation

Users can cancel their deletion request at any time during the cooling-off period:
1. Navigate to `/app/account/privacy`
2. Click "Cancel deletion request"
3. Status changes to `cancelled`
4. All data remains intact
5. Cancellation recorded in audit trail

---

## Edge Function: process-data-deletion-request

**Endpoint:** `supabase/functions/process-data-deletion-request`

**Actions supported:**
- `cancel_deletion` — Cancel pending deletion request
- `process_account_deletion` — Execute account deletion (checks ownership first)
- `process_wedding_deletion` — Execute wedding deletion (checks ownership, subscription)

**Security:**
- JWT authentication required
- Verifies user owns the request
- Verifies wedding ownership where applicable
- Uses service_role for actual deletions
- Idempotent — safe to retry
- Never trusts arbitrary table names from client
- Deletes in defined safe order (FK constraints respected)

---

## Post-Deletion

After deletion completes:
1. Confirm profile no longer exists in `profiles` table
2. Confirm no orphaned records in membership tables
3. Verify payment records retained with anonymised identifiers
4. Update incident log if any failures
5. File completion report

---

## Escalation

Escalate to legal/management if:
- Deletion involves potential legal disputes
- User requests deletion during active investigation
- Deletion would destroy evidence relevant to security incident
- Multiple accounts linked (possible sockpuppet/fraud)
- Request comes from law enforcement or regulatory body