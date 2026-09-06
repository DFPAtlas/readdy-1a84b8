# Data Retention Schedule

**Project:** Vowora  
**Last updated:** 2027-08-05  
**Status:** Draft — requires legal/management review  
**Reference:** Public policy at `/retention`

---

## Purpose

This schedule defines how long Vowora retains different categories of personal and operational data, the action taken at the end of the retention period, and the legal or business basis. Durations marked as "Proposed" require legal counsel confirmation.

---

## Retention Categories

### 1. Active Account Data

| Field | Value |
|-------|-------|
| Purpose | Wedding planning and account management |
| Retention period | Duration of account + 30 days after deletion request |
| Start point | Account creation |
| Action | Deletion via account deletion flow |
| Basis | Contract performance |
| Owner | Platform Operations |
| Review frequency | Annually |

### 2. Wedding Planning Data

| Field | Value |
|-------|-------|
| Purpose | Wedding organisation (guests, invitations, schedule, budget, seating, etc.) |
| Retention period | Duration of wedding + 30 days after deletion |
| Start point | Wedding creation |
| Action | Cascading delete with wedding deletion |
| Basis | Contract performance |
| Owner | Platform Operations |
| Review frequency | Annually |

### 3. Guest Personal Data

| Field | Value |
|-------|-------|
| Purpose | Guest management by wedding couples |
| Retention period | Duration of wedding + 30 days after wedding deletion |
| Start point | Guest record creation |
| Action | Cascading delete with wedding; anonymise on guest request |
| Basis | Legitimate interest / couple consent |
| Owner | Platform Operations |
| Review frequency | Annually |

### 4. Invitation and RSVP Records

| Field | Value |
|-------|-------|
| Purpose | Wedding invitation delivery and response tracking |
| Retention period | Duration of wedding data retention |
| Start point | Invitation creation |
| Action | Cascading delete with wedding; tokens purged 30 days after expiry |
| Basis | Contract performance |
| Owner | Platform Operations |
| Review frequency | Annually |

### 5. Registry Contributions

| Field | Value |
|-------|-------|
| Purpose | Gift registry and contribution tracking |
| Retention period | Duration of wedding data retention |
| Start point | Registry item creation |
| Action | Cascading delete with wedding; financial records retained per payment rules |
| Basis | Contract performance |
| Owner | Platform Operations |
| Review frequency | Annually |

### 6. Subscription and Invoice Records

| Field | Value |
|-------|-------|
| Purpose | Billing, subscription management, financial reporting |
| Retention period | 6 years from transaction date |
| Start point | Transaction date |
| Action | Manual after statutory period |
| Basis | Legal obligation (HMRC/tax) |
| Owner | Finance |
| Review frequency | Annually |

### 7. Support Cases

| Field | Value |
|-------|-------|
| Purpose | Customer support issue resolution |
| Retention period | Duration of account + 6 years |
| Start point | Case creation |
| Action | Manual on account removal |
| Basis | Legitimate interest (support quality, dispute resolution) |
| Owner | Support Team |
| Review frequency | Annually |

### 8. Security Logs

| Field | Value |
|-------|-------|
| Purpose | Security monitoring, incident investigation |
| Retention period | 12 months from creation |
| Start point | Log entry creation |
| Action | Scheduled monthly purge |
| Basis | Legitimate interest (security) |
| Owner | Security |
| Review frequency | Annually |

### 9. Operational Events

| Field | Value |
|-------|-------|
| Purpose | Platform health monitoring |
| Retention period | 12 months |
| Start point | Event creation |
| Action | Scheduled monthly purge |
| Basis | Legitimate interest |
| Owner | Platform Operations |
| Review frequency | Annually |

### 10. Analytics Events

| Field | Value |
|-------|-------|
| Purpose | Product analytics and improvement |
| Retention period | 90 days raw events; 24 months aggregated |
| Start point | Event creation |
| Action | Scheduled jobs |
| Basis | Consent / legitimate interest |
| Owner | Product |
| Review frequency | Annually |

