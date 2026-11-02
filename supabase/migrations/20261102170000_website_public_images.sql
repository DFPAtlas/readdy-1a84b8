-- Public images for the wedding website (the social sharing image used for link
-- previews). Link-preview crawlers need a stable public URL, so these live in a
-- public bucket under website/<wedding_id>/<file>. Anyone can view a file by its URL
-- (as with any image on a public website), but only the couple and their planner can
-- list, upload, replace or delete their wedding's files.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('website-public','website-public',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.website_storage_wedding_id(path text) returns uuid language plpgsql immutable set search_path='' as $$
declare parts text[]:=string_to_array(path,'/'); begin
 if coalesce(array_length(parts,1),0)<>3 or parts[1]<>'website'
  or parts[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  or parts[3] !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$' then return null; end if;
 return parts[2]::uuid;
end $$;

drop policy if exists website_public_member_read on storage.objects;
drop policy if exists website_public_member_insert on storage.objects;
drop policy if exists website_public_member_update on storage.objects;
drop policy if exists website_public_member_delete on storage.objects;
create policy website_public_member_read on storage.objects for select to authenticated
 using(bucket_id='website-public' and public.has_wedding_role(public.website_storage_wedding_id(name),array['owner','partner','planner']));
create policy website_public_member_insert on storage.objects for insert to authenticated
 with check(bucket_id='website-public' and public.has_wedding_role(public.website_storage_wedding_id(name),array['owner','partner','planner']));
create policy website_public_member_update on storage.objects for update to authenticated
 using(bucket_id='website-public' and public.has_wedding_role(public.website_storage_wedding_id(name),array['owner','partner','planner']))
 with check(bucket_id='website-public' and public.has_wedding_role(public.website_storage_wedding_id(name),array['owner','partner','planner']));
create policy website_public_member_delete on storage.objects for delete to authenticated
 using(bucket_id='website-public' and public.has_wedding_role(public.website_storage_wedding_id(name),array['owner','partner','planner']));

-- Keep each wedding's public image folder small; the app removes replaced images.
create or replace function vowora_private.enforce_website_storage() returns trigger language plpgsql security definer set search_path='' as $$
declare w uuid; used bigint;
begin
 if new.bucket_id<>'website-public' then return new; end if;
 w:=public.website_storage_wedding_id(new.name);
 if w is null then raise exception 'Invalid website image path.' using errcode='42501'; end if;
 if tg_op='INSERT' then
  perform 1 from public.weddings where id=w for update;
  select count(*) into used from storage.objects where bucket_id='website-public' and public.website_storage_wedding_id(name)=w;
  if used>=20 then raise exception 'Website image limit reached. Remove an old image first.' using errcode='42501'; end if;
 end if;
 return new;
end $$;
revoke all on function vowora_private.enforce_website_storage() from public,anon,authenticated,service_role;
drop trigger if exists enforce_website_storage on storage.objects;
create trigger enforce_website_storage before insert or update on storage.objects for each row execute function vowora_private.enforce_website_storage();
