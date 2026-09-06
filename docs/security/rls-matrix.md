# Vowora RLS Matrix — Production Prompt 4

## Summary

Every wedding-scoped table now enforces membership-based Row Level Security. The fixed UUID `00000000-0000-0000-0000-000000000001` has been purged from all policies. Anonymous/public access to private wedding data is denied.

## Helper Functions

| Function | Returns | Logic |
|----------|---------|-------|
| `is_wedding_member(uuid)` | boolean | auth.uid() has active membership for wedding_id |
| `wedding_member_role(uuid)` | text | Active member's role (owner/partner/planner/collaborator/viewer) |
| `can_view_wedding(uuid)` | boolean | Any active member |
| `can_edit_wedding(uuid)` | boolean | Active member with role IN (owner, partner, planner, collaborator) |
| `can_manage_wedding_members(uuid)` | boolean | Active member with role = owner |

All functions use `auth.uid()` internally — no caller-supplied user ID accepted.

## Role Baseline

| Role | View | Edit | Guests | Invitations | Budget | Seating | Travel | Gallery | Members | Delete Wedding |
|------|------|------|--------|-------------|--------|---------|--------|---------|---------|---------------|
| owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| partner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| planner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| collaborator | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| viewer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Table Policy Matrix

### Wedding Core

| Table | RLS | Wedding FK | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|-----------|--------|--------|--------|--------|
| weddings | ✅ | id (self) | member | denied | edit-role | denied |
| wedding_members | ✅ | wedding_id | member | owner-only | owner-only | owner-only |
| wedding_venues | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| wedding_elements | ✅ | wedding_id | member | edit-role | edit-role | denied |
| wedding_schedule | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| wedding_styleboard | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| wedding_events | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| wedding_budgets | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| wedding_contacts | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| wedding_faqs | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| wedding_shuttles | ✅ | wedding_id | member | edit-role | edit-role | denied |
| wedding_local_places | ✅ | wedding_id | member | denied | denied | denied |
| wedding_event_audiences | ✅ | wedding_id | member | edit-role | edit-role | edit-role |

### Updates

| Table | RLS | Wedding FK | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|-----------|--------|--------|--------|--------|
| wedding_updates | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| wedding_update_attachments | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| wedding_update_audiences | ✅ | wedding_id | member | edit-role | edit-role | edit-role |

### Guests

| Table | RLS | Wedding FK | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|-----------|--------|--------|--------|--------|
| guests | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| guest_households | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| guest_tags | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| guest_tag_assignments | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| guest_relationships | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| guest_activity_log | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| guest_import_jobs | ✅ | wedding_id | member | edit-role | edit-role | edit-role |

### Invitations & RSVP

| Table | RLS | Wedding FK | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|-----------|--------|--------|--------|--------|
| invitations | ✅ | wedding_id | member | edit-role | edit-role | denied |
| invitation_templates | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| invitation_recipients | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| invitation_access_tokens | ✅ | wedding_id | member | edit-role | edit-role | denied |
| invitation_activity_log | ✅ | wedding_id | member | edit-role | edit-role | denied |
| invitation_access_activity | ✅ | wedding_id | member | member | denied | denied |
| rsvp_submissions | ✅ | wedding_id | member | denied | member | denied |
| rsvp_responses | ✅ | wedding_id | member | denied | member | denied |
| rsvp_custom_answers | ✅ | wedding_id | member | denied | member | denied |
| rsvp_event_responses | ✅ | wedding_id | member | denied | member | edit-role |
| rsvp_response_revisions | ✅ | wedding_id | member | denied | denied | denied |

### Budget

| Table | RLS | Wedding FK | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|-----------|--------|--------|--------|--------|
| budget_categories | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| budget_expenses | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| budget_payments | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| budget_scenarios | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| budget_activity_log | ✅ | wedding_id | member | edit-role | edit-role | edit-role |

### Seating

| Table | RLS | Wedding FK | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|-----------|--------|--------|--------|--------|
| seating_plans | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_tables | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_assignments | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_seats | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_zones | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_room_objects | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_background_assets | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_groups | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_group_members | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_rules | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_conflicts | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_plan_versions | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_assistant_proposals | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_proposal_assignments | ✅ | wedding_id | member | edit-role | edit-role | edit-role |
| seating_publications | ✅ | wedding_id | member | edit-role | edit-role | denied |
| seating_export_jobs | ✅ | wedding_id | member | edit-role | edit-role | denied |
| seating_report_templates | ✅ | wedding_id | member | edit-role | edit-role | denied |
| seating_lookup_codes | ✅ | wedding_id | member | edit-role | edit-role | denied |
| seating_lookup_activity | ✅ | wedding_id | member | edit-role | denied | denied |
| seating_activity_log | ✅ | wedding_id | member | edit-role | edit-role | edit-role |

