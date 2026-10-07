alter table private.outbox add column locked_until timestamptz;
grant usage on schema private to service_role;
grant select,update on private.outbox to service_role;

create function public.claim_backend_jobs() returns jsonb language sql security invoker set search_path='' as $$
  with jobs as (
    select id from private.outbox where delivered_at is null and (locked_until is null or locked_until<now())
      order by id for update skip locked limit 20
  ), claimed as (
    update private.outbox set locked_until=now()+interval '2 minutes',attempts=attempts+1
      where id in(select id from jobs) returning id,meeting_id,kind,payload,attempts
  ) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]') from claimed
$$;
create function public.complete_backend_job(job_id bigint, attempt integer) returns void language sql security invoker set search_path='' as $$
  update private.outbox set delivered_at=now(),locked_until=null where id=job_id and attempts=attempt
$$;
revoke execute on function public.claim_backend_jobs(),public.complete_backend_job(bigint,integer) from public,anon,authenticated;
grant execute on function public.claim_backend_jobs(),public.complete_backend_job(bigint,integer) to service_role;
