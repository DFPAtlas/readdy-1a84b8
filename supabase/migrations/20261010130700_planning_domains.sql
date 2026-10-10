-- Phase 2: planning tables matching the checked-in domain models.
-- Private by default; policies are installed by the access-boundary migration.

create table if not exists public.wedding_budgets (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  currency_code text,
  planned_total numeric default 0,
  maximum_total numeric default 0,
  saved_amount numeric default 0,
  external_contributions numeric default 0,
  contingency_mode text,
  contingency_percentage numeric default 0,
  honeymoon_included boolean default false,
  engagement_ring_included boolean default false,
  setup_profile jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wedding_budgets enable row level security;
create index if not exists wedding_budgets_wedding_idx on public.wedding_budgets(wedding_id);

create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  name text,
  category_key text,
  suggested_percentage numeric default 0,
  planned_amount numeric default 0,
  quoted_amount numeric default 0,
  committed_amount numeric default 0,
  paid_amount numeric default 0,
  is_locked boolean default false,
  is_default boolean default false,
  sort_order numeric default 0,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.budget_categories enable row level security;
create index if not exists budget_categories_wedding_idx on public.budget_categories(wedding_id);

create table if not exists public.budget_expenses (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  category_id uuid,
  supplier_id uuid,
  title text,
  description text,
  planned_amount numeric default 0,
  quoted_amount numeric default 0,
  agreed_amount numeric default 0,
  amount_paid numeric default 0,
  deposit_amount numeric default 0,
  payment_status text,
  due_date date,
  booking_date date,
  refundable boolean default false,
  vat_status text,
  notes text,
  status text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
alter table public.budget_expenses enable row level security;
create index if not exists budget_expenses_wedding_idx on public.budget_expenses(wedding_id);

create table if not exists public.budget_payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  expense_id uuid,
  supplier_id uuid,
  payment_type text,
  amount numeric default 0,
  paid_at timestamptz,
  due_at timestamptz,
  payment_reference text,
  status text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  budget_expenses text
);
alter table public.budget_payments enable row level security;
create index if not exists budget_payments_wedding_idx on public.budget_payments(wedding_id);

create table if not exists public.budget_scenarios (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  name text,
  total_budget numeric default 0,
  guest_count numeric default 0,
  assumptions jsonb,
  category_allocations jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.budget_scenarios enable row level security;
create index if not exists budget_scenarios_wedding_idx on public.budget_scenarios(wedding_id);

create table if not exists public.budget_activity_log (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  actor_user_id uuid,
  action text,
  summary text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.budget_activity_log enable row level security;
create index if not exists budget_activity_log_wedding_idx on public.budget_activity_log(wedding_id);

create table if not exists public.wedding_tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  title text,
  description text,
  category text,
  priority text,
  status text,
  due_date date,
  due_time text,
  assigned_to uuid,
  created_by uuid,
  supplier_id uuid,
  expense_id uuid,
  notes text,
  sort_order numeric default 0,
  visibility text,
  reminder_enabled boolean default false,
  reminder_time text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wedding_tasks enable row level security;
create index if not exists wedding_tasks_wedding_idx on public.wedding_tasks(wedding_id);

create table if not exists public.wedding_task_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid,
  content text,
  sort_order numeric default 0,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  wedding_id uuid
);
alter table public.wedding_task_items enable row level security;
create index if not exists wedding_task_items_wedding_idx on public.wedding_task_items(wedding_id);

create table if not exists public.task_activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid,
  wedding_id uuid,
  actor_id uuid,
  action text,
  changes jsonb,
  created_at timestamptz not null default now()
);
alter table public.task_activity_log enable row level security;
create index if not exists task_activity_log_wedding_idx on public.task_activity_log(wedding_id);

create table if not exists public.wedding_suppliers (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  business_name text,
  category text,
  status text,
  rating numeric default 0,
  website text,
  notes text,
  internal_tags jsonb,
  next_action text,
  next_action_date text,
  contract_reference text,
  contract_date text,
  agreed_amount numeric default 0,
  cancellation_terms text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  quotes jsonb,
  documents jsonb,
  budget_links jsonb
);
alter table public.wedding_suppliers enable row level security;
create index if not exists wedding_suppliers_wedding_idx on public.wedding_suppliers(wedding_id);

create table if not exists public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid,
  wedding_id uuid,
  full_name text,
  role text,
  email text,
  phone text,
  is_primary boolean default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.supplier_contacts enable row level security;
create index if not exists supplier_contacts_wedding_idx on public.supplier_contacts(wedding_id);

create table if not exists public.supplier_quotes (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid,
  wedding_id uuid,
  quote_ref text,
  amount numeric default 0,
  inclusions jsonb,
  exclusions jsonb,
  tax_amount numeric default 0,
  tax_rate numeric default 0,
  deposit_required numeric default 0,
  deposit_paid numeric default 0,
  expiry_date text,
  status text,
  accepted_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.supplier_quotes enable row level security;
create index if not exists supplier_quotes_wedding_idx on public.supplier_quotes(wedding_id);

create table if not exists public.supplier_documents (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid,
  wedding_id uuid,
  file_name text,
  file_path text,
  file_size numeric default 0,
  mime_type text,
  document_type text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.supplier_documents enable row level security;
create index if not exists supplier_documents_wedding_idx on public.supplier_documents(wedding_id);

create table if not exists public.supplier_budget_links (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid,
  wedding_id uuid,
  expense_id uuid,
  payment_id uuid,
  link_type text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.supplier_budget_links enable row level security;
create index if not exists supplier_budget_links_wedding_idx on public.supplier_budget_links(wedding_id);

create table if not exists public.supplier_activity_log (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid,
  wedding_id uuid,
  actor_id uuid,
  action text,
  changes jsonb,
  created_at timestamptz not null default now()
);
alter table public.supplier_activity_log enable row level security;
create index if not exists supplier_activity_log_wedding_idx on public.supplier_activity_log(wedding_id);

create table if not exists public.seating_plans (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  linked_event_id uuid,
  name text,
  event_type text,
  venue_id uuid,
  room_name text,
  room_label text,
  description text,
  notes text,
  status text,
  is_working boolean default false,
  is_final boolean default false,
  is_published boolean default false,
  revision numeric default 0,
  canvas_width numeric default 0,
  canvas_height numeric default 0,
  default_zoom numeric default 0,
  grid_enabled boolean default false,
  grid_size numeric default 0,
  snap_to_grid boolean default false,
  measurement_unit text,
  background_asset_id uuid,
  background_opacity numeric default 0,
  background_locked boolean default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  published_at timestamptz
);
alter table public.seating_plans enable row level security;
create index if not exists seating_plans_wedding_idx on public.seating_plans(wedding_id);

create table if not exists public.seating_tables (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid,
  wedding_id uuid,
  name text,
  table_number numeric default 0,
  shape text,
  capacity numeric default 0,
  position_x numeric default 0,
  position_y numeric default 0,
  width numeric default 0,
  height numeric default 0,
  rotation numeric default 0,
  zone text,
  colour text,
  colour_key text,
  locked boolean default false,
  notes text,
  sort_order numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
alter table public.seating_tables enable row level security;
create index if not exists seating_tables_wedding_idx on public.seating_tables(wedding_id);

create table if not exists public.seating_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid,
  wedding_id uuid,
  table_id uuid,
  guest_id uuid,
  seating_seat_id uuid,
  seat_label text,
  assignment_status text,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.seating_assignments enable row level security;
create index if not exists seating_assignments_wedding_idx on public.seating_assignments(wedding_id);

create table if not exists public.seating_seats (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  seating_table_id uuid,
  seat_label text,
  seat_number numeric default 0,
  seat_type text,
  seat_status text,
  relative_x numeric default 0,
  relative_y numeric default 0,
  rotation numeric default 0,
  locked boolean default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.seating_seats enable row level security;
create index if not exists seating_seats_wedding_idx on public.seating_seats(wedding_id);

create table if not exists public.seating_room_objects (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  object_type text,
  name text,
  x_position numeric default 0,
  y_position numeric default 0,
  width numeric default 0,
  height numeric default 0,
  rotation numeric default 0,
  layer_order numeric default 0,
  style_key text,
  opacity numeric default 0,
  locked boolean default false,
  visible boolean default false,
  geometry_data jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
alter table public.seating_room_objects enable row level security;
create index if not exists seating_room_objects_wedding_idx on public.seating_room_objects(wedding_id);

create table if not exists public.seating_zones (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  name text,
  description text,
  style_key text,
  geometry_data jsonb,
  visible boolean default false,
  locked boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.seating_zones enable row level security;
create index if not exists seating_zones_wedding_idx on public.seating_zones(wedding_id);

create table if not exists public.seating_background_assets (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  storage_path text,
  original_filename text,
  mime_type text,
  file_size numeric default 0,
  width numeric default 0,
  height numeric default 0,
  scale_factor numeric default 0,
  x_position numeric default 0,
  y_position numeric default 0,
  rotation numeric default 0,
  opacity numeric default 0,
  locked boolean default false,
  visible boolean default false,
  uploaded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.seating_background_assets enable row level security;
create index if not exists seating_background_assets_wedding_idx on public.seating_background_assets(wedding_id);

create table if not exists public.seating_plan_versions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  version_number numeric default 0,
  label text,
  reason text,
  snapshot_data text,
  source_revision numeric default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.seating_plan_versions enable row level security;
create index if not exists seating_plan_versions_wedding_idx on public.seating_plan_versions(wedding_id);

create table if not exists public.seating_activity_log (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  actor_user_id uuid,
  action text,
  summary text,
  metadata text,
  created_at timestamptz not null default now()
);
alter table public.seating_activity_log enable row level security;
create index if not exists seating_activity_log_wedding_idx on public.seating_activity_log(wedding_id);

create table if not exists public.seating_groups (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  scope text,
  name text,
  description text,
  group_type text,
  priority numeric default 0,
  preferred_zone_id uuid,
  preferred_table_id uuid,
  keep_together boolean default false,
  max_table_split numeric default 0,
  notes text,
  status text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
alter table public.seating_groups enable row level security;
create index if not exists seating_groups_wedding_idx on public.seating_groups(wedding_id);

create table if not exists public.seating_group_members (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  seating_group_id uuid,
  guest_id uuid,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.seating_group_members enable row level security;
create index if not exists seating_group_members_wedding_idx on public.seating_group_members(wedding_id);

create table if not exists public.seating_rules (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  name text,
  rule_type text,
  source_type text,
  source_id uuid,
  target_type text,
  target_id uuid,
  strength text,
  is_hard_constraint boolean default false,
  rule_config jsonb,
  reason text,
  notes text,
  status text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
alter table public.seating_rules enable row level security;
create index if not exists seating_rules_wedding_idx on public.seating_rules(wedding_id);

create table if not exists public.seating_conflicts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  conflict_type text,
  severity text,
  guest_id uuid,
  related_guest_id uuid,
  seating_table_id uuid,
  seating_seat_id uuid,
  seating_rule_id uuid,
  summary text,
  details jsonb,
  status text,
  override_reason text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  related_guest text,
  rule text
);
alter table public.seating_conflicts enable row level security;
create index if not exists seating_conflicts_wedding_idx on public.seating_conflicts(wedding_id);

create table if not exists public.seating_assistant_proposals (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  source_revision numeric default 0,
  status text,
  scope text,
  priorities jsonb,
  weights jsonb,
  random_seed numeric default 0,
  overall_score numeric default 0,
  score_breakdown jsonb,
  conflict_summary jsonb,
  generated_by text,
  generated_at timestamptz,
  applied_by text,
  applied_at timestamptz,
  rejected_at timestamptz
);
alter table public.seating_assistant_proposals enable row level security;
create index if not exists seating_assistant_proposals_wedding_idx on public.seating_assistant_proposals(wedding_id);

create table if not exists public.seating_proposal_assignments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  proposal_id uuid,
  guest_id uuid,
  current_table_id uuid,
  current_seat_id uuid,
  proposed_table_id uuid,
  proposed_seat_id uuid,
  move_status text,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  current_table jsonb,
  proposed_table jsonb
);
alter table public.seating_proposal_assignments enable row level security;
create index if not exists seating_proposal_assignments_wedding_idx on public.seating_proposal_assignments(wedding_id);

create table if not exists public.seating_publications (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  seating_plan_version_id uuid,
  linked_event_id uuid,
  status text,
  publication_revision numeric default 0,
  audience_settings jsonb,
  lookup_settings jsonb,
  published_by text,
  published_at timestamptz,
  disabled_by text,
  disabled_at timestamptz,
  replaced_by_publication_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.seating_publications enable row level security;
create index if not exists seating_publications_wedding_idx on public.seating_publications(wedding_id);

create table if not exists public.seating_export_jobs (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  seating_plan_version_id uuid,
  export_type text,
  format text,
  status text,
  options jsonb,
  storage_path text,
  contains_sensitive_data boolean default false,
  requested_by text,
  requested_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  error_summary text
);
alter table public.seating_export_jobs enable row level security;
create index if not exists seating_export_jobs_wedding_idx on public.seating_export_jobs(wedding_id);

create table if not exists public.seating_lookup_codes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  seating_plan_id uuid,
  publication_id uuid,
  guest_id uuid,
  invitation_id uuid,
  code_hash text,
  status text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table public.seating_lookup_codes enable row level security;
create index if not exists seating_lookup_codes_wedding_idx on public.seating_lookup_codes(wedding_id);

create table if not exists public.seating_lookup_activity (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  publication_id uuid,
  event_type text,
  result_type text,
  security_metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.seating_lookup_activity enable row level security;
create index if not exists seating_lookup_activity_wedding_idx on public.seating_lookup_activity(wedding_id);

create table if not exists public.gallery_assets (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  album_id uuid,
  title text,
  caption text,
  storage_path text,
  thumbnail_path text,
  preview_path text,
  file_size numeric default 0,
  mime_type text,
  width numeric default 0,
  height numeric default 0,
  duration_seconds numeric default 0,
  uploaded_by_user_id uuid,
  uploaded_by_guest_id uuid,
  uploaded_by_invitation_id uuid,
  moderation_status text,
  moderation_ai_label text,
  moderation_reason text,
  moderation_scanned_at timestamptz,
  scanned_by text,
  moderation_updated_by text,
  moderation_updated_at timestamptz,
  original_file_hash text,
  metadata_stripped boolean default false,
  source_type text,
  publication_status text,
  wall_visible boolean default false,
  wall_added_at timestamptz,
  published_at timestamptz,
  captured_at timestamptz,
  sort_order numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gallery_assets enable row level security;
create index if not exists gallery_assets_wedding_idx on public.gallery_assets(wedding_id);

create table if not exists public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  title text,
  description text,
  cover_asset_id uuid,
  allow_uploads boolean default false,
  is_published boolean default false,
  publish_at timestamptz,
  sort_order numeric default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
alter table public.gallery_albums enable row level security;
create index if not exists gallery_albums_wedding_idx on public.gallery_albums(wedding_id);

create table if not exists public.gallery_moderation_rules (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  photos_allowed boolean default false,
  videos_allowed boolean default false,
  max_file_size_bytes numeric default 0,
  max_video_duration_seconds numeric default 0,
  max_uploads_per_guest numeric default 0,
  manual_approval_required boolean default false,
  auto_approve_trusted_guests boolean default false,
  auto_add_to_wall boolean default false,
  allow_reporting boolean default false,
  blocked_labels jsonb,
  provider_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gallery_moderation_rules enable row level security;
create index if not exists gallery_moderation_rules_wedding_idx on public.gallery_moderation_rules(wedding_id);

create table if not exists public.gallery_upload_settings (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  uploads_enabled boolean default false,
  max_file_size_bytes numeric default 0,
  allowed_image_types jsonb,
  allowed_video_types jsonb,
  max_uploads_per_guest numeric default 0,
  require_metadata_consent boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gallery_upload_settings enable row level security;
create index if not exists gallery_upload_settings_wedding_idx on public.gallery_upload_settings(wedding_id);

create table if not exists public.gift_fund_accounts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  user_id uuid,
  stripe_account_id text,
  onboarding_complete boolean default false,
  charges_enabled boolean default false,
  payouts_enabled boolean default false,
  requirements_due boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gift_fund_accounts enable row level security;
create index if not exists gift_fund_accounts_wedding_idx on public.gift_fund_accounts(wedding_id);

create table if not exists public.gift_funds (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  user_id uuid,
  title text,
  description text,
  category text,
  target_amount_minor numeric default 0,
  currency text,
  cover_image_path text,
  is_active boolean default false,
  is_public boolean default false,
  show_total_raised boolean default false,
  show_contributor_names boolean default false,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gift_funds enable row level security;
create index if not exists gift_funds_wedding_idx on public.gift_funds(wedding_id);

create table if not exists public.gift_fund_contributions (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid,
  wedding_id uuid,
  guest_id uuid,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  idempotency_key text,
  contributor_name text,
  contributor_email text,
  message text,
  amount_minor numeric default 0,
  currency text,
  payment_status text,
  visibility text,
  refunded_amount_minor numeric default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gift_fund_contributions enable row level security;
create index if not exists gift_fund_contributions_wedding_idx on public.gift_fund_contributions(wedding_id);

create table if not exists public.gift_fund_events (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid,
  stripe_event_id text,
  event_type text,
  processing_status text,
  error_code text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  wedding_id uuid
);
alter table public.gift_fund_events enable row level security;
create index if not exists gift_fund_events_wedding_idx on public.gift_fund_events(wedding_id);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  name text,
  template_type text,
  subject_template text,
  preheader_template text,
  sender_name text,
  reply_to_email text,
  content_blocks jsonb,
  brand_primary_color text,
  brand_secondary_color text,
  brand_accent_color text,
  brand_font_family text,
  is_system boolean default false,
  is_active boolean default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.email_templates enable row level security;
create index if not exists email_templates_wedding_idx on public.email_templates(wedding_id);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  template_id uuid,
  name text,
  subject text,
  preheader text,
  sender_name text,
  sender_email text,
  reply_to_email text,
  content_blocks jsonb,
  cta_label text,
  cta_url text,
  brand_primary_color text,
  brand_secondary_color text,
  brand_accent_color text,
  brand_font_family text,
  audience_filter text,
  recipient_count numeric default 0,
  status text,
  schedule_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  delivery_stats text,
  is_test boolean default false,
  resend_batch_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
alter table public.email_campaigns enable row level security;
create index if not exists email_campaigns_wedding_idx on public.email_campaigns(wedding_id);

create table if not exists public.email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid,
  wedding_id uuid,
  guest_id uuid,
  household_id uuid,
  recipient_email text,
  recipient_name text,
  recipient_type text,
  status text,
  resend_email_id text,
  delivered_at timestamptz,
  bounce_reason text,
  complaint_reason text,
  opened_at timestamptz,
  clicked_at timestamptz,
  retry_count numeric default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.email_campaign_recipients enable row level security;
create index if not exists email_campaign_recipients_wedding_idx on public.email_campaign_recipients(wedding_id);

create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  email text,
  suppression_type text,
  reason text,
  resend_event_id uuid,
  resend_webhook_data text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.email_suppressions enable row level security;
create index if not exists email_suppressions_wedding_idx on public.email_suppressions(wedding_id);

create table if not exists public.email_activity_log (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  campaign_id uuid,
  actor_id uuid,
  action text,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.email_activity_log enable row level security;
create index if not exists email_activity_log_wedding_idx on public.email_activity_log(wedding_id);

create table if not exists public.wedding_website_configs (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  status text,
  slug text,
  theme_config jsonb,
  navigation_config jsonb,
  sections_config jsonb,
  seo_config jsonb,
  published_config jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wedding_website_configs enable row level security;
create index if not exists wedding_website_configs_wedding_idx on public.wedding_website_configs(wedding_id);

create table if not exists public.wedding_timeline_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  timeline_date date,
  title text,
  category text,
  start_at timestamptz,
  end_at timestamptz,
  duration_min numeric default 0,
  description text,
  location text,
  wedding_event_id uuid,
  supplier_id uuid,
  assigned_user_id uuid,
  responsible_contact text,
  internal_notes text,
  shared_notes text,
  visibility text,
  status text,
  priority text,
  sort_order numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wedding_timeline_items enable row level security;
create index if not exists wedding_timeline_items_wedding_idx on public.wedding_timeline_items(wedding_id);

create table if not exists public.wedding_export_requests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid,
  requested_by text,
  export_type text,
  status text,
  storage_path text,
  contains_sensitive_data boolean default false,
  requested_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);
alter table public.wedding_export_requests enable row level security;
create index if not exists wedding_export_requests_wedding_idx on public.wedding_export_requests(wedding_id);
alter table public.guests add column if not exists title text;
alter table public.guests add column if not exists pronouns text;
alter table public.guests add column if not exists connection_group text;
alter table public.guests add column if not exists address_line_1 text;
alter table public.guests add column if not exists address_line_2 text;
alter table public.guests add column if not exists city text;
alter table public.guests add column if not exists county_or_region text;
alter table public.guests add column if not exists postcode text;
alter table public.guests add column if not exists country text;
alter table public.guests add column if not exists invite_preparation_status text;
alter table public.guests add column if not exists mobility_transport_notes text;
alter table public.guests add column if not exists private_notes text;
alter table public.guests add column if not exists guest_group text;
alter table public.guests add column if not exists created_by uuid;
alter table public.guests add column if not exists updated_by uuid;
alter table public.guests add column if not exists date_of_birth text;
alter table public.guest_households add column if not exists formal_invitation_name text;
alter table public.guest_households add column if not exists informal_greeting text;
alter table public.guest_households add column if not exists primary_guest_id uuid;
alter table public.guest_households add column if not exists shared_email text;
alter table public.guest_households add column if not exists shared_phone text;
alter table public.guest_households add column if not exists county_or_region text;
alter table public.guest_households add column if not exists invitation_delivery_method text;
alter table public.guest_households add column if not exists created_by uuid;
alter table public.guest_households add column if not exists archived_at timestamptz;
alter table public.guest_tags add column if not exists description text;
alter table public.guest_tags add column if not exists colour_key text;
alter table public.guest_tags add column if not exists created_by uuid;
alter table public.guest_tags add column if not exists updated_at timestamptz not null default now();
alter table public.guest_import_jobs add column if not exists created_by uuid;
alter table public.guest_import_jobs add column if not exists source_filename text;
alter table public.guest_import_jobs add column if not exists valid_rows numeric default 0;
alter table public.guest_import_jobs add column if not exists warning_rows numeric default 0;
alter table public.guest_import_jobs add column if not exists error_rows numeric default 0;
alter table public.guest_import_jobs add column if not exists skipped_rows numeric default 0;
alter table public.guest_import_jobs add column if not exists mapping_config jsonb;
alter table public.guest_import_jobs add column if not exists error_report jsonb;
alter table public.guest_import_jobs add column if not exists completed_at timestamptz;
alter table public.invitations add column if not exists language_code text;
alter table public.invitations add column if not exists notes text;
alter table public.invitations add column if not exists created_by uuid;
alter table public.invitations add column if not exists updated_by uuid;
alter table public.invitations add column if not exists sent_at timestamptz;
alter table public.invitations add column if not exists delivery_attempts numeric default 0;
alter table public.invitations add column if not exists last_delivery_error text;
alter table public.invitations add column if not exists resend_email_id text;
alter table public.invitation_templates add column if not exists description text;
alter table public.invitation_templates add column if not exists template_type text;
alter table public.invitation_templates add column if not exists created_by uuid;
alter table public.invitation_templates add column if not exists updated_by uuid;
alter table public.invitation_recipients add column if not exists custom_event_access jsonb;
alter table public.invitation_recipients add column if not exists child_invitation_notes text;
alter table public.invitation_recipients add column if not exists updated_at timestamptz not null default now();
alter table public.wedding_local_places add column if not exists accessibility_info text;
alter table public.wedding_local_places add column if not exists opening_info text;
alter table public.wedding_local_places add column if not exists provider_rating text;
alter table public.wedding_local_places add column if not exists review_count numeric default 0;
alter table public.wedding_local_places add column if not exists price_level text;
alter table public.wedding_local_places add column if not exists distance_from_venue numeric default 0;
alter table public.wedding_local_places add column if not exists estimated_travel_time numeric default 0;
alter table public.wedding_local_places add column if not exists is_featured boolean default false;
alter table public.wedding_local_places add column if not exists reveal_at timestamptz;
alter table public.wedding_local_places add column if not exists google_place_id text;
alter table public.wedding_local_places add column if not exists couple_note text;
alter table public.wedding_local_places add column if not exists category_labels jsonb;
alter table public.wedding_local_places add column if not exists provider_data jsonb;
alter table public.guest_portal_settings add column if not exists guest_account_optional boolean default false;
alter table public.guest_portal_settings add column if not exists venue_visibility_default text;
alter table public.rsvp_submissions add column if not exists revision numeric default 0;
alter table public.rsvp_submissions add column if not exists is_late boolean default false;
alter table public.rsvp_submissions add column if not exists started_at timestamptz;
alter table public.rsvp_event_responses add column if not exists submission_id uuid;
