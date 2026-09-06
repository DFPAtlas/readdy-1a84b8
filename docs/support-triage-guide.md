# Vowora Support Triage Guide

## Purpose

This guide defines how to triage, categorise, and manage customer support cases within the Vowora platform.

**This document contains no secret values, API keys, or private customer data.**

---

## Support Case Lifecycle

```
New → Open → [Waiting Customer / Waiting Team] → Resolved → Closed
```

| Status | Meaning |
|---|---|
| New | Case created, not yet reviewed |
| Open | Under active investigation |
| Waiting Customer | Waiting for customer to provide more info |
| Waiting Team | Waiting for internal team action |
| Resolved | Issue has been addressed |
| Closed | Final state, no further action needed |

---

## Case Categories

| Category | Examples |
|---|---|
| Billing | Plan changes, payment issues, invoice questions |
| Authentication | Login problems, password reset, account access |
| Invitations | Design issues, sending problems, templates |
| RSVP | Submission errors, form issues, dietary questions |
| Website | Publishing problems, domain setup, SEO |
| Gallery | Upload issues, moderation, album management |
| Registry | Gift creation, fund setup, contribution questions |
| Guest Access | Portal access, token issues, household management |
| Other | Anything not in the above categories |

---

## Priority Levels

| Priority | Response Time | Examples |
|---|---|---|
| Critical | < 1 hour | Account locked out, payment blocked, data loss |
| High | < 4 hours | Feature broken, invitation not sending, RSVP failing |
| Medium | < 24 hours | Question about feature, minor bug, how-to request |
| Low | < 72 hours | Feature request, documentation gap, cosmetic issue |

---

## Triage Workflow

### Step 1: Review New Cases

1. Navigate to `/app/admin/support`
2. Filter by status: "New"
3. For each new case:
   - Read the subject and summary
   - Check if this is a duplicate of an existing case
   - Assess the priority

### Step 2: Categorise and Prioritise

1. Set the correct category if misclassified
2. Set the priority based on impact:
   - Affects payment/billing: at least High
   - Affects guest RSVP: at least High
   - Account access blocked: Critical
3. Assign an owner if you have capacity

### Step 3: Investigate

1. Check related data:
   - Wedding details for context
   - Recent activity for the affected user
   - Known issues from Operations Dashboard
2. Link related incidents if applicable
3. Add internal notes with findings

### Step 4: Respond

1. Draft a response (use existing email system or mark as "Draft response")
2. Never include:
   - Internal technical details
   - Other customers' information
   - Secret values or tokens
   - Speculation about root cause
3. If you need more information, mark as "Waiting Customer"

### Step 5: Resolve

1. Confirm the issue is fully resolved
2. Document the resolution in internal notes
3. Mark as "Resolved"
4. After confirmation period: mark as "Closed"

---

## Common Scenarios

### Billing Inquiry

1. Verify subscription status in Supabase `wedora_subscriptions`
2. Check Stripe for payment status
3. DO NOT share Stripe payment IDs or internal subscription IDs with customers
4. Escalate payment disputes to billing team

### Login Issue

1. Verify the email exists in Supabase Auth
2. DO NOT confirm whether an email has an account (privacy)
3. Guide user through password reset
4. Check for email deliverability issues

### RSVP Not Working

1. Check if the invitation is still valid (not expired/revoked)
2. Verify the `validate-invitation` Edge Function is responding
3. Check `rsvp_submissions` for error patterns
4. Test with a separate test wedding

### Gallery Upload Failing

1. Check file size (too large?)
2. Check file type (unsupported format?)
3. Verify storage bucket permissions
4. Check `gallery_reports` for related reports

---

## Privacy Controls

**Always mask or omit:**
- Guest full names in public notes → use initials
- Access tokens and session hashes
- Card details and payment method info
- Full dietary or accessibility responses
- Password reset links
- Any provider secret or key

**Only access full details when:**
- Required to resolve the specific issue
- Your role permits access
- The access is auditable

---

## Escalation Path

1. Support agent: first-line triage and resolution
2. Technical team: debugging, Edge Function issues, data problems
3. Admin/owner: plan changes, account deletion, security issues

Create an incident in `/app/admin/incidents` if:
- The issue is a platform-wide bug
- Multiple customers report the same problem
- A security concern is identified

---

## Metrics to Track

- New cases per week
- Average resolution time
- Cases by category
- Cases by priority
- Reopen rate
- Customer satisfaction (if measured)

---

Last updated: 2026-08-04
Version: 1.0