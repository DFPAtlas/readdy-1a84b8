# Privacy Request Runbook

**Project:** Vowora  
**Last updated:** 2027-08-05  
**Owner:** Platform Operations

---

## Purpose

This runbook defines the operational procedure for handling customer privacy requests: data exports, account deletions, wedding deletions, corrections, and restrictions. All requests are tracked in the `privacy_requests` table and managed through the Data Protection Dashboard (`/app/admin/data-protection`).

---

## Request Types

| Type | Description | SLA |
|------|-------------|-----|
| Account Export | Download all personal data associated with account | 30 days |
| Wedding Export | Download all data for a specific wedding | 30 days |
| Account Deletion | Permanently delete account and owned data | 30 days + cooling-off |
| Wedding Deletion | Permanently delete wedding and all associated data | 30 days + cooling-off |
| Correction | Fix inaccurate personal data | 30 days |
| Restriction | Restrict processing of personal data | 30 days |
| Other | Any other privacy-related request | 30 days |

---

## Workflow

### Phase 1: Request Triage

1. Customer submits request via `/app/account/privacy` or support channel
2. Request appears in Data Protection Dashboard > Requests tab with status `submitted`
3. Admin reviews request:
   - Verify requester identity (authenticated user)
   - Confirm request type and scope
   - Check for active subscriptions, billing holds, or legal holds
4. If verification needed: change status to `verification_required`
5. Once verified: change status to `verified`

### Phase 2: Processing

**For exports:**
1. Change status to `processing`
2. Generate export through secure backend:
   - Account export: profile, memberships, owned weddings metadata
   - Wedding export: full wedding data (guests, RSVPs, schedule, budget, etc.)
3. Store export in private storage with 72-hour expiring signed URL
4. Change status to `completed`
5. NOTIFY the requester that their export is ready
6. Export auto-expires after 72 hours

**For deletions:**
1. Change status to `processing`
2. Verify cooling-off period (30 days)
3. If cooling-off complete:
   - Verify no active subscriptions
   - Verify no legal/security holds
   - Execute `process-data-deletion-request` Edge Function
4. Record completion reference
5. Change status to `completed`

### Phase 3: Completion

1. Record completion date and reference
2. Audit trail updated
3. Requester notified
4. Request remains in audit tab (never silently deleted)

---

## Data Export Contents

### Account Export Includes:
- Profile information (name, email, preferences)
- Wedding memberships and roles
- Weddings owned by the user (summary)
- Account preferences and settings
- Activity associated with the user
- Subscription summary

### Wedding Export Includes:
- Wedding settings and details
- Guest records (where authorised)
- Invitations (without raw tokens)
- RSVP records (where authorised)
- Schedule and events
- Tasks
- Suppliers
- Budget records
- Seating plans
- Registry items and contributions
- Gallery metadata (list of assets)
- Questions and FAQs
- Website content
- Timeline items
- Collaborator list

### Excluded from All Exports:
- Passwords and auth secrets
- Session hashes
- Raw invitation tokens
- Stripe secrets
- Full payment-provider payloads
- Other users' private data
- Internal security notes
- Internal support notes
- Other weddings' data

---

## Deletion Safeguards

### Account Deletion Pre-checks:
1. User owns no weddings (or has transferred ownership)
2. No active subscriptions or pending invoices
3. No open support or security incidents
4. No legal or financial retention holds
5. Confirmation phrase provided ("DELETE MY ACCOUNT")
6. Recent re-authentication

### Wedding Deletion Pre-checks:
1. Requester is the wedding owner
2. No active subscriptions linked to this wedding
3. No pending financial disputes
4. No active legal holds on wedding data
5. Confirmation phrase provided

### Cooling-off Period:
- 30 days from request submission
- Customer can cancel at any time during this period
- Admin cannot shorten the cooling-off period without explicit approval
- Scheduled deletion date is visible to the customer

---

## Rejection Reasons

A request may be rejected if:
- Requester identity cannot be verified
- Active subscription prevents deletion (must cancel billing first)
- Legal/security hold is active
- Requested data belongs to another user
- Request is technically not feasible
- Request is manifestly unfounded or excessive

Record rejection reason in `failure_reason` field. Rejected requests can be re-submitted.

---

## Notifications

### Customer Notifications:
- Request received (confirmation)
- Verification required (if additional steps needed)
- Export ready (with expiry warning)
- Export expiring (24-hour warning)
- Deletion scheduled (with cooling-off end date)
- Deletion cancelled (if cancelled)
- Request completed
- Request failed (with safe next steps)

### Admin Notifications:
- New verified request
- Request nearing deadline (3 days before cooling-off ends)
- Failed deletion job
- Export generation failed

---

## Audit Requirements

Every privacy request must record:
- Request ID (UUID)
- Request type
- User reference
- Wedding reference (where applicable)
- Submitted date
- Verification date
- Status history
- Assigned operator
- Completion date
- Safe notes
- Export or deletion reference
- Failure reason (where applicable and safe)

Completed request history is never silently deleted. All status changes are audited.