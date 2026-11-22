-- ── In-app notifications: per-user read state ──
-- Notifications are derived live from workspace records (RSVPs, questions,
-- gallery uploads, payments, tasks). Only the read/unread state is stored, per
-- signed-in user, so it follows them across devices.
create table if not exists public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  dedup_key text not null check (char_length(dedup_key) between 1 and 200),
  read_at timestamptz not null default now(),
  constraint notification_reads_unique unique (wedding_id, user_id, dedup_key)
);
create index if not exists notification_reads_user_wedding_idx on public.notification_reads(user_id, wedding_id);
alter table public.notification_reads enable row level security;

drop policy if exists notification_reads_select on public.notification_reads;
create policy notification_reads_select on public.notification_reads for select to authenticated
  using (user_id = auth.uid() and public.is_wedding_member(wedding_id));
drop policy if exists notification_reads_insert on public.notification_reads;
create policy notification_reads_insert on public.notification_reads for insert to authenticated
  with check (user_id = auth.uid() and public.is_wedding_member(wedding_id));
drop policy if exists notification_reads_update on public.notification_reads;
create policy notification_reads_update on public.notification_reads for update to authenticated
  using (user_id = auth.uid() and public.is_wedding_member(wedding_id))
  with check (user_id = auth.uid() and public.is_wedding_member(wedding_id));
drop policy if exists notification_reads_delete on public.notification_reads;
create policy notification_reads_delete on public.notification_reads for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.notification_reads from anon;
grant select, insert, update, delete on table public.notification_reads to authenticated;

-- ── Ownership transfer ──
-- The current owner hands the workspace to another active collaborator, who
-- becomes owner; the previous owner stays on as a partner. RLS forbids
-- anyone changing an owner row directly, so this runs as a checked function.
-- The new owner is promoted first so the collaborator seat it frees is
-- available when the previous owner is counted as a partner.
create or replace function public.transfer_wedding_ownership(p_wedding_id uuid, p_new_owner_member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_caller uuid := auth.uid();
  v_target public.wedding_members;
begin
  if v_caller is null then
    raise exception 'Sign in to transfer ownership.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.wedding_members
    where wedding_id = p_wedding_id and user_id = v_caller and role = 'owner' and status = 'active'
  ) then
    raise exception 'Only the current owner can transfer ownership.' using errcode = '42501';
  end if;

  select * into v_target from public.wedding_members
  where id = p_new_owner_member_id and wedding_id = p_wedding_id
  for update;
  if not found or v_target.status <> 'active' or v_target.user_id is null then
    raise exception 'The new owner must be an active collaborator on this wedding.' using errcode = '22023';
  end if;
  if v_target.user_id = v_caller then
    raise exception 'You already own this wedding.' using errcode = '22023';
  end if;

  update public.wedding_members set role = 'owner', updated_at = now()
  where id = p_new_owner_member_id;

  update public.wedding_members set role = 'partner', updated_at = now()
  where wedding_id = p_wedding_id and user_id = v_caller and role = 'owner';
end $$;

revoke all on function public.transfer_wedding_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_wedding_ownership(uuid, uuid) to authenticated;
