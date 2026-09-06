# Vowora — Security Audit Report

Date: 2026-07-23
Phase: Production Prompt 17 — Automated Testing, Security Audit & Operations
Auditor: Automated (AI-assisted review)
Scope: Full codebase (frontend + Edge Functions + database + storage)

---

## 1. Executive Summary

Vowora has been through 16 production hardening prompts and already has strong security foundations. This audit reviews the remaining attack surface and provides a structured assessment of authentication, authorisation, data protection, injection risks, and operational security.

**Overall Rating: Good — with specific remediations recommended.**

---

## 2. Authentication & Session Management

### 2.1 Supabase Auth Integration ✅

| Area | Status | Notes |
|------|--------|-------|
| Auth provider | Supabase Auth (managed) | Industry-standard, PKCE flow |
| Token storage | Supabase SDK (secure httpOnly cookies + localStorage fallback) | Default Supabase behaviour |
| Session persistence | Auto-refresh enabled (`autoRefreshToken: true`) | Configured in `src/lib/supabase.ts` |
| Multi-tab support | `onAuthStateChange` subscription in `AuthProvider` | Syncs across tabs with Navigator LockManager |
| Email verification | Required for signup (`email_confirm: true`) | Confirmed in Supabase project settings |
| Password policy | Supabase default (min 6 characters) | Acceptable; consider increasing to 8+ |
| Rate limiting | Supabase Auth built-in | Applies to login/signup/reset endpoints |
| Logout cache clearing | `supabase.auth.signOut()` → `localStorage.clear()` in demo, session cleared in production | Proper session termination |

### 2.2 Session Handling

| Area | Status | Notes |
|------|--------|-------|
| AuthGuard component | ✅ | Wraps all `/app/*` routes, redirects to `/login?redirect=...` |
| AuthProvider context | ✅ | Singleton, provides `user`, `session`, `loading`, `signIn`, `signUp`, `signOut` |
| Token refresh | ✅ | Automatic via Supabase SDK |
| Session expiry handling | ✅ | `mapAuthError` handles `session expired` → prompts re-login |
| CSRF protection | ✅ | Supabase Auth uses PKCE (OAuth 2.0 with Proof Key for Code Exchange) |

### 2.3 Guest Token Authentication ✅

| Area | Status | Notes |
|------|--------|-------|
| Token entropy | SHA-256 hash of `crypto.randomUUID()` | 256-bit effective entropy |
| Token storage | Hashed (`token_hash`) in DB, raw token in invitation URL only | Token never stored in plaintext |
| Token expiry | Configured per-token with `expires_at` | Enforced at validation |
| Token revocation | Status field (`active`/`revoked`/`expired`) | Admin-revocable |
| Session management | `guest_access_sessions` with 7-day expiry | sessionStorage-based, no cross-tab leakage |
| Rate limiting | Fingerprint-based (client IP + user-agent hash), 5 attempts per 15 min | `validate-invitation` edge function |
| Idempotency | SHA-256 hash of `invitationId:idempotencyKey` | Prevents duplicate RSVP submissions |

---

## 3. Authorisation & RLS

### 3.1 Row-Level Security (RLS) ✅

