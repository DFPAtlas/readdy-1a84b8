create table public.email_delivery_events(event_id text primary key,email_id text not null,event_type text not null,received_at timestamptz not null default now());
alter table public.email_delivery_events enable row level security;
create policy staff_email_events_read on public.email_delivery_events for select to authenticated using(public.is_platform_admin());
create or replace function public.apply_email_delivery_event(p_event_id text,p_email_id text,p_type text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare c public.email_campaign_recipients; l public.send_log; next_status text; claimed text;
begin
 if auth.role()<>'service_role' then raise exception 'Service access required'; end if;
 insert into public.email_delivery_events(event_id,email_id,event_type) values(p_event_id,p_email_id,p_type) on conflict do nothing returning event_id into claimed;
 if claimed is null then return; end if;
 next_status:=case p_type when 'email.delivered' then 'delivered' when 'email.bounced' then 'bounced' when 'email.complained' then 'complained' else null end;
 select * into c from public.email_campaign_recipients where resend_email_id=p_email_id for update;
 if c.id is not null then
  if next_status is not null and (next_status<>'delivered' or c.status not in ('bounced','complained')) then
   update public.email_campaign_recipients set status=next_status,delivered_at=case when next_status='delivered' then coalesce(delivered_at,now()) else delivered_at end where id=c.id;
  end if;
  if p_type='email.opened' then update public.email_campaign_recipients set opened_at=coalesce(opened_at,now()) where id=c.id; end if;
  if p_type='email.clicked' then update public.email_campaign_recipients set clicked_at=coalesce(clicked_at,now()) where id=c.id; end if;
  update public.email_campaigns set delivery_stats=(select jsonb_build_object('accepted',count(*) filter(where status='accepted'),'delivered',count(*) filter(where status='delivered'),'bounced',count(*) filter(where status='bounced'),'complained',count(*) filter(where status='complained'),'failed',count(*) filter(where status='failed')) from public.email_campaign_recipients where campaign_id=c.campaign_id) where id=c.campaign_id;
  if next_status in ('bounced','complained') then insert into public.email_suppressions(wedding_id,email,suppression_type,reason,resend_event_id) values(c.wedding_id,lower(c.recipient_email),next_status,left(p_reason,500),p_event_id) on conflict(wedding_id,email) do update set suppression_type=excluded.suppression_type,reason=excluded.reason; end if;
 end if;
 select * into l from public.send_log where resend_email_id=p_email_id for update;
 if l.id is not null and next_status is not null and (next_status<>'delivered' or l.status not in ('bounced','complained')) then
  update public.send_log set status=next_status,delivered_at=case when next_status='delivered' then coalesce(delivered_at,now()) else delivered_at end,updated_at=now() where id=l.id;
  update public.invitations set delivery_status=next_status where id=l.invitation_id;
  if next_status in ('bounced','complained') then insert into public.email_suppressions(wedding_id,email,suppression_type,reason,resend_event_id) select l.wedding_id,lower(email),next_status,left(p_reason,500),p_event_id from public.guests where id=l.guest_id and email is not null on conflict(wedding_id,email) do update set suppression_type=excluded.suppression_type; end if;
 end if;
end $$;
revoke all on function public.apply_email_delivery_event(text,text,text,text) from public,anon,authenticated;
grant execute on function public.apply_email_delivery_event(text,text,text,text) to service_role;
