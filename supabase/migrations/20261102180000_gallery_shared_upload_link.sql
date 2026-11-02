-- Wedding-wide photo upload link (and the live wall QR code that opens it).
-- Guests normally upload through their personal invitation link. This adds one
-- optional shared link per wedding that anyone at the wedding can open from a QR
-- code. Uploads made through it always wait in the couple's approval queue, are
-- rate limited per device, and count towards the gallery storage limit. The couple
-- can switch the link off or replace it (which stops the old QR code working).

create table if not exists public.gallery_shared_upload_links (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null unique references public.weddings(id) on delete cascade,
  token text not null unique,
  album_id uuid references public.gallery_albums(id) on delete set null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rotated_at timestamptz
);
alter table public.gallery_shared_upload_links enable row level security;
create index if not exists gallery_shared_upload_links_album_idx on public.gallery_shared_upload_links(album_id);

-- Tokens are always generated here, never chosen by the client. A token only
-- changes through rotate_gallery_shared_upload_link().
create or replace function vowora_private.gallery_shared_upload_link_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.token:=replace(gen_random_uuid()::text,'-','');
 elsif current_setting('vowora.rotating_upload_link',true)='on' then
  new.token:=replace(gen_random_uuid()::text,'-','');
  new.rotated_at:=now();
 else
  new.token:=old.token;
  new.id:=old.id;
  new.rotated_at:=old.rotated_at;
  if new.wedding_id is distinct from old.wedding_id then raise exception 'Wedding cannot be reassigned' using errcode='42501'; end if;
 end if;
 if new.album_id is not null and not exists(select 1 from public.gallery_albums a where a.id=new.album_id and a.wedding_id=new.wedding_id) then
  raise exception 'Album belongs to another wedding' using errcode='42501';
 end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function vowora_private.gallery_shared_upload_link_guard() from public,anon,authenticated,service_role;
drop trigger if exists guard_token on public.gallery_shared_upload_links;
create trigger guard_token before insert or update on public.gallery_shared_upload_links for each row execute function vowora_private.gallery_shared_upload_link_guard();
drop trigger if exists enforce_subscription on public.gallery_shared_upload_links;
create trigger enforce_subscription before insert or update on public.gallery_shared_upload_links for each row execute function vowora_private.enforce_wedding_entitlement();

drop policy if exists scoped_read on public.gallery_shared_upload_links;
drop policy if exists scoped_insert on public.gallery_shared_upload_links;
drop policy if exists scoped_update on public.gallery_shared_upload_links;
drop policy if exists scoped_delete on public.gallery_shared_upload_links;
create policy scoped_read on public.gallery_shared_upload_links for select to authenticated using (public.has_wedding_role(wedding_id,array['owner','partner','planner']));
create policy scoped_insert on public.gallery_shared_upload_links for insert to authenticated with check (public.has_wedding_role(wedding_id,array['owner','partner','planner']));
create policy scoped_update on public.gallery_shared_upload_links for update to authenticated using (public.has_wedding_role(wedding_id,array['owner','partner','planner'])) with check (public.has_wedding_role(wedding_id,array['owner','partner','planner']));
create policy scoped_delete on public.gallery_shared_upload_links for delete to authenticated using (public.has_wedding_role(wedding_id,array['owner','partner','planner']));
-- Same paid "gallery" feature as every other gallery table.
drop policy if exists subscription_read on public.gallery_shared_upload_links;
drop policy if exists subscription_insert on public.gallery_shared_upload_links;
drop policy if exists subscription_update on public.gallery_shared_upload_links;
drop policy if exists subscription_delete on public.gallery_shared_upload_links;
create policy subscription_read on public.gallery_shared_upload_links as restrictive for select to authenticated using (public.is_platform_admin() or vowora_private.member_feature(wedding_id,'gallery'));
create policy subscription_insert on public.gallery_shared_upload_links as restrictive for insert to authenticated with check (vowora_private.member_feature(wedding_id,'gallery'));
create policy subscription_update on public.gallery_shared_upload_links as restrictive for update to authenticated using (vowora_private.member_feature(wedding_id,'gallery')) with check (vowora_private.member_feature(wedding_id,'gallery'));
create policy subscription_delete on public.gallery_shared_upload_links as restrictive for delete to authenticated using (vowora_private.member_feature(wedding_id,'gallery'));
revoke all on public.gallery_shared_upload_links from anon;

-- Replace the link (old QR codes stop working). Runs as the caller, so the row
-- policies above decide who may do it.
create or replace function public.rotate_gallery_shared_upload_link(p_wedding_id uuid) returns text language plpgsql set search_path='' as $$
declare new_token text;
begin
 perform set_config('vowora.rotating_upload_link','on',true);
 update public.gallery_shared_upload_links set enabled=enabled where wedding_id=p_wedding_id returning token into new_token;
 perform set_config('vowora.rotating_upload_link','off',true);
 if new_token is null then raise exception 'No shared upload link to replace' using errcode='P0002'; end if;
 return new_token;
end $$;
revoke all on function public.rotate_gallery_shared_upload_link(uuid) from public,anon;
grant execute on function public.rotate_gallery_shared_upload_link(uuid) to authenticated;

-- Server-side record of shared-link upload attempts, used for rate limiting.
-- Only the Edge Function (service role) reads or writes it.
create table if not exists public.gallery_shared_upload_activity (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  fingerprint text not null,
  outcome text not null,
  created_at timestamptz not null default now()
);
alter table public.gallery_shared_upload_activity enable row level security;
revoke all on public.gallery_shared_upload_activity from anon,authenticated;
create index if not exists gallery_shared_upload_activity_rate_idx on public.gallery_shared_upload_activity(wedding_id,fingerprint,created_at);
create index if not exists gallery_shared_upload_activity_wedding_idx on public.gallery_shared_upload_activity(wedding_id,created_at);
