-- Stock invitation assets are public; uploaded wedding photos and supplier documents stay private.
insert into storage.buckets(id,name,public) values('private','private',false),('invitation-assets','invitation-assets',true) on conflict(id) do update set public=excluded.public;
create or replace function public.storage_wedding_id(path text) returns uuid language plpgsql immutable set search_path='' as $$
declare parts text[]:=string_to_array(path,'/'); begin
 if parts[1] not in ('galleries','suppliers') or parts[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if; return parts[2]::uuid;
end $$;
create policy wedding_private_read on storage.objects for select to authenticated using(bucket_id='private' and public.has_wedding_role(public.storage_wedding_id(name),array['owner','partner','planner']));
create policy wedding_private_insert on storage.objects for insert to authenticated with check(bucket_id='private' and public.has_wedding_role(public.storage_wedding_id(name),array['owner','partner','planner']));
create policy wedding_private_update on storage.objects for update to authenticated using(bucket_id='private' and public.has_wedding_role(public.storage_wedding_id(name),array['owner','partner','planner'])) with check(bucket_id='private' and public.has_wedding_role(public.storage_wedding_id(name),array['owner','partner','planner']));
create policy wedding_private_delete on storage.objects for delete to authenticated using(bucket_id='private' and public.has_wedding_role(public.storage_wedding_id(name),array['owner','partner','planner']));
create policy stock_assets_read on storage.objects for select to anon,authenticated using(bucket_id='invitation-assets');
create policy staff_stock_assets on storage.objects for all to authenticated using(bucket_id='invitation-assets' and public.is_platform_admin()) with check(bucket_id='invitation-assets' and public.is_platform_admin());
