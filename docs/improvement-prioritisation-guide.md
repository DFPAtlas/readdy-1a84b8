# Improvement Prioritisation Guide

## Purpose

Define the framework Vowora uses to prioritise product improvements, ensuring resources go to the highest-impact work backed by real evidence.

---

## 1. Prioritisation Framework

### Formula
```
Priority Score = Severity × Frequency × Confidence ÷ Effort
```

### Dimensions

| Dimension | Values | Description |
|---|---|---|
| **Severity** | low(1), medium(3), high(6), critical(10) | How badly does this affect customers? |
| **Frequency** | rare(1), occasional(2), frequent(4), widespread(6) | How often does this occur? |
| **Confidence** | low(0.5), medium(1), high(1.5) | How sure are we this is the right solution? |
| **Effort** | small(3), medium(2), large(1), xl(0.5) | How much engineering work is required? |

### Example Calculations
- **Critical bug, frequent, high confidence, small effort** → 10 × 4 × 1.5 ÷ 3 = **20**
- **High friction, occasional, medium confidence, medium effort** → 6 × 2 × 1 ÷ 2 = **6**
- **Low cosmetic, rare, low confidence, large effort** → 1 × 1 × 0.5 ÷ 1 = **0.5**

---

## 2. Required Evidence

An improvement must have **at least one** evidence source before reaching `approved`:

| Evidence Type | Source |
|---|---|
| Analytics data | Activation funnel drop-off, feature usage trends |
| Support case volume | Multiple cases on same theme |
| Customer feedback | Direct feedback from in-app widget |
| Incident history | Repeat incidents in same area |
| Release regression | Metric decline after a release |
| Accessibility issue | WCAG violation or usability barrier |
| Security finding | Audit or security review |

Without evidence, set status to `needs_evidence` and gather data before approving.

---

## 3. Required Success Measure

An improvement must have **at least one measurable outcome** before reaching `approved` or `planned`:

### Good Examples
- "Increase invitation-sent-to-RSVP-submitted conversion from X% to Y%"
- "Reduce support cases about seating from N/week to <M/week"
- "Increase website publish completion from X% to Y%"
- "Reduce time-to-first-guest from X hours to Y hours"
- "Improve Help Centre helpful rate from X% to Y%"

### Bad Examples (Rejected)
- "Make it better"
- "Improve UX" (too vague)
- "Fix the thing" (not measurable)

---

## 4. Improvement Lifecycle

```
new → needs_evidence → approved → planned → in_progress → testing → released → measuring → complete
                                                                                    ↓
                                                                                rejected
```

### Status Definitions

| Status | Meaning | Gate |
|---|---|---|
| `new` | Freshly created | — |
| `needs_evidence` | Waiting for data to justify | Evidence gathered |
| `approved` | Justified by evidence, success measure defined | Evidence + success measure |
| `planned` | Scheduled for a release | Target release assigned |
| `in_progress` | Engineering work started | Owner assigned |
| `testing` | Ready for verification | Tests written, PR merged |
| `released` | Deployed to production | Release confirmed |
| `measuring` | Collecting post-release data | Measurement period active |
| `complete` | Outcome verified | Result recorded |
| `rejected` | Will not do (record reason) | Priority override or team decision |

---

## 5. Priority Override

Priority scores can be overridden by the product owner. Overrides require a **recorded reason**:

- "Strategic initiative — aligns with Q4 goals"
- "Blocked by partner commitment"
- "Lower effort than estimated, fast win"
- "Higher effort than estimated, defer"

The score is a guide, not a mandate. But override reasons ensure transparency.

---

## 6. Post-Release Measurement

When an improvement reaches `released`:

1. **Record baseline period** — metrics before the release
2. **Set measurement period** — minimum 7 days of data
3. **Compare metrics** — did the success measure improve?
4. **Record result**:
   - `successful` — met or exceeded the success measure
   - `neutral` — no clear change
   - `unsuccessful` — metric got worse

After measurement, move to `complete` and record follow-up actions if needed.

---

## 7. Links Between Records

Improvements can (and should) link to:
- **Feedback records** (`linked_feedback_ids`) — the feedback that prompted this
- **Support cases** (`linked_support_case_ids`) — cases this resolves
- **Incidents** (`linked_incident_ids`) — incidents this addresses

This creates traceability from customer problem → improvement → release → verified outcome.