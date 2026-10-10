# Vowora three-phase GitHub build

One integrated release contains three substantial implementation chunks. Readdy imports the completed main branch once, after backend configuration and staging validation. This document describes repository work, not a declaration that the live service has been deployed.

## Phase 1 — Reliable account and workspace setup

Repair the build and TypeScript errors; align React 19 tests and dependencies; preserve the selected pricing plan and collaborator destination through registration and email confirmation. Add verification resend, required profile handling, optional wedding date/location/venues, British time-zone conversion, private defaults, atomic workspace creation, and an email-bound collaborator acceptance flow. Platform staff access is separate from wedding roles.

## Phase 2 — Planning and guest experience

Add the missing database domains and relationships for budgets, tasks, suppliers, seating, galleries, gifts and email campaigns. Add production search, activity, timeline and RSVP settings. Connect invitation design sends to canonical wedding guests, recipients and personalised RSVP credentials. Render published website snapshots without exposing private wedding tables. Serve an explicitly enabled photo wall using approved published photos and expiring private-storage URLs.

## Phase 3 — Payment, support and completion

Restrict subscription changes to the wedding owner and confirmed payment state to backend services. Verify Stripe and Resend signatures, handle retryable failures, and configure server-owned monthly/yearly prices. Add CSV/calendar downloads, printable reports, support request references, signed email opt-outs, a real deletion-request cancellation flow, and an atomic post-wedding closure action. Replace simulated production domain verification and deployment-success messages with explicit hosting/setup steps.

## Customer journey and page coverage

| Customer step | Pages / behaviour | Verification |
|---|---|---|
| Discover and compare | Home, product pages, pricing, help and legal pages | Browser route checks |
| Start free or choose a paid plan | Pricing → signup with plan preserved | Unit and browser checks |
| Register and verify | Signup, resend verification, auth callback, login | Redirect and validation tests; live email confirmation required in staging |
| Join an existing wedding | `/join/:token`, signup/login return, invited email and expiry checks | Database acceptance and browser return checks |
| Create a private workspace | Onboarding with names required and date/venues optional | Atomic database creation, retry and private-default checks |
| Set up planning | Getting started, events, venues, guests, budgets, tasks, suppliers, seating, timeline | Schema/query contracts and build; staging CRUD walkthrough required |
| Configure the guest journey | Invitations, designer, RSVP settings and guest-portal settings | Canonical delivery-record and access tests |
| Publish public information | Website builder → `/w/:slug` | Published-only RPC, draft hiding and private-data checks |
| Invite and communicate | Personal links, invitation emails, updates, questions and signed opt-outs | Token boundaries and signed provider handlers; staging email delivery required |
| Respond as a guest | `/invite/:token` → guest portal; attendance, household, meal and accessibility responses | Guest credential regression tests; representative live RSVP required in staging |
| Travel, gifts and photos | Guest travel/registry/gallery, private uploads, approved photo wall | Wedding scope and private-storage boundaries; provider integrations require staging |
| Pay and manage a subscription | Billing checkout/portal, monthly/yearly server prices and signed webhooks | Edge type checks and database write restrictions; Stripe sandbox walkthrough required |
| Request help | `/app/support` creates a reference in the staff queue | Database RPC and role boundaries |
| Finish the wedding | `/app/after-wedding`, `/app/exports`, billing and account privacy | Closure revokes access; CSV/ICS regression checks |
| Export or request deletion | Immediate planning downloads; full archive/deletion review requests | Requests persist; cancellation updates the database |

No extra marketing page is needed to complete the core flow. New functional pages are collaborator acceptance, RSVP settings, customer support and after-wedding guidance. Existing search, activity, exports, timeline, public website and photo-wall routes now have production implementations.

## Practical limits

Paid plans remain disabled until real Stripe product/price IDs are configured. Verified email senders and provider credentials must be installed. Custom wedding domains require hosting configuration through support; the application does not invent DNS records or claim certificate activation. Full account archives and deletion fulfilment require staff review and a retention decision; no unattended deletion worker is enabled. Photo-wall upload QR codes are demo-only because real guest uploads require an authorised personal invitation.

Local checks cover code and database behaviour. They do not prove delivery through live email, payment, DNS or Readdy services. See RELEASE-HANDOFF.md for the single import/publication procedure.
