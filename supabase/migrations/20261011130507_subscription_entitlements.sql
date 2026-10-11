-- Subscription state is server-owned. All checks fail closed and use database time.
create schema if not exists vowora_private;
revoke all on schema vowora_private from public, anon;
grant usage on schema vowora_private to authenticated, service_role;

create or replace function vowora_private.effective_plan(w uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare s public.wedora_subscriptions; legacy public.subscription_records; p text;
begin
 select * into s from public.wedora_subscriptions where wedding_id=w;
 if found then
   p := coalesce(s.plan_key,(select plan_code from public.wedora_subscription_plans where id=s.plan_id),'free');
   if p not in ('essential','complete','luxury') or s.stripe_subscription_id is null or s.ended_at is not null then return 'free'; end if;
   if s.status='trialing' and s.trial_end > now() then return p; end if;
   if s.status='active' and s.current_period_end > now() then return p; end if;
   return 'free';
 end if;
 select * into legacy from public.subscription_records where wedding_id=w;
 if legacy.plan in ('essential','complete','luxury') and legacy.stripe_subscription_id is not null
 and legacy.status='active' and legacy.current_period_end>now() then return legacy.plan; end if;
 return 'free';
end $$;
create or replace function vowora_private.plan_limits(p text) returns jsonb language sql immutable set search_path='' as $$
 select ('{"free":{"maxGuests":20,"maxCollaborators":1,"maxAlbums":2,"maxCustomSections":1,"maxEmailCampaigns":0,"maxInvitations":0,"galleryStorageMb":100,"whiteLabel":false,"prioritySupport":false,"seatingPlanner":false,"budgetTracker":false,"travelConcierge":false,"customDomain":false,"apiAccess":false},"essential":{"maxGuests":80,"maxCollaborators":3,"maxAlbums":5,"maxCustomSections":3,"maxEmailCampaigns":5,"maxInvitations":80,"galleryStorageMb":500,"whiteLabel":true,"prioritySupport":false,"seatingPlanner":false,"budgetTracker":false,"travelConcierge":true,"customDomain":false,"apiAccess":false},"complete":{"maxGuests":200,"maxCollaborators":10,"maxAlbums":15,"maxCustomSections":5,"maxEmailCampaigns":20,"maxInvitations":200,"galleryStorageMb":2000,"whiteLabel":true,"prioritySupport":true,"seatingPlanner":true,"budgetTracker":true,"travelConcierge":true,"customDomain":false,"apiAccess":false},"luxury":{"maxGuests":null,"maxCollaborators":null,"maxAlbums":null,"maxCustomSections":null,"maxEmailCampaigns":null,"maxInvitations":null,"galleryStorageMb":10000,"whiteLabel":true,"prioritySupport":true,"seatingPlanner":true,"budgetTracker":true,"travelConcierge":true,"customDomain":true,"apiAccess":true}}'::jsonb)->coalesce(p,'free');
$$;
create or replace function vowora_private.feature_plan(f text) returns text language sql immutable set search_path='' as $$
 select ('{"invitations":"essential","communications":"essential","travel":"essential","gallery":"essential","planning":"complete","suppliers":"complete","budget":"complete","seating":"complete","weddingDay":"luxury","customDomain":"luxury","premiumDesigns":"luxury","apiAccess":"luxury","prioritySupport":"complete","websiteCustomization":"essential","whiteLabel":"essential"}'::jsonb)->>f;
$$;
create or replace function vowora_private.has_feature(w uuid,f text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(array_position(array['free','essential','complete','luxury'],vowora_private.effective_plan(w)) >=
 array_position(array['free','essential','complete','luxury'],vowora_private.feature_plan(f)),false);
$$;
-- This helper is usable in RLS but still requires membership. It never grants ownership.
create or replace function vowora_private.member_feature(w uuid,f text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_wedding_member(w) and vowora_private.has_feature(w,f);
$$;
create or replace function vowora_private.table_feature(t text) returns text language sql immutable set search_path='' as $$
 select case
 when t='wedding_budgets' or t like 'budget_%' or t like 'gift_fund%' then 'budget'
 when t='wedding_suppliers' or t like 'supplier_%' then 'suppliers'
 when t='wedding_tasks' or t='wedding_task_items' or t='task_activity_log' or t='wedding_styleboard' then 'planning'
 when t='wedding_timeline_items' then 'weddingDay'
 when t like 'seating_%' then 'seating'
 when t like 'gallery_%' then 'gallery'
 when t like 'email_%' and t not in ('email_suppressions','email_delivery_events') or t in ('wedding_updates','guest_update_state','verified_senders','send_log') then 'communications'
 when t in ('wedding_local_places','guest_travel_plans') then 'travel'
 when t in ('invitations','invitation_designs','invitation_templates','asset_library','invitation_access_tokens','invitation_access_activity') then 'invitations'
 end;
$$;
create or replace function vowora_private.collaborator_usage(w uuid,exclude_id uuid default null,exclude_email text default null) returns bigint
language sql stable security definer set search_path='' as $$
 select count(*) from (
 select lower(coalesce(u.email,m.user_id::text)) as email from public.wedding_members m left join auth.users u on u.id=m.user_id
 where m.wedding_id=w and m.role<>'owner' and m.status='active' and m.id is distinct from exclude_id
 union
 select lower(coalesce(invited_email,email)) from public.wedding_member_invitations
 where wedding_id=w and status='pending' and expires_at>now() and id is distinct from exclude_id
 ) seats where email is distinct from lower(exclude_email);
$$;
create or replace function vowora_private.custom_section_count(sections jsonb) returns bigint language sql immutable set search_path='' as $$
 select count(*) from jsonb_array_elements(case when jsonb_typeof(sections)='array' then sections else '[]'::jsonb end) x where x->>'type' in ('custom_text','custom');
$$;
-- Snapshot returns no payment/customer identifiers and is available to all active wedding members.
create or replace function vowora_private.member_entitlements(w uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p text; expiry timestamptz; features jsonb;
begin
 if auth.uid() is null or not public.is_wedding_member(w) then raise exception 'Wedding access required' using errcode='42501'; end if;
 p:=vowora_private.effective_plan(w);
 select case when status='trialing' then trial_end else current_period_end end into expiry from public.wedora_subscriptions where wedding_id=w;
 if not found then select current_period_end into expiry from public.subscription_records where wedding_id=w; end if;
 select jsonb_object_agg(key,vowora_private.has_feature(w,key)) into features from jsonb_each_text('{"invitations":"essential","communications":"essential","travel":"essential","gallery":"essential","planning":"complete","suppliers":"complete","budget":"complete","seating":"complete","weddingDay":"luxury","customDomain":"luxury","premiumDesigns":"luxury","apiAccess":"luxury","prioritySupport":"complete","websiteCustomization":"essential","whiteLabel":"essential"}'::jsonb);
 return jsonb_build_object('planKey',p,'accessUntil',expiry,'features',features,'limits',vowora_private.plan_limits(p),'usage',jsonb_build_object(
 'maxGuests',(select count(*) from public.guests where wedding_id=w),
 'maxCollaborators',vowora_private.collaborator_usage(w),
 'maxAlbums',(select count(*) from public.gallery_albums where wedding_id=w),
 'maxInvitations',(select count(*) from public.invitations where wedding_id=w),
 'maxEmailCampaigns',(select count(*) from public.email_campaigns where wedding_id=w),
 'maxCustomSections',(select coalesce(max(vowora_private.custom_section_count(sections_config)),0) from public.wedding_website_configs where wedding_id=w),
 'galleryStorageMb',(select coalesce(sum(coalesce((metadata->>'size')::numeric,0)),0)/1048576 from storage.objects where bucket_id='private' and public.storage_wedding_id(name)=w and name like 'galleries/%')));
end $$;
create or replace function public.get_wedding_entitlements(p_wedding_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select vowora_private.member_entitlements(p_wedding_id);
$$;
-- Service-role Edge Functions must call this before any paid action or external side effect.
create or replace function public.require_wedding_feature(p_wedding_id uuid,p_feature text) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if not vowora_private.has_feature(p_wedding_id,p_feature) then raise exception 'Upgrade your subscription to use this feature.' using errcode='42501'; end if;
 return true;
end $$;

create or replace function public.service_wedding_features(p_wedding_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_object_agg(key,vowora_private.has_feature(p_wedding_id,key)) from jsonb_each_text('{"invitations": "essential", "communications": "essential", "travel": "essential", "gallery": "essential", "planning": "complete", "suppliers": "complete", "budget": "complete", "seating": "complete", "weddingDay": "luxury", "customDomain": "luxury", "premiumDesigns": "luxury", "apiAccess": "luxury", "prioritySupport": "complete", "websiteCustomization": "essential", "whiteLabel": "essential"}'::jsonb);
$$;
revoke all on function public.service_wedding_features(uuid) from public,anon,authenticated;
grant execute on function public.service_wedding_features(uuid) to service_role;

-- Restrictive policies AND with existing role policies, including any permissive admin policies.
do $$ declare t record; f text; begin
 for t in select table_name from information_schema.columns where table_schema='public' and column_name='wedding_id' loop
 f:=vowora_private.table_feature(t.table_name);
 if f is not null then
 execute format('create policy subscription_read on public.%I as restrictive for select to authenticated using (public.is_platform_admin() or vowora_private.member_feature(wedding_id,%L))',t.table_name,f);
 execute format('create policy subscription_insert on public.%I as restrictive for insert to authenticated with check (vowora_private.member_feature(wedding_id,%L))',t.table_name,f);
 execute format('create policy subscription_update on public.%I as restrictive for update to authenticated using (vowora_private.member_feature(wedding_id,%L)) with check (vowora_private.member_feature(wedding_id,%L))',t.table_name,f,f);
 execute format('create policy subscription_delete on public.%I as restrictive for delete to authenticated using (vowora_private.member_feature(wedding_id,%L))',t.table_name,f);
 end if;
 end loop;
end $$;
-- Atomic quotas also run for trusted backend writes (guest plus-ones, uploads, invite acceptance).
create or replace function vowora_private.enforce_wedding_entitlement() returns trigger language plpgsql security definer set search_path='' as $$
declare w uuid:=new.wedding_id; f text; lim bigint; used numeric; old_id uuid; email text; key text; limits jsonb;
begin
 if tg_op='UPDATE' then
 if old.wedding_id is distinct from w then raise exception 'Wedding cannot be reassigned' using errcode='42501'; end if;
 old_id:=old.id;
 end if;
 perform 1 from public.weddings where id=w for update;
 f:=vowora_private.table_feature(tg_table_name);
 -- Workspace provisioning creates default categories; role + subscription RLS still protects customer access.
 if f is not null and tg_table_name not in ('budget_categories','invitation_access_tokens','invitation_access_activity','gift_fund_events','gift_fund_contributions','email_activity_log','send_log') and not vowora_private.has_feature(w,f) then
 raise exception 'Upgrade your subscription to use this feature.' using errcode='42501'; end if;
 limits:=vowora_private.plan_limits(vowora_private.effective_plan(w));
 key:=case tg_table_name when 'guests' then 'maxGuests' when 'invitations' then 'maxInvitations' when 'gallery_albums' then 'maxAlbums' when 'email_campaigns' then 'maxEmailCampaigns' end;
 if key is not null and tg_op='INSERT' then
 lim:=(limits->>key)::bigint;
 if lim is not null then
 execute format('select count(*) from public.%I where wedding_id=$1',tg_table_name) into used using w;
 if used>=lim then raise exception 'Subscription limit reached (%). Upgrade to add more.',key using errcode='42501'; end if;
 end if;
 end if;
 if tg_table_name in ('wedding_members','wedding_member_invitations') then
 if new.role='planner' and new.status in ('active','pending') and not vowora_private.has_feature(w,'premiumDesigns') then raise exception 'Planner access requires Luxury.' using errcode='42501'; end if;
 if new.role<>'owner' and new.status in ('active','pending') then
 if tg_table_name='wedding_members' then select u.email into email from auth.users u where u.id=new.user_id;
 else email:=coalesce(new.invited_email,new.email); end if;
 -- Reservation -> accepted member transfers its seat without counting twice.
 used:=vowora_private.collaborator_usage(w,old_id,email);
 lim:=(limits->>'maxCollaborators')::bigint;
 if lim is not null and used>=lim then raise exception 'Collaborator limit reached. Upgrade to invite more members.' using errcode='42501'; end if;
 end if;
 end if;
 if tg_table_name='gallery_assets' then
 if new.wall_visible and not vowora_private.has_feature(w,'weddingDay') and (tg_op='INSERT' or not coalesce(old.wall_visible,false)) then raise exception 'Live photo wall requires Luxury.' using errcode='42501'; end if;
 end if;
 if tg_table_name='gallery_moderation_rules' then
 if new.provider_config->'live_wall'->>'enabled'='true' and not vowora_private.has_feature(w,'weddingDay') and (tg_op='INSERT' or old.provider_config->'live_wall'->>'enabled' is distinct from 'true') then raise exception 'Live photo wall requires Luxury.' using errcode='42501'; end if;
 end if;
 if tg_table_name='wedding_website_configs' then
 if tg_op='UPDATE' then
 if new.sections_config is not distinct from old.sections_config and new.published_config is not distinct from old.published_config then return new; end if;
 end if;
 lim:=(limits->>'maxCustomSections')::bigint;
 if lim is not null and (vowora_private.custom_section_count(new.sections_config)>lim or vowora_private.custom_section_count(new.published_config->'sections_config')>lim) then
 raise exception 'Custom section limit reached. Upgrade to add more.' using errcode='42501'; end if;
 end if;
 return new;
end $$;
do $$ declare t record; begin
 for t in select table_name from information_schema.columns where table_schema='public' and column_name='wedding_id' loop
 if vowora_private.table_feature(t.table_name) is not null or t.table_name in ('guests','wedding_members','wedding_member_invitations','wedding_website_configs') then
 execute format('create trigger enforce_subscription before insert or update on public.%I for each row execute function vowora_private.enforce_wedding_entitlement()',t.table_name);
 end if;
 end loop;
end $$;

-- Storage limits count real stored object bytes, including uploads without asset records.
create or replace function vowora_private.storage_feature(path text) returns text language sql immutable set search_path='' as $$
 select case split_part(path,'/',1) when 'galleries' then 'gallery' when 'suppliers' then 'suppliers' end;
$$;
create policy storage_subscription on storage.objects as restrictive for all to authenticated
 using (bucket_id<>'private' or vowora_private.member_feature(public.storage_wedding_id(name),vowora_private.storage_feature(name)))
 with check (bucket_id<>'private' or vowora_private.member_feature(public.storage_wedding_id(name),vowora_private.storage_feature(name)));
create or replace function vowora_private.enforce_storage_entitlement() returns trigger language plpgsql security definer set search_path='' as $$
declare w uuid; f text; used numeric; lim numeric;
begin
 if new.bucket_id<>'private' then return new; end if;
 w:=public.storage_wedding_id(new.name); f:=vowora_private.storage_feature(new.name);
 -- Other service-owned private paths are not wedding gallery/supplier uploads.
 if w is null or f is null then return new; end if;
 perform 1 from public.weddings where id=w for update;
 if not vowora_private.has_feature(w,f) then raise exception 'Upgrade your subscription to upload files.' using errcode='42501'; end if;
 if f='gallery' then
 lim:=(vowora_private.plan_limits(vowora_private.effective_plan(w))->>'galleryStorageMb')::numeric*1048576;
 select coalesce(sum(coalesce((metadata->>'size')::numeric,0)),0) into used from storage.objects
 where bucket_id='private' and public.storage_wedding_id(name)=w and name like 'galleries/%' and id is distinct from new.id;
 if used+coalesce((new.metadata->>'size')::numeric,0)>lim then raise exception 'Gallery storage limit reached.' using errcode='42501'; end if;
 end if;
 return new;
end $$;
create trigger enforce_storage_subscription before insert or update on storage.objects for each row execute function vowora_private.enforce_storage_entitlement();

revoke all on all functions in schema vowora_private from public,anon,authenticated,service_role;
grant execute on function vowora_private.member_feature(uuid,text),vowora_private.member_entitlements(uuid),vowora_private.storage_feature(text) to authenticated;
revoke all on function public.get_wedding_entitlements(uuid) from public,anon;
grant execute on function public.get_wedding_entitlements(uuid) to authenticated;
revoke all on function public.require_wedding_feature(uuid,text) from public,anon,authenticated;
grant execute on function public.require_wedding_feature(uuid,text) to service_role;

create or replace function vowora_private.public_website_config(w uuid,c jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare sections jsonb; lim bigint;
begin
 lim:=(vowora_private.plan_limits(vowora_private.effective_plan(w))->>'maxCustomSections')::bigint;
 select coalesce(jsonb_agg(section order by ordinal),'[]'::jsonb) into sections from (
 select section,ordinal, count(*) filter(where section->>'type' in ('custom','custom_text')) over(order by ordinal) as custom_n
 from jsonb_array_elements(case when jsonb_typeof(c->'sections_config')='array' then c->'sections_config' else '[]'::jsonb end) with ordinality as x(section,ordinal)
 ) filtered where
 (section->>'type' not in ('travel','accommodation') or vowora_private.has_feature(w,'travel')) and
 (section->>'type'<>'gallery' or vowora_private.has_feature(w,'gallery')) and
 (section->>'type' not in ('custom','custom_text') or lim is null or custom_n<=lim);
 if not vowora_private.has_feature(w,'websiteCustomization') then
 c:=jsonb_set(c,'{theme_config}','{"preset":"classic","heading_font":"Playfair Display","body_font":"Lora","primary_color":"#2d2d2d","secondary_color":"#5a5a5a","accent_color":"#b8860b","background_color":"#fafaf8","text_color":"#1a1a1a","button_style":"rounded","card_style":"outlined","border_radius":8,"section_spacing":"normal","content_width":"normal"}'::jsonb);
 end if;
 return jsonb_set(c,'{sections_config}',sections);
end $$;
revoke all on function vowora_private.public_website_config(uuid,jsonb) from public,anon,authenticated,service_role;
create or replace function public.public_wedding_page(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'wedding',jsonb_build_object('id',w.id,'title',w.title,'partner_one_name',w.partner_one_name,'partner_two_name',w.partner_two_name,'wedding_date',w.wedding_date,'timezone',w.timezone,'dress_code',w.dress_code,'location',w.location,'slug',w.slug),
  'config',vowora_private.public_website_config(w.id,c.published_config),
  'features',jsonb_build_object('whiteLabel',vowora_private.has_feature(w.id,'whiteLabel')),
  'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'description',e.guest_description,'start_at',e.start_at,'end_at',e.end_at,'venue_id',e.venue_id) order by e.start_at) from public.wedding_events e where e.wedding_id=w.id and e.status='published' and e.visibility='public' and (e.reveal_at is null or e.reveal_at<=now())),'[]'::jsonb),
  'venues',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'address_line_1',v.address_line_1,'city',v.city,'postcode',v.postcode,'country',v.country)) from public.wedding_venues v where v.wedding_id=w.id and exists(select 1 from public.wedding_events e where e.venue_id=v.id and e.wedding_id=w.id and e.status='published' and e.visibility='public' and (e.reveal_at is null or e.reveal_at<=now()))),'[]'::jsonb),
  'faqs',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'question',f.question,'answer',f.answer) order by f.sort_order) from public.wedding_faqs f where f.wedding_id=w.id and f.status='published' and f.is_published),'[]'::jsonb),
  'places',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'description',p.description,'website',p.website) order by p.sort_order) from public.wedding_local_places p where p.wedding_id=w.id and vowora_private.has_feature(w.id,'travel') and p.is_approved and p.visibility='public' and (p.reveal_at is null or p.reveal_at<=now())),'[]'::jsonb)
 ) from public.weddings w join public.wedding_website_configs c on c.wedding_id=w.id
 where w.slug=p_slug and c.status='published' and c.published_config is not null and length(p_slug) between 1 and 160;