| Area | Status | Notes |
|------|--------|-------|
| RLS enabled | ✅ | On all 85+ wedding-scoped tables (see `docs/security/rls-matrix.md`) |
| Membership functions | ✅ | `is_wedding_member`, `wedding_member_role`, `can_view_wedding`, `can_edit_wedding`, `can_manage_wedding_members` |
| Role enforcement | ✅ | 5-tier hierarchy: owner > partner > planner > collaborator > viewer |
| Cross-wedding isolation | ✅ | All RLS policies scoped to `wedding_id` via membership check |
| Fixed UUID removed | ✅ | No hardcoded `00000000-0000-0000-0000-000000000001` in any policy |
| Anon access denied | ✅ | `is_wedding_member()` returns false for anon users |
| Service role bypass | ✅ | Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` for admin operations |

### 3.2 Edge Function Authentication

| Function | JWT Verified | Input Validation | Rate Limited | CORS | Notes |
|----------|-------------|-----------------|-------------|------|-------|
| `provision-wedding-workspace` | ✅ (auth.getUser) | ✅ (validatePayload with all fields) | ❌ | ✅ | Rate limiting deferred |
| `validate-invitation` | N/A (public) | ✅ | ✅ (5/15min) | ✅ | Public endpoint, token-based |
| `guest-portal-loader` | N/A (session hash) | ✅ | ❌ | ✅ | Session hash validation |
| `submit-rsvp` | N/A (session hash) | ✅ | ✅ (10/min) | ✅ | Idempotency key supported |
| `invitation-send` | ✅ | ✅ | ❌ | ✅ | Rate limiting deferred |
| `guest-gallery-upload` | N/A (session) | ✅ | ❌ | ✅ | File validation present |
| `guest-gallery-interact` | N/A (session) | ✅ | ❌ | ✅ | Minimal surface |

**Recommendation:** Add rate limiting to `provision-wedding-workspace`, `guest-portal-loader`, `invitation-send`, and `guest-gallery-upload`.

### 3.3 Storage Bucket Policies

| Bucket | Access | Wedding Scoping | Notes |
|--------|--------|----------------|-------|
| `public` | Public read | ❌ No wedding scoping | Only use for public assets |
| `private` | Private | ✅ Wedding-scoped RLS | SELECT/INSERT/UPDATE/DELETE gated by `wedding_members` + path convention `{category}/{wedding_id}/...` |
| `wedding-assets` | Public read | ❌ No wedding scoping | Risk: guests can enumerate |
| `budget-documents` | Private | ✅ Wedding-scoped RLS | SELECT/INSERT/UPDATE/DELETE gated by `wedding_members` + path convention `{category}/{wedding_id}/...` |

**INSERT enforcement:** Uses RESTRICTIVE policies layered on top of existing permissive bucket-filter policies. Both must pass: bucket filter (PERMISSIVE) AND wedding membership check (RESTRICTIVE).

**Policy list:**
- `private_select_wedding_scoped` (PERMISSIVE)
- `private_insert_wedding_scoped` (RESTRICTIVE)
- `private_update_wedding_scoped` (PERMISSIVE)
- `private_delete_wedding_scoped` (PERMISSIVE)
- `budget_docs_select_wedding_scoped` (PERMISSIVE)
- `budget_docs_insert_wedding_scoped` (RESTRICTIVE)
- `budget_docs_update_wedding_scoped` (PERMISSIVE)
- `budget_docs_delete_wedding_scoped` (PERMISSIVE)

All policies extract `wedding_id` from the second path segment and verify the user is an active member via `wedding_members`. Edge Functions with `service_role` bypass RLS entirely, so they continue to work for guest uploads and admin operations.

---

## 4. Injection & XSS Prevention

### 4.1 Cross-Site Scripting (XSS)

| Area | Status | Notes |
|------|--------|-------|
| React JSX auto-escaping | ✅ | React escapes all JSX content by default |
| dangerouslySetInnerHTML | ⚠️ | Not found in codebase — good. But `descriptionHtml` from Shopify (future) requires sanitisation |
| User-generated content | ✅ | Wedding copy, captions, messages, supplier notes — all rendered via JSX (auto-escaped) |
| Email content | ⚠️ | Edge Functions construct email HTML from user input — needs HTML sanitisation before Resend |
| URL injection | ✅ | `Link` and `NavLink` from react-router-dom — no raw href construction found |
| SVG injection | ✅ | No SVG generation; Remix Icon from CDN |

**Recommendation:** Add DOMPurify or similar HTML sanitisation to any edge function that injects user content into email HTML (e.g., `invitation-send`, `email-campaign-send`).

### 4.2 SQL Injection

| Area | Status | Notes |
|------|--------|-------|
| Supabase client | ✅ | Parameterised queries via `.eq()`, `.ilike()`, `.select()` |
| Edge Functions | ✅ | All queries use Supabase client with parameterised methods |
| Raw SQL | ❌ | No raw SQL found in codebase outside migrations |
| `execute_sql` tool | ✅ | Used only for schema management, not runtime queries |

### 4.3 Formula Injection (CSV Export)

| Area | Status | Notes |
|------|--------|-------|
| CSV export | ✅ | `useGuestService.ts` applies formula injection protection (`'` prefix for values starting with `=`, `+`, `-`, `@`) |

