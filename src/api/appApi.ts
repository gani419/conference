import { createApi } from '@reduxjs/toolkit/query/react';
import { backendBaseQuery, BackendOperation } from './baseQuery';
import { PageRequest, PageResponse } from '../types/common';
import {
  CancelMeetingResponse,
  CreateMeetingPayload,
  CreateMeetingResponse,
  JoinMeetingPayload,
  JoinMeetingResponse,
  Meeting,
  MeetingListItem,
  MeetingSummary,
  ResolveMeetingPayload,
  ResolveMeetingResponse,
  UpdateMeetingPayload,
  UpdateMeetingResponse,
} from '../types/meeting';
import {
  AcceptInvitationPayload,
  AcceptInvitationResponse,
  DeclineInvitationPayload,
  DeclineInvitationResponse,
  MeetingInvitation,
  SaveGuestSchedulePayload,
  SaveGuestScheduleResponse,
  SendInvitationsPayload,
  SendInvitationsResponse,
} from '../types/invitation';
import {
  AdmitParticipantPayload,
  AdmitParticipantResponse,
  ChangeParticipantRolePayload,
  ChangeParticipantRoleResponse,
  MeetingParticipant,
  RemoveParticipantPayload,
  RemoveParticipantResponse,
} from '../types/participant';
import {
  BulkUpdatePermissionsPayload,
  BulkUpdatePermissionsResponse,
  DecidePermissionRequestPayload,
  DecidePermissionRequestResponse,
  PermissionRequest,
  RequestPermissionPayload,
  RequestPermissionResponse,
  UpdateParticipantPermissionsPayload,
  UpdateParticipantPermissionsResponse,
} from '../types/permission';
import {
  ChatMessage,
  SendAnnouncementPayload,
  SendAnnouncementResponse,
  SendChatMessagePayload,
  SendChatMessageResponse,
} from '../types/chat';
import { AppNotification } from '../types/notification';

