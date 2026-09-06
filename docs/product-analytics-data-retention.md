# Product Analytics Data Retention Policy

## Purpose

Define retention periods, deletion behaviour, and consent handling for Vowora product analytics data.

---

## 1. Data Categories

### Product Analytics Events (`product_analytics_events`)

| Retention Class | Duration | Description |
|---|---|---|
| `operational` | Indefinite (essential) | Billing events, account lifecycle, security-relevant events |
| `product` | 24 months | Feature usage, funnels, onboarding events |
| `temporary` | 90 days | Session-level events, navigation tracking (not currently used) |

After retention period expires, events are permanently deleted. Aggregated reporting data may be retained indefinitely as it contains no individual identifiers.

### Aggregated Analytics (from existing tables)

Data aggregated from production tables (weddings, invitations, RSVPs, etc.) follows the retention of the source tables. Aggregated dashboard queries are real-time and do not create separate storage.

### Feedback (`product_feedback`)

- Retained indefinitely while the feedback is relevant
- Closed feedback older than 36 months may be archived
- Feedback linked to active improvements or incidents is retained as long as the linked record exists

### Improvement Records (`product_improvements`)

- Retained indefinitely as product history
- Rejected improvements retained for reference (avoid re-proposing the same idea)

## 2. Consent Withdrawal

When a user withdraws analytics consent:

1. **Future events**: Events with `requiresConsent: true` are no longer recorded for that user
2. **Existing events**: Not deleted (aggregated data is anonymised in counts); individual event records have their `consent_state` updated to `denied`
3. **Operational events** (`requiresConsent: false`): Continue to be recorded — these are essential for billing, security, and service operation
4. **Effect on dashboards**: No change — dashboards show aggregated counts only, making individual withdrawal invisible in aggregate

## 3. Deletion Behaviour

### Automated Deletion
- Events with `retentionClass: 'temporary'` are deleted after 90 days
- Events with `retentionClass: 'product'` are deleted after 24 months
- Events with `retentionClass: 'operational'` are never automatically deleted

### Manual Deletion
- Administrators can delete specific events via Supabase dashboard if required for compliance
- Feedback and improvement records can be deleted by administrators
- Deletion is permanent and irreversible

## 4. Security Log Separation

Security and operational logs are **never** routed through product analytics:

- `guest_access_security_events` — security logging, separate retention
- `operational_events` — platform operations, separate retention
- `stripe_webhook_events` — billing operations, separate retention
- `send_log` — email operations, separate retention
- `invitation_activity_log` — security-relevant, separate retention

These are not affected by analytics consent withdrawal.

## 5. Data Not Collected

The following data categories are explicitly excluded from product analytics:

- Guest names, email addresses, phone numbers
- Invitation tokens, access IDs, session hashes
- RSVP message content, dietary information, accessibility information
- Payment references, card data, bank information
- Supplier private notes
- Uploaded image/video contents
- Password or authentication secrets

## 6. Review Schedule

| Review | Frequency | Owner |
|---|---|---|
| Retention policy review | Annually | Product Owner |
| Consent mechanism audit | Every 6 months | Engineering |
| Data deletion verification | Quarterly | Operations |
| Privacy compliance check | Annually | Legal/DPO |