-- Real photo safety checks, run by Tron (DFG's own server) instead of the old
-- simulated scanner. Tron pulls work: it claims queued guest photos through the
-- gallery-scan-worker Edge Function, checks them on its own GPU and posts a verdict.
-- Nothing is ever approved because a check failed or never ran: unchecked photos
-- simply stay in the couple's approval queue.

alter table public.gallery_assets add column if not exists scan_status text;
alter table public.gallery_assets add column if not exists scan_attempts integer not null default 0;
alter table public.gallery_assets add column if not exists scan_claimed_at timestamptz;
alter table public.gallery_assets add column if not exists scan_score numeric;
alter table public.gallery_assets add column if not exists scan_labels jsonb;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='gallery_assets_scan_status_check') then
  alter table public.gallery_assets add constraint gallery_assets_scan_status_check
   check (scan_status is null or scan_status in ('queued','claimed','done','failed','skipped'));
 end if;
end $$;
create index if not exists gallery_assets_scan_queue_idx on public.gallery_assets(scan_status,created_at)
 where scan_status in ('queued','claimed');

-- Guest uploads are queued automatically, whichever route created them.
create or replace function vowora_private.queue_gallery_scan() returns trigger language plpgsql set search_path='' as $$
begin
 if new.scan_status is null and coalesce(new.source_type,'')='guest' and new.moderation_status in ('pending','uploading','processing') then
  new.scan_status:=case when coalesce(new.mime_type,'') like 'image/%' then 'queued' else 'skipped' end;
 end if;
 return new;
end $$;
revoke all on function vowora_private.queue_gallery_scan() from public,anon,authenticated,service_role;
drop trigger if exists queue_gallery_scan on public.gallery_assets;
create trigger queue_gallery_scan before insert on public.gallery_assets for each row execute function vowora_private.queue_gallery_scan();

-- Clients cannot fake a scan result: only the server functions below change scan fields.
create or replace function vowora_private.protect_gallery_scan_fields() returns trigger language plpgsql set search_path='' as $$
begin
 -- Only signed-in/anonymous API callers are restricted; server code and migrations are not.
 if current_setting('vowora.recording_scan',true)='on' or coalesce(auth.role(),'') not in ('authenticated','anon') then return new; end if;
 new.scan_status:=old.scan_status; new.scan_attempts:=old.scan_attempts; new.scan_claimed_at:=old.scan_claimed_at;
 new.scan_score:=old.scan_score; new.scan_labels:=old.scan_labels;
 new.moderation_scanned_at:=old.moderation_scanned_at; new.scanned_by:=old.scanned_by;
 return new;
end $$;
revoke all on function vowora_private.protect_gallery_scan_fields() from public,anon,authenticated,service_role;
drop trigger if exists protect_scan_fields on public.gallery_assets;
create trigger protect_scan_fields before update on public.gallery_assets for each row execute function vowora_private.protect_gallery_scan_fields();

-- Hand out up to p_limit photos to check. Claims expire after 10 minutes so a
-- crashed worker never strands a photo; after 3 attempts the photo is left for
-- the couple to review by hand.
create or replace function public.claim_gallery_scans(p_limit integer default 10)
returns table(asset_id uuid, wedding_id uuid, storage_path text, mime_type text)
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
begin
 perform set_config('vowora.recording_scan','on',true);
 update public.gallery_assets a set scan_status='failed',
   moderation_status=case when a.moderation_status in ('pending','scanning','uploading','processing') then 'awaiting_review' else a.moderation_status end,
   moderation_ai_label=coalesce(a.moderation_ai_label,'Not checked'), updated_at=now()
  where a.scan_status in ('queued','claimed') and a.scan_attempts>=3
   and (a.scan_status='queued' or a.scan_claimed_at<now()-interval '10 minutes');
 return query
 update public.gallery_assets a set scan_status='claimed', scan_claimed_at=now(), scan_attempts=a.scan_attempts+1
  where a.id in (
   select g.id from public.gallery_assets g
   where (g.scan_status='queued' or (g.scan_status='claimed' and g.scan_claimed_at<now()-interval '10 minutes'))
    and g.scan_attempts<3 and vowora_private.has_feature(g.wedding_id,'gallery')
   order by g.created_at limit greatest(1,least(coalesce(p_limit,10),25))
   for update skip locked)
 returning a.id, a.wedding_id, a.storage_path, a.mime_type;