export const appApi = createApi({
  reducerPath: 'appApi',
  baseQuery: backendBaseQuery(),
  tagTypes: ['Meetings', 'Invitations', 'Participants', 'Permissions', 'Chat', 'Notifications'],
  endpoints: (builder) => ({
    // Meetings
    getUpcomingMeetings: builder.query<MeetingListItem[], void>({
      query: (): BackendOperation => ({ type: 'getUpcomingMeetings' }),
      providesTags: ['Meetings'],
    }),
    getRecentMeetings: builder.query<MeetingListItem[], void>({
      query: (): BackendOperation => ({ type: 'getRecentMeetings' }),
      providesTags: ['Meetings'],
    }),
    getMeetingDetails: builder.query<Meeting, string | { meetingId: string }>({
      query: (arg: string | { meetingId: string }): BackendOperation => {
        const meetingId = typeof arg === 'string' ? arg : arg.meetingId;
        return { type: 'getMeetingDetails', meetingId };
      },
      providesTags: (_result, _error, arg) => {
        const meetingId = typeof arg === 'string' ? arg : arg.meetingId;
        return [{ type: 'Meetings', id: meetingId }];
      },
    }),
    createMeeting: builder.mutation<CreateMeetingResponse, CreateMeetingPayload>({
      query: (payload: CreateMeetingPayload): BackendOperation => ({ type: 'createMeeting', payload }),
      invalidatesTags: ['Meetings'],
    }),
    updateMeeting: builder.mutation<UpdateMeetingResponse, UpdateMeetingPayload>({
      query: (payload: UpdateMeetingPayload): BackendOperation => ({ type: 'updateMeeting', payload }),
      invalidatesTags: (_result, _error, arg) => ['Meetings', { type: 'Meetings', id: arg.meetingId }],
    }),
    cancelMeeting: builder.mutation<CancelMeetingResponse, { meetingId: string; expectedVersion: number }>({
      query: ({ meetingId, expectedVersion }): BackendOperation => ({
        type: 'cancelMeeting',
        meetingId,
        expectedVersion,
      }),
      invalidatesTags: ['Meetings'],
    }),
    resolveMeeting: builder.mutation<ResolveMeetingResponse, ResolveMeetingPayload>({
      query: (payload: ResolveMeetingPayload): BackendOperation => ({ type: 'resolveMeeting', payload }),
    }),
    joinMeeting: builder.mutation<JoinMeetingResponse, JoinMeetingPayload>({
      query: (payload: JoinMeetingPayload): BackendOperation => ({ type: 'joinMeeting', payload }),
      invalidatesTags: ['Participants'],
    }),
    startMeeting: builder.mutation<Meeting, { meetingId: string }>({
      query: ({ meetingId }): BackendOperation => ({ type: 'startMeeting', meetingId }),
      invalidatesTags: (_result, _error, arg) => ['Meetings', { type: 'Meetings', id: arg.meetingId }],
    }),
    endMeeting: builder.mutation<Meeting, { meetingId: string }>({
      query: ({ meetingId }): BackendOperation => ({ type: 'endMeeting', meetingId }),
      invalidatesTags: (_result, _error, arg) => ['Meetings', { type: 'Meetings', id: arg.meetingId }],
    }),
    getMeetingSummary: builder.query<MeetingSummary, string>({
      query: (meetingId: string): BackendOperation => ({ type: 'getMeetingSummary', meetingId }),
    }),

    // Invitations
    getInvitations: builder.query<MeetingInvitation[], void>({
      query: (): BackendOperation => ({ type: 'listInvitations' }),
      providesTags: ['Invitations'],
    }),
    acceptInvitation: builder.mutation<AcceptInvitationResponse, AcceptInvitationPayload>({
      query: (payload: AcceptInvitationPayload): BackendOperation => ({ type: 'acceptInvitation', payload }),
      invalidatesTags: ['Invitations', 'Meetings'],
    }),
    declineInvitation: builder.mutation<DeclineInvitationResponse, DeclineInvitationPayload>({
      query: (payload: DeclineInvitationPayload): BackendOperation => ({ type: 'declineInvitation', payload }),
      invalidatesTags: ['Invitations'],
    }),
    saveGuestSchedule: builder.mutation<SaveGuestScheduleResponse, SaveGuestSchedulePayload>({
      query: (payload: SaveGuestSchedulePayload): BackendOperation => ({ type: 'saveGuestSchedule', payload }),
      invalidatesTags: ['Meetings'],
    }),
    sendInvitations: builder.mutation<SendInvitationsResponse, SendInvitationsPayload>({
      query: (payload: SendInvitationsPayload): BackendOperation => ({ type: 'sendInvitations', payload }),
      invalidatesTags: ['Invitations'],
    }),

    // Participants
    getParticipants: builder.query<MeetingParticipant[], string>({
      query: (meetingId: string): BackendOperation => ({ type: 'listParticipants', meetingId }),
      providesTags: ['Participants'],
    }),
    admitParticipant: builder.mutation<AdmitParticipantResponse, AdmitParticipantPayload>({
      query: (payload: AdmitParticipantPayload): BackendOperation => ({ type: 'admitParticipant', payload }),
      invalidatesTags: ['Participants'],
    }),
    removeParticipant: builder.mutation<RemoveParticipantResponse, RemoveParticipantPayload>({
      query: (payload: RemoveParticipantPayload): BackendOperation => ({ type: 'removeParticipant', payload }),
      invalidatesTags: ['Participants'],
    }),
    changeParticipantRole: builder.mutation<ChangeParticipantRoleResponse, ChangeParticipantRolePayload>({
      query: (payload: ChangeParticipantRolePayload): BackendOperation => ({ type: 'changeParticipantRole', payload }),
      invalidatesTags: ['Participants'],
    }),

    // Permissions
    getPermissionRequests: builder.query<PermissionRequest[], string>({
      query: (meetingId: string): BackendOperation => ({ type: 'listPermissionRequests', meetingId }),
      providesTags: ['Permissions'],
    }),
    requestPermission: builder.mutation<RequestPermissionResponse, RequestPermissionPayload>({
      query: (payload: RequestPermissionPayload): BackendOperation => ({ type: 'requestPermission', payload }),
      invalidatesTags: ['Permissions'],
    }),
    decidePermissionRequest: builder.mutation<DecidePermissionRequestResponse, DecidePermissionRequestPayload>({
      query: (payload: DecidePermissionRequestPayload): BackendOperation => ({
        type: 'decidePermissionRequest',
        payload,
      }),
      invalidatesTags: ['Permissions', 'Participants'],
    }),
    updateParticipantPermissions: builder.mutation<
      UpdateParticipantPermissionsResponse,
      UpdateParticipantPermissionsPayload
    >({
      query: (payload: UpdateParticipantPermissionsPayload): BackendOperation => ({
        type: 'updateParticipantPermissions',
        payload,
      }),
      invalidatesTags: ['Permissions', 'Participants'],
    }),
    bulkUpdatePermissions: builder.mutation<BulkUpdatePermissionsResponse, BulkUpdatePermissionsPayload>({
      query: (payload: BulkUpdatePermissionsPayload): BackendOperation => ({
        type: 'bulkUpdatePermissions',
        payload,
      }),
      invalidatesTags: ['Permissions', 'Participants'],
    }),

    // Chat
    getChatMessages: builder.query<ChatMessage[], string>({
      query: (meetingId: string): BackendOperation => ({ type: 'listChatMessages', meetingId }),
      providesTags: ['Chat'],
    }),
    sendChatMessage: builder.mutation<SendChatMessageResponse, SendChatMessagePayload>({
      query: (payload: SendChatMessagePayload): BackendOperation => ({ type: 'sendChatMessage', payload }),
      invalidatesTags: ['Chat'],
    }),
    sendAnnouncement: builder.mutation<SendAnnouncementResponse, SendAnnouncementPayload>({
      query: (payload: SendAnnouncementPayload): BackendOperation => ({ type: 'sendAnnouncement', payload }),
      invalidatesTags: ['Chat'],
    }),

    // Notifications
    getNotifications: builder.query<AppNotification[], void>({
      query: (): BackendOperation => ({ type: 'listNotifications' }),
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation<boolean, string>({
      query: (notificationId: string): BackendOperation => ({ type: 'markNotificationRead', notificationId }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation<boolean, void>({
      query: (): BackendOperation => ({ type: 'markAllNotificationsRead' }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetUpcomingMeetingsQuery,
  useGetRecentMeetingsQuery,
  useGetMeetingDetailsQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useCancelMeetingMutation,
  useResolveMeetingMutation,
  useJoinMeetingMutation,
  useStartMeetingMutation,
  useEndMeetingMutation,
  useGetMeetingSummaryQuery,
  useGetInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useSaveGuestScheduleMutation,
  useSendInvitationsMutation,
  useGetParticipantsQuery,
  useAdmitParticipantMutation,
  useRemoveParticipantMutation,
  useChangeParticipantRoleMutation,
  useGetPermissionRequestsQuery,
  useRequestPermissionMutation,
  useDecidePermissionRequestMutation,
  useUpdateParticipantPermissionsMutation,
  useBulkUpdatePermissionsMutation,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useSendAnnouncementMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = appApi;

export const useGetMeetingQuery = appApi.useGetMeetingDetailsQuery;
