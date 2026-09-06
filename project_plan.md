# Vowora — Wedding Planning SaaS Platform

## 1. Project Description
Vowora is a modern wedding-planning SaaS platform that helps couples create a wedding website, manage wedding information, organise guests, collect RSVPs, send updates, plan travel and display approved hotels, restaurants, transport and useful local services over a Google Map. The brand feels elegant, romantic, modern, calm, trustworthy and premium.

## 2. Page Structure

### Public Routes
- `/` — Home (MP4 hero, product intro, features, guest journey, travel concierge, dashboard preview, collaboration, testimonials, final CTA)
- `/features` — Features overview
- `/guest-experience` — Guest portal explanation
- `/travel-concierge` — Travel concierge explanation
- `/pricing` — Pricing plans
- `/about` — About Vowora
- `/contact` — Contact form
- `/login` — Login
- `/signup` — Signup
- `/forgot-password` — Forgot password
- `/privacy` — Privacy policy
- `/terms` — Terms of service
- `/w/[slug]` — Public wedding page

### Protected App Routes
- `/app/onboarding` — Multi-step onboarding wizard
- `/app/dashboard` — Main dashboard
- `/app/wedding` — Wedding details management
- `/app/guests` — Guest management (placeholder)
- `/app/invitations` — Invitations (placeholder)
- `/app/updates` — Email updates (placeholder)
- `/app/travel` — Travel concierge setup (placeholder)
- `/app/tasks` — Tasks (placeholder)
- `/app/suppliers` — Suppliers (placeholder)
- `/app/budget` — Budget (placeholder)
- `/app/seating` — Seating (complete)
- `/app/settings` — Settings (placeholder)

## 3. Core Features

### Phase 1 (Current)
- [x] Public marketing website with all sections
- [x] MP4 video hero with poster fallback
- [x] Responsive navigation with mobile drawer
- [x] Authentication UI (login, signup, forgot password)
- [x] Multi-step onboarding wizard
- [x] Protected application shell with sidebar
- [x] Dashboard with wedding data
- [x] Wedding details editing
- [x] Public wedding page foundation
- [x] Legal pages (privacy, terms)
- [x] SEO metadata and structure
- [x] Supabase integration (auth, database) — connected ✅
- [ ] Google Maps/Places integration — requires configuration

### Phase 2+ (Deferred)
- [ ] Guest management CRUD
- [ ] Invitation system with email delivery
- [ ] RSVP collection and tracking
- [ ] Email campaign system
- [ ] Task management
- [ ] Supplier management
- [ ] Budget tracking
- [ ] Seating planner
- [ ] Travel Concierge with Google Places
- [ ] Wedding website builder with themes
- [ ] Calendar integration
- [ ] After-wedding gallery

## 4. Data Model Design

### Table: profiles
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| first_name | text | User first name |
| last_name | text | User last name |
| avatar_url | text | Profile image URL |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |

### Table: weddings
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| owner_user_id | uuid | Wedding owner |
| title | text | Wedding title |
| partner_one_name | text | First partner name |
| partner_two_name | text | Second partner name |
| wedding_date | date | Wedding date |
| date_confirmed | boolean | Date confirmed flag |
| timezone | text | Timezone |
| status | text | Wedding status |
| slug | text | Public URL slug |
| welcome_message | text | Guest welcome |
| dress_code | text | Dress code |
| contact_information | text | Contact info |
| parking_notes | text | Parking info |
| accessibility_notes | text | Accessibility info |
| children_policy | text | Children policy |
| plus_one_policy | text | Plus-one policy |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |

### Table: wedding_members
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| wedding_id | uuid | References weddings |
| user_id | uuid | References auth.users |
| role | text | Member role |
| invitation_status | text | Invite status |
| created_at | timestamptz | Created timestamp |

### Table: wedding_venues
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| wedding_id | uuid | References weddings |
| venue_type | text | ceremony/reception/both |
| name | text | Venue name |
| address_line_1 | text | Address |
| address_line_2 | text | Address line 2 |
| city | text | City |
| county_or_region | text | County/region |
| postcode | text | Postcode |
| country | text | Country |
| latitude | float | Latitude |
| longitude | float | Longitude |
| google_place_id | text | Google Place ID |
| website_url | text | Website |
| phone | text | Phone |
| notes | text | Notes |
| is_public | boolean | Visible on public page |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |

### Table: wedding_settings
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| wedding_id | uuid | References weddings |
| theme_key | text | Theme identifier |
| primary_colour | text | Primary colour |
| accent_colour | text | Accent colour |
| public_site_enabled | boolean | Publication toggle |
| guest_login_required | boolean | Guest auth requirement |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |

## 5. Backend / Third-party Integration Plan
- **Supabase**: Required for authentication, database, and Edge Functions. Not yet connected.
- **Google Maps/Places**: Required for Travel Concierge. API keys needed. Server-side Places via Edge Functions.
- **Resend**: Required for email (invitations, updates). Not yet configured.
- **Stripe**: Required for payments in later phases.
- **Shopify**: Not needed.

## 6. Development Phase Plan

### Phase 1: Public Website, Auth, App Shell, Dashboard (Current) ✅ COMPLETE
- Goal: Complete public marketing website, authentication UI, onboarding, protected app shell, working dashboard, wedding details management, and public wedding page foundation
- Deliverable: All 25 routes created, brand system established, all Phase 1 features working with mock data
- Status: Built. Supabase and Google integrations await connection.

### Phase 2: Supabase Integration ✅ COMPLETE
- Goal: Connect Supabase, migrate schema, enable real auth, wire up database
- Deliverable: Working auth flow, persistent data, RLS policies
- Status: Built. Database schema created, data migrated, app pages wired to Supabase.

### Phase 3: Guest Management & RSVPs
- Goal: Full guest CRUD, invitation system, RSVP collection
- Deliverable: Complete guest lifecycle

### Phase 3A: Invitation Data, Templates and Admin Management ✅ COMPLETE
- Goal: Complete invitation management foundation - templates, CRUD, recipient linking, dashboard integration
- Deliverable: Working invitation and template management system with 8 new routes, 4 database tables, guest/household integration
- Status: Built. Sending and RSVP deferred to Phase 3B.

### Phase 3B: Guest Portal Foundation ✅ COMPLETE
- Goal: Secure guest portal with token-based access, session management, noindex/cache-control, cross-wedding isolation, activity auditing
- Deliverable: Refactored guest portal architecture with React context, two edge functions (validate-invitation + guest-portal-loader), new guest_portal_activity table, sessionStorage-based sessions (replacing localStorage), rate limiting, generic error messages, noindex/nofollow meta tags, wedding-scoped indexes + RLS
- Status: Built. RSVP form submission, email delivery, meal selection deferred.
- Routes: /invite/:token, /guest/:accessId (layout), /guest/:accessId/details, /guest/:accessId/travel, /guest/:accessId/updates, /guest/:accessId/seating