end $$;

-- Record Tron's verdict and apply the couple's moderation rules.
--   clean   -> auto-approved only when the couple turned off manual approval and the
--              photo came from a personal invitation link; otherwise awaiting review.
--   flagged -> held for the couple, with the reason shown.
--   error   -> retried (up to 3 attempts), then left for manual review.
-- A decision the couple already made is never overwritten.
create or replace function public.record_gallery_scan(p_asset_id uuid, p_verdict text, p_labels jsonb default '[]'::jsonb, p_score numeric default null, p_model text default null, p_reason text default null)
returns text language plpgsql security definer set search_path='' as $$
declare a public.gallery_assets; r public.gallery_moderation_rules; undecided boolean; auto boolean; final text;
begin
 if p_verdict not in ('clean','flagged','error') then raise exception 'Unknown verdict' using errcode='22023'; end if;
 select * into a from public.gallery_assets where id=p_asset_id for update;
 if not found or a.scan_status<>'claimed' then return 'ignored'; end if;
 perform set_config('vowora.recording_scan','on',true);
 undecided:=a.moderation_status in ('pending','scanning','uploading','processing','awaiting_review');
 if p_verdict='error' then
  update public.gallery_assets set
   scan_status=case when scan_attempts>=3 then 'failed' else 'queued' end,
   moderation_status=case when scan_attempts>=3 and undecided then 'awaiting_review' else moderation_status end,
   moderation_ai_label=case when scan_attempts>=3 then coalesce(moderation_ai_label,'Not checked') else moderation_ai_label end,
   updated_at=now()
  where id=p_asset_id returning moderation_status into final;
  return final;
 end if;
 select * into r from public.gallery_moderation_rules where wedding_id=a.wedding_id;
 auto:=p_verdict='clean' and undecided and found and r.manual_approval_required is false and a.uploaded_by_invitation_id is not null;
 update public.gallery_assets set
  scan_status='done', scan_claimed_at=null,
  scan_score=p_score,
  scan_labels=coalesce(p_labels,'[]'::jsonb),
  scanned_by=left(coalesce(nullif(p_model,''),'tron'),120),
  moderation_scanned_at=now(),
  moderation_ai_label=case when p_verdict='clean' then 'No issues found'
   else left('Flagged: '||coalesce((select string_agg(value,', ') from jsonb_array_elements_text(case when jsonb_typeof(p_labels)='array' then p_labels else '[]'::jsonb end) value),'needs review'),120) end,
  moderation_reason=case when p_verdict='flagged' then left(coalesce(nullif(p_reason,''),'Flagged by the automatic safety check'),300) else moderation_reason end,
  moderation_status=case when not undecided then moderation_status when p_verdict='flagged' then 'held' when auto then 'approved' else 'awaiting_review' end,
  moderation_updated_by=case when undecided then 'tron' else moderation_updated_by end,
  moderation_updated_at=case when undecided then now() else moderation_updated_at end,
  publication_status=case when auto then 'published' else publication_status end,
  published_at=case when auto then now() else published_at end,
  wall_visible=case when auto and r.auto_add_to_wall and vowora_private.has_feature(a.wedding_id,'weddingDay') then true else wall_visible end,
  wall_added_at=case when auto and r.auto_add_to_wall and vowora_private.has_feature(a.wedding_id,'weddingDay') then now() else wall_added_at end,
  updated_at=now()
 where id=p_asset_id returning moderation_status into final;
 return final;
end $$;

revoke all on function public.claim_gallery_scans(integer) from public,anon,authenticated;
revoke all on function public.record_gallery_scan(uuid,text,jsonb,numeric,text,text) from public,anon,authenticated;
grant execute on function public.claim_gallery_scans(integer) to service_role;
grant execute on function public.record_gallery_scan(uuid,text,jsonb,numeric,text,text) to service_role;

-- Photos already waiting from before this change get checked too.
update public.gallery_assets set scan_status='queued'
 where scan_status is null and source_type='guest' and moderation_status in ('pending','awaiting_review','scanning') and mime_type like 'image/%';
