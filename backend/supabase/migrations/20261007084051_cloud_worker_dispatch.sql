-- Database-owned dispatch, not a public RPC. Credentials are provisioned from .env into Vault.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create function private.dispatch_backend_jobs() returns bigint
language plpgsql security definer set search_path='' as $$
declare worker_url text; worker_secret text; request_id bigint;
begin
  if not exists(select 1 from private.outbox where delivered_at is null
    and (locked_until is null or locked_until < now())) then return null; end if;
  select decrypted_secret into worker_url from vault.decrypted_secrets where name='conference_worker_url';
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name='conference_worker_secret';
  if worker_url is null or worker_secret is null then return null; end if;
  select net.http_post(url:=worker_url,
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||worker_secret),
    body:='{}'::jsonb, timeout_milliseconds:=10000) into request_id;
  return request_id;
end $$;
revoke all on function private.dispatch_backend_jobs() from public,anon,authenticated,service_role;

create function private.dispatch_after_enqueue() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform private.dispatch_backend_jobs();
  return null;
end $$;
revoke all on function private.dispatch_after_enqueue() from public,anon,authenticated,service_role;
create trigger outbox_dispatch after insert on private.outbox
  for each statement execute function private.dispatch_after_enqueue();

-- Dispatch runs after commit. Retry only when eligible work exists; idle periods make no HTTP calls.
select cron.schedule('conference-outbox-retry','* * * * *','select private.dispatch_backend_jobs()');