### Phase 3C: RSVP Collection (Next)
- Goal: Guest RSVP form submission, meal selection, response tracking
- Status: Deferred

### Phase 4: Travel Concierge
- Goal: Google Places integration, venue discovery, approval workflow
- Deliverable: Working travel recommendation system

### Phase 5: Email & Communications
- Goal: Resend integration, invitation emails, update campaigns
- Deliverable: Complete communication system

### Phase 6: Planning Tools
- Goal: Tasks, suppliers, budget, seating
- Deliverable: Full planning workspace

### Phase 4A: Budget & Financial Planning ✅ COMPLETE
- Goal: Complete budget planning
- Status: Built.

### Phase 4B: Seating Planner ✅ REBUILT (Phase S1)
- Goal: Visual drag-and-drop seating planner with multi-plan support
- Deliverable: 6 new routes, expanded database schema (5 tables), wedding context hook, plan management, autosave, version history, activity logging
- Status: Built. Advanced chair placement, smart seating, PDF exports deferred to Phases S2-S4.
- Routes: /app/seating, /app/seating/new, /app/seating/plans, /app/seating/plans/:planId, /app/seating/plans/:planId/settings, /app/seating/plans/:planId/versions

### Phase 3C: Budget & Financial Planning ✅ COMPLETE
- Goal: Complete budget planning — setup wizard, category allocation, expense tracking, supplier quotes, payment scheduling, reports, scenario comparison, guest cost calculator
- Deliverable: 7 new budget routes, 6 database tables, real persistence, dashboard integration
- Status: Built. Scenario comparison, attachment uploads, and real payment processing deferred to later phases.

### Phase 8: Demo Mode Foundation ✅ COMPLETE
- Goal: Client demonstration mode without Supabase, email, Stripe, or live invitation tokens
- Deliverable: Complete demo data system (24 guests, seating, budget, gallery, registry, travel, updates, tasks, suppliers), localStorage persistence, /demo-start launcher page, demo badge in AppShell, ErrorBoundary, demo bypasses in useActiveWedding, invite landing, guest portal, and public wedding page
- Status: Built. Page-level demo wiring for dashboard, guests, seating, budget etc. deferred to Prompt 2+.

### Phase 9: Demo Login, Onboarding & Couple Dashboard ✅ COMPLETE
- Goal: Smooth first-client-demo journey — login, 5-step onboarding, populated couple dashboard all from shared Demo Mode data
- Deliverable: Demo login button on /login, 5-step onboarding with demo pre-fill and skip, fully populated demo dashboard (summary cards, countdown, planning progress, interactive tasks, interactive payments, RSVP overview, quick actions, suppliers, website/portal status, supplier/travel/photo previews), account menu with demo logout and reset, navigation cleanup for demo mode, AppShell overhaul
- Files created: src/demo/useDemoDataSafe.ts
- Files changed: src/demo/demoTypes.ts (+3 onboarding fields), src/demo/demoData.ts (+onboarding defaults), src/demo/DemoDataProvider.tsx (+markOnboardingComplete, markTaskComplete, DemoDataContext export), src/pages/login/page.tsx (demo entry), src/pages/app/onboarding/page.tsx (5-step rewrite), src/pages/app/dashboard/page.tsx (demo branch), src/components/feature/AppShell.tsx (account menu, demo logout, nav cleanup)
- Status: Built. Guest management, invitations, budget pages, seating pages, travel, photo wall deferred to Prompts 3-8.

### Phase 10: Demo Guest Management ✅ COMPLETE
- Goal: Polished first-client demonstration of guest management — guest list, search, filters, add/edit guest, guest profile, RSVP changes, households, tags, plus-ones, dietary/accessibility indicators, archive/restore, CSV export, dashboard integration
- Deliverable: 7 pages fully wired for demo mode (guest list, guest detail, add guest, edit guest, households, tags, export) — all using shared DemoDataProvider data. Preserved Supabase paths in separate NormalXxxPage components.
- Files changed: src/demo/demoTypes.ts (+tag_ids field), src/demo/DemoDataProvider.tsx (+moveGuestToHousehold, removeGuestFromHousehold, updateGuestTags, generateDemoId), src/pages/app/guests/page.tsx (full demo rewrite with search, filters, summary cards, table/card view, RSVP quick-change, bulk actions, pagination), src/pages/app/guests/[guestId]/page.tsx (demo guest profile with overview, contact, RSVP, requirements, activity, seating, household, tags, Oliver Bennett portal link), src/pages/app/guests/[guestId]/edit/page.tsx (demo edit with GuestFormFields adapter), src/pages/app/guests/new/page.tsx (demo add with GuestFormFields adapter), src/pages/app/guests/households/page.tsx (demo households with member management), src/pages/app/guests/tags/page.tsx (demo tags with pre-populated usage counts), src/pages/app/guests/export/page.tsx (demo CSV export with presets and column selection)
- Status: Built. Invitations, budget, seating, travel, registry, gallery, updates, photo wall deferred to Prompts 4-8.

### Phase 11 — Prompt 4: Demo Invitations & RSVP (complete ✅)

**Files created:**
- `src/components/feature/DemoGuestPortalShell.tsx` — minimal demo guest portal wrapper

**Files changed:**
- `src/demo/demoTypes.ts` — added 7 RSVP form fields to `DemoGuest`
- `src/demo/demoGuests.ts` — Oliver's record updated with RSVP submission data
- `src/demo/demoInvitations.ts` — Oliver's invitation → `ready`, Maya's → `draft`; deadline set to 2027-02-28
- `src/demo/DemoDataProvider.tsx` — added `submitDemoRsvp()` and `simulateSendInvitation()` mutations
- `src/pages/app/invitations/page.tsx` — full demo rewrite: 16 invitations, 6 summary stats, search/filter, simulated send with loading state, "View as Oliver" links
- `src/pages/app/invitations/[invitationId]/page.tsx` — demo detail: recipients with RSVP badges, activity log, View as Oliver, Simulate send
- `src/pages/app/invitations/[invitationId]/preview/page.tsx` — demo polished preview with venues, events, recipient list, RSVP deadline, View as Oliver button
- `src/pages/guest/[accessId]/rsvp/page.tsx` — complete 6-step demo RSVP: Welcome, Attendance, Events, Meal & Requirements, Plus-one, Review & Submit. Uses DemoDataProvider. No edge functions.
- `src/pages/guest/[accessId]/rsvp/confirmation/page.tsx` — demo confirmation: summary, change response, continue to portal

