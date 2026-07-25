# Wedora — Production Baseline

Date: 19 July 2026
Phase: Production Prompt 1 — Post-Demo Audit & Branch Protection

## Branch / Repository State

The project uses the Readdy.ai cloud environment. Git operations are managed through the Readdy interface.

### Recommended Branch Structure (for future)

- `main` — production-ready releases only
- `demo/client-preview` — stable client demonstration (current state)
- `develop` — production integration work
- `feature/*` — individual production workstreams

## Demo Mode

- **Activation**: Set `VITE_DEMO_MODE=true` in `.env`
- **Centralised in**: `src/lib/env.ts` (via `IS_DEMO_MODE`)
- **Demo config**: `src/demo/demoConfig.ts` uses `IS_DEMO_MODE`
- **Demo data provider**: `src/demo/DemoDataProvider.tsx`
- **Demo state storage**: `localStorage` key `wedora.demo.state.v1`
- **Normal mode**: `VITE_DEMO_MODE=false` or absent — no demo data loaded

## Build Commands

```bash
npm run dev        # Development server
npm run build      # TypeScript + Vite production build
npm run lint       # ESLint
```

## Environment Variables (names only, no values)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_DEMO_MODE` | No | Enable demo mode (`true`) |
| `VITE_PUBLIC_SITE_URL` | No | Canonical site URL (e.g. `https://wedora.uk`) |
| `VITE_PUBLIC_SUPABASE_URL` | Yes* | Supabase project URL |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | Yes* | Supabase anonymous key |
| `VITE_PUBLIC_GOOGLE_MAPS_KEY` | No | Google Maps API key |

*Required for production mode

## Routes Included in Client Demo

| Route | Status | Description |
|-------|--------|-------------|
| `/` | Demo-ready | Marketing homepage |
| `/demo-start` | Demo-ready | Demo launcher with 14-step journey |
| `/login` | Demo-ready | Login with demo entry button |
| `/signup` | Demo-ready | Signup page |
| `/app/onboarding` | Demo-ready | 5-step onboarding wizard |
| `/app/dashboard` | Demo-ready | Full dashboard with all cards |
| `/app/guests` | Demo-ready | Guest list with CRUD |
| `/app/guests/:guestId` | Demo-ready | Guest detail profile |
| `/app/guests/new` | Demo-ready | Add guest form |
| `/app/guests/:guestId/edit` | Demo-ready | Edit guest form |
| `/app/guests/households` | Demo-ready | Household management |
| `/app/guests/export` | Demo-ready | CSV guest export |
| `/app/guests/tags` | Demo-ready | Tag management |
| `/app/invitations` | Demo-ready | Invitation list |
| `/app/invitations/:id` | Demo-ready | Invitation detail |
| `/app/invitations/:id/preview` | Demo-ready | Invitation preview |
| `/app/invitations/responses` | Demo-ready | RSVP response overview |
| `/app/budget` | Demo-ready | Budget dashboard |
| `/app/budget/categories` | Demo-ready | Category management |
| `/app/budget/payments` | Demo-ready | Payment schedule |
| `/app/budget/suppliers` | Demo-ready | Supplier overview |
| `/app/seating` | Demo-ready | Seating overview |
| `/app/seating/plans/demo-plan` | Demo-ready | Seating workspace |
| `/app/travel` | Demo-ready | Travel concierge admin |
| `/app/gallery-control` | Demo-ready | Gallery management |
| `/live-wall/:slug` | Demo-ready | Live photo wall |
| `/w/emma-and-james` | Demo-only | Public wedding website |
| `/guest/demo-session` | Demo-only | Oliver Bennett's guest portal |
| `/guest/demo-session/rsvp` | Demo-only | Oliver's RSVP flow |
| `/guest/demo-session/travel` | Demo-only | Guest travel guide |

## Routes That Remain Unfinished (Production)

| Route | Status | Notes |
|-------|--------|-------|
| `/app/tasks` | Placeholder | Needs production persistence |
| `/app/suppliers` | Placeholder | Needs production persistence |
| `/app/updates` | Placeholder | Needs production persistence |
| `/app/settings` | Placeholder | Needs production persistence |
| `/app/wedding` | UI present | Has Supabase persistence but no demo wrapper |
| `/app/styleboard` | UI present | Has Supabase persistence but no demo wrapper |
| `/app/budget/settings` | UI present | Normal mode uses Supabase |
| `/app/budget/setup` | UI present | Normal mode uses Supabase |
| `/app/budget/reports` | UI present | Normal mode uses Supabase |
| `/app/invitations/templates` | UI present | Normal mode uses Supabase |
| `/app/seating/plans/:id/*` | Partial | Sub-pages need production persistence |
| `/guest/:accessId/*` | Partial | Production path needs Supabase token validation |

## Known Blockers