---

## 5. CSRF, Replay & Idempotency

| Area | Status | Notes |
|------|--------|-------|
| CSRF on Supabase Auth | ✅ | PKCE + httpOnly cookies |
| CSRF on Edge Functions | ✅ | All mutations require either JWT or session hash (not cookie-based) |
| Replay attacks | ✅ | `submit-rsvp` uses `idempotency_key` + SHA-256 hash dedup |
| Webhook idempotency | ✅ | `email-webhook` uses event ID deduplication |
| Mutation idempotency | ⚠️ | Other mutations lack idempotency keys — acceptable for low-risk operations |

---

## 6. File Upload Security

| Area | Status | Notes |
|------|--------|-------|
| Size limits | ✅ | Gallery uploads: 20MB per file, 50 per guest (`gallery_upload_settings`) |
| MIME validation | ✅ | `guest-gallery-upload` validates MIME types |
| Extension validation | ⚠️ | No explicit extension whitelist — relies on MIME only |
| Malware scanning | ❌ | Not implemented — recommended for production |
| Path traversal | ✅ | Files stored by UUID path, preventing path injection |
| Storage quotas | ❌ | No per-wedding quota enforcement |

**Recommendation:** Add file extension whitelist (`.jpg`, `.jpeg`, `.png`, `.webp`, `.mp4`, `.mov`) to `guest-gallery-upload`. Consider integrating ClamAV or cloud malware scanning for uploaded files.

---

## 7. Dependency & Secret Security

### 7.1 Secret Scanning

| Area | Status | Notes |
|------|--------|-------|
| Hardcoded API keys | ✅ | None found — previous audit confirmed |
| Service role key in frontend | ✅ | None found — only in Edge Functions via `Deno.env.get()` |
| `.env` file in repo | ✅ | `.env` is gitignored; `.env.example` contains only placeholders |
| Secret rotation | ❌ | No documented rotation procedure |
| Environment separation | ✅ | `src/lib/env.ts` centralises all env access |

### 7.2 Dependency Review

| Dependency | Version | Risk | Notes |
|------------|---------|------|-------|
| `react` | ^19.1.2 | Low | Latest React 19 |
| `react-dom` | ^19.1.2 | Low | Matches React |
| `react-router-dom` | ^7.6.3 | Low | Latest v7 |
| `@supabase/supabase-js` | 2.57.4 | Low | Recent stable |
| `firebase` | — | — | ✅ REMOVED (2026-08-01) — was an unused dependency; Supabase is the sole backend |
| `recharts` | 3.2.0 | Low | Charting library, data visualisation only |
| `lucide-react` | ^0.469.0 | Low | Icon library |
| `i18next` | ^25.3.2 | Low | Internationalisation |

**Finding:** ~~`firebase@12.0.0` was listed as a dependency~~ → ✅ **REMOVED (2026-08-01).** Firebase removed from `package.json`. Has zero impact on the codebase — Vowora uses Supabase exclusively, and no code ever imported firebase. This trims ~200KB from the bundle and removes an unnecessary supply-chain risk.

---

## 8. Abuse Case Analysis

| Abuse Case | Risk | Mitigation | Status |
|------------|------|------------|--------|
| Mass invitation emails | Medium | Rate limiting on `invitation-send` | ❌ Not implemented |
| Guest question spam | Low | Rate limiting on `guest-question-interact` | ❌ Not implemented |
| Gallery upload flood | Medium | Per-guest limits (50 files, 20MB each) | ✅ Implemented |
| RSVP brute-force | Low | Rate limiting (10/min) + session validation | ✅ Implemented |
| Public form spam | Low | Honeypot anti-spam on contact form | ✅ Implemented |
| Seating data enumeration | Low | All seating tables under RLS | ✅ Implemented |
| Budget data scraping | Low | All budget tables under RLS | ✅ Implemented |
| Wedding slug enumeration | Low | RLS prevents data access even with known slug | ✅ Implemented |

