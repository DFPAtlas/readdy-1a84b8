# Vowora Guest Management — Production Persistence

## Status: Prompt 6 Complete

## Tables Used

| Table | Ownership Path | RLS | Notes |
|-------|---------------|-----|-------|
| `guests` | `wedding_id` FK → `weddings.id` | ✅ Member-based | `is_wedding_member(wedding_id)` for SELECT/UPDATE, `can_edit_wedding(wedding_id)` for INSERT/DELETE |
| `guest_households` | `wedding_id` FK → `weddings.id` | ✅ Member-based | Same pattern as guests |
| `guest_tags` | `wedding_id` FK → `weddings.id` | ✅ Member-based | Tags scoped per wedding |
| `guest_tag_assignments` | `wedding_id` FK → `weddings.id` | ✅ Member-based | Many-to-many junction |
| `guest_activity_log` | `wedding_id` FK → `weddings.id` | ✅ Member-based | Activity recording |
| `guest_import_jobs` | `wedding_id` FK → `weddings.id` | ✅ Member-based | Import audit trail |
| `guest_relationships` | `wedding_id` FK → `weddings.id` | ✅ Member-based | Guest-to-guest relationships |

## Schema Summary

### Guests (`guests`)
- **Primary key**: `id` (UUID)
- **Wedding FK**: `wedding_id`
- **Key fields**: `full_name`, `last_name`, `preferred_name`, `email`, `mobile_phone`, `guest_type`, `invitation_group`
- **Status**: `active` / `archived` (with `archived_at` timestamp)
- **RSVP**: `rsvp_status` (accepted/pending/declined)
- **Plus-one**: `plus_one_status`, `named_plus_one_guest_id`
- **Requirements**: `dietary_requirements`, `allergy_notes`, `accessibility_notes`, `mobility_transport_notes`
- **Household**: `household_id` → `guest_households.id`
- **Audit**: `created_by`, `updated_by`, `created_at`, `updated_at`
- **Private**: `private_notes` (couple-side only)

### Households (`guest_households`)
- **Primary key**: `id` (UUID)
- **Wedding FK**: `wedding_id`
- **Key fields**: `display_name`, `formal_invitation_name`, `primary_guest_id`, `shared_email`, `shared_phone`
- **Status**: `active` / `archived`

### Tags (`guest_tags`)
- **Primary key**: `id` (UUID)
- **Wedding FK**: `wedding_id`
- **Key fields**: `name`, `colour_key` (primary/accent/secondary)
- **No archived_at** — tags are deleted directly (assignments cascade)

### Tag Assignments (`guest_tag_assignments`)
- **Primary key**: `id` (UUID)
- **Wedding FK**: `wedding_id`
- **Guest FK**: `guest_id`
- **Tag FK**: `tag_id`
- **Unique constraint**: `(guest_id, tag_id)`

## Production Query Layer

### `src/hooks/useGuestService.ts`

Centralized hook providing all production guest operations:

| Operation | Function | Notes |
|-----------|----------|-------|
| List guests | `listGuests(filters)` | Paginated, filtered, sorted |
| Get guest | `getGuest(id)` | Single guest by ID (wedding-scoped) |
| Create guest | `createGuest(payload)` | Inserts with active wedding ID |
| Update guest | `updateGuest(id, payload)` | Wedding-scoped update |
| Archive | `archiveGuest(ids)` | Sets status=archived, archived_at=now |
| Restore | `restoreGuest(ids)` | Sets status=active, clears archived_at |
| Duplicate check | `checkDuplicates(payload)` | Email/phone/name matching |
| List households | `listHouseholds(status?)` | Filtered by status |
| Create household | `createHousehold(payload)` | Wedding-scoped |
| Update household | `updateHousehold(id, payload)` | Wedding-scoped |
| Archive household | `archiveHousehold(id)` | Sets status=archived |
| List tags | `listTags()` | All tags for wedding |
| Create tag | `createTag(payload)` | Wedding-scoped |
| Update tag | `updateTag(id, payload)` | Wedding-scoped |
| Delete tag | `deleteTag(id)` | Deletes assignments first (cascade) |
| Assign tag | `assignTag(guestId, tagId)` | Upserts assignment |
| Remove tag | `removeTag(guestId, tagId)` | Deletes assignment |
| Bulk assign | `bulkAssignTag(guestIds, tagId)` | Batch upsert |
| Get guest tags | `getGuestTags(guestId)` | Tags for one guest |
| Record activity | `recordActivity(action, summary)` | Best-effort activity logging |
| Bulk household | `bulkMoveHousehold(guestIds, hhId)` | Batch move |
| Bulk group | `bulkUpdateGroup(guestIds, group)` | Batch group update |
| Stats | `getStats()` | Aggregated guest statistics |
| Import | `importGuests(rows, defaultGroup?)` | Batch import with validation |
| Export data | `getExportData(includeArchived, selectedIds?)` | Full data for CSV export |
| Export count | `getExportCount(includeArchived, selectedIds?)` | Count for export preview |

## Import/Export

### CSV Import
- Step 1: Upload CSV (max 5MB, .csv only)
- Step 2: Column mapping (auto-detection for common headers)
- Step 3: Validation preview (valid/warning/error rows)
- Step 4: Results (imported/skipped/failed counts with errors)
- **Batch ID**: UUID generated per import for idempotency tracking
- **Activity logging**: Import result recorded in activity log
- **Import job**: Result saved to `guest_import_jobs`

### CSV Export
- Presets: All guests, Contact list, Invitation planning, Dietary & accessibility
- **Formula injection protection**: Values starting with `=`, `+`, `-`, `@` prefixed with `'`
- **BOM**: UTF-8 BOM added for Excel compatibility
- **Activity logging**: Export recorded in activity log
- **No internal IDs**: No Supabase UUIDs or token hashes in exports

## Duplicate Detection

On guest creation, checks for:
1. Matching email
2. Matching phone
3. Matching full name + last name

Shows modal with matching guests. Actions: View existing, Create anyway, Cancel.

## Archive/Restore

- Archive sets `status='archived'`, `archived_at=now`
- Restore sets `status='active'`, `archived_at=null`
- Activity recorded for both operations
- Undo available for 5 seconds after archive
- No hard deletion — archive only

## Dashboard Integration

The production dashboard now shows real RSVP stats:
- **Attending**: Guests with `rsvp_status='accepted'`
- **Awaiting reply**: Guests with `rsvp_status='pending'` or null
- **Declined**: Guests with `rsvp_status='declined'`
- All stats from `useGuestService().getStats()`

## RLS Configuration

All guest-scoped tables use these helper functions from Prompt 4:
- `is_wedding_member(wedding_id)` — any active member
- `can_edit_wedding(wedding_id)` — collaborator+

### Policies
- **SELECT**: `is_wedding_member(wedding_id)` — any active member can read
- **INSERT**: `can_edit_wedding(wedding_id)` — edit-role members can create
- **UPDATE**: `is_wedding_member(wedding_id)` for read, `can_edit_wedding(wedding_id)` for write
- **DELETE**: `can_edit_wedding(wedding_id)` — edit-role members can delete

## Deferred Work

The following is explicitly NOT implemented in Prompt 6:
- **Real invitation sending** (Prompt 7)
- **RSVP token submission** (Prompt 7+)
- **Guest profile deep CRUD** (view/edit guest by ID — route exists, pages exist, basic Supabase queries work)
- **Plus-one linking/deep validation**
- **Seating integration with guests**
- **Email delivery for import confirmation**
- **Guest portal integration with member management**