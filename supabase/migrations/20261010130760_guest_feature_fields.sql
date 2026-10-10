-- Phase 2: planning tables matching the checked-in domain models.
-- Private by default; policies are installed by the access-boundary migration.
alter table public.gallery_assets add column if not exists description text;
alter table public.gallery_assets add column if not exists is_featured boolean default false;
alter table public.gallery_assets add column if not exists is_favourited boolean default false;
alter table public.gallery_assets add column if not exists credit_name text;
alter table public.gallery_assets add column if not exists credit_visibility text;
alter table public.gallery_assets add column if not exists downloads_enabled boolean default false;
alter table public.gallery_assets add column if not exists sharing_enabled boolean default false;
alter table public.gallery_assets add column if not exists duplicate_of_asset_id uuid;
alter table public.gallery_assets add column if not exists removed_reason text;
alter table public.gallery_albums add column if not exists name text;
alter table public.gallery_albums add column if not exists album_type text;
alter table public.gallery_albums add column if not exists cover_image_path text;
alter table public.gallery_albums add column if not exists allow_downloads boolean default false;
alter table public.gallery_albums add column if not exists allow_favourites boolean default false;
alter table public.gallery_albums add column if not exists allow_sharing boolean default false;
alter table public.gallery_albums add column if not exists assets jsonb;
alter table public.gallery_albums add column if not exists linked_event_id uuid;
alter table public.gallery_albums add column if not exists visibility text;
alter table public.gallery_albums add column if not exists reveal_at timestamptz;
alter table public.gallery_albums add column if not exists publication_status text;
alter table public.gallery_albums add column if not exists downloads_enabled boolean default false;
alter table public.gallery_albums add column if not exists sharing_enabled boolean default false;
alter table public.gallery_albums add column if not exists published_at timestamptz;
alter table public.gallery_albums add column if not exists last_viewed_at timestamptz;
alter table public.gallery_albums add column if not exists has_new_images boolean default false;
alter table public.gallery_upload_settings add column if not exists opens_at timestamptz;
alter table public.gallery_upload_settings add column if not exists closes_at timestamptz;
alter table public.gallery_upload_settings add column if not exists moderation_mode text;
alter table public.gallery_upload_settings add column if not exists max_files_per_batch numeric default 0;
alter table public.gallery_upload_settings add column if not exists max_files_per_guest numeric default 0;
alter table public.gallery_upload_settings add column if not exists guest_credit_default text;
alter table public.gallery_moderation_rules add column if not exists show_captions boolean default false;
alter table public.gallery_moderation_rules add column if not exists show_uploader_names boolean default false;
alter table public.gallery_moderation_rules add column if not exists uploader_name_format text;
alter table public.gallery_moderation_rules add column if not exists wall_delay_minutes numeric default 0;
alter table public.gallery_moderation_rules add column if not exists event_time_window_start text;
alter table public.gallery_moderation_rules add column if not exists event_time_window_end text;
alter table public.gallery_moderation_rules add column if not exists strip_metadata boolean default false;
alter table public.gallery_moderation_rules add column if not exists retain_originals boolean default false;

create table if not exists public.gift_registries (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  enabled boolean default false,
  registry_type text,
  name text,
  title text,
  description text,
  presence_message text,
  thank_you_message text,
  currency text,
  cover_image text,
  hero_image_url text,
  provider text,
  provider_config jsonb,
  external_url text,
  featured_gifts jsonb,
  group_gifting_enabled boolean default false,
  show_donors_publicly boolean default false,
  show_amounts_publicly boolean default false,
  allow_anonymous boolean default false,
  status text,
  opens_at timestamptz,
  closes_at timestamptz,
  sort_order numeric default 0
);
alter table public.gift_registries enable row level security;
create index if not exists gift_registries_wedding_idx on public.gift_registries(wedding_id);

create table if not exists public.gift_registry_items (
  id uuid primary key default gen_random_uuid(),
  registry_id uuid,
  wedding_id uuid,
  title text,
  description text,
  image text,
  price numeric default 0,
  target_amount numeric default 0,
  guide_amount numeric default 0,
  currency text,
  provider text,
  provider_item_id uuid,
  external_url text,
  is_featured boolean default false,
  is_group_gift boolean default false,
  allow_group_gifting boolean default false,
  allow_reservation boolean default false,
  show_progress boolean default false,
  sort_order numeric default 0,
  category text,
  status text,
  why_couple_chose text
);
alter table public.gift_registry_items enable row level security;
create index if not exists gift_registry_items_wedding_idx on public.gift_registry_items(wedding_id);

create table if not exists public.gift_item_reservations (
  id uuid primary key default gen_random_uuid(),
  registry_item_id uuid,
  guest_id uuid,
  status text,
  reserved_at timestamptz,
  expires_at timestamptz,
  wedding_id uuid
);
alter table public.gift_item_reservations enable row level security;
create index if not exists gift_item_reservations_wedding_idx on public.gift_item_reservations(wedding_id);

create table if not exists public.gift_contributions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid,
  registry_id uuid,
  guest_id uuid,
  amount numeric default 0,
  currency text,
  message text,
  is_anonymous boolean default false,
  show_name boolean default false,
  show_amount boolean default false,
  donor_visibility text,
  donor_display_name text,
  status text,
  provider_checkout_reference text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  wedding_id uuid
);
alter table public.gift_contributions enable row level security;
create index if not exists gift_contributions_wedding_idx on public.gift_contributions(wedding_id);

