# Phase 1 Guest Access and RSVP Verification

Date: 1 August 2026
Supabase project: `zjqftnkrmqhmbrtkvafy`

## Scope

The following live Edge Functions were verified against the production Wedora schema:

- `validate-invitation`
- `guest-portal-loader`
- `submit-rsvp`

## Security model

- Invitation tokens are stored as SHA-256 hashes.
- Guest session secrets are returned once to the browser and stored only as SHA-256 hashes.
- Invalid token/session attempts are recorded in `guest_access_security_events`.
- Anonymous and authenticated clients have explicit deny policies on the security-event table.
- Guest functions use custom token/session authentication and therefore have Supabase gateway JWT verification disabled.
- Browser origins are restricted by `ALLOWED_ORIGINS`, with Wedora production domains and localhost defaults.
- RSVP rate limiting and idempotency are database-backed.

## Live smoke-test result

A temporary wedding, guest, invitation, access token and ceremony event were created. The live functions were then called through PostgreSQL HTTP.

1. Invitation validation returned `valid: true` and issued a guest session secret.
2. Guest portal loading returned the correct wedding, invitation, recipient and event.
3. RSVP submission saved attendance, plus-one confirmation, child attendance, meal selection, structured dietary and accessibility data, a custom answer, an event response and revision history.
4. Replaying the identical RSVP idempotency key returned the original submission without creating a duplicate.
5. Reloading the guest portal returned the saved RSVP and related records.

Verified database totals before cleanup:

- 1 submission
- 1 response
- 1 revision
- 1 custom answer
- 1 event response

The temporary wedding and all cascaded test data were deleted after verification. Final cleanup counts were zero for weddings, guests, invitations, tokens, sessions, submissions, responses and test security events.

## Migrations

- `harden_wedora_guest_access_and_rsvp`
- `set_wedora_guest_access_table_privileges`
- `enable_http_for_wedora_smoke_tests`
- `add_explicit_deny_policies_guest_access_security_events`

## Next Phase 1 milestone

Harden and deploy invitation delivery using Resend, including token generation, delivery-status persistence, suppression checks, retries and webhook reconciliation.