### Gallery & Registry

| Table | RLS | Wedding FK | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|-----------|--------|--------|--------|--------|
| gallery_albums | ✅ | wedding_id | member | denied | denied | denied |
| gallery_assets | ✅ | wedding_id | member | denied | denied | denied |
| gallery_asset_derivatives | ✅ | wedding_id | member | denied | denied | denied |
| gallery_album_audiences | ✅ | wedding_id | member | denied | denied | denied |
| gallery_album_read_state | ✅ | wedding_id | member | member | member | member |
| gallery_favourites | ✅ | wedding_id | member | member | denied | member |
| gallery_reports | ✅ | wedding_id | denied | member | denied | denied |
| gallery_upload_settings | ✅ | wedding_id | member | denied | denied | denied |
| gift_registries | ✅ | wedding_id | member | denied | denied | denied |
| gift_registry_items | ✅ | wedding_id | member | denied | denied | denied |
| gift_contributions | ✅ | wedding_id | member | denied | denied | denied |
| gift_contribution_events | ✅ | wedding_id | member | denied | denied | denied |
| gift_item_reservations | ✅ | wedding_id | member | denied | denied | denied |

### Travel, Guest Portal & Activity

| Table | RLS | Wedding FK | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|-----------|--------|--------|--------|--------|
| guest_travel_plans | ✅ | wedding_id | member | member | denied | denied |
| guest_saved_travel_locations | ✅ | wedding_id | member | member | denied | member |
| travel_shuttle_requests | ✅ | wedding_id | member | member | member | denied |
| travel_location_event_links | ✅ | wedding_id | member | denied | denied | denied |
| guest_access_sessions | ✅ | wedding_id | member | edit-role | edit-role | denied |
| guest_portal_settings | ✅ | wedding_id | member | edit-role | edit-role | denied |
| guest_portal_activity | ✅ | wedding_id | denied | member | denied | denied |
| guest_notification_preferences | ✅ | wedding_id | member | member | member | denied |
| guest_update_state | ✅ | wedding_id | member | member | member | denied |
| guest_questions | ✅ | wedding_id | member | member | edit-role | edit-role |
| question_activity | ✅ | via faq_id/question_id | member | member | denied | denied |
| guest_calendar_activity | ✅ | wedding_id | member | member | edit-role | denied |
| guest_consent_records | ✅ | wedding_id | member | member | denied | denied |
| guest_seating_activity | ✅ | wedding_id | member | denied | denied | denied |
| update_read_states | ✅ | wedding_id | member | member | member | denied |

### Privacy & Profile

| Table | RLS | Wedding FK | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|-----------|--------|--------|--------|--------|
| privacy_requests | ✅ | wedding_id | member | member | edit-role | denied |
| profile_change_records | ✅ | wedding_id | member | edit-role | denied | denied |

### Profiles (Non-wedding-scoped)

| Table | RLS | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|--------|--------|--------|--------|
| profiles | ✅ | own only (auth.uid() = id) | own only | own only | denied |

## Tables NOT Touched (Readdy Shop Feature)

- product_categories, product_items, product_variants, product_skus, product_custom_fields, product_custom_values
- order_headers, order_items

## Guest/Public Access

Currently fully denied on all wedding-scoped tables. Guest portal access must use Edge Functions with server-side token validation (deferred to later prompt).

## Fixed UUID References

- The fixed UUID `00000000-0000-0000-0000-000000000001` has been removed from all RLS policies.
- Only remaining reference is in `supabase/functions/seed-demo-data/index.ts` (dev-only seed function).

## Storage Policies

Existing buckets: `public`, `private`. No wedding-scoped storage policies exist. Storage path convention recommended: `weddings/{wedding_id}/{category}/{object_id}/{filename}`. Deferred to storage prompt.

## Edge Functions

Audit deferred to dedicated prompt. Known functions: seed-demo-data, guest-settings-interact, guest-question-interact, guest-update-interact, guest-gallery-interact, guest-gallery-upload, save-travel-plan, guest-travel, submit-rsvp, guest-portal-loader, validate-invitation.

## Last Updated

2026-07-19 — Production Prompt 4