-- Staff operational records are separate from wedding member permissions.
create table if not exists public.backup_records (id uuid primary key default gen_random_uuid(),
backup_type text,
environment text,
status text,
started_at timestamptz,
completed_at timestamptz,
provider_reference text,
database_version text,
approximate_size_bytes numeric default 0,
encryption_status text,
retention_expiry text,
verification_status text,
verified_by text,
verified_at timestamptz,
notes text,
created_at timestamptz default now(),
updated_at timestamptz default now());
alter table public.backup_records enable row level security;
create policy staff_access on public.backup_records for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create table if not exists public.restore_tests (id uuid primary key default gen_random_uuid(),
backup_id text,
test_environment text,
status text,
requested_by text,
started_at timestamptz,
completed_at timestamptz,
database_restoration_result text,
storage_restoration_result text,
authentication_verification text,
rls_verification text,
guest_rsvp_verification text,
stripe_isolation boolean default false,
email_isolation boolean default false,
issues_found text,
resolution text,
overall_result text,
created_at timestamptz default now(),
updated_at timestamptz default now());
alter table public.restore_tests enable row level security;
create policy staff_access on public.restore_tests for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create table if not exists public.operational_releases (id uuid primary key default gen_random_uuid(),
version text,
status text,
release_date text,
git_ref text,
migration_version text,
release_owner text,
summary text,
included_fixes text,
known_issues text,
edge_function_versions jsonb,
frontend_deployment_ref text,
verification_results text,
rollback_notes text,
previous_stable_version text,
created_at timestamptz default now(),
updated_at timestamptz default now());
alter table public.operational_releases enable row level security;
create policy staff_access on public.operational_releases for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create table if not exists public.operational_incidents (id uuid primary key default gen_random_uuid(),
incident_ref text,
title text,
severity text,
status text,
affected_service text,
start_time timestamptz,
end_time timestamptz,
detected_by text,
user_impact text,
technical_summary text,
release_version text,
assigned_owner text,
immediate_action text,
resolution text,
follow_up_actions text,
created_at timestamptz default now(),
updated_at timestamptz default now());
alter table public.operational_incidents enable row level security;
create policy staff_access on public.operational_incidents for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create table if not exists public.incident_updates (id uuid primary key default gen_random_uuid(),
incident_id text,
author text,
text text,
visibility text,
status_change text,
created_at timestamptz default now(),
updated_at timestamptz default now());
alter table public.incident_updates enable row level security;
create policy staff_access on public.incident_updates for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create table if not exists public.product_feedback (id uuid primary key default gen_random_uuid(),
feedback_type text,
feature text,
category text,
summary text,
description text,
priority text,
status text,
assigned_to text,
submitted_by text,
submitted_at timestamptz default now(),
linked_support_case_id text,
linked_incident_id text,
linked_improvement_id text,
updated_at timestamptz default now());
alter table public.product_feedback enable row level security;
create policy staff_access on public.product_feedback for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create table if not exists public.product_improvements (id uuid primary key default gen_random_uuid(),
title text,
problem_statement text,
evidence text,
affected_feature text,
affected_journey text,
customer_impact text,
frequency text,
severity text,
effort_estimate text,
confidence text,
priority_score numeric default 0,
status text,
owner text,
target_release text,
success_measure text,
linked_feedback_ids jsonb default '[]'::jsonb,
linked_support_case_ids jsonb default '[]'::jsonb,
linked_incident_ids jsonb default '[]'::jsonb,
priority_override_reason text,
result text,
result_detail text,
created_at timestamptz default now(),
updated_at timestamptz default now());
alter table public.product_improvements enable row level security;
create policy staff_access on public.product_improvements for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create table if not exists public.operational_events(id uuid primary key default gen_random_uuid(),occurred_at timestamptz default now(),service text,event_type text,severity text,status text,summary text,release_version text,safe_metadata jsonb default '{}');
create table if not exists public.stripe_webhook_events(id uuid primary key default gen_random_uuid(),received_at timestamptz default now(),event_type text,status text,error_message text);
alter table public.operational_events enable row level security;
alter table public.stripe_webhook_events enable row level security;
create policy staff_access on public.operational_events for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy staff_read on public.stripe_webhook_events for select to authenticated using(public.is_platform_admin());
create table if not exists public.wedding_styleboard(id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings(id),image_url text,caption text,section text,sort_order int default 0,created_at timestamptz default now());
alter table public.wedding_styleboard enable row level security;
create policy member_read on public.wedding_styleboard for select to authenticated using(public.is_wedding_member(wedding_id));
create policy planner_write on public.wedding_styleboard for all to authenticated using(public.has_wedding_role(wedding_id,array['owner','partner','planner'])) with check(public.has_wedding_role(wedding_id,array['owner','partner','planner']));
create table if not exists public.wedding_deletion_requests(id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings(id),requested_by uuid not null references auth.users(id),reason text,confirmation_code text,status text not null default 'pending' check(status in ('pending','confirmed','cancelled','processing','completed','failed')),created_at timestamptz default now(),updated_at timestamptz default now());
alter table public.wedding_deletion_requests enable row level security;
create policy owner_read on public.wedding_deletion_requests for select to authenticated using(public.has_wedding_role(wedding_id,array['owner']) or public.is_platform_admin());
create policy owner_request on public.wedding_deletion_requests for insert to authenticated with check(public.has_wedding_role(wedding_id,array['owner']) and requested_by=auth.uid() and status='pending');
create policy owner_cancel_confirm on public.wedding_deletion_requests for update to authenticated using(public.has_wedding_role(wedding_id,array['owner']) and requested_by=auth.uid() and status in ('pending','confirmed')) with check(public.has_wedding_role(wedding_id,array['owner']) and requested_by=auth.uid() and status in ('pending','confirmed','cancelled'));
alter table public.privacy_requests add column if not exists invitation_id uuid references public.invitations(id);
alter table public.privacy_requests add column if not exists notes text;
alter table public.privacy_requests add column if not exists corrected_fields jsonb;
alter table public.privacy_requests add column if not exists completed_at timestamptz;
alter table public.privacy_requests add column if not exists failure_reason text;
alter table public.gift_registry_items add column if not exists created_at timestamptz default now();
do $$ declare p record; begin for p in select policyname from pg_policies where schemaname='public' and tablename='email_suppressions' and cmd<>'SELECT' loop execute format('drop policy %I on public.email_suppressions',p.policyname); end loop; end $$;
-- Staff diagnostics can inspect records; wedding owners never inherit this access.
do $$ declare t text; begin
 foreach t in array array['weddings','wedding_members','profiles','wedding_website_configs','invitations','rsvp_submissions','wedora_subscriptions','guests','wedding_events','gallery_assets','gift_registries','privacy_requests','wedora_billing_events'] loop
  execute format('create policy staff_diagnostic_read on public.%I for select to authenticated using(public.is_platform_admin())',t);
 end loop;