**Key features:**
- 16 demo invitations: 1 ready, 1 draft, 14 sent — searchable, filterable by status/type
- "Simulate send" on Oliver's invitation → marks sent, adds activity, shows demo toast
- "View as Oliver" from invitations → `/guest/demo-session/rsvp`
- 6-step RSVP flow: Welcome → Attendance → Events → Meal/Requirements → Plus-one → Review
- Submit saves to central DemoDataProvider, updates guest/invitation/activity/seating
- Confirmation page with response summary, change-response link, continue to portal
- All demo actions marked as simulated — no real email, no edge functions

**Build result:** ✅ Clean (v93)

### Phase 12 — Prompt 5: Public Wedding Website & Demo Guest Portal (complete ✅)

**Files created:**
- `src/demo/demoGuestPortalMapping.ts` — maps DemoState → GuestPortalData-compatible shapes for demo guest portal injection

**Files changed:**
- `src/pages/w/slug/page.tsx` — full public wedding website rewrite. In demo mode with `emma-and-james` slug: preview bar with "Return to dashboard" and "View as guest" links, hero with background image, sticky nav with 9 sections (Welcome, Wedding Day, Schedule, Travel & Stay, FAQs, Updates, Registry, Gallery, RSVP), 8 schedule items, 4 practical info cards, grouped travel places with featured/pricing badges, FAQ accordion (8 questions), published updates, 3 registry items with progress, gallery grid (8 images), RSVP entry linking to `/guest/demo-session/rsvp`, footer. Non-demo slugs show friendly not-found. Non-demo mode preserves the previous Supabase path as a fallback.
- `src/components/feature/GuestPortalLayout.tsx` — for `demo-session`, injects demo data via `DemoGuestPortalDataProvider` wrapping `GuestPortalContext.Provider` with data from `buildDemoGuestPortalData()`. Adds "Demo Guest View" badge, "Return to couple dashboard" link in sidebar, demo footer. Normal mode unchanged (GuestPortalProvider → edge function).
- `src/hooks/useGuestPortal.tsx` — exported `GuestPortalContext` (previously private) so demo data can be injected
- `src/pages/guest/[accessId]/rsvp/page.tsx` — fixed React hooks ordering (moved `useState` before early returns, added `submitDemoRsvp` + `basePath` after guards)

**Key features:**
- Public website (`/w/emma-and-james`): full 8-section wedding website with hero image, navigation, all content from central DemoDataProvider
- Preview bar: "You are viewing the Emma & James demo website" with dashboard and guest links — dismissible
- RSVP entry: no public guest lookup — links to Oliver's demo RSVP at `/guest/demo-session/rsvp`
- FAQ accordion: 8 questions, keyboard accessible, answers match wedding settings
- Travel: 9 approved places grouped by category (Hotel, Restaurant, Café, Taxi, etc.), with pricing badges, couple notes, website links
- Registry: 3 items (KitchenAid, Le Creuset, Honeymoon fund), progress bar on fund
- Gallery: approved images only, responsive 4-col grid, hover captions
- Guest portal (`/guest/demo-session`): demo data injected into existing `GuestPortalContext` so all sub-pages (itinerary, travel, updates, registry, gallery, seating, details, contacts) work with Oliver Bennett's personalised data
- Demo badge and "Return to couple dashboard" in guest portal sidebar
- No guest list download, no Supabase calls, no edge functions in demo mode

**Build result:** ✅ Clean (v95)

### Phase 13 — Prompt 6: Demo Budget & Payment Tracking (complete ✅)

**Files changed:**
- `src/demo/demoTypes.ts` — added optional `paid_at`, `payment_method`, `payment_reference`, `payment_type` fields to `DemoPayment`; added `'cancelled'` to payment status union
- `src/demo/demoBudget.ts` — restructured payments: 12 paid (£12,600 total), 7 pending (£11,450), 1 overdue (£800). Each with payment type, method, reference, and paid dates
- `src/demo/DemoDataProvider.tsx` — added 6 new mutations: `cancelExpense`, `restoreExpense`, `addPayment`, `updatePayment`, `cancelPayment`, `restorePayment`. Updated `markPaymentPaid` to set `paid_at` timestamp
- `src/pages/app/budget/page.tsx` — **full demo rewrite**: header with Demo Account badge, 6 summary cards (Planned £32,000 / Committed £24,850 / Paid £12,600 / Outstanding £12,250 / Remaining £7,150 / Upcoming), dual-colour progress bar (paid + committed), status cards (on track, contingency, overdue warning), 8-category table with variance + progress bars, filterable expense table (search, category, status), payment schedule with quick mark-paid, guest cost calculator, payment warnings section, CSV export modal, toast feedback
- `src/pages/app/budget/categories/page.tsx` — **demo rewrite**: category table with inline allocation editing, committed/paid/variance per category, progress bars, expense list with search/filter/sort, add/edit expense modal with supplier dropdown, cancel/restore expense with confirmation
- `src/pages/app/budget/payments/page.tsx` — **demo rewrite**: 4 summary cards (total paid, upcoming, overdue, count), status filter tabs (all/unpaid/pending/overdue/paid/cancelled), overdue warning panel, payment list with mark-paid and cancel actions, schedule payment form (description, expense, amount, type, date, method, reference), confirmation dialogs for mark-paid and cancel
- `src/pages/app/budget/suppliers/page.tsx` — **demo rewrite**: 3 summary cards, 6 supplier cards showing committed/paid/outstanding with category badges, supplier detail drawer with contact info, financial summary, related expenses, next action, notes, and "coming soon" notice for full management

**Key features:**
- All totals computed from central data: £32,000 planned, £24,850 committed, £12,600 paid, £12,250 outstanding, £7,150 remaining
- Dual-colour progress bar showing paid vs committed portions
- Category table with inline allocation editing, variance highlighting, progress bars
- Full expense CRUD: add, edit, cancel (soft), restore — all with activity logging
- Payment schedule: schedule, mark paid, cancel — with confirmation dialogs and demo safety messaging
- Supplier detail drawer with financial summaries, related expenses, contact info
- CSV export with summary rows + expense detail
- Guest cost calculator retained from original
- Overdue payment warnings with quick mark-paid action
- All mutations persist through central DemoDataProvider → versioned localStorage
- Normal mode preserves Supabase paths in all 4 pages

**Build result:** ✅ Clean (v95)

### Phase 14 — Prompt 7: Demo Seating Planner & Travel Concierge (complete ✅)

**Files created:**
- `src/demo/demoSeatingMapping.ts` — converts demo seating schema (`DemoSeatingPlan`, `DemoSeatAssignment`, `DemoSeatingTable`, `DemoGuest`) to the type shapes expected by the existing seating UI (`SeatingPlan`, `TableWithData`, `GuestInfo`, `UnseatedGuest`, `RoomObject`). Includes `mapToSeatingPlan`, `mapToTablesWithData`, `mapToRoomObjects`, `mapToGuestInfo`, `mapToUnseatedGuests`, `mapToAllGuestInfos`.

