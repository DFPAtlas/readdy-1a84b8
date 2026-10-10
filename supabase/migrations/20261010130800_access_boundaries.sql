-- Phase 3: roles are enforced in the database, independently of the app UI.
create or replace function public.has_wedding_role(p_wedding_id uuid, p_roles text[]) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.wedding_members where wedding_id=p_wedding_id and user_id=auth.uid() and status='active' and role=any(p_roles));
$$;
create or replace function public.is_wedding_member(p_wedding_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select public.has_wedding_role(p_wedding_id,array['owner','partner','planner','collaborator','viewer']);
$$;
create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.platform_admins where user_id=auth.uid() and active);
$$;
revoke all on function public.has_wedding_role(uuid,text[]),public.is_wedding_member(uuid),public.is_platform_admin() from public;
grant execute on function public.has_wedding_role(uuid,text[]),public.is_wedding_member(uuid),public.is_platform_admin() to authenticated;

-- Remove old permissive policies before installing explicit read/write boundaries.
do $$ declare p record; t record; read_roles text[]; write_roles text[]; begin
 for p in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename <> 'platform_admins' loop
   execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
 end loop;
 for t in select table_name from information_schema.columns where table_schema='public' and column_name='wedding_id' and table_name not in ('wedding_members','wedding_member_invitations') loop
   execute format('alter table public.%I enable row level security',t.table_name);
   read_roles := array['owner','partner','planner','collaborator','viewer'];
   write_roles := array['owner','partner','planner'];
   if t.table_name in ('guests','guest_households','invitations','invitation_recipients','rsvp_submissions','rsvp_responses','rsvp_response_revisions','rsvp_event_responses','rsvp_custom_answers','guest_questions','guest_travel_plans','guest_notification_preferences','guest_consent_records','profile_change_records','guest_activity_log','invitation_activity_log') then read_roles:=array['owner','partner','planner']; end if;
   if t.table_name like 'budget_%' or t.table_name in ('wedding_budgets','gift_fund_contributions') then read_roles:=array['owner','partner','planner']; end if;
   if t.table_name in ('wedding_tasks','wedding_task_items','task_activity_log','wedding_elements') then write_roles:=array['owner','partner','planner','collaborator']; end if;
   if t.table_name in ('wedding_settings','wedding_notification_preferences') then write_roles:=array['owner','partner']; end if;
   if t.table_name in ('guest_access_sessions','invitation_access_tokens','invitation_access_activity','guest_portal_activity','gift_fund_events','gift_fund_accounts','provisioning_requests','privacy_requests') then read_roles:=array['owner','partner']; write_roles:=array[]::text[]; end if;
   execute format('create policy scoped_read on public.%I for select to authenticated using (public.has_wedding_role(wedding_id,%L::text[]))',t.table_name,read_roles);
   if cardinality(write_roles)>0 then
     execute format('create policy scoped_insert on public.%I for insert to authenticated with check (public.has_wedding_role(wedding_id,%L::text[]))',t.table_name,write_roles);
     execute format('create policy scoped_update on public.%I for update to authenticated using (public.has_wedding_role(wedding_id,%L::text[])) with check (public.has_wedding_role(wedding_id,%L::text[]))',t.table_name,write_roles,write_roles);
     execute format('create policy scoped_delete on public.%I for delete to authenticated using (public.has_wedding_role(wedding_id,%L::text[]))',t.table_name,write_roles);
   end if;
 end loop;
end $$;
alter table public.weddings enable row level security;
create policy wedding_private_read on public.weddings for select to authenticated using(public.is_wedding_member(id));
create policy wedding_owner_update on public.weddings for update to authenticated using(public.has_wedding_role(id,array['owner','partner','planner'])) with check(public.has_wedding_role(id,array['owner','partner','planner']));
-- Creation and deletion happen through authenticated Edge Functions, never public SQL writes.
create policy profile_self_read on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_self_insert on public.profiles for insert to authenticated with check(id=auth.uid() and (user_id is null or user_id=auth.uid()));
create policy profile_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid() and (user_id is null or user_id=auth.uid()));
create policy membership_read on public.wedding_members for select to authenticated using(user_id=auth.uid() or public.has_wedding_role(wedding_id,array['owner','partner']));
create policy membership_insert on public.wedding_members for insert to authenticated with check(role <> 'owner' and public.has_wedding_role(wedding_id,array['owner']));
create policy membership_update on public.wedding_members for update to authenticated using(role <> 'owner' and public.has_wedding_role(wedding_id,array['owner'])) with check(role <> 'owner' and public.has_wedding_role(wedding_id,array['owner']));
create policy membership_delete on public.wedding_members for delete to authenticated using(role <> 'owner' and public.has_wedding_role(wedding_id,array['owner']));
create policy member_invitation_read on public.wedding_member_invitations for select to authenticated using(public.has_wedding_role(wedding_id,array['owner']));
create policy member_invitation_update on public.wedding_member_invitations for update to authenticated using(public.has_wedding_role(wedding_id,array['owner'])) with check(role in ('partner','planner','collaborator','viewer') and public.has_wedding_role(wedding_id,array['owner']));
-- Subscription records are updated only by verified payment webhooks.
do $$ declare t text; p record; begin
 foreach t in array array['wedora_subscriptions','subscription_records','wedora_billing_events'] loop
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',p.policyname,t); end loop;
  execute format('create policy billing_owner_read on public.%I for select to authenticated using(public.has_wedding_role(wedding_id,array[''owner'',''partner'']))',t);
 end loop;
end $$;
create policy plan_catalogue_read on public.wedora_subscription_plans for select to authenticated using(is_active);
create policy billing_customer_self_read on public.wedora_customers for select to authenticated using(user_id=auth.uid());
-- Invitation organisers can create and rotate hashed guest links; guest sessions remain service-only.
drop policy scoped_read on public.invitation_access_tokens;
create policy invitation_tokens_read on public.invitation_access_tokens for select to authenticated using(public.has_wedding_role(wedding_id,array['owner','partner','planner']));
create policy invitation_tokens_insert on public.invitation_access_tokens for insert to authenticated with check(public.has_wedding_role(wedding_id,array['owner','partner','planner']));
create policy invitation_tokens_update on public.invitation_access_tokens for update to authenticated using(public.has_wedding_role(wedding_id,array['owner','partner','planner'])) with check(public.has_wedding_role(wedding_id,array['owner','partner','planner']));
create policy invitation_access_audit_insert on public.invitation_access_activity for insert to authenticated with check(public.has_wedding_role(wedding_id,array['owner','partner','planner']));
