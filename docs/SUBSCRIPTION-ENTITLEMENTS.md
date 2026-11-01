# Subscription access enforcement

The wedding owns the subscription. Owners, partners and collaborators share its effective plan; membership permissions still apply. Platform staff retain existing diagnostic read permissions, but customer writes require the plan even when the owner also has a platform-admin account.

| Feature | Minimum plan |
| --- | --- |
| Basic website, guest list (20), manual RSVP collection, one collaborator, billing, support and privacy | Free |
| Invitations, email updates/campaigns, travel guide, gallery and website design customization | Essential |
| Tasks, suppliers, budgets, seating and priority support | Complete |
| Wedding-day timeline, live photo wall, day mode, table/place cards, planner seats and custom-domain control | Luxury |

Numeric allowances come from `_shared/entitlementConfig.ts`, used by the displayed plan catalogue and tested against the database snapshot. Database quotas cover guests, invitation records, albums, custom website sections, campaign records, collaborator seats and real gallery Storage bytes. Owner seats are excluded; pending, unexpired member invitations reserve a seat. Accepting an invitation transfers that reservation. Counts include saved records, so archiving cannot circumvent a cap. The wedding row is locked to serialize quota-changing writes, including bulk inserts and service-role guest plus-ones.

Only server-owned billing rows grant access. `trialing` requires a future `trial_end`; `active` requires a future `current_period_end`. Both require a Stripe subscription identifier and no `ended_at`. Every other status (including past_due, unpaid, paused, incomplete and canceled), an invalid/missing plan, missing dates, or an expired period falls back to Free. Scheduled cancellation retains the valid paid period. An authoritative subscription row takes precedence over the legacy fallback, preventing a stale legacy paid row from restoring access. Repeated checkouts do not grant another introductory trial.

Page guards use a membership-checked snapshot RPC. Database restrictive policies protect paid reads and writes independently of the frontend. Private trigger functions enforce feature checks and quotas, including trusted backend creations. Edge Functions check entitlement before sending mail, signing gallery URLs, discovering places or opening gift-fund checkout. Service-only RPCs are revoked from anonymous and authenticated customers. Private helpers have an empty search path and explicit grants.

Downgrades retain data, deny further paid use, and filter published website and guest-portal output. Existing basic guest links and RSVP responses remain usable; new digital invitation creation/sending requires Essential. Free public pages retain branding and use the basic classic design. Paid customization is retained for recovery after an upgrade. Incoming financial/email webhook reconciliation, workspace default-category provisioning and privacy cleanup remain operational; these exceptions do not open customer writes.

Billing shows actual database/Storage usage instead of sample counts. Billing management, login, onboarding, support and privacy remain available when paid features are locked. Background entitlement refresh does not remount an authorized editing page while a check is pending; changing weddings, expiry or failed checks cannot grant access.

Validation includes local PostgreSQL-compatible RLS/trigger tests for four plans, expired trials, paid-period expiry, scheduled cancellation, ended subscriptions, stale legacy state, forged subscription writes, foreign-wedding access, collaborator reservations/acceptance, exact quotas, storage bytes and public downgrade projections. Browser tests cover locked Free/Essential routes, failed entitlement lookup, stale expired snapshots and preserved core journeys. Unit tests check route mapping, shared allowances and service guards failing closed.

Apply migration `20261011130507_subscription_entitlements.sql`, deploy the changed functions with their shared dependencies, then pull GitHub main into Readdy and publish once. Existing signed file URLs can remain valid until their original expiry; previously downloaded data cannot be revoked. Custom domains and API access still depend on their underlying integrations being implemented/configured; advertising those features does not create them.