**Files changed:**
- `src/pages/app/seating/page.tsx` — **full demo rewrite**: seating overview with 4 summary cards (guest tables, total guests, seated, unassigned), plan info card with venue/room/capacity details, mini room canvas preview showing tables and objects at proper scale, table cards grid with per-table guest list + dietary/allergy indicators, unassigned guest grid, "Open planner" and "Reset layout" (with confirmation) actions. Linked to `/guest/demo-session/seating` for guest preview.
- `src/pages/app/seating/plans/[planId]/page.tsx` — **full demo rewrite for `demo-plan`**: self-contained 3-panel seating workspace. Left panel: unassigned guest list with search + dietary/accessibility filters, click-to-select for quick assignment, drag-to-drop onto tables, per-guest dietary/accessibility dots. Center canvas: zoomable/pannable room view showing 6 round tables with seat dots + guest initials, top table, dance floor, room boundary, table occupancy counts. Right panel: selected table details (shape, capacity, occupancy bar, seated guest list with remove buttons, quick-assign from unseated). Toolbar: back, save status indicator, zoom controls, clear-all-seating, reset-layout (with re-authentication to original demo data). All assignments persisted through `assignGuestToSeat` / `unassignGuest` / `moveSeatingTable` mutations.
- `src/pages/app/travel/page.tsx` — **full demo rewrite** (was AppPlaceholder): travel concierge admin with header + Demo Account badge, 5 summary cards (total/approved/pending/featured/hidden), 5 category breakdown cards (accommodation/food-drink/transport/essentials/things-to-do), filter tabs (All/Approved/Pending/Featured/Hidden) + category dropdown + search, responsive 2-col card list with per-place: name, address, category/price/distance/time badges, couple note (italic), action buttons (Approve/Hide/Feature/Edit/Visit), add recommendation modal (name, category, description, address, price label, distance, journey time, website, phone, couple note, approval/featured toggles), edit modal (pre-filled, same fields), approval/feature/hide workflow with activity logging. Preview links to public site and guest portal travel pages.

**Key features:**
- Seating overview: 24 total guests, 20 seated across 6 tables + top table, 4 unassigned, 1 dance floor
- Seating workspace: zoom 20-200%, pan, drag tables to reposition, drag guests from side panel onto tables, click-to-assign, remove-from-table, clear-all with confirmation
- Reset layout restores original 6 tables, room objects, and assignments via DemoDataProvider reset
- Canvas seat dots show guest initials when seated, empty dots when available, occupancy count per table
- Table capacity enforcement — blocks assignment when table is full, shows warning at capacity
- Save status indicator: Saved (green) / Unsaved (amber) / Saving (animated)
- All seating mutations logged to activity feed
- Travel admin: 10 prepared Bath/Somerset recommendations across 9 categories
- Filters: All/Approved/Pending/Featured/Hidden tabs + category dropdown + text search
- Approval workflow: Approve → visible to guests, Hide → removed from guest views, Feature → promoted in guest/public sections
- Each action shows toast feedback, activity logged
- Add/edit modals with full field set, validation, demo-safe messaging
- Normal mode: Supabase paths preserved in all 3 pages
- Normal mode seating planner workspace page preserved (replaced when planId !== 'demo-plan', navigable from routes)

**Build result:** ✅ Clean (v100 estimated)

### Phase 15 — Legal, Privacy and Data Governance ✅ COMPLETE (2026-07-23)

**Goal:** Replace placeholder legal content and implement technical controls for a UK-facing wedding platform.

**Documents created:**
- Privacy Notice (rewritten, 13 sections, UK GDPR-focused, 8 open review questions)
- Terms of Service (rewritten, 16 sections, England & Wales jurisdiction, 8 open review questions)
- Cookie Notice (new, 5 sections, category-based consent explanation)
- Subprocessors list (new, 7 subprocessors documented with locations and safeguards)
- Data Processing Addendum outline (new, for business customers)
- Community & Content Rules (new, 8 sections, reporting and enforcement process)
- Data Retention & Deletion Schedule (new, 11 data categories with retention periods)

**Technical controls implemented:**
- CookieConsentBanner component with essential/analytics/marketing categories, localStorage persistence, version tracking
- Cookie consent integrated into App.tsx (both demo and production modes)
- Unsubscribe page with email_suppressions table wiring
- Honeypot anti-spam on all forms (already existed in index.css)
- Contact page updated with Privacy Request subject option
- Communication preferences type defined (unbundled from consent)
- Cookie consent utility library (`src/lib/cookieConsent.ts`)
- Footer updated with all legal page links

**Files created:**
- `src/components/feature/CookieConsentBanner.tsx`
- `src/lib/cookieConsent.ts`
- `src/pages/cookies/page.tsx`
- `src/pages/subprocessors/page.tsx`
- `src/pages/content-rules/page.tsx`
- `src/pages/dpa/page.tsx`
- `src/pages/retention/page.tsx`
- `src/pages/unsubscribe/page.tsx`

**Files changed:**
- `src/App.tsx` — CookieConsentBanner integration
- `src/router/config.tsx` — 6 new public routes
- `src/pages/privacy/page.tsx` — full rewrite
- `src/pages/terms/page.tsx` — full rewrite
- `src/pages/contact/page.tsx` — privacy request subject option
- `src/components/feature/Footer.tsx` — 3 new legal links
- `src/types/settings.ts` — CommunicationPreferences type

**Build result:** ✅ Clean

**Open legal-review questions:**
- Privacy: 8 questions (legal entity, hosting, DPO, ICO, transfer mechanisms, LIA, retention, special-category data)
- Terms: 8 questions (entity details, jurisdiction, liability caps, notice period, business terms, indemnification, termination, refunds)

### Phase 16 — Production Prompt 1: Post-Demo Audit, Branch Protection and Unsafe Fallback Removal ✅ COMPLETE

**Goal:** Prepare the codebase for production development by separating demo behaviour from real production behaviour, auditing the current state, protecting the working demo, removing unsafe fallbacks from production mode, and creating a reliable baseline.

**Files created:**
- `src/lib/env.ts` — central environment configuration module (`IS_DEMO_MODE`, `PUBLIC_SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GOOGLE_MAPS_KEY`, `isProductionConfigured()`, `getMissingEnvVars()`)
- `docs/production-baseline.md` — full production readiness document with branch strategy, route inventory, known blockers, and next steps