---

## 9. Privacy & Data Protection

| Area | Status | Notes |
|------|--------|-------|
| Data minimisation | ✅ | Only necessary fields collected |
| Health data access | ✅ | Dietary/accessibility restricted to wedding members |
| Consent tracking | ✅ | Cookie consent with version + timestamp |
| Email suppression | ✅ | `email_suppressions` table, unsubscribe page |
| Data export | ✅ | `wedding_export_requests` table with status tracking |
| Data deletion | ✅ | `wedding_deletion_requests` with 30-day cooling off |
| Right to be forgotten | ✅ | Guest data deletion documented in retention schedule |

---

## 10. Findings Summary

### Critical (0)
None identified.

### High (0)
~~1. **No storage bucket wedding-scoping**~~ — ✅ **FIXED (2026-07-24).** Added 8 wedding-scoped RLS policies across `private` and `budget-documents` buckets. All CRUD operations now require active wedding membership verified against `wedding_members` table, with `wedding_id` extracted from the second path segment.

### Medium (2)
2. **No rate limiting on `provision-wedding-workspace`** — Could be abused to create excessive wedding workspaces.
3. **No malware scanning on uploads** — Gallery uploads could carry malicious payloads.

### Low (5)
5. **No file extension whitelist on uploads** — Relies on MIME only.
6. **No secret rotation procedure documented**.
7. **Edge Function rate limiting coverage incomplete** — 4 of 8 functions unrated.
8. **No per-wedding storage quota enforcement**.
9. **Email HTML lacks sanitisation** — User content injected into email templates.

---

## 11. Remediation Roadmap

### Immediate (this sprint)
- ~~Remove `firebase` dependency~~ ✅ Done (2026-08-01)
- Add file extension whitelist to `guest-gallery-upload`
- Add rate limiting to `provision-wedding-workspace`

### Near-term (next sprint)
- ~~Add storage RLS policies scoping `private` and `budget-documents`~~ ✅ Completed 2026-07-24
- Add DOMPurify to email-constructing edge functions
- Add rate limiting to remaining 2 edge functions

### Medium-term
- Implement malware scanning pipeline for uploads
- Document and automate secret rotation
- Add storage quota enforcement
- Set up automated dependency vulnerability scanning in CI

---

## 12. Residual Risks (Accepted)

| Risk | Owner | Reason |
|------|-------|--------|
| Supabase infrastructure compromise | Supabase | Third-party managed service; covered by their SOC 2 |
| Third-party CDN compromise (Google Fonts, CDNJS) | Product | Acceptable for UI; no sensitive data exposed via CDN |
| Resend email data in transit (USA) | Product | SCCs in place; UK-facing but email is inherently not end-to-end encrypted |
| Google Maps API key exposure | Product | VITE_PUBLIC_ prefix = client-side; restricted by HTTP referrer in GCP console |
| Browser extension keylogging | N/A | Outside Vowora's control |

---

## 13. Test Verification Guidance

| Test | How to Verify |
|------|--------------|
| RLS cross-wedding isolation | Create two weddings, attempt to read wedding B data with wedding A credentials — must return empty |
| RLS role enforcement | Create a viewer member, attempt INSERT on guests — must fail |
| Token expiry | Create token with `expires_at: now - 1 day`, attempt validation — must return "expired" |
| Token revocation | Revoke active token, attempt validation — must return "invalid_link" |
| Rate limiting | Send 6 validation attempts within 15 minutes from same fingerprint — 6th must be rate-limited |
| Session isolation | Open two different guest sessions in different browser contexts — must not leak data |
| XSS via wedding copy | Set wedding title to `<script>alert(1)</script>`, view public page — JSX must escape |
| File upload MIME spoofing | Upload a `.exe` renamed to `.jpg` — MIME check must reject |
| CSV formula injection | Export guest with name `=SUM(A1:A100)`, open CSV — cell must be prefixed with `'` |
| Unsubscribe durability | Unsubscribe email, restart browser, check suppression — must persist |

---

Last Updated: 2026-08-01