create table if not exists public.gallery_album_read_state (
  id uuid primary key default gen_random_uuid(),
  album_id uuid,
  guest_id uuid,
  last_viewed_at timestamptz,
  wedding_id uuid
);
alter table public.gallery_album_read_state enable row level security;
create index if not exists gallery_album_read_state_wedding_idx on public.gallery_album_read_state(wedding_id);
create table if not exists public.gallery_favourites (id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings(id),invitation_id uuid not null references public.invitations(id),guest_id uuid not null references public.guests(id),asset_id uuid not null references public.gallery_assets(id),created_at timestamptz not null default now(),unique(guest_id,asset_id));
create table if not exists public.gallery_reports (id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings(id),invitation_id uuid references public.invitations(id),asset_id uuid not null references public.gallery_assets(id),reported_by_guest_id uuid references public.guests(id),reason text,status text default 'open',created_at timestamptz not null default now());
create table if not exists public.gallery_album_audiences (id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings(id),album_id uuid not null references public.gallery_albums(id),audience_type text,audience_reference_id uuid,guest_id uuid,invitation_id uuid,household_id uuid);
create table if not exists public.gallery_asset_derivatives (id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings(id),gallery_asset_id uuid not null references public.gallery_assets(id),storage_path text,derivative_type text,mime_type text,created_at timestamptz not null default now());
create table if not exists public.guest_access_security_events (id uuid primary key default gen_random_uuid(),wedding_id uuid references public.weddings(id),invitation_id uuid,fingerprint_hash text not null,event_type text not null,source text,metadata jsonb default '{}',created_at timestamptz not null default now());
create index if not exists guest_access_security_rate_limit on public.guest_access_security_events(fingerprint_hash,created_at desc);
create table if not exists public.send_log (id uuid primary key default gen_random_uuid(),wedding_id uuid references public.weddings(id),invitation_id uuid references public.invitations(id),guest_id uuid references public.guests(id),channel text,submission_id text,status text default 'queued',resend_email_id text,error_message text,sent_at timestamptz,delivered_at timestamptz,created_at timestamptz not null default now(),unique(submission_id,guest_id));
alter table public.wedding_suppliers add column if not exists milestones jsonb default '[]';
alter table public.guest_questions add column if not exists updated_at timestamptz default now();
alter table public.guest_activity_log add column if not exists household_id uuid;
alter table public.guest_activity_log add column if not exists actor_source text;
alter table public.invitation_access_tokens add column if not exists delivery_channel text;
alter table public.invitation_access_tokens add column if not exists rotation_reason text;
alter table public.invitation_access_tokens add column if not exists sent_via_campaign_id uuid;
alter table public.invitation_access_tokens add column if not exists revoked_by uuid;
alter table public.wedding_event_audiences add column if not exists audience_reference_id uuid;
alter table public.asset_library add column if not exists file_url text;
alter table public.asset_library add column if not exists thumbnail_url text;
alter table public.asset_library add column if not exists tags jsonb default '[]';
alter table public.asset_library add column if not exists is_premium boolean default false;
alter table public.email_suppressions add column if not exists suppressed_at timestamptz default now();
alter table public.email_suppressions add column if not exists source text;
alter table public.email_suppressions add column if not exists token text;
alter table public.invitation_activity_log add column if not exists event_type text;
alter table public.invitation_activity_log add column if not exists actor_type text;
alter table public.invitation_activity_log add column if not exists security_metadata jsonb;
alter table public.invitation_activity_log add column if not exists actor_user_id uuid;
alter table public.profile_change_records add column if not exists invitation_id uuid;
alter table public.profile_change_records add column if not exists changed_fields jsonb;
alter table public.profile_change_records add column if not exists field_summary text;
alter table public.guest_consent_records add column if not exists consented boolean default false;
alter table public.guest_consent_records add column if not exists recorded_at timestamptz default now();
alter table public.guest_update_state add column if not exists last_read_at timestamptz;
alter table public.guest_update_state add column if not exists saved_at timestamptz;
alter table public.guest_update_state add column if not exists dismissed_at timestamptz;
alter table public.guest_update_state add column if not exists updated_at timestamptz default now();
alter table public.provisioning_requests add column if not exists id uuid default gen_random_uuid();
alter table public.rsvp_submissions add column if not exists idempotency_key_hash text;
alter table public.rsvp_response_revisions add column if not exists invitation_id uuid;
alter table public.rsvp_response_revisions add column if not exists snapshot_data jsonb;
alter table public.guest_portal_activity add column if not exists session_id uuid;
alter table public.guest_portal_activity add column if not exists metadata jsonb default '{}';
alter table public.gift_item_reservations add column if not exists invitation_id uuid;
alter table public.gift_contributions add column if not exists invitation_id uuid;
alter table public.gallery_album_read_state add column if not exists invitation_id uuid;
create unique index if not exists guest_tag_assignment_unique on public.guest_tag_assignments(guest_id,tag_id);
create unique index if not exists guest_update_state_unique on public.guest_update_state(update_id,guest_id);
create unique index if not exists guest_notification_preferences_unique on public.guest_notification_preferences(invitation_id,guest_id);
create unique index if not exists supplier_expense_link_unique on public.supplier_budget_links(supplier_id,expense_id,link_type);
create unique index if not exists wedding_elements_field_unique on public.wedding_elements(wedding_id,section,field_name);
create unique index if not exists budget_categories_key_unique on public.budget_categories(wedding_id,category_key);
create unique index if not exists email_suppression_wedding_unique on public.email_suppressions(wedding_id,email);
create unique index if not exists gallery_album_read_unique on public.gallery_album_read_state(album_id,guest_id);