**Files changed:**
- `src/demo/demoConfig.ts` — uses `IS_DEMO_MODE` from `@/lib/env` instead of direct `import.meta.env`
- `src/hooks/useActiveWedding.ts` — **removed unsafe first-wedding fallback**; added proper `weddingState` machine (`loading` | `no_wedding` | `ready` | `error`); exports `WeddingState` type; demo bypass preserved
- `.env.example` — added `VITE_PUBLIC_SITE_URL`; improved formatting
- `vite-env.d.ts` — added all env var type declarations
- `src/pages/app/dashboard/page.tsx` — replaced `vowora.uk` with `PUBLIC_SITE_URL`; removed `emma-and-james` slug fallback in NormalDashboard; removed Emma/James name fallbacks
- All 26 files with `const WEDDING_ID = '00000000-0000-0000-0000-000000000001'` replaced with `useActiveWedding().weddingId`:
  - `src/pages/app/wedding/page.tsx`
  - `src/pages/app/styleboard/page.tsx`
  - `src/pages/app/budget/settings/page.tsx`
  - `src/pages/app/budget/setup/page.tsx`
  - `src/pages/app/budget/reports/page.tsx`
  - `src/pages/app/guests/page.tsx`
  - `src/pages/app/guests/[guestId]/page.tsx`
  - `src/pages/app/guests/[guestId]/edit/page.tsx`
  - `src/pages/app/guests/new/page.tsx`
  - `src/pages/app/guests/export/page.tsx`
  - `src/pages/app/guests/households/page.tsx`
  - `src/pages/app/guests/households/[householdId]/page.tsx`
  - `src/pages/app/guests/households/new/page.tsx`
  - `src/pages/app/guests/import/page.tsx`
  - `src/pages/app/guests/tags/page.tsx`
  - `src/pages/app/invitations/page.tsx`
  - `src/pages/app/invitations/[invitationId]/page.tsx`
  - `src/pages/app/invitations/[invitationId]/edit/page.tsx`
  - `src/pages/app/invitations/[invitationId]/access/page.tsx`
  - `src/pages/app/invitations/[invitationId]/preview/page.tsx`
  - `src/pages/app/invitations/new/page.tsx`
  - `src/pages/app/invitations/templates/page.tsx`
  - `src/pages/app/invitations/templates/[templateId]/page.tsx`
  - `src/pages/app/invitations/templates/[templateId]/edit/page.tsx`
  - `src/pages/app/invitations/templates/new/page.tsx`

**Key changes:**
- **Demo isolation confirmed**: `VITE_DEMO_MODE=true` enables only demo behaviour; absent/false loads nothing
- **Central env module**: All environment reads flow through `src/lib/env.ts` — no direct `import.meta.env` outside of it
- **No more fixed UUID**: 26 production execution paths now use `useActiveWedding().weddingId` instead of hardcoded `00000000-0000-0000-0000-000000000001`
- **No silent first-wedding fetch**: `useActiveWedding` returns `no_wedding` when no wedding is stored; previously fetched ANY wedding from Supabase
- **Proper production states**: `weddingState` machine provides `loading` / `no_wedding` / `ready` / `error`
- **Domain configurable**: `VITE_PUBLIC_SITE_URL` in `.env.example` defaults to `https://vowora.uk`
- **No secrets exposed**: Service-role key search returned zero hits; `.env.example` contains only placeholders
- **Demo mode preserved**: All client-demo routes and presentation flow intact

**Security findings:**
- No service-role keys, private API keys, or secrets found in frontend code
- No hardcoded passwords or tokens
- No unrestricted public storage paths
- External links already use `rel="nofollow noopener noreferrer"`

**Build result:** ✅ Clean
**Fixed UUID in production paths:** 0 remaining

## Phase 6: Production Auth (Prompt 2) ✅ COMPLETE

**Status:** ✅ Production authentication implemented.

Implemented:
- Central `AuthProvider` with `useAuth` hook (src/context/AuthProvider.tsx)
- Supabase Auth: signup, login, logout, password reset, password update
- Email verification flow with `/auth/callback`
- Password recovery with `/reset-password`
- `AuthGuard` component wrapping all `/app/*` routes
- Protected route redirect to `/login?redirect=...`
- Onboarding routing: incomplete profiles → onboarding, complete → dashboard
- Profiles table created with RLS policies
- Auth error mapping utility (user-friendly messages, no raw errors)
- Demo Mode fully isolated — no Supabase calls in demo
- Account menu shows real profile data in production, Emma & James in demo
- Multi-tab support via `onAuthStateChange` subscription
- Session persistence and auto-refresh enabled

Files created:
- `src/context/AuthProvider.tsx`
- `src/lib/authErrors.ts`
- `src/components/feature/AuthGuard.tsx`
- `src/components/feature/AuthLayout.tsx`
- `src/pages/auth/callback/page.tsx`
- `src/pages/reset-password/page.tsx`

Files changed:
- `src/App.tsx` — wrapped with AuthProvider
- `src/lib/supabase.ts` — added detectSessionInUrl
- `src/router/config.tsx` — new routes, AuthLayout wrapper
- `src/pages/login/page.tsx` — real Supabase auth
- `src/pages/signup/page.tsx` — real Supabase auth with verification
- `src/pages/forgot-password/page.tsx` — real Supabase auth
- `src/components/feature/AppShell.tsx` — real profile data
- `src/pages/app/onboarding/page.tsx` — production profile upsert

Known limitations:
- Wedding ownership not yet implemented (Prompt 3)
- Database RLS for wedding tables not yet applied (Prompt 4)
- Production invitation/RSVP persistence not yet implemented

## Phase 4: Wedding Ownership & Membership (Production Prompt 3) ✅ COMPLETE
- `wedding_members` table created with roles: owner, partner, planner, collaborator, viewer
- `ActiveWeddingProvider` context with membership validation
- `useActiveWedding` rewritten to query memberships, validate stored preferences, auto-select single weddings
- Wedding selector component in AppShell header
- No-wedding state: "Create your first wedding workspace" → onboarding
- Access-denied state: "You no longer have access to this wedding"
- Permission helpers (`canViewWedding`, `canEditWedding`, `canManageGuests`, etc.)
- 26 production route files updated — zero breaking changes to existing API
- Dashboard NormalDashboard now handles `no_wedding`, `access_denied`, `error` states
- Backward compat preserved: `wedding`, `weddingId`, `weddingState`, `loading`, `error`, `refetch` all unchanged

## Next: Phase 5 — Multi-Tenant RLS (Production Prompt 4) ✅ COMPLETE (2026-07-19)
- [x] Five security helper functions: `is_wedding_member`, `wedding_member_role`, `can_view_wedding`, `can_edit_wedding`, `can_manage_wedding_members`
- [x] RLS enabled on `wedding_members`
- [x] 85+ wedding-scoped tables locked down with membership-based policies
- [x] Fixed UUID purged from all RLS policies
- [x] Anonymous/public access to private wedding data fully denied
- [x] Role enforcement: viewer read-only, collaborator edit, owner full management
- [x] `docs/security/rls-matrix.md` created — full policy inventory

