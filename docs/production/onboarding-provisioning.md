# Onboarding-to-Wedding Provisioning

> Production Prompt 5 — Wedora

## Current Flow

### Before This Prompt
1. User signs up → Supabase Auth (`signUp` in AuthProvider)
2. Auth callback verifies email → session established
3. Profile created/loaded
4. AuthGuard checks `profile.onboarding_completed`
5. If incomplete → routes to `/app/onboarding`
6. Onboarding form collects: couple names, wedding date, location, venues, guest estimate, priorities
7. **On "Finish Setup"**: Only `profiles` got upserted with `onboarding_completed = true`
8. No wedding record, no membership, no venues, no events — just a profile flag
9. ActiveWeddingProvider found no memberships → `no_wedding` state
10. Dashboard showed "Create your first wedding workspace" prompt

### After This Prompt
1. Steps 1-6 remain the same
2. **On "Finish Setup"**: Calls `provision-wedding-workspace` Edge Function
3. Edge Function creates atomically:
   - Profile (upsert with couple details)
   - Wedding record
   - Owner membership
   - Venues (ceremony + reception)
   - Events (ceremony, reception, evening)
   - Budget categories (10 default)
   - Guest portal settings (all disabled)
   - Planning priorities (in `wedding_elements`)
   - Marks `onboarding_completed = true`
4. Client refreshes profile + ActiveWeddingProvider
5. Dashboard loads with real wedding data

## Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `profiles` | UPSERT | Updates first_name, last_name, display_name, onboarding_completed |
| `weddings` | INSERT | partner_one_name, partner_two_name, title, wedding_date, location, estimated_guest_count, status='planning', slug, created_by, timezone='Europe/London' |
| `wedding_members` | INSERT | role='owner', status='active', user_id from JWT |
| `wedding_venues` | INSERT | ceremony + reception venues |
| `wedding_events` | INSERT | Ceremony, Reception, Evening Celebration (status='draft') |
| `budget_categories` | INSERT | 10 default categories with suggested percentages |
| `guest_portal_settings` | INSERT | All features disabled by default |
| `wedding_elements` | INSERT | Planning priorities stored as section='planning_priorities' |

## Provisioning Method

**Edge Function**: `supabase/functions/v1/provision-wedding-workspace`

- JWT validated via `supabase.auth.getUser(token)` 
- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS during creation
- All operations in a single request → partial failure rolls back
- Returns `{ success, wedding_id, summary }`

## Idempotency

- Before creating anything, checks if user already has an active `owner` membership
- If found → returns `already_provisioned: true` with existing wedding data
- `provisioning_request_id` generated client-side, sent with request (for logging)
- Single wedding per user enforced by owner membership check

## Slug Generation

1. Lowercase display name, strip special chars, replace spaces with hyphens
2. Check against reserved slugs: `app`, `admin`, `api`, `auth`, `guest`, `login`, `signup`, `support`, `wedora`, etc.
3. Check against existing slugs in database
4. If conflict → append `-2`, `-3`, etc.
5. Max length 50 characters
6. Wedding website remains **unpublished** (no public access)

## Security

- Client cannot create owner membership — only Edge Function with service key
- Client cannot set `user_id` or `created_by` — derived from JWT
- Client cannot override slug — generated server-side
- All payload fields validated: types, lengths, ranges
- No sensitive data in response — only safe wedding summary
- Anonymous calls fail with 401

## Deferred Work

- **Tasks/Todos**: No task table exists. When a task module is created, starter tasks should be added to the provisioning flow.
- **Partner email/invitation**: Not implemented. Partner is noted in `partner_two_name` only.
- **Invitation template defaults**: Table exists but no default template created.
- **Gallery settings**: Schema exists but no default record created (created on-demand by UI).
- **Registry defaults**: Schema exists but no default record created (created on-demand by UI).
- **Travel defaults**: Schema exists but no default record created.
- **Public site publishing**: Wedding created with `status='planning'`, slug assigned but unpublished.

## Demo Mode

Unchanged. Demo Mode onboarding:
- Uses local demo data
- Calls `demoData.markOnboardingComplete()`
- Sets `localStorage` demo session
- Never calls the provisioning Edge Function
- Never creates Supabase records