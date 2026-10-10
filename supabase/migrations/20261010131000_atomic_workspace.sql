alter table public.wedora_subscription_plans add column if not exists stripe_yearly_price_id text;
create or replace function public.provision_customer_workspace(p_user uuid,p_payload jsonb,p_ceremony timestamptz,p_reception timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.weddings; v1 uuid; v2 uuid; base text; candidate text; cat text; n int:=0; priority text;
begin
 if auth.role()<>'service_role' or not exists(select 1 from auth.users where id=p_user) then raise exception 'Service access required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select x.* into w from public.weddings x join public.wedding_members m on m.wedding_id=x.id where m.user_id=p_user and m.role='owner' and m.status='active' order by x.created_at limit 1;
 if w.id is not null then update public.profiles set onboarding_completed=true where id=p_user; return jsonb_build_object('success',true,'already_provisioned',true,'wedding_id',w.id,'summary',to_jsonb(w)); end if;
 base:=trim(both '-' from regexp_replace(lower(p_payload->>'display_name'),'[^a-z0-9]+','-','g'));
 if length(base)<3 then base:='our-wedding'; end if;
 candidate:=left(base,70)||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8);
 insert into public.weddings(title,slug,partner_one_name,partner_two_name,wedding_date,date_confirmed,timezone,location,estimated_guest_count,status,created_by)
 values(p_payload->>'display_name',candidate,p_payload->>'partner_one_first',p_payload->>'partner_two_first',nullif(p_payload->>'wedding_date','')::date,nullif(p_payload->>'wedding_date','') is not null,p_payload->>'timezone',p_payload->>'location',(p_payload->>'guest_estimate')::int,'planning',p_user) returning * into w;
 insert into public.wedding_members(wedding_id,user_id,profile_id,email,role,status) select w.id,p_user,p_user,email,'owner','active' from auth.users where id=p_user;
 if nullif(p_payload->>'ceremony_venue','') is not null then
  insert into public.wedding_venues(wedding_id,name,venue_type,city,country) values(w.id,p_payload->>'ceremony_venue','ceremony',p_payload->>'location','United Kingdom') returning id into v1;
 end if;
 if nullif(p_payload->>'reception_venue','') is not null then
  if lower(p_payload->>'reception_venue')=lower(p_payload->>'ceremony_venue') and v1 is not null then v2:=v1; update public.wedding_venues set venue_type='ceremony_reception' where id=v1;
  else insert into public.wedding_venues(wedding_id,name,venue_type,city,country) values(w.id,p_payload->>'reception_venue','reception',p_payload->>'location','United Kingdom') returning id into v2; end if;
 end if;
 insert into public.wedding_events(wedding_id,event_type,name,start_at,venue_id,visibility,status) values(w.id,'ceremony','Wedding Ceremony',p_ceremony,v1,'public','draft'),(w.id,'reception','Wedding Reception',p_reception,v2,'public','draft'),(w.id,'evening','Evening Celebration',null,null,'public','draft');
 foreach cat in array array['Venue','Catering','Photography','Entertainment','Flowers & Décor','Attire','Transport','Stationery','Accommodation','Contingency'] loop
  n:=n+1;
  insert into public.budget_categories(wedding_id,name,category_key,sort_order,is_default,status,planned_amount,quoted_amount,committed_amount,paid_amount) values(w.id,cat,regexp_replace(lower(cat),'[^a-z]+','_','g'),n,true,'active',0,0,0,0);
 end loop;
 -- A new workspace starts private; publishing is an explicit later step.
 insert into public.guest_portal_settings(wedding_id,portal_enabled,rsvp_enabled,household_rsvp_enabled,allow_rsvp_updates) values(w.id,false,false,false,true);
 for priority in select jsonb_array_elements_text(p_payload->'priorities') loop
  if length(trim(priority))>0 then insert into public.wedding_elements(wedding_id,section,field_name,field_value) values(w.id,'planning_priorities',left(priority,120),'selected'); end if;
 end loop;
 update public.profiles set first_name=p_payload->>'partner_one_first',last_name=p_payload->>'partner_one_last',display_name=p_payload->>'display_name',onboarding_completed=true,updated_at=now() where id=p_user;
 insert into public.guest_activity_log(wedding_id,action,summary) values(w.id,'workspace_provisioned','Wedding workspace created via onboarding');
 return jsonb_build_object('success',true,'already_provisioned',false,'wedding_id',w.id,'summary',to_jsonb(w));
end $$;
revoke all on function public.provision_customer_workspace(uuid,jsonb,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.provision_customer_workspace(uuid,jsonb,timestamptz,timestamptz) to service_role;