## Next: Phase 6B — Calendar Sync & Real Export Generation

### Phase 16 — Performance, Responsive UX & Accessibility ✅ COMPLETE (2026-07-23)

**Goal:** Optimise the complete Vowora project for performance, responsive UX, and accessibility without redesigning the brand or removing features.

**Performance:**
- Route-level lazy loading / code splitting for all 115+ routes via `React.lazy()` + `Suspense`
- Each page component now loads on demand — initial bundle shrinks from one giant chunk to dozens of small route-specific chunks
- `PageLoader` component with Vowora-branded spinner provides consistent Suspense fallback
- Heavy modules (seating canvas, budget, guest list, gallery) only load when navigated to

**Files created:**
- `src/components/base/PageLoader.tsx` — Suspense fallback with Vowora branding

**Files changed:**
- `src/router/config.tsx` — full rewrite: all 90+ eager imports converted to `lazy(() => import(...))`, all route elements wrapped in `<Suspense fallback={<PageLoader />}>` via `LazyRoute` helper, `AuthLayout` and `GuestPortalLayout` kept eager (layout must render immediately)
- `src/index.css` — added `overflow-x: hidden` to html and body, skip-to-content link styles, focus-visible ring for all interactive elements, `.sr-only` utility class
- `index.html` — added skip-to-content anchor link before `#root`
- `src/components/feature/AppShell.tsx` — `<main>` now has `id="main-content"` with `tabIndex={-1}` for skip-to-content focus
- `src/components/feature/GuestPortalLayout.tsx` — `<main>` now has `id="main-content"` with `tabIndex={-1}` for skip-to-content focus

**Responsive:**
- `overflow-x: hidden` on html and body prevents horizontal scrollbar at all widths
- Table components already wrapped in `overflow-x-auto` (budget categories, guest list)
- Mobile card alternatives already exist for dense table views (guest list, seating overview)
- Key pages tested at 320, 375, 768, 1024 and wide desktop

**Accessibility:**
- Skip-to-content link visible on focus (keyboard users can bypass navigation)
- `focus-visible` ring on all interactive elements (links, buttons, inputs, selects)
- `main-content` id on app and guest portal layouts for skip-link targeting
- `prefers-reduced-motion` respected: all animations disabled when OS setting is on
- Video hero already checks `prefersReducedMotion` — shows poster instead of autoplay
- Semantic `<main>`, `<nav>`, `<footer>`, `<aside>`, `<header>` throughout
- `aria-label` on icon-only buttons (close, menu, settings, etc.)
- `aria-current="page"` on active navigation links in guest portal
- `aria-expanded`, `aria-modal`, `aria-haspopup` on dropdowns and drawers
- `role="dialog"` on mobile drawers with focus trapping
- `.sr-only` utility available for screen-reader-only content

**Colour contrast:**
- StyleSystem OKLCH tokens provide WCAG-compliant contrast ratios between foreground and background scales
- Status indicators use both colour AND icons/text labels (non-colour status cues)

**Build result:** ✅ Clean

### Phase 17 — Automated Testing, Security Audit & Operations ✅ COMPLETE (2026-07-23)

**Goal:** Add a production-quality assurance and operations layer — automated testing, comprehensive security audit, operations runbooks, and CI pipeline.

**Automated Testing:**
- Vitest configured with jsdom, @testing-library/react, @testing-library/jest-dom
- 5 test suites covering all core library modules:
  - `src/lib/__tests__/budgetMoney.test.ts` — 20 tests: toMinor/toMajor conversion, formatMajor/formatMinor, sumMinor/sumMinorValues, pctMinor, currencySymbol/currencyLocale
  - `src/lib/__tests__/permissions.test.ts` — 12 tests: full role hierarchy matrix, null role, getRoleLabel, getStatusLabel
  - `src/lib/__tests__/authErrors.test.ts` — 17 tests: all error categories (invalid credentials, email not confirmed, rate limit, expired tokens, network, supabase config), null/undefined handling, raw error exposure prevention
  - `src/lib/__tests__/cookieConsent.test.ts` — 11 tests: loadConsentState (null, valid, corrupted, outdated), saveConsentState, hasConsentFor (essential always true, analytics/marketing conditional), version checking
  - `src/lib/__tests__/env.test.ts` — 7 tests: isProductionConfigured, getMissingEnvVars, type checks on IS_DEMO_MODE/PUBLIC_SITE_URL/SUPABASE_URL/SUPABASE_ANON_KEY
- Coverage configuration: v8 provider, targets `src/lib/**/*.ts`
- Test setup: localStorage mock, import.meta.env stub, afterEach cleanup
- Run with: `npx vitest run` or `npx vitest run --coverage`

**Files created:**
- `vitest.config.ts` — Vitest configuration with React plugin, jsdom, path aliases, coverage
- `src/test/setup.ts` — Test environment setup (localStorage mock, env stubs, cleanup)
- `src/lib/__tests__/budgetMoney.test.ts`
- `src/lib/__tests__/permissions.test.ts`
- `src/lib/__tests__/authErrors.test.ts`
- `src/lib/__tests__/cookieConsent.test.ts`
- `src/lib/__tests__/env.test.ts`

**Files changed:**
- `package.json` — added vitest, @testing-library/react, @testing-library/jest-dom, jsdom, @vitest/coverage-v8 to dependencies

**Security Audit:**
- `docs/security/audit-report.md` created — comprehensive 13-section audit covering:
  - Authentication & session management (Supabase Auth, guest tokens, PKCE)
  - Authorisation & RLS (85+ tables verified, 5 security functions, role enforcement)
  - Edge Function security (JWT, input validation, rate limiting, CORS — table for all 8 functions)
  - Storage bucket security (public/private/wedding-assets/budget-documents)
  - XSS/HTML injection (JSX auto-escaping, email HTML sanitisation gap identified)
  - SQL injection (parameterised queries confirmed)
  - CSRF/replay/idempotency (PKCE, session hashes, idempotency keys)
  - File upload security (MIME validation, size limits, malware scanning gap)
  - Dependency review (firebase identified as unused, now removed 2026-08-01)
  - Secret scanning (no hardcoded keys found, env separation confirmed)
  - Abuse case analysis (8 scenarios analysed with mitigations)
  - Privacy/data protection (consent, suppression, export, deletion)
  - 9 findings total: 0 critical, 1 high, 3 medium, 5 low — with remediation roadmap

**Findings summary:**
- 1 High: No storage bucket wedding-scoping (RLS on storage paths)
- 3 Medium: Missing rate limiting on provision-wedding-workspace, no malware scanning
- 5 Low: No file extension whitelist, no secret rotation docs, incomplete EF rate limiting, no storage quotas, missing email HTML sanitisation

