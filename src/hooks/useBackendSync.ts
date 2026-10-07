import { useEffect } from 'react';
import { supabase } from '../backend/supabaseClient';
import { appApi } from '../api/appApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';

export function useBackendSync() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(state => state.auth.session?.user.id);
  useEffect(() => {
    if (!userId) return;
    const invalidate = () =>
      dispatch(
        appApi.util.invalidateTags([
          'Meetings',
          'Invitations',
          'Participants',
          'Permissions',
          'Chat',
          'Notifications',
        ]),
      );
    let channel = supabase.channel(`conference-user-${userId}`);
    for (const table of [
      'meetings',
      'participants',
      'permission_requests',
      'chat_messages',
      'invitations',
      'notifications',
    ]) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        invalidate,
      );
    }
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') invalidate();
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [dispatch, userId]);
}
