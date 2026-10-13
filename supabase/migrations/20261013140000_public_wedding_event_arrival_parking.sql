-- Expose the per-event arrival and parking notes on the public wedding page
-- payload. Guests travelling between multiple venues should see each event's
-- own arrival lead time, arrival notes and parking notes on the schedule.
create or replace function public.public_wedding_page(p_slug text)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
 select jsonb_build_object(
  'wedding',jsonb_build_object('id',w.id,'title',w.title,'partner_one_name',w.partner_one_name,'partner_two_name',w.partner_two_name,'wedding_date',w.wedding_date,'timezone',w.timezone,'dress_code',w.dress_code,'location',w.location,'slug',w.slug),
  'config',vowora_private.public_website_config(w.id,c.published_config),
  'features',jsonb_build_object('whiteLabel',vowora_private.has_feature(w.id,'whiteLabel')),
  'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'description',e.guest_description,'start_at',e.start_at,'end_at',e.end_at,'dress_code',e.dress_code,'arrival_notes',e.arrival_notes,'arrival_offset_minutes',e.arrival_offset_minutes,'parking_notes',e.parking_notes,'venue_id',e.venue_id) order by e.start_at) from public.wedding_events e where e.wedding_id=w.id and e.status='published' and e.visibility='public' and (e.reveal_at is null or e.reveal_at<=now())),'[]'::jsonb),
  'venues',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'address_line_1',v.address_line_1,'city',v.city,'postcode',v.postcode,'country',v.country)) from public.wedding_venues v where v.wedding_id=w.id and exists(select 1 from public.wedding_events e where e.venue_id=v.id and e.wedding_id=w.id and e.status='published' and e.visibility='public' and (e.reveal_at is null or e.reveal_at<=now()))),'[]'::jsonb),
  'faqs',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'question',f.question,'answer',f.answer) order by f.sort_order) from public.wedding_faqs f where f.wedding_id=w.id and f.status='published' and f.is_published),'[]'::jsonb),
  'places',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'description',p.description,'website',p.website) order by p.sort_order) from public.wedding_local_places p where p.wedding_id=w.id and vowora_private.has_feature(w.id,'travel') and p.is_approved and p.visibility='public' and (p.reveal_at is null or p.reveal_at<=now())),'[]'::jsonb)
 ) from public.weddings w join public.wedding_website_configs c on c.wedding_id=w.id
 where w.slug=p_slug and c.status='published' and c.published_config is not null and length(p_slug) between 1 and 160;
$function$;

grant execute on function public.public_wedding_page(text) to anon;
grant execute on function public.public_wedding_page(text) to authenticated;