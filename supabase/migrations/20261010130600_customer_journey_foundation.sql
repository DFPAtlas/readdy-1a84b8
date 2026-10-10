-- Phase 1: additive repairs against the audited Vowora public schema.
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists marketing_consent boolean not null default false;
alter table public.profiles add column if not exists marketing_consent_at timestamptz;
alter table public.weddings add column if not exists date_confirmed boolean not null default false;
alter table public.weddings add column if not exists estimated_guest_count integer;
alter table public.weddings add column if not exists created_by uuid;
alter table public.wedding_members add column if not exists invited_by uuid;
alter table public.wedding_members add column if not exists invited_email text;
alter table public.wedding_members add column if not exists accepted_at timestamptz;
alter table public.wedding_member_invitations add column if not exists invited_email text;
alter table public.wedding_member_invitations add column if not exists accepted_by uuid;
alter table public.wedding_member_invitations add column if not exists updated_at timestamptz default now();
update public.wedding_member_invitations set invited_email = email where invited_email is null;
update public.wedding_members set invited_email = email where invited_email is null;
alter table public.wedding_member_invitations alter column expires_at set default (now() + interval '7 days');
create unique index if not exists wedding_members_wedding_user_unique on public.wedding_members(wedding_id, user_id);
create unique index if not exists guest_portal_settings_wedding_unique on public.guest_portal_settings(wedding_id);
create unique index if not exists wedding_settings_wedding_unique on public.wedding_settings(wedding_id);
create table if not exists public.platform_admins (user_id uuid primary key references auth.users(id) on delete cascade, active boolean not null default true, created_at timestamptz not null default now());
alter table public.platform_admins enable row level security;
create policy platform_admins_self_read on public.platform_admins for select to authenticated using (user_id = auth.uid());
create table if not exists public.provisioning_requests (request_id uuid primary key, user_id uuid not null references auth.users(id), wedding_id uuid references public.weddings(id) on delete set null, status text not null default 'pending', payload_summary jsonb, error_message text, created_at timestamptz not null default now(), completed_at timestamptz);
alter table public.provisioning_requests enable row level security;
create table if not exists public.wedding_elements (id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings(id) on delete cascade, section text, field_name text, field_value text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.wedding_elements enable row level security;

create or replace function public.handle_vowora_signup() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, user_id, email, first_name, last_name, display_name, marketing_consent, marketing_consent_at)
  values(new.id, new.id, new.email, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', trim(coalesce(new.raw_user_meta_data->>'first_name','') || ' ' || coalesce(new.raw_user_meta_data->>'last_name','')), coalesce(new.raw_user_meta_data->>'marketing_consent','false') = 'true', case when new.raw_user_meta_data->>'marketing_consent' = 'true' then now() else null end)
  on conflict(id) do nothing;
  return new;
end;
$$;
drop trigger if exists vowora_auth_signup on auth.users;
create trigger vowora_auth_signup after insert on auth.users for each row execute function public.handle_vowora_signup();
revoke all on function public.handle_vowora_signup() from public;

create or replace function public.accept_wedding_member_invitation(p_token_hash text, p_user_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.wedding_member_invitations; account_email text;
begin
  select email into account_email from auth.users where id = p_user_id;
  select * into inv from public.wedding_member_invitations where token_hash = p_token_hash for update;
  if inv.id is null or inv.status not in ('pending','accepted') or inv.expires_at is null or inv.expires_at <= now() or lower(inv.invited_email) is distinct from lower(account_email) then raise exception 'Invitation unavailable'; end if;
  if inv.role not in ('partner','planner','collaborator','viewer') then raise exception 'Invalid invitation role'; end if;
  if inv.status = 'accepted' and inv.accepted_by is distinct from p_user_id then raise exception 'Invitation already used'; end if;
  insert into public.wedding_members(wedding_id,user_id,role,status,invited_by,invited_email,accepted_at)
    values(inv.wedding_id,p_user_id,inv.role,'active',inv.invited_by,inv.invited_email,now())
    on conflict(wedding_id,user_id) do update set status='active', role=case when public.wedding_members.role='owner' then 'owner' else excluded.role end;
  update public.wedding_member_invitations set status='accepted',accepted_by=p_user_id,accepted_at=coalesce(accepted_at,now()),updated_at=now() where id=inv.id;
  update public.profiles set onboarding_completed=true where id=p_user_id;
  return inv.wedding_id;
end;
$$;
revoke all on function public.accept_wedding_member_invitation(text,uuid) from public, anon, authenticated;
grant execute on function public.accept_wedding_member_invitation(text,uuid) to service_role;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists timezone text default 'Europe/London';
alter table public.wedding_events add column if not exists is_public boolean default true;
alter table public.wedding_events add column if not exists sort_order integer default 0;
alter table public.guest_portal_settings add column if not exists allow_guest_uploads boolean default true;
alter table public.guest_portal_settings add column if not exists require_upload_approval boolean default true;
alter table public.guest_portal_settings add column if not exists publish_mode text default 'draft';
alter table public.guest_portal_settings add column if not exists guest_password_enabled boolean default false;
alter table public.guest_portal_settings add column if not exists show_guest_count boolean default false;
alter table public.guest_portal_settings add column if not exists rsvp_questions_locked_after timestamptz;
alter table public.guest_portal_settings add column if not exists dietary_options jsonb default '[]';
alter table public.guest_portal_settings add column if not exists allergy_labels jsonb default '[]';
alter table public.wedding_settings add column if not exists search_engine_indexing boolean not null default false;
alter table public.wedding_settings add column if not exists guest_portal_enabled boolean not null default true;
alter table public.wedding_notification_preferences add column if not exists user_id uuid;
alter table public.invitation_designs add column if not exists title text default 'Untitled Invitation';
alter table public.invitation_designs add column if not exists user_id uuid;
alter table public.verified_senders add column if not exists user_id uuid;
alter table public.verified_senders add column if not exists is_verified boolean not null default false;
