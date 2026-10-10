alter table public.invitations add column if not exists design_document jsonb;
-- Canonical guest -> invitation -> token -> delivery record, prepared atomically.
alter table public.send_log add column if not exists resend_email_id text;
alter table public.send_log add column if not exists updated_at timestamptz default now();
create unique index if not exists send_log_submission_guest on public.send_log(submission_id,guest_id);
create unique index if not exists invitation_token_digest_unique on public.invitation_access_tokens(token_hash);
create or replace function public.prepare_design_invitation_send(p_design uuid,p_guest uuid,p_submission text,p_token_hash text,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.invitation_designs; g public.guests; l public.send_log; inv uuid;
begin
 if auth.role()<>'service_role' then raise exception 'Service access required'; end if;
 select * into d from public.invitation_designs where id=p_design;
 select * into g from public.guests where id=p_guest and wedding_id=d.wedding_id and archived_at is null;
 if g.id is null or not exists(select 1 from public.wedding_members where wedding_id=d.wedding_id and user_id=p_actor and status='active' and role in ('owner','partner','planner')) then raise exception 'Invitation unavailable'; end if;
 if exists(select 1 from public.email_suppressions where wedding_id=d.wedding_id and lower(email)=lower(g.email)) then raise exception 'This guest has opted out or cannot receive email'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_submission||p_guest::text,0));
 select * into l from public.send_log where submission_id=p_submission and guest_id=p_guest;
 if l.id is not null then
  if l.wedding_id<>d.wedding_id then raise exception 'Submission unavailable'; end if;
  return jsonb_build_object('log_id',l.id,'invitation_id',l.invitation_id,'status',l.status,'created_at',l.created_at,'resend_email_id',l.resend_email_id);
 end if;
 select i.id into inv from public.invitations i join public.invitation_recipients r on r.invitation_id=i.id where i.wedding_id=d.wedding_id and i.design_id=d.id and r.guest_id=g.id and i.status not in ('cancelled','archived') order by i.created_at limit 1;
 if inv is null then
  insert into public.invitations(wedding_id,design_id,household_id,internal_name,formal_recipient_name,invitation_type,status) values(d.wedding_id,d.id,g.household_id,d.title,g.full_name,'individual','draft') returning id into inv;
  insert into public.invitation_recipients(wedding_id,invitation_id,guest_id,recipient_role,ceremony_included,reception_included,evening_included,plus_one_allowed) values(d.wedding_id,inv,g.id,'primary',g.ceremony_invited,g.reception_invited,g.evening_invited,g.plus_one_allowed);
 end if;
 update public.invitations set design_document=d.document where id=inv;
 insert into public.invitation_access_tokens(wedding_id,invitation_id,token_hash,status,created_by) values(d.wedding_id,inv,p_token_hash,'active',p_actor);
 insert into public.send_log(wedding_id,invitation_id,guest_id,channel,status,submission_id) values(d.wedding_id,inv,g.id,'email','queued',p_submission) returning * into l;
 return jsonb_build_object('log_id',l.id,'invitation_id',inv,'status',l.status,'created_at',l.created_at,'resend_email_id',l.resend_email_id);
end $$;
revoke all on function public.prepare_design_invitation_send(uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.prepare_design_invitation_send(uuid,uuid,text,text,uuid) to service_role;
-- Only verified provider events or backend services can change money and delivery state.
do $$ declare t text; p record; begin
 foreach t in array array['verified_senders','send_log','gift_contributions','gift_fund_contributions','gift_fund_events','security_events','guest_access_security_events'] loop
  for p in select policyname from pg_policies where schemaname='public' and tablename=t and cmd<>'SELECT' loop execute format('drop policy %I on public.%I',p.policyname,t); end loop;
 end loop;
end $$;