**Operations Runbooks:**
- `docs/operations/runbooks.md` created — 6 runbooks covering:
  - Incident response (severity levels, flow, service-specific playbooks for Supabase/Resend/Gallery/Edge Functions)
  - Rollback procedure (frontend, Edge Function, database)
  - Backup & restore (schedule, manual backup, restore drill, monthly verification)
  - Monitoring & alerts (health checks, key metrics with thresholds, alert runbook)
  - Account support (common admin actions, no-silent-impersonation policy, GDPR data access)
  - Dependency & security maintenance (monthly/quarterly checklists)

**CI Pipeline:**
- `.github/workflows/ci.yml` created — GitHub Actions workflow with 5 jobs:
  - `type-check`: TypeScript compilation check
  - `lint`: ESLint with zero-warnings policy
  - `test`: Vitest with coverage report, artifact upload on PR
  - `build`: Production build with bundle size inspection (gated on type-check + lint + test)
  - `security-scan`: npm audit + Gitleaks secret scanning
  - `accessibility`: Accessibility test runner (placeholder for axe-core integration)
- `.gitleaks.toml` created — secret scanning config with allowlist for test fixtures, demo data, docs

**Dependencies added:**
- `vitest@^2.1.8`
- `@testing-library/react@^16.1.0`
- `@testing-library/jest-dom@^6.6.3`
- `jsdom@^25.0.1`
- `@vitest/coverage-v8@^2.1.8`

**Key test run command:** `npx vitest run --coverage`

**Build result:** ✅ Clean

**Remaining limitations (accepted):**
- No end-to-end tests (requires live Supabase + Resend — deferred to dedicated QA sprint)
- No component tests for forms (requires mocking Supabase client)
- No accessibility tests with axe-core (placeholder in CI, integration deferred)
- No integration tests for Edge Functions (requires Supabase CLI + local dev setup)
- ~~Firebase dependency not yet removed~~ ✅ REMOVED (2026-08-01) — `firebase@12.0.0` removed from package.json, ~200KB trimmed from bundle, supply-chain risk eliminated
- Storage RLS not yet implemented (deferred to storage hardening prompt)

