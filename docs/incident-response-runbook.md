# Vowora Incident Response Runbook

## Purpose

This runbook defines the incident response process for the Vowora platform. It ensures incidents are detected, classified, contained, resolved, and reviewed in a consistent and auditable manner.

**This document contains no secret values, API keys, or private customer data.**

---

## Incident Severity Levels

| Severity | Definition | Example |
|---|---|---|
| Critical | Cross-wedding data exposure, authentication outage, RSVP data loss, Stripe entitlement error, secret exposure, database corruption | Guest can view another wedding's RSVP data |
| High | Broken critical journey, significant feature outage, webhook processing failure | RSVP submissions failing for all weddings |
| Medium | Feature degraded but usable, non-critical outage, elevated error rate | Gallery uploads failing intermittently |
| Low | Minor visual issue, non-critical feature bug, documentation gap | Help article out of date |

---

## Response Phases

### Phase 1: Detect

**Who:** Any team member or automated alert
**Action:**
1. Identify the anomaly (dashboard alert, user report, error spike)
2. Note the time of detection
3. Capture initial observations (screenshots, error messages, affected URLs)
4. Create an incident in `/app/admin/incidents`

**Create incident with:**
- Title: Brief description of the issue
- Severity: Initial assessment (can be adjusted)
- Affected Service: Which system is impacted
- User Impact: How users are affected (or "Unknown — investigating")
- Technical Summary: What you observe (no secrets, no raw tokens)

### Phase 2: Confirm

**Who:** On-call operator or first responder
**Action:**
1. Reproduce the issue if possible
2. Check Operations Dashboard for related failures
3. Review relevant data sources:
   - Supabase logs for database errors
   - Edge Function logs for function failures
   - Stripe Dashboard for webhook issues
   - Resend Dashboard for email issues
4. Confirm the scope: one wedding, all weddings, specific route, all routes
5. Update incident status: `open` → `investigating`

### Phase 3: Classify

**Who:** Incident owner
**Action:**
1. Assign or confirm severity
2. Determine if rollback is needed (see Rollback Runbook)
3. Identify affected release version
4. Link related incidents or support cases
5. Assign an owner (name or email)
6. Set initial communication plan (internal only unless public status page exists)

**Decision points:**
- If severity = critical: begin containment immediately, notify team
- If severity = high: contain within 1 hour, notify team
- If severity = medium: contain within 4 hours
- If severity = low: schedule for next working day

### Phase 4: Contain

**Who:** Incident owner + technical team
**Action:**
1. Stop the bleeding:
   - Disable affected Edge Function if safe
   - Route traffic away from broken endpoint
   - Temporarily disable affected feature
   - DO NOT disable authentication or RLS
2. Preserve evidence:
   - Capture logs before they rotate
   - Screenshot error states
   - Note exact timestamps
3. Communicate internally:
   - Post update in incident record
   - Notify team via existing channels
4. Update incident status: `investigating` → `monitoring` (if contained)

### Phase 5: Communicate Internally

**Who:** Incident owner
**Action:**
1. Post incident updates in the incident record
2. Include:
   - What happened (safe summary)
   - What's impacted
   - What we're doing
   - Estimated resolution time if known
3. Do NOT include:
   - Secret values, tokens, passwords
   - Customer PII or private data
   - Full error payloads
   - Speculation marked as fact

### Phase 6: Fix or Rollback

**Who:** Technical team
**Action:**
1. Determine fix approach:
   - **Hotfix:** Small code change, can deploy quickly
   - **Rollback:** Revert to previous stable release
   - **Forward fix:** Full release with proper testing
2. If hotfix:
   - Create hotfix in Release Centre
   - Deploy through approved CI/CD pipeline
   - Verify fix on production
3. If rollback:
   - Follow Rollback Runbook
   - Verify previous version is stable
   - Confirm all data integrity
4. Document the fix in the incident record

### Phase 7: Verify

**Who:** Incident owner
**Action:**
1. Run smoke tests for affected journeys
2. Check Operations Dashboard — all health categories should be pass
3. Monitor for 15-30 minutes post-fix
4. Verify no regressions in unrelated features
5. Update incident status: `monitoring` → `resolved`

### Phase 8: Resolve

**Who:** Incident owner
**Action:**
1. Document resolution in incident record
2. Set end_time
3. Add follow-up actions:
   - Root cause analysis needed?
   - Tests to add?
   - Monitoring to improve?
4. Mark incident as `resolved`
5. After follow-ups complete: mark as `closed`

### Phase 9: Review

**Who:** Incident owner + team
**Action:**
1. Schedule post-incident review (within 48 hours for critical/high)
2. Review:
   - What went well in the response
   - What could be improved
   - Was detection fast enough?
   - Was containment effective?
   - Are there systemic fixes needed?
3. Create follow-up tasks
4. Update runbooks and documentation

### Phase 10: Prevent Recurrence

**Who:** Technical team
**Action:**
1. Implement preventive measures:
   - Additional tests for the broken code path
   - Improved monitoring or alerting
   - Documentation updates
   - Architecture changes if needed
2. Close the incident only after prevention measures are in place

---

## Rollback Triggers

**Immediate rollback required for:**
- Cross-wedding access (RLS bypass)
- Cross-guest access
- Broken invitation validation
- RSVP submissions failing broadly
- Authentication outage
- Production build serving demo data
- Stripe granting incorrect access
- Secret exposure
- Database corruption

**Rollback NOT required for:**
- One non-core page visual issue
- Minor copy error
- Non-critical analytics issue
- Optional feature temporarily unavailable

---

## Incident Communication Template

```
INCIDENT UPDATE — [Date Time UTC]
Status: [Investigating | Monitoring | Resolved]
Severity: [Critical | High | Medium | Low]

What happened:
[Safe technical summary — no secrets, no PII]

User impact:
[How users are affected]

Action taken:
[What we did]

Next steps:
[What happens next]
```

---

## Tools and Access

| Tool | Purpose | Access |
|---|---|---|
| `/app/admin/operations` | Health dashboard | Owner/Partner |
| `/app/admin/incidents` | Incident management | Owner/Partner |
| `/app/admin/releases` | Release tracking | Owner/Partner |
| Supabase Dashboard | Database, Auth, Edge Functions | Admin |
| Stripe Dashboard | Payment processing, webhooks | Admin |
| Resend Dashboard | Email delivery monitoring | Admin |

---

Last updated: 2026-08-04
Version: 1.0