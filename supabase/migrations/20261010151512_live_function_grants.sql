-- Supabase's hosted default privileges explicitly grant functions to API roles.
-- Revoking PUBLIC alone does not remove those independent grants.
create or replace function public.increment_faq_counter(p_faq_id uuid,p_column text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_column='helpful_count' then update public.wedding_faqs set helpful_count=coalesce(helpful_count,0)+1 where id=p_faq_id;
 elsif p_column='not_helpful_count' then update public.wedding_faqs set not_helpful_count=coalesce(not_helpful_count,0)+1 where id=p_faq_id;
 else raise exception 'Invalid counter'; end if;
end $$;
create or replace function public.get_db_size_estimate() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_platform_admin() then raise exception 'Staff access required' using errcode='42501'; end if;
 return jsonb_build_object('bytes',pg_database_size(current_database()),'pretty',pg_size_pretty(pg_database_size(current_database())));
end $$;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
  if f.proname in ('has_wedding_role','is_wedding_member','is_platform_admin','close_wedding_guest_experience','submit_customer_support_request','get_db_size_estimate','public_wedding_page') then
   execute format('grant execute on function %s to authenticated',f.signature);
  end if;
  if f.proname='public_wedding_page' then execute format('grant execute on function %s to anon',f.signature); end if;
 end loop;
end $$;
