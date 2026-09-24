# Guest Access Credential Contract

**Scope**: The guest-facing invitation and portal flow (`/invite/:token` → `/guest/:accessId`).
**Status**: Reconciled against the current Vowora main (schema verified 2026-09).

This document is the single source of truth for the guest-access security boundary.
It records the canonical contract, the protections in place, and the constraints any
future change must respect. Do not invent tables, columns, RPCs or policies beyond
what is listed here.

---

## 1. Canonical contract

### 1a. Invitation raw token
- **Carrier**: the email link `/invite/<rawToken>`. Browser supplies it in the body of
  `validate-invitation` as `rawToken`.
- **Storage**: never stored. The server computes `SHA-256(rawToken)` and looks up
  `invitation_access_tokens.token_hash`.
- **Column**: `invitation_access_tokens.token_hash` (text, NOT NULL).
- **Rules**: raw token is never logged or persisted; activity logs exclude token values.

### 1b. Invitation token hash
- `SHA-256(rawToken)` stored in `invitation_access_tokens.token_hash`.
- Accept/reject uses `status = 'active'` plus `expires_at` and `revoked_at` checks.
- Resend rotates: the old token row is revoked and a new token generated (couple side).

### 1c. Guest session secret (raw credential)
- **Carrier**: the browser holds the raw secret in `sessionStorage['vowora_guest_session']`
  and in the `/guest/<rawSecret>` route param.
- **Issued**: by `validate-invitation`, returned exactly **once** as `session_id`.
- **Entropy**: 256 bits (32 random bytes, lowercase hex).
- **Never stored**: the raw secret is never written to the database or logs.

### 1d. Stored guest session hash
- **Column**: `guest_access_sessions.session_hash` (text, NOT NULL).
- **Value**: `SHA-256(rawSecret)`. This is the only form persisted.
- **Lookup**: every consumer hashes the supplied raw credential with SHA-256 **before**
  querying `guest_access_sessions`. A caller presenting the raw secret must never be
  able to match a row by raw value.

### 1e. Session expiry / revocation
- `guest_access_sessions.status` ∈ `active | ended | expired`.
- `expires_at` = issue time + 7 days. On expiry the row is flipped to `expired`.
- Revocation: if the underlying `invitation_access_tokens.status = 'revoked'`, the
  session is ended (`status = 'ended'`).
- Expired/ended sessions fail closed with a generic `session_invalid` / `session_expired`.

### 1f. Portal availability
- `guest_portal_settings.portal_enabled = false` → `portal_disabled`.
- `guest_portal_settings.portal_closes_at` in the past → `portal_closed`.

### 1g. RSVP idempotency
- Idempotency is expressed through `rsvp_submissions` (`status`, `revision`) rather than
  a stored idempotency key. A resubmission bumps `revision` and records an
  `rsvp_response_revisions` snapshot. The client may send `x-idempotency-key`, but the
  server currently keys off the submission status for the invitation.
- (Open item — see §5.)

---

## 2. Tables involved (verified)

| Table | Key columns used |
|-------|------------------|
| `invitation_access_tokens` | `id, wedding_id, invitation_id, token_hash, status, expires_at, revoked_at, last_used_at` |
| `guest_access_sessions` | `id, wedding_id, invitation_id, access_token_id, session_hash, status, expires_at, last_seen_at, ended_at, created_at` |
| `guest_portal_settings` | `portal_enabled, portal_closes_at, rsvp_enabled, …` |
| `rsvp_submissions` | `id, wedding_id, invitation_id, submitted_by_guest_id, status, is_draft, submitted_at, created_at, updated_at` |
| `invitation_access_activity`, `guest_portal_activity` | security logging (`security_metadata` jsonb) |

---

## 3. Edge Functions in the boundary

| Function | Session credential handling |
|----------|-----------------------------|
| `validate-invitation` | Issues the raw secret, stores only its SHA-256 hash |
| `guest-portal-loader` | SHA-256 hashes the supplied raw credential before lookup |
| `submit-rsvp` | SHA-256 hashes the supplied raw credential before lookup |
| `guest-settings-interact` | SHA-256 hashes before lookup |
| `guest-question-interact` | SHA-256 hashes before lookup |
| `guest-update-interact` | SHA-256 hashes before lookup |
| `guest-gallery-interact` | SHA-256 hashes before lookup |
| `guest-gallery-upload` | SHA-256 hashes before lookup |
| `save-travel-plan` | SHA-256 hashes before lookup |
| `gift-fund-create-checkout` | SHA-256 hashes before lookup (session optional) |

### CORS
`validate-invitation`, `guest-portal-loader` and `submit-rsvp` use an environment-driven
allowlist instead of `*`:

- `GUEST_ALLOWED_ORIGINS` — comma-separated additional origins. When set, it **replaces**
  the production default list.
- `ALLOW_LOCAL_ORIGINS=true` — opt local development origins in alongside an explicit list.
- Defaults (when `GUEST_ALLOWED_ORIGINS` is unset): `https://vowora.uk`,
  `https://www.vowora.uk` plus local dev origins.

### Runtime URL
Guest functions read `SUPABASE_URL` first and fall back to `VITE_PUBLIC_SUPABASE_URL`.

---

## 4. Tenant / wedding isolation

Every query and mutation is scoped by the session's `wedding_id` and `invitation_id`,
resolved from the hashed session row — never from client-supplied ids. Guests can never
read or write another wedding's data even if they tamper with request parameters.

---

## 5. Deliberately not restored (from the earlier PR)

- Reuse of an existing active session on re-validation — incompatible with the
  one-way-hash property (the server cannot re-issue a raw secret it no longer holds).
  Each validation issues a fresh session; old sessions simply expire.
- Legacy Wedora/wedora domains and the global `fetch` monkey-patch are not restored.
- No dedicated RSVP idempotency key table (kept the existing submission-status model).