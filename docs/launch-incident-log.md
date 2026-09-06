# Vowora Launch Incident Log

**Release:** v{RELEASE_VERSION}
**Launch date:** {LAUNCH_DATE}

---

## Incident Template

Use one table per incident. Create a new entry for each incident detected during launch and monitoring.

---

### Incident #___

| Field | Value |
|-------|-------|
| **Incident ID** | INC-{YYYYMMDD}-{NNN} |
| **Start time** | YYYY-MM-DD HH:MM UTC |
| **End time** | YYYY-MM-DD HH:MM UTC |
| **Detected by** | (automated check / smoke test / user report / monitoring) |
| **Severity** | (Critical / High / Medium / Low) |
| **Affected feature** | (e.g., RSVP submission, invitation validation, checkout) |
| **User impact** | Describe who is affected and how |
| **Release version** | v{RELEASE_VERSION} |
| **Safe technical summary** | Describe what happened without exposing PII, secrets, or raw data |

**Immediate action:**
Describe what was done immediately to contain or mitigate.

**Rollback decision:** (Yes / No / Not applicable)
If yes, reference rollback runbook step.

**Resolution:**
Describe how the incident was resolved. Include any configuration changes, code fixes, or workarounds.

**Root cause:**
Brief root cause analysis (if known).

**Follow-up action:**
List any follow-up items (e.g., create issue, update runbook, add test coverage).

---

## Severity Definitions

| Severity | Definition | Examples |
|----------|-----------|----------|
| **Critical** | Data exposure, data loss, authentication broken, payment safety compromised, RSVP data loss | Cross-wedding access, guest token leakage, secret exposure, database corruption |
| **High** | Core feature unavailable, significant user impact | RSVP submissions failing, invitations not validating, checkout broken, all emails failing |
| **Medium** | Non-core feature degraded, limited user impact | Export failures, gallery upload issues, non-critical page broken |
| **Low** | Minor visual issue or copy error | Typo, spacing issue, non-functional cosmetic bug |

---

## Active Incidents

*(Leave empty if no active incidents)*

| ID | Severity | Feature | Start Time | Status |
|----|----------|---------|------------|--------|

---

## Resolved Incidents

*(Record here after resolution)*

| ID | Severity | Feature | Duration | Resolution |
|----|----------|---------|----------|------------|

---

## Incident Summary

| Metric | Count |
|--------|-------|
| Total incidents | |
| Critical | |
| High | |
| Medium | |
| Low | |
| Rollbacks triggered | |
| Average time to resolution | |

---

*This log was created on {DATE}. Do not include secret values, raw tokens, or private customer data.*