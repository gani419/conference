
alter table public.meetings add column expires_at timestamptz;
alter table public.meetings add constraint meeting_expiry_after_start check (expires_at is null or expires_at > starts_at);
create index meetings_due_expiry on public.meetings(expires_at) where status in ('scheduled','live') and expires_at is not null;
-- Existing meetings retain their original lifetime. New meetings get a two-hour default.
create function private.default_meeting_expiry() returns trigger language plpgsql set search_path='' as $$
begin
  if new.expires_at is null then new.expires_at:=new.starts_at+interval '2 hours'; end if;
  return new;
end $$;
revoke all on function private.default_meeting_expiry() from public,anon,authenticated;
create trigger default_meeting_expiry before insert on public.meetings for each row execute function private.default_meeting_expiry();
create function private.invitee_suggestions(query text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor auth.users; result jsonb; q text:=lower(trim(query));
begin
  select * into actor from auth.users where id=auth.uid();
  if actor.id is null or actor.is_anonymous or actor.deleted_at is not null or actor.banned_until>now() then raise exception 'ACCOUNT_REQUIRED' using errcode='42501'; end if;
  if length(q)>100 then raise exception 'INVALID_QUERY'; end if;
  select coalesce(jsonb_agg(to_jsonb(rows)),'[]') into result from (
    select distinct on (email) email,display_name,avatar_id,source from (
      select i.email,i.display_name,coalesce(p.avatar_id,'avatar-1') avatar_id,'recent'::text source,i.created_at
      from public.invitations i join public.meetings m on m.id=i.meeting_id
      left join auth.users u on lower(u.email)=i.email and not u.is_anonymous and u.deleted_at is null
      left join public.profiles p on p.id=u.id
      where m.organizer_id=actor.id and (q='' or position(q in lower(i.display_name))>0 or position(q in i.email)>0)
      union all
      select lower(u.email),p.display_name,p.avatar_id,'account',u.created_at
      from auth.users u join public.profiles p on p.id=u.id
      where q=lower(u.email) and position('@' in q)>1 and u.id<>actor.id and not u.is_anonymous and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
    ) candidates order by email,created_at desc limit 8
  ) rows;
  return result;
end $$;
revoke all on function private.invitee_suggestions(text) from public,anon;
grant execute on function private.invitee_suggestions(text) to authenticated;
create function private.expire_due_meetings() returns integer language plpgsql security definer set search_path='' as $$
declare m public.meetings; affected integer:=0;
begin
  for m in select * from public.meetings where expires_at<=now() and status in ('scheduled','live') for update skip locked loop
    update public.meetings set status='ended',ended_at=now(),version=version+1,updated_at=now() where id=m.id;
    update public.participants set status='left',left_at=now(),is_hand_raised=false,hand_raised_at=null where meeting_id=m.id and status in ('in_lobby','in_meeting');
    update public.attendance set left_at=now() where meeting_id=m.id and left_at is null;
    insert into private.outbox(meeting_id,kind,payload) values(m.id,'media_close','{}');
    affected:=affected+1;
  end loop;
  return affected;
end $$;
revoke all on function private.expire_due_meetings() from public,anon,authenticated;
select cron.schedule('conference-meeting-expiry','* * * * *','select private.expire_due_meetings()');

create or replace function private.command(action text, payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid();
  actor auth.users;
  mid uuid;
  m public.meetings;
  p public.participants;
  target public.participants;
  inv public.invitations;
  req public.permission_requests;
  msg public.chat_messages;
  prof public.profiles;
  item jsonb;
  perms jsonb;
  role_name text;
  result jsonb;
  count_rows integer;
begin
  if uid is null then raise exception 'UNAUTHENTICATED' using errcode='42501'; end if;
  select * into actor from auth.users where id=uid;
  if actor.id is null or actor.deleted_at is not null or actor.banned_until > now() then raise exception 'ACCOUNT_DISABLED' using errcode='42501'; end if;
  if not actor.is_anonymous and actor.email_confirmed_at is null then raise exception 'EMAIL_NOT_VERIFIED' using errcode='42501'; end if;
  select * into prof from public.profiles where id=uid;

  if action='create_meeting' then
    if actor.is_anonymous then raise exception 'GUEST_CANNOT_HOST' using errcode='42501'; end if;
    perms := '{"microphone":false,"camera":false,"screenShare":false,"chat":true}'::jsonb || private.validate_permissions(payload->'defaultPermissions');
    if payload#>>'{timing,kind}' not in ('instant','scheduled') then raise exception 'INVALID_TIMING' using errcode='22023'; end if;
    if payload#>>'{timing,kind}'='scheduled' and (payload#>>'{timing,startsAt}')::timestamptz <= now() then raise exception 'START_TIME_IN_PAST' using errcode='22023'; end if;
    insert into public.meetings(organizer_id,title,description,timing_kind,starts_at,timezone,guest_access,default_permissions,status,actual_start_time,expires_at)
    values(uid,payload->>'title',coalesce(payload->>'description',''),payload#>>'{timing,kind}',
      case when payload#>>'{timing,kind}'='instant' then now() else (payload#>>'{timing,startsAt}')::timestamptz end,
      coalesce(payload#>>'{timing,timezone}','Asia/Kolkata'),coalesce((payload->>'guestAccess')::boolean,true),perms,
      case when payload#>>'{timing,kind}'='instant' then 'live' else 'scheduled' end,
      case when payload#>>'{timing,kind}'='instant' then now() end, (payload->>'expiresAt')::timestamptz) returning * into m;
    mid:=m.id;
    if m.status='live' then
      insert into public.participants(meeting_id,user_id,display_name,avatar_id,role,status,permissions,joined_at)
      values(mid,uid,prof.display_name,prof.avatar_id,'host','in_meeting','{"microphone":true,"camera":true,"screenShare":true,"chat":true}',now()) returning * into p;
      insert into public.attendance(meeting_id,participant_id) values(mid,p.id);
    end if;
    for item in select value from jsonb_array_elements(coalesce(payload->'invitees','[]')) loop
      insert into public.invitations(meeting_id,email,display_name,role) values(mid,lower(trim(item->>'email')),item->>'displayName',item->>'role');
    end loop;
    return to_jsonb(m);
  end if;

  if action in ('accept_invitation','decline_invitation') then
    select * into inv from public.invitations where id=(payload->>'invitationId')::uuid for update;
    if inv.id is null or actor.is_anonymous or inv.email<>lower(actor.email) or inv.status='revoked' then raise exception 'INVITATION_FORBIDDEN' using errcode='42501'; end if;
    if exists(select 1 from public.meetings where id=inv.meeting_id and (status in ('ended','cancelled') or expires_at<=now())) then raise exception 'MEETING_CLOSED'; end if;
    update public.invitations set status=case when action='accept_invitation' then 'accepted' else 'declined' end,user_id=uid,responded_at=now() where id=inv.id returning * into inv;
    return to_jsonb(inv);
  end if;
  if action in ('mark_notification_read','mark_all_notifications_read') then
    update public.notifications set is_read=true where user_id=uid and (action='mark_all_notifications_read' or id=(payload->>'notificationId')::uuid);
    return 'true';
  end if;
  if action in ('register_push_token','unregister_push_token') then
    if actor.is_anonymous then raise exception 'PUSH_REQUIRES_ACCOUNT' using errcode='42501'; end if;
    if coalesce(length(payload->>'deviceId'),0) not between 1 and 200 then raise exception 'INVALID_DEVICE_ID'; end if;
    if action='unregister_push_token' then
      delete from public.push_tokens where user_id=uid and device_id=payload->>'deviceId';
      return 'true';
    end if;
    if coalesce(length(payload->>'token'),0) not between 32 and 4096
      or coalesce(payload->>'platform','') not in ('android','ios','web') then raise exception 'INVALID_PUSH_TOKEN'; end if;
    perform pg_advisory_xact_lock(hashtextextended(payload->>'token',0));
    delete from public.push_tokens where token=payload->>'token' and user_id<>uid;
    insert into public.push_tokens(user_id,device_id,token,platform) values(uid,payload->>'deviceId',payload->>'token',payload->>'platform')
    on conflict(user_id,device_id) do update set token=excluded.token,platform=excluded.platform,updated_at=now();
    return 'true';
  end if;
  if action='resolve_meeting' then
    select * into m from public.meetings where code=upper(payload->>'code') and status in ('scheduled','live');
    if m.id is null or (actor.is_anonymous and not m.guest_access) then raise exception 'MEETING_NOT_FOUND'; end if;
    if m.expires_at<=now() then raise exception 'MEETING_EXPIRED'; end if;
    -- A code reveals the organizer and active count, never email addresses or invitations.
    return jsonb_build_object('id',m.id,'code',m.code,'title',m.title,'starts_at',m.starts_at,'timezone',m.timezone,'status',m.status,
      'guest_access',m.guest_access,'is_locked',m.is_locked,'expires_at',m.expires_at,'organizer_name',(select display_name from public.profiles where id=m.organizer_id),'active_participant_count',(select count(*) from public.participants where meeting_id=m.id and status='in_meeting'),'eligible_to_join',not m.is_locked and (m.status='live' or m.starts_at<=now()+interval '5 minutes'));
  end if;

  mid:=(payload->>'meetingId')::uuid;
  select * into m from public.meetings where id=mid for update;
  if m.id is null then raise exception 'MEETING_NOT_FOUND'; end if;
  select * into p from public.participants where meeting_id=mid and user_id=uid;
  if action='save_meeting' then
    if not private.can_read_meeting(mid) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
    insert into public.saved_meetings(user_id,meeting_id,reminder_minutes) values(uid,mid,coalesce((payload->>'reminderMinutes')::integer,5))
    on conflict(user_id,meeting_id) do update set reminder_minutes=excluded.reminder_minutes;
    return 'true';
  end if;
  if action<>'leave_meeting' and m.expires_at<=now() then raise exception 'MEETING_EXPIRED'; end if;
  if action='join_meeting' then
    if m.status not in ('scheduled','live') then raise exception 'MEETING_CLOSED'; end if;
    if p.status='removed' then raise exception 'REMOVED_FROM_MEETING' using errcode='42501'; end if;
    if m.is_locked and not private.is_host(mid) then raise exception 'MEETING_LOCKED'; end if;
    if m.status='scheduled' and m.starts_at>now()+interval '5 minutes' then raise exception 'MEETING_NOT_READY'; end if;
    if actor.is_anonymous and not m.guest_access then raise exception 'GUEST_ACCESS_DISABLED' using errcode='42501'; end if;
    if p.status in ('in_lobby','in_meeting') then return to_jsonb(p); end if;
    role_name:=case when m.organizer_id=uid then 'host' when private.is_host(mid) then 'co_host' when actor.is_anonymous then 'guest' else 'participant' end;
    perms:=case when role_name in ('host','co_host') then '{"microphone":true,"camera":true,"screenShare":true,"chat":true}'::jsonb else m.default_permissions end;
    insert into public.participants(meeting_id,user_id,display_name,avatar_id,role,status,permissions,joined_at)
    values(mid,uid,prof.display_name,prof.avatar_id,role_name,case when role_name in ('host','co_host') then 'in_meeting' else 'in_lobby' end,perms,
      case when role_name in ('host','co_host') then now() end)
    on conflict(meeting_id,user_id) do update set role=excluded.role,status=excluded.status,permissions=excluded.permissions,joined_at=excluded.joined_at,left_at=null returning * into p;
    if p.status='in_meeting' then insert into public.attendance(meeting_id,participant_id) values(mid,p.id); end if;
    return to_jsonb(p);
  end if;
  if action='leave_meeting' then
    update public.participants set status='left',left_at=now(),is_hand_raised=false,hand_raised_at=null where id=p.id and status in ('in_lobby','in_meeting');
    update public.attendance set left_at=now() where participant_id=p.id and left_at is null;
    insert into private.outbox(meeting_id,kind,payload) values(mid,'media_remove',jsonb_build_object('userId',uid));
    return 'true';
  end if;
  if m.status in ('ended','cancelled') then raise exception 'MEETING_CLOSED'; end if;
  if action in ('send_chat','send_announcement','request_permission','raise_hand') then
    if p.id is null or p.status<>'in_meeting' or m.status<>'live' then raise exception 'NOT_ADMITTED' using errcode='42501'; end if;
    if action in ('send_chat','send_announcement') then
      if action='send_announcement' and not private.is_host(mid) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      if not (p.permissions->>'chat')::boolean then raise exception 'CHAT_DISABLED' using errcode='42501'; end if;
      insert into public.chat_messages(meeting_id,sender_id,sender_name,sender_avatar_id,is_host_or_co_host,type,content)
      values(mid,p.id,p.display_name,p.avatar_id,private.is_host(mid),case when action='send_announcement' then 'announcement' else 'message' end,payload->>'content') returning * into msg;
      return to_jsonb(msg);
    elsif action='raise_hand' then
      update public.participants set is_hand_raised=(payload->>'raised')::boolean,hand_raised_at=case when (payload->>'raised')::boolean then coalesce(hand_raised_at,now()) end where id=p.id returning * into p;
      return to_jsonb(p);
    else
      insert into public.permission_requests(meeting_id,participant_id,permission) values(mid,p.id,payload->>'permission')
      on conflict(participant_id,permission) where status='pending' do update set permission=excluded.permission returning * into req;
      return to_jsonb(req);
    end if;
  end if;
  if not private.is_host(mid) then raise exception 'HOST_REQUIRED' using errcode='42501'; end if;
  if action='update_meeting' then
    if m.version is distinct from (payload->>'expectedVersion')::integer then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
    if payload#>>'{timing,kind}' is distinct from m.timing_kind then raise exception 'TIMING_KIND_LOCKED'; end if;
    if m.status='live' and m.timing_kind='scheduled' and (payload#>>'{timing,startsAt}')::timestamptz is distinct from m.starts_at then raise exception 'LIVE_TIMING_LOCKED'; end if;
    if m.status='scheduled' and ((payload#>>'{timing,startsAt}') is null or (payload#>>'{timing,startsAt}')::timestamptz<=now()) then raise exception 'INVALID_START_TIME'; end if;
    update public.meetings set title=payload->>'title',description=coalesce(payload->>'description',''),
      expires_at=coalesce((payload->>'expiresAt')::timestamptz,m.expires_at),
      guest_access=(payload->>'guestAccess')::boolean,default_permissions=m.default_permissions || private.validate_permissions(payload->'defaultPermissions'),
      starts_at=case when m.status='scheduled' then (payload#>>'{timing,startsAt}')::timestamptz else m.starts_at end,
      timezone=coalesce(payload#>>'{timing,timezone}',m.timezone),version=version+1,updated_at=now() where id=mid returning * into m;
    for item in select value from jsonb_array_elements(coalesce(payload->'invitees','[]')) loop
      insert into public.invitations(meeting_id,email,display_name,role) values(mid,lower(trim(item->>'email')),item->>'displayName',item->>'role')
      on conflict(meeting_id,email) do update set display_name=excluded.display_name,role=excluded.role;
    end loop;
    update public.invitations set status='revoked',responded_at=now() where meeting_id=mid and email not in
      (select lower(trim(value->>'email')) from jsonb_array_elements(coalesce(payload->'invitees','[]')));
    update public.participants set role='participant',permissions=m.default_permissions where meeting_id=mid and role='co_host' and user_id in
      (select user_id from public.invitations where meeting_id=mid and (status='revoked' or role<>'co_host'));
    insert into private.outbox(meeting_id,kind,payload) values(mid,'media_sync','{}');
    return to_jsonb(m);
  elsif action in ('start_meeting','end_meeting','cancel_meeting') then
    if action='start_meeting' and m.status<>'scheduled' then raise exception 'INVALID_TRANSITION'; end if;
    if action='end_meeting' and m.status<>'live' then raise exception 'INVALID_TRANSITION'; end if;
    if action='cancel_meeting' and (m.status<>'scheduled' or m.version is distinct from (payload->>'expectedVersion')::integer) then raise exception 'INVALID_TRANSITION'; end if;
    update public.meetings set status=case action when 'start_meeting' then 'live' when 'end_meeting' then 'ended' else 'cancelled' end,
      actual_start_time=case when action='start_meeting' then now() else actual_start_time end,
      ended_at=case when action='end_meeting' then now() else ended_at end,version=version+1,updated_at=now() where id=mid returning * into m;
    if action<>'start_meeting' then
      update public.participants set status='left',left_at=now(),is_hand_raised=false,hand_raised_at=null where meeting_id=mid and status in ('in_lobby','in_meeting');
      update public.attendance set left_at=now() where meeting_id=mid and left_at is null;
      insert into private.outbox(meeting_id,kind,payload) values(mid,'media_close','{}');
    end if;
    return to_jsonb(m);
  elsif action='send_invitations' then
    if payload->'channels' ? 'sms' then raise exception 'SMS_NOT_SUPPORTED'; end if;
    count_rows:=0;
    for inv in select * from public.invitations where meeting_id=mid and status='pending' and
      (not payload ? 'inviteeIds' or inv.id::text in(select jsonb_array_elements_text(payload->'inviteeIds'))) loop
      if payload->'channels' ? 'email' then
        insert into private.outbox(meeting_id,kind,payload) values(mid,'invitation_email',jsonb_build_object('invitationId',inv.id,'email',inv.email,'code',m.code,'title',m.title));
      end if;
      insert into public.notifications(user_id,meeting_id,invitation_id,kind,title,body)
        select u.id,mid,inv.id,'meeting_invitation',m.title,'You have been invited to a meeting' from auth.users u where lower(u.email)=inv.email and not u.is_anonymous and u.deleted_at is null on conflict(invitation_id,user_id,kind) where invitation_id is not null and kind='meeting_invitation' do nothing;
      count_rows:=count_rows+1;
    end loop;
    return jsonb_build_object('queuedCount',count_rows,'deliveryStatus','queued');
  elsif action='bulk_permissions' then
    if payload#>>'{action,kind}'='lock_meeting' then
      update public.meetings set is_locked=(payload#>>'{action,locked}')::boolean,version=version+1,updated_at=now() where id=mid;
      return jsonb_build_object('affectedParticipantCount',0);
    end if;
    perms:=case payload#>>'{action,kind}' when 'mute_all' then '{"microphone":false}'::jsonb when 'stop_all_cameras' then '{"camera":false}'::jsonb
      when 'disable_all_chat' then '{"chat":false}'::jsonb when 'enable_all_chat' then '{"chat":true}'::jsonb end;
    if perms is null then raise exception 'INVALID_ACTION'; end if;
    update public.participants set permissions=permissions||perms where meeting_id=mid and role not in ('host','co_host') and status='in_meeting';
    get diagnostics count_rows=row_count;
    insert into private.outbox(meeting_id,kind,payload) values(mid,'media_sync','{}');
    return jsonb_build_object('affectedParticipantCount',count_rows);
  elsif action='decide_permission' then
    select * into req from public.permission_requests where id=(payload->>'requestId')::uuid and meeting_id=mid and status='pending' for update;
    if req.id is null or payload->>'decision' not in ('approve','deny') then raise exception 'INVALID_REQUEST'; end if;
    select * into target from public.participants where id=req.participant_id and meeting_id=mid and status='in_meeting';
    if target.id is null then raise exception 'PARTICIPANT_NOT_ACTIVE'; end if;
    update public.permission_requests set status=case when payload->>'decision'='approve' then 'approved' else 'denied' end,decided_at=now(),decided_by=uid where id=req.id returning * into req;
    update public.participants set permissions=permissions||jsonb_build_object(req.permission,payload->>'decision'='approve') where id=req.participant_id;
    insert into private.outbox(meeting_id,kind,payload) values(mid,'media_sync',jsonb_build_object('userId',target.user_id));
    return to_jsonb(req);
  elsif action in ('admit_participant','remove_participant','change_role','update_permissions','lower_hand') then
    select * into target from public.participants where id=(payload->>'participantId')::uuid and meeting_id=mid for update;
    if target.id is null then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
    if target.role='host' then raise exception 'HOST_PROTECTED' using errcode='42501'; end if;
    if target.role='co_host' and m.organizer_id<>uid then raise exception 'ORGANIZER_REQUIRED' using errcode='42501'; end if;
    if action='admit_participant' then
      if m.status<>'live' or target.status<>'in_lobby' or payload->>'decision' not in ('admit','deny') then raise exception 'INVALID_ADMISSION'; end if;
      update public.participants set status=case when payload->>'decision'='admit' then 'in_meeting' else 'removed' end,
        joined_at=case when payload->>'decision'='admit' then now() end,left_at=case when payload->>'decision'='deny' then now() end where id=target.id returning * into target;
      if target.status='in_meeting' then insert into public.attendance(meeting_id,participant_id) values(mid,target.id); end if;
    elsif action='remove_participant' then
      update public.participants set status='removed',left_at=now(),is_hand_raised=false,hand_raised_at=null where id=target.id returning * into target;
      update public.attendance set left_at=now() where participant_id=target.id and left_at is null;
      update public.invitations set status='revoked',responded_at=now() where meeting_id=mid and user_id=target.user_id and role='co_host';
      insert into private.outbox(meeting_id,kind,payload) values(mid,'media_remove',jsonb_build_object('userId',target.user_id));
    elsif action='change_role' then
      if m.organizer_id<>uid or payload->>'newRole' not in ('co_host','participant') or target.status<>'in_meeting'
        or exists(select 1 from auth.users where id=target.user_id and is_anonymous) then raise exception 'INVALID_ROLE_CHANGE' using errcode='42501'; end if;
      update public.participants set role=payload->>'newRole',permissions=case when payload->>'newRole'='co_host' then '{"microphone":true,"camera":true,"screenShare":true,"chat":true}'::jsonb else m.default_permissions end where id=target.id returning * into target;
      update public.invitations set role=case when payload->>'newRole'='co_host' then 'co_host' else 'guest' end where meeting_id=mid and user_id=target.user_id;
      insert into private.outbox(meeting_id,kind,payload) values(mid,'media_sync',jsonb_build_object('userId',target.user_id));
    elsif action='update_permissions' then
      if target.status<>'in_meeting' then raise exception 'PARTICIPANT_NOT_ACTIVE'; end if;
      update public.participants set permissions=permissions||private.validate_permissions(payload->'permissions') where id=target.id returning * into target;
      insert into private.outbox(meeting_id,kind,payload) values(mid,'media_sync',jsonb_build_object('userId',target.user_id));
    else
      update public.participants set is_hand_raised=false,hand_raised_at=null where id=target.id returning * into target;
    end if;
    return to_jsonb(target);
  end if;
  raise exception 'UNKNOWN_ACTION' using errcode='22023';
end $$;
CREATE OR REPLACE FUNCTION public.conference_read(action text, payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare mid uuid:=(payload->>'meetingId')::uuid; result jsonb; row_limit integer; row_offset integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode='42501'; end if;
  row_limit:=least(greatest(coalesce((payload->>'limit')::integer,100),1),100);
  row_offset:=greatest(coalesce((payload->>'offset')::integer,0),0);
  if action in ('meetings','meeting_details') then
    select coalesce(jsonb_agg(row_data),'[]') into result from (
      select to_jsonb(m)||jsonb_build_object('status',case when m.expires_at<=now() and m.status in ('scheduled','live') then 'ended' else m.status end,'organizer_name',p.display_name,'organizer_avatar_id',p.avatar_id,
        'invitees',coalesce((select jsonb_agg(to_jsonb(i)) from public.invitations i where i.meeting_id=m.id),'[]'),
        'active_participant_count',(select count(*) from public.participants x where x.meeting_id=m.id and x.status='in_meeting')) row_data
      from public.meetings m join public.profiles p on p.id=m.organizer_id where (action='meetings' or m.id=mid)
        and (not payload ? 'status' or m.status=payload->>'status') order by m.starts_at desc limit row_limit offset row_offset
    ) rows;
    if action='meeting_details' then
      if jsonb_array_length(result)=0 then raise exception 'MEETING_NOT_FOUND'; end if;
      return result->0;
    end if;
  elsif action='invitee_suggestions' then
    return private.invitee_suggestions(coalesce(payload->>'query',''));
  elsif action='participants' then
    select coalesce(jsonb_agg(to_jsonb(p)),'[]') into result from public.participants p where meeting_id=mid;
  elsif action='permission_requests' then
    select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('participant_name',p.display_name,'participant_avatar_id',p.avatar_id)),'[]') into result
      from public.permission_requests r join public.participants p on p.id=r.participant_id where r.meeting_id=mid and r.status='pending';
  elsif action='chat' then
    select coalesce(jsonb_agg(to_jsonb(rows) order by created_at),'[]') into result from (
      select * from public.chat_messages where meeting_id=mid order by created_at desc limit row_limit offset row_offset
    ) rows;
  elsif action='invitations' then
    select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('meeting_title',m.title,'scheduled_start_time',m.starts_at,'organizer_name',p.display_name)),'[]') into result
      from public.invitations i join public.meetings m on m.id=i.meeting_id join public.profiles p on p.id=m.organizer_id
      where i.email=lower((select auth.jwt()->>'email'));
  elsif action='notifications' then
    select coalesce(jsonb_agg(to_jsonb(rows)),'[]') into result from (
      select * from public.notifications where user_id=auth.uid() order by created_at desc limit row_limit offset row_offset
    ) rows;
  elsif action='attendance' then
    select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('display_name',p.display_name,'avatar_id',p.avatar_id,'role',p.role)),'[]') into result
      from public.attendance a join public.participants p on p.id=a.participant_id where a.meeting_id=mid;
  else raise exception 'UNKNOWN_READ_ACTION' using errcode='22023';
  end if;
  return result;
end $function$