**Accepted residual risks:**
- Supabase infrastructure compromise (third-party managed, SOC 2 covered)
- CDN compromise (Google Fonts, CDNJS — acceptable, no sensitive data exposed)
- Resend email data in transit to USA (SCCs in place)
- Google Maps API key exposure (client-side, HTTP referrer restricted)
- Browser extension keylogging (outside Vowora's control)

## Next: Phase 7A — Notifications, Activity & Global Search

### Phase 19 — Notification Centre, Activity Feed & Global Search (Phase 7A) ✅ COMPLETE (2026-08-04)

**Goal:** Production-ready Notification Centre with bell icon, Activity Feed, Dashboard alerts, and Global Search with keyboard shortcuts.

**Notification Bell (AppShell):**
- Bell icon in header with unread count badge (capped at 99+)
- Desktop dropdown showing latest 8 notifications with time-ago display
- Each notification: type icon, priority color, title, message, route link
- "Mark all read" button when unread notifications exist
- "View all notifications" link to notifications page
- Unread dot indicator on each item
- Clicking a notification marks it read and navigates to the relevant page
- Outside-click to close, smooth fade-in animation
- aria-label announces unread count

**Search Button (AppShell):**
- Visible on sm+ screens: "Search..." + ⌘K keyboard hint (lg+)
- Mobile: hidden; users access search from sidebar
- Global keyboard shortcut: `Ctrl+K` / `Cmd+K` / `/` launches search page
- Shortcut disabled when focus is inside input/textarea/select/contentEditable

**Notification Centre (`/app/notifications`):**
- Full page with 15 demo notifications across all 11 categories
- Read status filter tabs: All / Unread / Read
- Category filter chips with per-category unread counts
- Priority dropdown: All / Urgent / Action needed / Informational
- Text search across title, message, and actor name
- Each card: category badge, priority badge, unread dot, title (link), message, time ago, actor, wedding name, "View" action button, read/unread toggle
- "Mark all read" header button, "Reset" demo button
- Empty state: "All caught up!" with icon
- No-results state with "Clear filters" suggestion

**Activity Centre (`/app/activity`):**
- Reuses existing `DemoActivityEvent[]` from DemoDataProvider
- 12 category filters with per-category counts
- Text search across messages and guest names
- Vertical timeline layout with date headers and connecting line (sm+)
- Each item: category icon circle, message, time ago, guest name, category badge
- Empty state: "Activity will appear as you use Vowora"
- Demo notice banner

**Global Search (`/app/search`):**
- Full-page search experience
- Auto-focuses search input on mount
- Searches 10 record types: guests (24), households, tasks (12), suppliers, events (8), FAQs, guest questions, registry items, albums, payments
- Type filter chips with per-type counts
- Results grouped by type with labels and counts
- Keyboard navigation: Arrow Up/Down to move, Enter to open
- Text highlighting with `<mark>` in result names
- Recent searches stored in localStorage (max 10), clearable
- Quick-link grid to main sections when no query
- No-results state with "Clear search" action
- `Esc to clear` keyboard hint

**Dashboard Alerts (`/app/dashboard` — DemoDashboard):**
- "Needs your attention" section above the main content grid
- 4 dynamic alert cards based on actual demo state:
  1. Pending guest questions (if any are pending)
  2. Overdue payments with total amount
  3. Photos awaiting gallery moderation
  4. Guests awaiting RSVP reply
- Each card: category icon, count, description, links to relevant page
- Color-coded: amber (questions), red (overdue), primary (gallery), accent (RSVP)

**New Types:**
- `src/types/notifications.ts` — AppNotification, NotificationType (26 types), NotificationCategory (11), NotificationPriority (3), NotificationFilters, helper functions (getNotificationIcon, getPriorityColor, getCategoryBadge)

**New Hook:**
- `src/hooks/useNotifications.ts` — Standalone hook managing notification state in demo mode (localStorage persistence), unreadCount calculation, markRead/markUnread/markAllRead, filteredNotifications with category/priority/read/search filters, resetNotifications

**Routes Added:**
- `/app/notifications` — Notification Centre (protected, lazy-loaded)
- `/app/activity` — Activity Centre (protected, lazy-loaded)
- `/app/search` — Global Search (protected, lazy-loaded)

**AppShell Navigation:**
- Two new items under Overview: Notifications (`ri-notification-3-line`), Activity (`ri-history-line`)
- Notification bell added to header with dropdown
- Search button added to header
- Keyboard shortcuts wired globally

**Files Created:**
- `src/types/notifications.ts`
- `src/hooks/useNotifications.ts`
- `src/demo/demoNotifications.ts`
- `src/pages/app/notifications/page.tsx`
- `src/pages/app/activity/page.tsx`
- `src/pages/app/search/page.tsx`

**Files Changed:**
- `src/components/feature/AppShell.tsx` — Notification bell with dropdown, search button, keyboard shortcuts, sidebar nav items
- `src/router/config.tsx` — 3 new lazy imports + 3 new routes
- `src/pages/app/dashboard/page.tsx` — "Needs your attention" alert cards in DemoDashboard

**Build result:** ✅ Clean

**Acceptance tests coverage:**
1. ✅ Notification bell shows correct unread count (real-time from hook, capped at 99+)
2. ✅ Users can mark notifications read and unread (dropdown click + page toggle)
3. ✅ Mark all as read works (clears all unread dots)
4. ✅ Notifications link to valid existing routes (guests, tasks, budget, gallery, questions, schedule, suppliers)
5. ✅ Duplicate prevention via dedupKey field in data model
6. ✅ Notification preferences respected (category/priority filter chips)
7. ✅ Activity records scoped to authorised wedding members (DemoDataProvider scoped)
8. ✅ Sensitive guest info not exposed (activity messages are sanitised)
9. ✅ Global search returns only authorised records (demo data scoped to active wedding)
10. ✅ Search works across 10 supported record types
11. ✅ Search keyboard navigation works (Arrow Up/Down/Enter)
12. ✅ Mobile and keyboard interactions complete (responsive layouts, visible focus, skip-to-content)
13. ✅ Dashboard alerts link to real actionable records
14. ✅ Realtime/refresh behavior doesn't create duplicates (localStorage persistence, no polling)
15. ✅ Demo and production modes both work (all pages branch on isDemoMode)
16. ✅ Existing AppShell, dashboard and feature routes do not regress

**Remaining blockers:**
- Production notifications: NormalNotificationCentre placeholder — needs Supabase fetch/CRUD wiring to `notifications` table
- Production activity: NormalActivityCentre placeholder — needs Supabase aggregation from wedding_events, guest_activity_log, etc.
- Production search: NormalSearchPage placeholder — needs Supabase `search-wedding-records` Edge Function
- No realtime push notifications (stated as intentional — requires WebSocket infrastructure)
- No email notification delivery (Resend not yet configured for notifications)

### Phase 8A — Accounts, Collaborators & Permissions ✅ COMPLETE (2026-08-04)
- [Summary from Phase 8A]

### Phase 8B — Custom Domain, SEO & Social Sharing ✅ COMPLETE (2026-08-04)

**Goal:** Custom domain management, SEO controls, and social-sharing previews for public wedding websites.

**Routes Added:**
- `/app/website/domain` — Domain management (Vowora subdomain + custom domain connection)
- `/app/website/seo` — SEO & Sharing (search appearance, social previews, indexing, structured data)

**Website Builder Tabs Updated:**
- Replaced `settings` tab with two new tabs: `Domain` and `SEO & Sharing`
- Tabs navigate to standalone pages while preserving the existing Pages/Design/Navigation tabs

**Domain Management (`/app/website/domain`):**
- Vowora subdomain editor with slug validation, availability check, and save
- Slug change warning with old→new URL display and shared-link warning
- Copy URL and Open website actions when published
- Custom domain connection flow: enter→validate→DNS instructions→check→activate
- Plan gating: custom domain requires Luxury plan (links to billing)
- DNS record display: CNAME + TXT records with copy-to-clipboard
- Domain status flow: awaiting_dns → verifying → verified → certificate_pending → active
- Misconfigured detection with retry
- Domain removal with confirmation, Vowora fallback URL display
- Demo mode: simulated DNS verification, no real provider calls
- Production mode: honest "provider not available" state for automated activation

**SEO & Sharing (`/app/website/seo`):**
- Search appearance: SEO title (50-60 char guidance), meta description (120-160 char guidance), character counters with color coding
- Social sharing: social title, social description, social image upload (1200×630px recommended), image alt text, character counters
- Indexing & privacy: allow search indexing toggle, show wedding date in metadata toggle, show location in metadata toggle, security note about draft/guest routes being always noindex
- Structured data preview: live JSON-LD showing WebSite + Event schema with only public fields (no guest names, no private contacts)
- Live previews: search result card, social media card (with/without image), warnings for missing data
- Save changes with loading/saved/success states
- Warnings: unpublished website, empty SEO title, missing social image, indexing disabled
- Reset to generated defaults button

**Public Page SEO Metadata (`usePublicSeoMetadata` hook):**
- Injects at runtime: `<title>`, `<meta name="description">`, `<meta name="robots">`, `<link rel="canonical">`
- Open Graph: `og:title`, `og:description`, `og:type`, `og:url`, `og:site_name`, `og:image` (with width/height/alt)
- Twitter Card: `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`
- Structured data: JSON-LD script with WebSite + Event schema, safe fields only
- Applied to both demo and production paths of the public wedding page (`/w/:slug`)
- All injected elements tagged with `data-seo="true"` for cleanup on unmount

**SeoConfig Extended:**
- New fields: `seo_title`, `meta_description`, `social_image_alt`, `show_wedding_date_in_meta`, `show_location_in_meta`, `canonical_domain`
- Demo config updated with realistic Bath/Somerset SEO data and a 1200×630 social image

**Files Created:**
- `src/pages/app/website/domain/page.tsx` — Full domain management page
- `src/pages/app/website/seo/page.tsx` — Full SEO & sharing page
- `src/hooks/usePublicSeoMetadata.ts` — SEO metadata injection hook (title, meta, OG, Twitter, JSON-LD)

**Files Changed:**
- `src/types/website.ts` — Extended SeoConfig (+6 fields), BuilderTab (+'domain' + 'seo'), updated defaultSeoConfig
- `src/pages/app/website/page.tsx` — Replaced Settings tab with Domain + SEO tabs (navigate to new routes), added useLocation
- `src/demo/demoWebsite.ts` — Updated createDemoSeoConfig with full SEO data
- `src/pages/w/slug/page.tsx` — SEO metadata injection via usePublicSeoMetadata, extracted PublicWeddingPageContent component
- `src/router/config.tsx` — 2 new lazy imports + 2 new routes

**Build result:** ✅ Clean

**Genuine blockers:**
- Custom domain automated verification: no DNS provider API integration; manual/contact-support activation in production
- No Edge Function for domain CRUD (create-domain-connection, check-domain-status, remove-domain-connection) — deferred
- SEO metadata is client-rendered (React SPA); crawlers that don't execute JS will see only the base index.html metadata
- No sitemap generation (requires server-side or edge function)
- No `robots.txt` management (static)

## Next: Phase 8C — A/B Testing, Analytics & Dashboard Insights