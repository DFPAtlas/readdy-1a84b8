# Feedback Triage Guide

## Purpose

This guide helps the Vowora team efficiently review, categorise, and action customer feedback collected through in-app forms, support cases, and cancellation reasons.

---

## 1. Feedback Sources

| Source | How it arrives | Table |
|---|---|---|
| In-app feedback widget | "Share feedback" button on customer pages | `product_feedback` |
| Support case themes | Manually linked from support cases | `product_feedback` (linked to `wedora_support_cases`) |
| Cancellation reasons | From subscription cancellation flow | `product_feedback` |
| Help Centre helpful/not-helpful | From article feedback buttons | `product_feedback` (via `help_article_viewed` event) |

## 2. Triage Workflow

### Step 1: Review New Feedback
Visit `/app/admin/feedback` with filter: **Status = New**

For each item:
- Read the summary (private message content is NOT shown)
- Determine feedback type: Problem / Suggestion / Confusing / Praise / Other
- Assign to affected feature and category

### Step 2: Assign Priority

| Priority | Criteria |
|---|---|
| **Critical** | Billing failure, data loss, security issue, cross-wedding exposure |
| **High** | Core journey broken (RSVP, invitations, publishing), major workflow blocker |
| **Medium** | Feature friction, confusing UX, missing expected functionality |
| **Low** | Cosmetic issues, minor suggestions, edge-case improvements |

### Step 3: Set Status

| Status | Meaning |
|---|---|
| `new` | Fresh, unreviewed |
| `reviewed` | Triaged and understood |
| `in_progress` | Being addressed (linked to improvement or incident) |
| `resolved` | Addressed and verified |
| `closed` | No further action needed / duplicate / out of scope |

### Step 4: Link Where Appropriate
- Link to **improvement** if it should be added to the backlog
- Link to **support case** if it originated there
- Link to **incident** if it relates to an active issue

## 3. Common Feedback Patterns

### "I can't figure out how to..."
**Type**: Confusing / Problem
**Action**: Review the feature's UI flow. Consider adding a walkthrough or help article. Link to improvement.

### "It would be great if..."
**Type**: Suggestion
**Action**: Evaluate against product roadmap. If it fits, create an improvement with evidence from analytics.

### "X is broken" / "I got an error when..."
**Type**: Problem
**Action**: Check operational health dashboard for related errors. Create incident if systemic. Link to improvement for the fix.

### "Love the app!"
**Type**: Praise
**Action**: Record for team morale. Can be referenced in future communications. No action required.

### "I'm cancelling because..."
**Type**: Other (cancellation)
**Action**: High-priority review. Create improvement if the reason is actionable. Track cancellation themes for product direction.

## 4. Privacy Controls

Feedback records **never** display:
- Full private messages from support cases
- Guest names or contact details
- Payment or billing information
- Tokens or session data
- RSVP or dietary content

When linking feedback to improvements, use redacted summaries only. Do not copy sensitive source content into the improvement record.

## 5. Response Guidelines

### If the feedback submitter opted into follow-up:
- Acknowledge receipt within 2 business days
- Provide status updates when the feedback is actioned
- Close the loop when the improvement ships

### If no follow-up consent:
- Process internally only
- Do not contact the submitter

## 6. Metrics

Track these for the monthly product review:

| Metric | Source |
|---|---|
| Feedback volume by type | Count from `product_feedback` |
| Average time to triage | Time from `submitted_at` to first status change |
| Feedback-to-improvement conversion | Count of feedback linked to improvements |
| Top feedback themes | Most tagged features and categories |
| Resolution rate | % of feedback reaching `resolved` or `closed` |