1. **No authenticated wedding ownership** — Production mode has no way to associate weddings with users. Currently falls back to `weddingState: 'no_wedding'` when Supabase has no stored wedding ID.
2. **No production guest token system** — Guest portal uses demo-session bypass; production requires secure token validation.
3. **No email delivery** — Invitations have UI but no Resend integration.
4. **No production RSVP** — RSVP flow works in demo but not in production.
5. **No payment processing** — Budget payments are demo-only.

## Unsafe Fallbacks Removed (Prompt 1)

- Fixed UUID `00000000-0000-0000-0000-000000000001` removed from all 26 production execution paths
- `useActiveWedding` no longer silently selects the first wedding from the database
- Dashboard no longer falls back to `emma-and-james` slug or `https://wedora.app` hardcoded URLs
- Production mode shows proper `no_wedding` state instead of demo data
- Public wedding page `/w/:slug` shows branded "not found" for unknown slugs
- Guest portal requires valid session token (only `demo-session` bypasses)
- `VITE_PUBLIC_SITE_URL` centralises the canonical site URL

## Remaining Fixed-ID References

Only the Supabase seed function (`supabase/functions/seed-demo-data/index.ts`) retains the UUID for seeding demo data into Supabase. This is a non-production, administrative Edge Function.

## RLS Enforcement (Prompt 4 — COMPLETE)

- Five helper functions: `is_wedding_member`, `wedding_member_role`, `can_view_wedding`, `can_edit_wedding`, `can_manage_wedding_members`
- 85+ wedding-scoped tables locked with membership-based policies
- Fixed UUID purged from all RLS policies
- Anonymous/public access to wedding data fully denied
- `wedding_members` RLS enabled (was the only table without it)
- All `qual: true` / `with_check: true` policies replaced with membership checks
- Full RLS matrix at `docs/security/rls-matrix.md`
- ⚠️ Guest portal token validation still deferred — Edge Function audit pending

## Onboarding Wedding Provisioning (Prompt 5 — COMPLETE)

- Edge Function: `supabase/functions/v1/provision-wedding-workspace`
- JWT-validated, atomic wedding workspace creation
- Creates: profile (upsert), wedding, owner membership, venues (2), events (3), budget categories (10), guest portal settings, planning priorities
- Idempotent: detects existing owner membership, returns existing wedding
- Unique slug generation with reserved-route checking
- Full documentation at `docs/production/onboarding-provisioning.md`

### Guest Management Persistence (Prompt 6 — COMPLETE)
- `src/hooks/useGuestService.ts`: Centralised production guest service hook
  - Full CRUD: list, get, create, update, archive, restore
  - Household CRUD: list, create, update, archive
  - Tag CRUD: list, create, update, delete
  - Tag assignments: assign, remove, bulk assign
  - Activity logging: create/archive/restore/import/export events
  - Duplicate detection: email, phone, name matching
  - Import: batch guest creation with validation
  - Export: CSV generation with formula injection protection
  - Stats: attending/awaiting/declined counts + dietary/allergy/accessibility
- Guests list page (`/app/guests`): fixed broken inner-join query, uses useGuestService
- Add guest page (`/app/guests/new`): duplicate detection modal, activity logging, tag assignments
- Tags page (`/app/guests/tags`): real CRUD with Supabase persistence
- Households page (`/app/guests/households`): bulk member query (N+1 fixed)
- Import page (`/app/guests/import`): batch UUID, activity logging, error reporting
- Export page (`/app/guests/export`): formula injection protection, activity logging
- Dashboard (`/app/dashboard`): real RSVP stats from production data
- RLS: guest tables have proper member-based policies (anon policies fixed)
- Full documentation at `docs/production/guest-management.md`

## Known Blockers (Updated)

1. **No real invitation delivery** — Invitations have UI but no Resend email sending
2. **No production RSVP token submission** — RSVP mutations blocked at RLS; token-based path needed
3. **No production guest token system** — Guest portal still uses demo-session bypass
4. **No task/supplier/update persistence** — Those modules have UI but no production data layer
5. **No storage policies** — Buckets exist (public/private) but no wedding-scoped storage RLS
6. **No payment processing** — Stripe not connected

## Next Production Prompt

Production Prompt 7 should implement real invitation delivery — sending actual invitation emails via Resend with secure guest access tokens.

### Wedding Ownership (Prompt 3 — COMPLETE)
- `wedding_members` table: id, wedding_id (FK), user_id, role, status, invited_by, invited_email, accepted_at
- Roles: owner, partner, planner, collaborator, viewer
- Statuses: invited, active, declined, revoked
- Unique active membership constraint: (wedding_id, user_id)
- Indexes on user_id, wedding_id, status, role
- `ActiveWeddingProvider` context: membership validation, wedding selection, localStorage preference re-validation
- Permission helpers: `getPermissions(role)` → `{ canViewWedding, canEditWedding, canManageGuests, ... }`
- Wedding selector in AppShell header (hidden when ≤1 wedding)
- No-wedding state routes to onboarding
- Access-denied state shows "You no longer have access to this wedding"
- ⚠️ RLS policies now enforced via Prompt 4