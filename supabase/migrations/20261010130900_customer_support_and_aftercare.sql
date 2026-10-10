create table if not exists public.wedora_support_cases (
 id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),case_ref text not null unique,
 customer_email text,wedding_id uuid references public.weddings(id) on delete set null,wedding_name text,
 category text not null default 'other',subject text not null,safe_summary text,status text not null default 'new',priority text not null default 'medium',assigned_owner text,
 related_incident_id uuid,related_release_id uuid,internal_notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),resolved_at timestamptz,closed_at timestamptz
);
alter table public.wedora_support_cases enable row level security;
create policy support_staff on public.wedora_support_cases for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create or replace function public.submit_customer_support_request(p_wedding_id uuid,p_category text,p_subject text,p_details text) returns text language plpgsql security definer set search_path='' as $$
declare request_ref text; customer_email text; wedding_name text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_wedding_id is not null and not public.is_wedding_member(p_wedding_id) then raise exception 'Wedding unavailable'; end if;
 if p_category is null or p_subject is null or p_details is null or p_category not in ('billing','authentication','invitations','rsvp','website','gallery','registry','guest_access','other') or length(trim(p_subject)) not between 1 and 160 or length(trim(p_details)) not between 10 and 4000 then raise exception 'Invalid support request'; end if;
 select email into customer_email from auth.users where id=auth.uid();
 select title into wedding_name from public.weddings where id=p_wedding_id;
 request_ref := 'SUP-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 insert into public.wedora_support_cases(user_id,case_ref,customer_email,wedding_id,wedding_name,category,subject,safe_summary) values(auth.uid(),request_ref,customer_email,p_wedding_id,wedding_name,p_category,trim(p_subject),trim(p_details));
 return request_ref;
end $$;
revoke all on function public.submit_customer_support_request(uuid,text,text,text) from public;
grant execute on function public.submit_customer_support_request(uuid,text,text,text) to authenticated;
create or replace function public.close_wedding_guest_experience(p_wedding_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_wedding_role(p_wedding_id,array['owner']) then raise exception 'Owner access required'; end if;
 update public.guest_portal_settings set portal_enabled=false,rsvp_enabled=false,portal_closes_at=now(),updated_at=now() where wedding_id=p_wedding_id;
 update public.wedding_website_configs set status='unpublished',updated_at=now() where wedding_id=p_wedding_id;
 update public.guest_access_sessions set status='ended',ended_at=now() where wedding_id=p_wedding_id and status='active';
 update public.invitation_access_tokens set status='revoked',revoked_at=now() where wedding_id=p_wedding_id and status='active';
end $$;
revoke all on function public.close_wedding_guest_experience(uuid) from public;
grant execute on function public.close_wedding_guest_experience(uuid) to authenticated;
alter table public.privacy_requests add column if not exists user_id uuid;
alter table public.privacy_requests add column if not exists cooling_off_until timestamptz;
alter table public.privacy_requests add column if not exists safe_notes text;
create policy privacy_self_read on public.privacy_requests for select to authenticated using(user_id=auth.uid() or public.is_platform_admin());
create policy privacy_request_insert on public.privacy_requests for insert to authenticated with check(user_id=auth.uid() and status='submitted' and request_type in ('account_export','wedding_export','account_deletion','wedding_deletion','correction','restriction','other') and (wedding_id is null or public.is_wedding_member(wedding_id)));

-- The anonymous website endpoint returns a curated projection of a published snapshot.
-- Draft content and private wedding/contact fields never leave this function.
create or replace function public.public_wedding_page(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'wedding',jsonb_build_object('id',w.id,'title',w.title,'partner_one_name',w.partner_one_name,'partner_two_name',w.partner_two_name,'wedding_date',w.wedding_date,'timezone',w.timezone,'dress_code',w.dress_code,'location',w.location,'slug',w.slug),
  'config',c.published_config,
  'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'description',e.guest_description,'start_at',e.start_at,'end_at',e.end_at,'venue_id',e.venue_id) order by e.start_at) from public.wedding_events e where e.wedding_id=w.id and e.status='published' and e.visibility='public' and (e.reveal_at is null or e.reveal_at<=now())),'[]'::jsonb),
  'venues',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'address_line_1',v.address_line_1,'city',v.city,'postcode',v.postcode,'country',v.country)) from public.wedding_venues v where v.wedding_id=w.id and exists(select 1 from public.wedding_events e where e.venue_id=v.id and e.wedding_id=w.id and e.status='published' and e.visibility='public' and (e.reveal_at is null or e.reveal_at<=now()))),'[]'::jsonb),
  'faqs',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'question',f.question,'answer',f.answer) order by f.sort_order) from public.wedding_faqs f where f.wedding_id=w.id and f.status='published' and f.is_published),'[]'::jsonb),
  'places',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'description',p.description,'website',p.website) order by p.sort_order) from public.wedding_local_places p where p.wedding_id=w.id and p.is_approved and p.visibility='public' and (p.reveal_at is null or p.reveal_at<=now())),'[]'::jsonb)
 ) from public.weddings w join public.wedding_website_configs c on c.wedding_id=w.id
 where w.slug=p_slug and c.status='published' and c.published_config is not null and length(p_slug) between 1 and 160;
$$;
revoke all on function public.public_wedding_page(text) from public;
grant execute on function public.public_wedding_page(text) to anon,authenticated;
