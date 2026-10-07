-- Run against a development project using execute_sql or a postgres connection.
-- All synthetic users, messages, and meetings are rolled back.
begin;
create temporary table test_context(key text primary key, value text);
grant all on test_context to authenticated;
do $$
declare host_id uuid:=gen_random_uuid(); guest_id uuid:=gen_random_uuid(); outsider_id uuid:=gen_random_uuid(); cohost_id uuid:=gen_random_uuid();
begin
  insert into auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data)
  values(host_id,'backend-test-'||host_id||'@example.com',now(),false,'{"displayName":"Test Host"}'),
    (guest_id,null,null,true,'{"displayName":"Test Guest"}'),
    (outsider_id,null,null,true,'{"displayName":"Outsider"}'),
    (cohost_id,'cohost-test-'||cohost_id||'@example.com',now(),false,'{"displayName":"Co-host"}');
  insert into test_context values('host',host_id::text),('guest',guest_id::text),('outsider',outsider_id::text),('cohost',cohost_id::text);
end $$;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',(select value from test_context where key='guest'),'role','authenticated','is_anonymous',true)::text,true);
do $$
begin
  begin
    perform public.conference_command('create_meeting','{"title":"Denied","timing":{"kind":"instant"},"defaultPermissions":{},"invitees":[]}');
    raise exception 'FAIL: guest created meeting';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',(select value from test_context where key='host'),'role','authenticated','is_anonymous',false)::text,true);
do $$
declare result jsonb;
begin
  result:=public.conference_command('create_meeting','{"title":"Authorization test","timing":{"kind":"instant"},"defaultPermissions":{"chat":true},"guestAccess":true,"invitees":[]}');
  insert into test_context values('meeting',result->>'id'),('code',result->>'code');
end $$;
select set_config('request.jwt.claims',json_build_object('sub',(select value from test_context where key='guest'),'role','authenticated','is_anonymous',true)::text,true);
do $$
declare result jsonb; mid text:=(select value from test_context where key='meeting');
begin
  result:=public.conference_command('join_meeting',jsonb_build_object('meetingId',mid));
  if result->>'status'<>'in_lobby' then raise exception 'FAIL: guest bypassed lobby'; end if;
  insert into test_context values('participant',result->>'id');
  begin
    perform public.conference_command('admit_participant',jsonb_build_object('meetingId',mid,'participantId',result->>'id','decision','admit'));
    raise exception 'FAIL: guest admitted themselves';
  exception when insufficient_privilege then null; end;
  begin
    perform public.conference_command('send_chat',jsonb_build_object('meetingId',mid,'content','Forbidden lobby message'));
    raise exception 'FAIL: lobby guest sent chat';
  exception when insufficient_privilege then null; end;
  begin
    update public.participants set role='host' where id=(result->>'id')::uuid;
    raise exception 'FAIL: direct role mutation allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',(select value from test_context where key='host'),'role','authenticated')::text,true);
select public.conference_command('admit_participant',jsonb_build_object('meetingId',(select value from test_context where key='meeting'),'participantId',(select value from test_context where key='participant'),'decision','admit'));
select set_config('request.jwt.claims',json_build_object('sub',(select value from test_context where key='guest'),'role','authenticated','is_anonymous',true)::text,true);
select public.conference_command('send_chat',jsonb_build_object('meetingId',(select value from test_context where key='meeting'),'content','Admitted guest chat'));
select public.conference_command('request_permission',jsonb_build_object('meetingId',(select value from test_context where key='meeting'),'permission','microphone'));
select set_config('request.jwt.claims',json_build_object('sub',(select value from test_context where key='outsider'),'role','authenticated','is_anonymous',true)::text,true);
do $$
begin
  if exists(select 1 from public.meetings) then raise exception 'FAIL: outsider read meeting'; end if;
  if exists(select 1 from public.participants) then raise exception 'FAIL: outsider read participants'; end if;
  if exists(select 1 from public.chat_messages) then raise exception 'FAIL: outsider read chat'; end if;
  if exists(select 1 from public.attendance) then raise exception 'FAIL: outsider read attendance'; end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',(select value from test_context where key='host'),'role','authenticated')::text,true);
select public.conference_command('remove_participant',jsonb_build_object('meetingId',(select value from test_context where key='meeting'),'participantId',(select value from test_context where key='participant')));
do $$
declare mid text:=(select value from test_context where key='meeting');
begin
  begin
    perform public.conference_command('update_meeting',jsonb_build_object('meetingId',mid));
    raise exception 'FAIL: missing version bypassed concurrency check';
  exception when serialization_failure then null; end;
  begin
    perform public.conference_command('bulk_permissions',jsonb_build_object('meetingId',mid,'action',jsonb_build_object('kind','bad')));
    raise exception 'FAIL: unknown bulk action allowed';
  exception when raise_exception then
    if sqlerrm<>'INVALID_ACTION' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',(select value from test_context where key='guest'),'role','authenticated','is_anonymous',true)::text,true);
do $$
begin
  begin
    perform public.conference_command('join_meeting',jsonb_build_object('meetingId',(select value from test_context where key='meeting')));
    raise exception 'FAIL: removed guest rejoined';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.chat_messages) then raise exception 'FAIL: removed guest read chat'; end if;
end $$;
reset role;
-- An invitation alone never grants authority when email ownership is unchecked.
insert into public.invitations(meeting_id,email,display_name,role,status,user_id)
select (select value from test_context where key='meeting')::uuid,email,'Co-host','co_host','accepted',id
from auth.users where id=(select value from test_context where key='cohost')::uuid;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',(select value from test_context where key='cohost'),'role','authenticated')::text,true);
do $$
declare p jsonb;
begin
  p:=public.conference_command('join_meeting',jsonb_build_object('meetingId',(select value from test_context where key='meeting')));
  if p->>'role'<>'participant' or p->>'status'<>'in_lobby' then raise exception 'FAIL: invitation bypassed host approval'; end if;
  insert into test_context values('cohost_participant',p->>'id');
  begin
    perform public.conference_command('end_meeting',jsonb_build_object('meetingId',(select value from test_context where key='meeting')));
    raise exception 'FAIL: invitation granted host authority';
  exception when insufficient_privilege then null; end;
  if (public.conference_read('meeting_details',jsonb_build_object('meetingId',(select value from test_context where key='meeting')))->>'organizer_name')<>'Test Host' then raise exception 'FAIL: organizer profile unavailable'; end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',(select value from test_context where key='host'),'role','authenticated')::text,true);
select public.conference_command('admit_participant',jsonb_build_object('meetingId',(select value from test_context where key='meeting'),'participantId',(select value from test_context where key='cohost_participant'),'decision','admit'));
select public.conference_command('change_role',jsonb_build_object('meetingId',(select value from test_context where key='meeting'),'participantId',(select value from test_context where key='cohost_participant'),'newRole','co_host'));
select public.conference_command('remove_participant',jsonb_build_object('meetingId',(select value from test_context where key='meeting'),'participantId',(select value from test_context where key='cohost_participant')));
select set_config('request.jwt.claims',json_build_object('sub',(select value from test_context where key='cohost'),'role','authenticated')::text,true);
do $$
begin
  begin
    perform public.conference_command('end_meeting',jsonb_build_object('meetingId',(select value from test_context where key='meeting')));
    raise exception 'FAIL: removed cohost retained authority';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: guest hosting, lobby enforcement, host authorization, role protection, chat, requests, RLS isolation, removal, version checks, read model, cohost revocation' as result;
rollback;