end $$;
-- Confirmed legacy data-management requests enter the same staff privacy queue.
create or replace function public.sync_wedding_privacy_request() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  insert into public.privacy_requests(wedding_id,user_id,request_type,status,cooling_off_until,safe_notes) values(new.wedding_id,new.requested_by,'wedding_deletion','submitted',now()+interval '30 days','Wedding data-management request: '||new.id::text);
 elsif new.status='cancelled' then
  update public.privacy_requests set status='cancelled' where wedding_id=new.wedding_id and user_id=new.requested_by and safe_notes='Wedding data-management request: '||new.id::text and status in ('submitted','pending','confirmed');
 end if; return new;
end $$;
create trigger sync_wedding_privacy_request after insert or update of status on public.wedding_deletion_requests for each row execute function public.sync_wedding_privacy_request();
create policy stock_asset_metadata_read on public.asset_library for select to anon,authenticated using(wedding_id is null);
create policy staff_stock_metadata on public.asset_library for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
-- Existing authenticated customers also receive the profile shape expected by the app.
insert into public.profiles(id,user_id,email,first_name,last_name,display_name,onboarding_completed)
select u.id,u.id,u.email,coalesce(u.raw_user_meta_data->>'first_name',''),coalesce(u.raw_user_meta_data->>'last_name',''),coalesce(u.raw_user_meta_data->>'display_name',''),exists(select 1 from public.wedding_members m where m.user_id=u.id and m.status='active') from auth.users u where not exists(select 1 from public.profiles p where p.id=u.id) on conflict(id) do nothing;
