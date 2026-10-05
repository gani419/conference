import { BaseQueryFn } from '@reduxjs/toolkit/query';
import { ApiErrorCode, FieldError, PageRequest, RequestContext } from '../types/common';
import { backend } from '../backend';
import {
  CreateMeetingPayload,
  JoinMeetingPayload,
  ResolveMeetingPayload,
  UpdateMeetingPayload,
} from '../types/meeting';
import {
  AcceptInvitationPayload,
  DeclineInvitationPayload,
  SaveGuestSchedulePayload,
  SendInvitationsPayload,
} from '../types/invitation';
import {
  AdmitParticipantPayload,
  ChangeParticipantRolePayload,
  RemoveParticipantPayload,
} from '../types/participant';
import {
  BulkUpdatePermissionsPayload,
  DecidePermissionRequestPayload,
  RequestPermissionPayload,
  UpdateParticipantPermissionsPayload,
} from '../types/permission';
import { SendAnnouncementPayload, SendChatMessagePayload } from '../types/chat';

export type BackendOperation =
  | { type: 'listMeetings'; page: PageRequest }
  | { type: 'getUpcomingMeetings' }
  | { type: 'getRecentMeetings' }
  | { type: 'getMeetingDetails'; meetingId: string }
  | { type: 'createMeeting'; payload: CreateMeetingPayload }
  | { type: 'updateMeeting'; payload: UpdateMeetingPayload }
  | { type: 'cancelMeeting'; meetingId: string; expectedVersion: number }
  | { type: 'resolveMeeting'; payload: ResolveMeetingPayload }
  | { type: 'joinMeeting'; payload: JoinMeetingPayload }
  | { type: 'startMeeting'; meetingId: string }
  | { type: 'endMeeting'; meetingId: string }
  | { type: 'getMeetingSummary'; meetingId: string }
  | { type: 'listInvitations' }
  | { type: 'acceptInvitation'; payload: AcceptInvitationPayload }
  | { type: 'declineInvitation'; payload: DeclineInvitationPayload }
  | { type: 'saveGuestSchedule'; payload: SaveGuestSchedulePayload }
  | { type: 'sendInvitations'; payload: SendInvitationsPayload }
  | { type: 'listParticipants'; meetingId: string }
  | { type: 'admitParticipant'; payload: AdmitParticipantPayload }
  | { type: 'removeParticipant'; payload: RemoveParticipantPayload }
  | { type: 'changeParticipantRole'; payload: ChangeParticipantRolePayload }
  | { type: 'listPermissionRequests'; meetingId: string }
  | { type: 'requestPermission'; payload: RequestPermissionPayload }
  | { type: 'decidePermissionRequest'; payload: DecidePermissionRequestPayload }
  | { type: 'updateParticipantPermissions'; payload: UpdateParticipantPermissionsPayload }
  | { type: 'bulkUpdatePermissions'; payload: BulkUpdatePermissionsPayload }
  | { type: 'listChatMessages'; meetingId: string }
  | { type: 'sendChatMessage'; payload: SendChatMessagePayload }
  | { type: 'sendAnnouncement'; payload: SendAnnouncementPayload }
  | { type: 'listNotifications' }
  | { type: 'markNotificationRead'; notificationId: string }
  | { type: 'markAllNotificationsRead' };

export interface BackendQueryError {
  code: ApiErrorCode;
  message: string;
  fieldErrors: FieldError[];
}

export const backendBaseQuery =
  (): BaseQueryFn<BackendOperation, unknown, BackendQueryError> =>
  async (arg, api) => {
    const state = api.getState() as { auth: { session: { tokens: { accessToken: string } } | null } };
    const accessToken = state.auth.session?.tokens.accessToken ?? null;
    const ctx: RequestContext = {
      accessToken,
      requestId: `rtk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      signal: api.signal,
    };

    try {
      let result;
      switch (arg.type) {
        case 'listMeetings':
          result = await backend.listMeetings(arg.page, ctx);
          break;
        case 'getUpcomingMeetings':
          result = await backend.getUpcomingMeetings(ctx);
          break;
        case 'getRecentMeetings':
          result = await backend.getRecentMeetings(ctx);
          break;
        case 'getMeetingDetails':
          result = await backend.getMeetingDetails(arg.meetingId, ctx);
          break;
        case 'createMeeting':
          result = await backend.createMeeting(arg.payload, ctx);
          break;
        case 'updateMeeting':
          result = await backend.updateMeeting(arg.payload, ctx);
          break;
        case 'cancelMeeting':
          result = await backend.cancelMeeting({ meetingId: arg.meetingId, expectedVersion: arg.expectedVersion }, ctx);
          break;
        case 'resolveMeeting':
          result = await backend.resolveMeeting(arg.payload, ctx);
          break;
        case 'joinMeeting':
          result = await backend.joinMeeting(arg.payload, ctx);
          break;
        case 'startMeeting':
          result = await backend.startMeeting(arg.meetingId, ctx);
          break;
        case 'endMeeting':
          result = await backend.endMeeting(arg.meetingId, ctx);
          break;
        case 'getMeetingSummary':
          result = await backend.getMeetingSummary(arg.meetingId, ctx);
          break;
        case 'listInvitations':
          result = await backend.listInvitations(ctx);
          break;
        case 'acceptInvitation':
          result = await backend.acceptInvitation(arg.payload, ctx);
          break;
        case 'declineInvitation':
          result = await backend.declineInvitation(arg.payload, ctx);
          break;
        case 'saveGuestSchedule':
          result = await backend.saveGuestSchedule(arg.payload, ctx);
          break;
        case 'sendInvitations':
          result = await backend.sendInvitations(arg.payload, ctx);
          break;
        case 'listParticipants':
          result = await backend.listParticipants(arg.meetingId, ctx);
          break;
        case 'admitParticipant':
          result = await backend.admitParticipant(arg.payload, ctx);
          break;
        case 'removeParticipant':
          result = await backend.removeParticipant(arg.payload, ctx);
          break;
        case 'changeParticipantRole':
          result = await backend.changeParticipantRole(arg.payload, ctx);
          break;
        case 'listPermissionRequests':
          result = await backend.listPermissionRequests(arg.meetingId, ctx);
          break;
        case 'requestPermission':
          result = await backend.requestPermission(arg.payload, ctx);
          break;
        case 'decidePermissionRequest':
          result = await backend.decidePermissionRequest(arg.payload, ctx);
          break;
        case 'updateParticipantPermissions':
          result = await backend.updateParticipantPermissions(arg.payload, ctx);
          break;
        case 'bulkUpdatePermissions':
          result = await backend.bulkUpdatePermissions(arg.payload, ctx);
          break;
        case 'listChatMessages':
          result = await backend.listChatMessages(arg.meetingId, ctx);
          break;
        case 'sendChatMessage':
          result = await backend.sendChatMessage(arg.payload, ctx);
          break;
        case 'sendAnnouncement':
          result = await backend.sendAnnouncement(arg.payload, ctx);
          break;
        case 'listNotifications':
          result = await backend.listNotifications(ctx);
          break;
        case 'markNotificationRead':
          result = await backend.markNotificationRead(arg.notificationId, ctx);
          break;
        case 'markAllNotificationsRead':
          result = await backend.markAllNotificationsRead(ctx);
          break;
        default:
          return {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Unknown operation',
              fieldErrors: [],
            },
          };
      }

      if (result.success) {
        return { data: result.data };
      } else {
        return { error: result.error };
      }
    } catch (err) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'Unknown query error',
          fieldErrors: [],
        },
      };
    }
  };