$$;

-- Paid planner seats lose workspace access on downgrade; their membership is retained for recovery.
create or replace function public.has_wedding_role(p_wedding_id uuid,p_roles text[]) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.wedding_members m where m.wedding_id=p_wedding_id and m.user_id=auth.uid() and m.status='active' and m.role=any(p_roles)
 and (m.role<>'planner' or vowora_private.effective_plan(p_wedding_id)='luxury'));
$$;

-- Ticket priority is derived from verified subscription state, never customer input.
create or replace function public.submit_customer_support_request(p_wedding_id uuid,p_category text,p_subject text,p_details text) returns text language plpgsql security definer set search_path='' as $$
declare request_ref text; customer_email text; wedding_name text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_wedding_id is not null and not public.is_wedding_member(p_wedding_id) then raise exception 'Wedding unavailable'; end if;
 if p_category is null or p_subject is null or p_details is null or p_category not in ('billing','authentication','invitations','rsvp','website','gallery','registry','guest_access','other') or length(trim(p_subject)) not between 1 and 160 or length(trim(p_details)) not between 10 and 4000 then raise exception 'Invalid support request'; end if;
 select email into customer_email from auth.users where id=auth.uid();
 select title into wedding_name from public.weddings where id=p_wedding_id;
 request_ref := 'SUP-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 insert into public.wedora_support_cases(user_id,case_ref,customer_email,wedding_id,wedding_name,category,subject,safe_summary,priority) values(auth.uid(),request_ref,customer_email,p_wedding_id,wedding_name,p_category,trim(p_subject),trim(p_details),case when p_wedding_id is not null and vowora_private.has_feature(p_wedding_id,'prioritySupport') then 'high' else 'medium' end);
 return request_ref;
end $$;
