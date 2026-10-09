-- Synthetic data is rolled back; no invitations are delivered.
begin;
create temporary table push_test_context(key text primary key,value text);
grant all on push_test_context to authenticated;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); g uuid:=gen_random_uuid();
begin
  insert into auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data) values
  (a,'push-a-'||a||'@example.com',now(),false,'{"displayName":"Push host"}'),
  (b,'push-b-'||b||'@example.com',now(),false,'{"displayName":"Push recipient"}'),
  (g,null,null,true,'{"displayName":"Guest"}');
  insert into push_test_context values('a',a::text),('b',b::text),('g',g::text);
end $$;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',(select value from push_test_context where key='g'),'role','authenticated')::text,true);
do $$ begin
  begin
    perform public.conference_command('register_push_token','{"deviceId":"test","token":"abcdefghijklmnopqrstuvwxyz0123456789","platform":"web"}');
    raise exception 'FAIL: guest registered push';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',(select value from push_test_context where key='a'),'role','authenticated')::text,true);
select public.conference_command('register_push_token','{"deviceId":"test","token":"abcdefghijklmnopqrstuvwxyz0123456789","platform":"web"}');
do $$ declare meeting jsonb; begin
  meeting:=public.conference_command('create_meeting',jsonb_build_object('title','Push test','defaultPermissions','{}'::jsonb,'timing',jsonb_build_object('kind','instant'),'invitees',
    jsonb_build_array(jsonb_build_object('email','push-b-'||(select value from push_test_context where key='b')||'@example.com','displayName','Recipient','role','guest'))));
  insert into push_test_context values('meeting',meeting->>'id');
end $$;
select public.conference_command('send_invitations',jsonb_build_object('meetingId',(select value from push_test_context where key='meeting'),'channels','[]'::jsonb));
select public.conference_command('send_invitations',jsonb_build_object('meetingId',(select value from push_test_context where key='meeting'),'channels','[]'::jsonb));
select set_config('request.jwt.claims',json_build_object('sub',(select value from push_test_context where key='b'),'role','authenticated')::text,true);
do $$ begin
  if exists(select 1 from public.push_tokens) then raise exception 'FAIL: recipient saw host token'; end if;
  begin
    insert into public.push_tokens(user_id,device_id,token,platform) values(auth.uid(),'bad','abcdefghijklmnopqrstuvwxyz0123456789','web');
    raise exception 'FAIL: direct token write allowed';
  exception when insufficient_privilege then null; end;
end $$;
select public.conference_command('register_push_token','{"deviceId":"recipient","token":"abcdefghijklmnopqrstuvwxyz0123456789","platform":"web"}');
reset role;
do $$ begin
  if (select count(*) from public.push_tokens where token='abcdefghijklmnopqrstuvwxyz0123456789')<>1
    or not exists(select 1 from public.push_tokens where token='abcdefghijklmnopqrstuvwxyz0123456789' and user_id=(select value::uuid from push_test_context where key='b'))
    then raise exception 'FAIL: token ownership did not transfer'; end if;
  if (select count(*) from public.notifications where meeting_id=(select value::uuid from push_test_context where key='meeting'))<>1
    then raise exception 'FAIL: repeated invites duplicated notifications'; end if;
  if (select count(*) from private.outbox where meeting_id=(select value::uuid from push_test_context where key='meeting') and kind='invitation_push')<>1
    then raise exception 'FAIL: invitation push queue incorrect'; end if;
end $$;
set local role authenticated;
select public.conference_command('unregister_push_token','{"deviceId":"recipient"}');
do $$ begin
  if exists(select 1 from public.push_tokens) then raise exception 'FAIL: logout token cleanup failed'; end if;
end $$;
reset role;
rollback;
select 'Push authorization, automatic queue, deduplication and logout checks passed' as result;
