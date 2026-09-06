# Product Analytics Runbook

## Purpose

This document describes how to operate the Vowora product analytics system, interpret the data, and maintain the analytics infrastructure.

---

## 1. Analytics Data Sources

Vowora product analytics are sourced from **existing production tables**, not a separate tracking system:

| Data Source | Table | What It Provides |
|---|---|---|
| Weddings | `weddings` | Activation funnel, active wedding count |
| Wedding Members | `wedding_members` | Account counts, role distribution |
| Website Configs | `wedding_website_configs` | Website publishing funnel, published count |
| Invitations | `invitations` | Invitation journey, creation/send counts |
| RSVP Submissions | `rsvp_submissions` | RSVP completion, submission funnel |
| Subscriptions | `subscriptions` | Billing journey, plan distribution, conversion |
| Support Cases | `wedora_support_cases` | Support volume, issue themes |
| Guests | `guests` | Guest creation counts |
| Events | `wedding_events` | Event creation counts |
| Gallery | `gallery_assets` | Upload and approval metrics |
| Registry | `gift_registry_items` | Registry usage counts |
| Product Events | `product_analytics_events` | Explicit feature-usage events |

## 2. Accessing Analytics

### Route
`/app/admin/analytics` — accessible only to wedding **owners** and **partners**.

### Time Ranges
- 7 days
- 30 days (default)
- 90 days

Click **Refresh** to reload data from the database.

## 3. Dashboard Sections

### Summary Cards
Eight metric cards showing: active accounts, active weddings, published websites, invitations created, RSVP submissions, paid subscriptions, trial-to-paid conversion, and open support cases.

### Activation Funnel
Ten-stage funnel from Account Created → First RSVP Received. Each stage shows count, percentage from previous stage, and overall percentage. Bars are proportional.

### Journey Funnels
Three side-by-side funnels:
- **Invitation Journey**: Created → Sent → Opened → RSVP Opened → RSVP Started → RSVP Submitted
- **Website Journey**: Builder Opened → Draft Saved → Preview Opened → Published
- **Billing Journey**: Plan Selected → Checkout Started → Checkout Completed → Active (with plan distribution)

### Feature Usage
Per-feature cards showing: guest creation count, RSVP actions, event creation, website publishing, gallery uploads, and registry items. Percentage calculated against active wedding count.

## 4. Privacy Rules

**NEVER collected:**
- Guest names, emails, phone numbers
- Invitation tokens, access IDs
- Session hashes
- RSVP message content
- Dietary, allergy, or accessibility information
- Payment references or card data
- Private supplier notes
- Uploaded image/video contents

All displayed data is aggregated counts — no individual customer activity is visible.

## 5. Event Tracking System

The `product_analytics_events` table collects validated, allowlisted events only.

### Adding a New Event
1. Add the event definition to `src/lib/analyticsEvents.ts` in the `ANALYTICS_EVENTS` record
2. Define allowed properties and their valid values
3. Set `requiresConsent` appropriately
4. Set `retentionClass`
5. Do NOT add properties that could contain names, emails, tokens, or private content

### Event Recording
Events go through `buildRecordableEvent()` which:
- Validates the event name against the allowlist
- Validates properties against allowed lists
- Strips any sensitive property names
- Checks consent state for consent-required events

### Consent
- `requiresConsent: true` events are only recorded if analytics consent is granted
- Consent state is stored with each event
- If consent is withdrawn, those events stop being recorded going forward

## 6. Feedback Collection

Feedback is stored in `product_feedback` table.

### Sources
- In-app feedback widget (`feedback_submitted` events)
- Support case themes (manually linked)
- Cancellation reasons (from subscription records)

### Review Workflow
1. New feedback appears in `/app/admin/feedback`
2. Filter by type (problem/suggestion/confusing/praise/other)
3. Assign priority (low/medium/high/critical)
4. Track status through the workflow: new → reviewed → in_progress → resolved → closed
5. Link to improvements or incidents as needed

## 7. Improvement Prioritisation

### Framework
Priority Score = **Severity × Frequency × Confidence ÷ Effort**

| Dimension | Values |
|---|---|
| Severity | low(1), medium(3), high(6), critical(10) |
| Frequency | rare(1), occasional(2), frequent(4), widespread(6) |
| Confidence | low(0.5), medium(1), high(1.5) |
| Effort | small(3), medium(2), large(1), xl(0.5) |

### Workflow
1. Create improvement in `/app/admin/improvements`
2. Provide problem statement, evidence, success measure
3. Set severity, frequency, confidence, effort → score auto-calculates
4. Status flow: new → needs_evidence → approved → planned → in_progress → testing → released → measuring → complete
5. After release, set baseline period and measurement period
6. Record result: successful / neutral / unsuccessful

### Success Measures
Every improvement must have at least one measurable outcome, e.g.:
- "Increase first-invitation completion rate"
- "Reduce RSVP submission failures"
- "Reduce support cases about seating"

## 8. Maintenance

### Daily
- Check analytics dashboard loads without errors
- Verify data is populating for the current day

### Weekly
- Review feature usage trends
- Check for new feedback items
- Review improvement backlog priority

### Monthly
- Generate monthly product review (see `monthly-product-review-template.md`)
- Review activation funnel for drop-off changes
- Compare release impact on key metrics

## 9. Troubleshooting

| Symptom | Check |
|---|---|
| Dashboard shows zeros | Verify time range includes data; check Supabase connection |
| "Not enough data" everywhere | Normal for new installations; wait for activity to accumulate |
| Query errors | Check Supabase dashboard for table access; verify RLS policies |
| Events not recording | Verify event name is in allowlist; check consent state |
| Feedback not saving | Verify authenticated session; check RLS insert policy |