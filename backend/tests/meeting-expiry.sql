-- Synthetic accounts and meeting changes never commit.
begin;
create temporary table expiry_test_context(key text primary key,value text);
grant all on expiry_test_context to authenticated;
do $$ declare h uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); begin
insert into auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data) values
(h,'expiry-host-'||h||'@example.com',now(),false,'{"displayName":"Expiry Host"}'),
(c,'expiry-cohost-'||c||'@example.com',now(),false,'{"displayName":"Expiry Co-host"}'),
(o,'expiry-outsider-'||o||'@example.com',now(),false,'{"displayName":"Other Person"}');
insert into expiry_test_context values('host',h::text),('cohost',c::text),('outsider',o::text);
end $$;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',(select value from expiry_test_context where key='host'),'role','authenticated')::text,true);
do $$ declare m jsonb; planned jsonb; delay interval; suggestions jsonb; email text:='expiry-cohost-'||(select value from expiry_test_context where key='cohost')||'@example.com'; begin
m:=public.conference_command('create_meeting',jsonb_build_object('title','Expiry test','timing',jsonb_build_object('kind','instant'),'defaultPermissions','{}'::jsonb,'invitees',jsonb_build_array(jsonb_build_object('email',email,'displayName','Expiry Co-host','role','co_host'))));
if (m->>'expires_at')::timestamptz<>(m->>'starts_at')::timestamptz+interval '2 hours' then raise exception 'Default expiry incorrect'; end if;
insert into expiry_test_context values('meeting',m->>'id'),('code',m->>'code');
foreach delay in array array[interval '1 minute',interval '1 day',interval '1 year'] loop
  planned:=public.conference_command('create_meeting',jsonb_build_object('title','Scheduled expiry test','timing',jsonb_build_object('kind','scheduled','startsAt',now()+delay),'expiresAt',now()+delay+interval '4 hours','defaultPermissions','{}'::jsonb,'invitees','[]'::jsonb));
  if (planned->>'expires_at')::timestamptz<>now()+delay+interval '4 hours' then raise exception 'Custom expiry not persisted'; end if;
end loop;
perform public.conference_read('meeting_details',jsonb_build_object('meetingId',m->>'id'));
perform public.conference_command('leave_meeting',jsonb_build_object('meetingId',m->>'id'));
if (public.conference_read('meeting_details',jsonb_build_object('meetingId',m->>'id'))->>'status')<>'live' then raise exception 'Host leave closed meeting'; end if;
if (public.conference_command('join_meeting',jsonb_build_object('meetingId',m->>'id'))->>'role')<>'host' then raise exception 'Host cannot rejoin'; end if;
suggestions:=public.conference_read('invitee_suggestions',jsonb_build_object('query','Expiry Co'));
if jsonb_array_length(suggestions)<>1 then raise exception 'Recent invitee suggestions failed'; end if;
suggestions:=public.conference_read('invitee_suggestions',jsonb_build_object('query','expiry-outsider-'));
if jsonb_array_length(suggestions)<>0 then raise exception 'Partial user directory exposed'; end if;
suggestions:=public.conference_read('invitee_suggestions',jsonb_build_object('query','expiry-outsider-'||(select value from expiry_test_context where key='outsider')||'@example.com'));
if jsonb_array_length(suggestions)<>1 then raise exception 'Exact registered email lookup failed'; end if;
end $$;
reset role;
insert into public.participants(meeting_id,user_id,display_name,avatar_id,role,status,permissions,joined_at) select (select value from expiry_test_context where key='meeting')::uuid,(select value from expiry_test_context where key='cohost')::uuid,'Expiry Co-host','avatar-1','co_host','in_meeting','{"microphone":true,"camera":true,"screenShare":true,"chat":true}',now();
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',(select value from expiry_test_context where key='cohost'),'role','authenticated')::text,true);
do $$ declare m text:=(select value from expiry_test_context where key='meeting'); begin
perform public.conference_command('leave_meeting',jsonb_build_object('meetingId',m));
if (public.conference_command('join_meeting',jsonb_build_object('meetingId',m))->>'role')<>'co_host' then raise exception 'Co-host lost access on rejoin'; end if;
begin perform public.conference_media_left(m::uuid,(select value from expiry_test_context where key='host')::uuid,now()); raise exception 'Client modified media presence'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.meetings set starts_at=now()-interval '3 hours',expires_at=now()-interval '1 hour' where id=(select value from expiry_test_context where key='meeting')::uuid;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',(select value from expiry_test_context where key='host'),'role','authenticated')::text,true);
do $$ declare m text:=(select value from expiry_test_context where key='meeting'); begin
if (public.conference_read('meeting_details',jsonb_build_object('meetingId',m))->>'status')<>'ended' then raise exception 'Expired meeting still live'; end if;
begin perform public.conference_command('join_meeting',jsonb_build_object('meetingId',m)); raise exception 'Expired join allowed'; exception when others then if sqlerrm<>'MEETING_EXPIRED' then raise; end if; end;
begin perform public.conference_command('resolve_meeting',jsonb_build_object('code',(select value from expiry_test_context where key='code'))); raise exception 'Expired resolve allowed'; exception when others then if sqlerrm<>'MEETING_EXPIRED' then raise; end if; end;
end $$;
reset role;
select private.expire_due_meetings();
do $$ begin
if exists(select 1 from public.participants where meeting_id=(select value from expiry_test_context where key='meeting')::uuid and status='in_meeting') then raise exception 'Expiry left active participants'; end if;
end $$;
rollback;
select 'PASS: default/custom expiry, dashboard details, host/co-host leave and rejoin, autocomplete privacy, expired join/resolve, and cleanup' result;
