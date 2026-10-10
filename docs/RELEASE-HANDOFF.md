# One Readdy handoff for the three-phase build

GitHub is the source of truth. Complete the code review and CI first, configure the backend in staging, and make one Readdy pull from main after the integrated release is ready. Do not import intermediate commits.

## 1. Backend preparation

Take a database and storage backup. Rehearse all migrations against a staging copy of the existing Vowora schema; these migrations extend an existing application, not an empty project. The structural fixture in database-schema-audit.json records the baseline used for local PostgreSQL checks. Review unique-index compatibility and any existing records before production application. Foreign keys marked NOT VALID protect new writes; inspect and validate old rows after any necessary cleanup.

The observed Vowora project reference is `fbtfomexfcwdwyxwcgot`. Confirm the target in the Supabase dashboard before linking the CLI. Use the Supabase CLI to link the intended staging project and run `supabase db push`; deploy the functions using the checked-in supabase/config.toml. Repeat the verified procedure against production during the release window. No live migrations or function deployments were performed by this GitHub build.

Set these server-only secrets in Supabase, never with a VITE_ prefix:

- PUBLIC_SITE_URL: canonical HTTPS origin, normally https://vowora.uk.
- ALLOWED_ORIGINS: explicit preview/staging HTTPS origins when required.
- RESEND_API_KEY, RESEND_FROM_DOMAIN and RESEND_WEBHOOK_SECRET.
- STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET for the correct Stripe environment.
- INVITATION_LINK_SECRET and EMAIL_PREFERENCE_SECRET: stable random secrets. Changing these affects retry links and old email preference URLs.
- GOOGLE_PLACES_API_KEY only if Google Places discovery is enabled.

Supabase provides SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to deployed functions. Authenticated functions verify their caller; guest functions validate wedding-scoped guest secrets; webhooks verify provider signatures. Therefore endpoint-level verify_jwt is false in the function configuration.

Keep ENABLE_DEMO_SEEDING unset in production. Stock invitation asset seeding and demo seeding require a platform-admin account. Uploaded galleries and supplier documents use the private storage bucket; stock invitation assets use the public invitation-assets bucket. Review and remove any pre-existing permissive storage policies before launch, since adding restrictive policies cannot override a separate permissive policy.

## 2. Email and billing configuration

Verify the Resend sending domain and DNS authentication. Add verified_senders rows with the correct wedding_id, email, user_id and is_verified=true using a trusted administrative process after verification. Customers cannot verify their own sender rows through database writes. Designer emails now use Resend directly; N8N_SEND_WEBHOOK_URL is no longer required. Scheduled designer sends support up to 30 days ahead.

Configure Resend webhooks for delivery, bounce and complaint events at email-webhook, and store the webhook signing secret. Retry the same designer submission after a timeout; the delivery record and provider idempotency key are reused. Sends older than the safe retry window require a delivery-status review before a new submission.

Create and verify the Stripe products/prices for essential, complete and luxury. Populate wedora_subscription_plans with stripe_product_id, stripe_price_id, optional stripe_yearly_price_id, currency and amount_minor; enable paid rows only after confirming prices against the pricing page. Annual checkout fails clearly if no annual price is configured. Configure the billing portal and both subscription/gift webhook endpoints; ensure the signing secret corresponds to the endpoint/environment. Use a separate sandbox first, with test-only customers and connected accounts.

Create platform_admins entries only for actual Vowora staff, through a trusted administrative process. Wedding owner/partner membership never grants platform administration. Establish support queue and privacy-request monitoring; requests are stored, but no automated support email notification or deletion worker is enabled.

## 3. Frontend and one import

Set Readdy's public frontend variables from .env.example, with VITE_DEMO_MODE=false, the real Supabase public URL/anon key, VITE_PUBLIC_SITE_URL and the release version. Configure Supabase Auth callback redirects for the production and explicit staging origins. Email confirmation must remain enabled for production signup.

The GitHub Prepare Readdy release workflow verifies and packages the frontend plus backend sources. It requires the repository's public Supabase URL variable and anon-key secret. It does not deploy Supabase or publish Readdy, and it fails on missing production configuration.

After backend staging checks pass and production backend configuration is installed, pull the completed main branch into Readdy once. Preview the exact imported revision, verify environment variables, and publish once. Record the main commit and release version. Do not make divergent source edits in Readdy during the GitHub build/import window.

## 4. Staging / publication acceptance checks

- New free signup → real confirmation email → optional-date onboarding → private dashboard; retry does not create another wedding.
- Paid signup → selected plan preserved → sandbox checkout → signed webhook → correct entitlement; annual prices and billing portal changes agree.
- Invite a collaborator → invited email joins the existing wedding; other emails, expired links and revoked membership fail.
- Add/import guests, planning expenses/tasks/suppliers/seating/timeline; reload to confirm persistence and correct wedding scope.
- Publish events and website; public website exposes only curated published data, while personalised guests see their allowed events.
- Send a real staging invitation; use its personal link for attendance, dietary/accessibility changes and RSVP updates. Check email delivery, retries, suppression and opt-out.
- Test connected-account gifts in Stripe sandbox; confirmed amount/currency and wedding match, duplicate events do not create duplicate contributions.
- Upload and moderate photos; unpublished/private photos stay hidden, wall URLs expire, and disabled walls return unavailable.
- Download CSV/calendar and print a report; submit support and retain its reference.
- Close the guest experience after the wedding; website, portal, sessions and invitation links close together. Billing cancellation remains a separate action.
- Record privacy requests, reload them, cancel a request and confirm the database update. Staff review handles fulfilment and storage/financial retention.

## 5. Rollback

Retain the previous main commit and the pre-release backup. Disable paid purchases, email sending or guest access if an external integration fails. Frontend rollback must be paired with a schema-compatibility check: the new access boundaries intentionally remove public reads of private wedding data. Do not restore permissive policies to make an old frontend appear healthy. Use the rehearsed backup/restore procedure for database rollback; record any payments/emails issued since the backup before restoring.
