# Vowora Operations Data Retention Policy

## Purpose

This document defines data retention rules for operational records within the Vowora platform. It ensures compliance, manages storage costs, and protects customer privacy.

**This document contains no secret values, API keys, or private customer data.**

---

## Data Categories

### Category A: Incident Records

| Table | Retention | Rationale |
|---|---|---|
| `operational_incidents` | Keep permanently | Incident history is critical for audit, pattern analysis, and compliance. Incidents should never be deleted. |

**Rules:**
- Never delete incident records
- Closed incidents remain in the system indefinitely
- Incident updates are preserved with timestamps

### Category B: Release Records

| Table | Retention | Rationale |
|---|---|---|
| `operational_releases` | Keep permanently | Release history is required for rollback, audit, and deployment tracking. |

**Rules:**
- All release records are permanent
- Superseded releases remain for reference
- Hotfix records follow the same retention

### Category C: Operational Events

| Table | Retention | Rationale |
|---|---|---|
| `operational_events` | 90 days (active), 1 year (archived) | Low-value events consume storage. Critical events should be promoted to incidents. |

**Rules:**
- Info severity: retain 30 days
- Warning severity: retain 90 days
- Error severity: retain 180 days
- Critical severity: promote to incident, retain permanently
- Archived events may be exported before deletion

### Category D: Support Cases

| Table | Retention | Rationale |
|---|---|---|
| `wedora_support_cases` | Keep permanently | Support history is needed for customer relationship, recurring issues, and quality analysis. |

**Rules:**
- Never delete support case records
- Closed cases remain for reference
- Internal notes are preserved

### Category E: Production Operational Data (Aggregated)

| Table/Source | Retention | Rationale |
|---|---|---|
| `stripe_webhook_events` | 90 days | Stripe retains its own logs. Keep recent for debugging. |
| `send_log` | 90 days | Resend retains its own logs. Keep recent for debugging. |
| `rsvp_submissions` | Keep permanently | RSVP data is part of the wedding record — governed by wedding data retention. |
| `guest_access_security_events` | 90 days | Security audit trail. Archive older events. |
| `gallery_reports` | 180 days | Moderation history. Archive after 180 days. |
| `notification_deliveries` | 30 days | Low-value delivery confirmations. |

### Category F: Wedding Data

Wedding data (weddings, guests, invitations, RSVP responses, gallery assets, etc.) is governed by the **Wedding Data Retention Policy**, which is separate from operational data retention. Wedding data is not automatically deleted as part of operational data cleanup.

---

## Retention Implementation

### Automated Cleanup

For tables with defined retention periods, consider implementing a scheduled cleanup:

1. **Edge Function or Database Job:** Runs daily/weekly
2. **Query:** `DELETE FROM table WHERE created_at < NOW() - INTERVAL 'X days'`
3. **Safety:** Never delete without a verified backup
4. **Logging:** Record count of deleted records

### Before Any Deletion

1. Verify backup exists
2. Confirm retention period has elapsed
3. Export critical records if needed
4. Log the deletion operation
5. Never delete incident, release, support, or wedding data

---

## Prohibited Deletions

**Never automatically delete:**
- `operational_incidents` — any status, any age
- `operational_releases` — any status, any age
- `wedora_support_cases` — any status, any age
- Wedding data tables (separate policy)
- Any table without an explicit retention rule

---

## Sensitive Data in Operational Records

**Operational records must never contain:**
- Raw invitation tokens
- Session hashes
- Passwords or password hashes
- Card details
- Full dietary or accessibility responses
- Private guest question answers
- Secret keys or API tokens
- Full provider payloads

If sensitive data is accidentally logged:
1. Create an incident (severity: high)
2. Redact or delete the affected records
3. Update logging to prevent recurrence
4. Document in incident record

---

## Review Schedule

| Frequency | Action |
|---|---|
| Monthly | Review operational_events volume — consider archiving |
| Quarterly | Full retention audit — verify no policy violations |
| Annually | Review and update this document |

---

Last updated: 2026-08-04
Version: 1.0