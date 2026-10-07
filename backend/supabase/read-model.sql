create function private.can_read_profile(profile_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (profile_id=auth.uid()
    or exists(select 1 from public.meetings m where m.organizer_id=profile_id and private.can_read_meeting(m.id))
    or exists(select 1 from public.participants p where p.user_id=profile_id and (private.is_host(p.meeting_id) or (p.status='in_meeting' and private.in_room(p.meeting_id)))))
$$;
revoke execute on function private.can_read_profile(uuid) from public,anon;
grant execute on function private.can_read_profile(uuid) to authenticated;
drop policy profile_select on public.profiles;
create policy profile_select on public.profiles for select to authenticated using(private.can_read_profile(id));

create function public.conference_read(action text, payload jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare mid uuid:=(payload->>'meetingId')::uuid; result jsonb; row_limit integer; row_offset integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode='42501'; end if;
  row_limit:=least(greatest(coalesce((payload->>'limit')::integer,100),1),100);
  row_offset:=greatest(coalesce((payload->>'offset')::integer,0),0);
  if action in ('meetings','meeting_details') then
    select coalesce(jsonb_agg(row_data),'[]') into result from (
      select to_jsonb(m)||jsonb_build_object('organizer_name',p.display_name,'organizer_avatar_id',p.avatar_id,
        'invitees',coalesce((select jsonb_agg(to_jsonb(i)) from public.invitations i where i.meeting_id=m.id),'[]'),
        'active_participant_count',(select count(*) from public.participants x where x.meeting_id=m.id and x.status='in_meeting')) row_data
      from public.meetings m join public.profiles p on p.id=m.organizer_id where (action='meetings' or m.id=mid)
        and (not payload ? 'status' or m.status=payload->>'status') order by m.starts_at desc limit row_limit offset row_offset
    ) rows;
    if action='meeting_details' then
      if jsonb_array_length(result)=0 then raise exception 'MEETING_NOT_FOUND'; end if;
      return result->0;
    end if;
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
end $$;
revoke execute on function public.conference_read(text,jsonb) from public,anon;
grant execute on function public.conference_read(text,jsonb) to authenticated;