### 11. Generated Exports

| Field | Value |
|-------|-------|
| Purpose | Customer data downloads |
| Retention period | 72 hours from generation |
| Start point | Export generation |
| Action | Scheduled job |
| Basis | Contract performance |
| Owner | Platform Operations |
| Review frequency | Annually |

### 12. Gallery Media

| Field | Value |
|-------|-------|
| Purpose | Wedding photo gallery |
| Retention period | Duration of wedding data retention |
| Start point | Upload |
| Action | Storage object delete + DB record removal |
| Basis | Contract performance |
| Owner | Platform Operations |
| Review frequency | Annually |

### 13. Backup Retention

| Field | Value |
|-------|-------|
| Purpose | Disaster recovery |
| Retention period | 7 days (daily), 90 days (cold storage for deleted accounts) |
| Start point | Backup creation |
| Action | Automated rotation |
| Basis | Legitimate interest (business continuity) |
| Owner | Platform Operations |
| Review frequency | Annually |

### 14. Incident and Release Records

| Field | Value |
|-------|-------|
| Purpose | Operational history and accountability |
| Retention period | Indefinite |
| Start point | Record creation |
| Action | Manual review |
| Basis | Legitimate interest (operational learning, accountability) |
| Owner | Platform Operations |
| Review frequency | Annually |

### 15. Rejected/Quarantined Media

| Field | Value |
|-------|-------|
| Purpose | Abuse prevention and moderation audit |
| Retention period | 30 days from rejection |
| Start point | Moderation decision |
| Action | Scheduled job |
| Basis | Legitimate interest (abuse prevention) |
| Owner | Trust & Safety |
| Review frequency | Annually |

### 16. Invitation Tokens and Access Sessions

| Field | Value |
|-------|-------|
| Purpose | Guest access authentication |
| Retention period | 30 days after expiry / 90 days after last use |
| Start point | Token expiry or last access |
| Action | Scheduled job |
| Basis | Legitimate interest (security) |
| Owner | Platform Operations |
| Review frequency | Annually |

### 17. Email Suppression List

| Field | Value |
|-------|-------|
| Purpose | Prevent unwanted email delivery |
| Retention period | Indefinite |
| Start point | Unsubscribe action |
| Action | Manual removal on verified request |
| Basis | Legal obligation (CAN-SPAM, GDPR unsubscribe) |
| Owner | Platform Operations |
| Review frequency | Annually |

### 18. Cookie Consent Records

| Field | Value |
|-------|-------|
| Purpose | Proof of consent |
| Retention period | 6 months from last consent |
| Start point | Consent action |
| Action | Browser storage expiry |
| Basis | Legal obligation (consent proof) |
| Owner | Legal |
| Review frequency | Annually |

---

## Review Notes for Legal Counsel

The following items require legal review and confirmation:

1. **6-year payment record retention:** Confirm this meets HMRC requirements for digital services. Does the 6-year period start from the end of the financial year or from individual transaction dates?

2. **Guest data retention:** Is "duration of wedding + 30 days" defensible under UK GDPR? Should guests be notified at the point their data is collected about this retention period?

3. **RSVP data de-identification vs deletion:** When a guest requests deletion, we propose de-identifying RSVP data (removing personal identifiers, keeping attendance numbers) rather than outright deletion. Is this consistent with the right to erasure?

4. **12-month security log retention:** Is this sufficient for PCI DSS, UK GDPR accountability, and potential legal discovery? Should we extend to 24 months?

5. **Automated purging:** Do any of the scheduled purge jobs require human review gates before execution?

6. **Cross-border data:** If Supabase hosts data in regions outside the UK, do any of these retention periods need adjustment for international data transfer compliance?

---

## Enforcement

Retention rules are enforced through:

1. **Scheduled Edge Functions** for automated purging
2. **Data Protection Dashboard** (`/app/admin/data-protection`) for manual review
3. **Retention Holds** for legal/security exceptions
4. **Audit trail** in `privacy_requests` and `backup_records`

Records under active retention holds are excluded from automated deletion.