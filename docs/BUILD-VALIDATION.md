# Three-phase build validation

This is a code-release report. Supabase production migrations, provider configuration and Readdy publication have not been performed.

## Verified locally

- Production-mode Vite build completes with demo mode disabled and synthetic public backend configuration.
- TypeScript passes without adding suppression directives.
- ESLint has zero errors. There are 138 warnings, chiefly existing hook-dependency and fast-refresh warnings; this is not a warning-free repository.
- 283 unit tests across 16 files pass, including credential boundaries, signup redirects, invitation autosave/render/export and CSV/calendar/time-zone regressions.
- 33 Playwright browser smoke tests pass in Chromium. Backend responses and external assets are stubbed, so these establish route, redirect, layout and JavaScript behaviour rather than live integration delivery.
- All Edge Function entry points pass Deno type checking against pinned current SDK versions.
- All migrations apply to the checked-in existing-schema fixture in PostgreSQL (PGlite). Tests exercise signup profiles, private reads, role escalation denial, cross-wedding references, email preparation/idempotency, provider-event deduplication, forged-payment/sender denial, published-only pages, aftercare revocation and atomic onboarding retries.
- Static Supabase query/column contracts match the migrated schema.
- Production dependency audit reports zero vulnerabilities. Development dependencies are checked separately; unresolved Tailwind 3 tooling advisories require a future major-version migration and do not justify claiming a completely clean all-dependency audit.

## Required before live launch

Run the staging acceptance checks in RELEASE-HANDOFF.md with real Supabase Auth, Resend and Stripe sandbox configuration. In particular, prove email confirmation, invitation delivery and opt-out, paid entitlements after signed webhooks, connected-account gifts, storage uploads, RSVP persistence and the single Readdy import/publication. Local tests cannot substitute for these provider-dependent checks.

The CI workflow now gates frontend checks, database/Edge checks, browser smoke tests and security scans. The release workflow creates a reviewable handoff package; it does not print a simulated deployment or verification success.
