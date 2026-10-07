create or replace function private.is_host(mid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and not exists(select 1 from public.participants where meeting_id=mid and user_id=auth.uid() and status='removed') and (
    exists(select 1 from public.meetings where id=mid and organizer_id=auth.uid())
    or exists(select 1 from public.participants where meeting_id=mid and user_id=auth.uid() and role='co_host' and status='in_meeting'))
$$;
