import { backend } from '../backend';
import { ApiResult, RequestContext } from '../types/common';
import {
  CancelMeetingPayload,
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

function makeContext(accessToken: string | null = null, signal?: AbortSignal): RequestContext {
  return {
    accessToken,
    requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    signal: signal ?? undefined,
  };
}

export const meetingService = {
  async getUpcomingMeetings(token: string | null, signal?: AbortSignal): Promise<ApiResult<MeetingListItem[]>> {
    return backend.getUpcomingMeetings(makeContext(token, signal));
  },

  async getRecentMeetings(token: string | null, signal?: AbortSignal): Promise<ApiResult<MeetingListItem[]>> {
    return backend.getRecentMeetings(makeContext(token, signal));
  },

  async getMeetingDetails(meetingId: string, token: string | null): Promise<ApiResult<Meeting>> {
    return backend.getMeetingDetails(meetingId, makeContext(token));
  },

  async createMeeting(payload: CreateMeetingPayload, token: string | null): Promise<ApiResult<CreateMeetingResponse>> {
    return backend.createMeeting(payload, makeContext(token));
  },

  async updateMeeting(payload: UpdateMeetingPayload, token: string | null): Promise<ApiResult<UpdateMeetingResponse>> {
    return backend.updateMeeting(payload, makeContext(token));
  },

  async cancelMeeting(payload: CancelMeetingPayload, token: string | null): Promise<ApiResult<CancelMeetingResponse>> {
    return backend.cancelMeeting(payload, makeContext(token));
  },

  async resolveMeeting(payload: ResolveMeetingPayload, token: string | null): Promise<ApiResult<ResolveMeetingResponse>> {
    return backend.resolveMeeting(payload, makeContext(token));
  },

  async joinMeeting(payload: JoinMeetingPayload, token: string | null): Promise<ApiResult<JoinMeetingResponse>> {
    return backend.joinMeeting(payload, makeContext(token));
  },

  async startMeeting(meetingId: string, token: string | null): Promise<ApiResult<Meeting>> {
    return backend.startMeeting(meetingId, makeContext(token));
  },

  async endMeeting(meetingId: string, token: string | null): Promise<ApiResult<Meeting>> {
    return backend.endMeeting(meetingId, makeContext(token));
  },

  async getMeetingSummary(meetingId: string, token: string | null): Promise<ApiResult<MeetingSummary>> {
    return backend.getMeetingSummary(meetingId, makeContext(token));
  },

  // Invitations
  async listInvitations(token: string | null): Promise<ApiResult<MeetingInvitation[]>> {
    return backend.listInvitations(makeContext(token));
  },

  async acceptInvitation(payload: AcceptInvitationPayload, token: string | null): Promise<ApiResult<AcceptInvitationResponse>> {
    return backend.acceptInvitation(payload, makeContext(token));
  },

  async declineInvitation(payload: DeclineInvitationPayload, token: string | null): Promise<ApiResult<DeclineInvitationResponse>> {
    return backend.declineInvitation(payload, makeContext(token));
  },

  async saveGuestSchedule(payload: SaveGuestSchedulePayload, token: string | null): Promise<ApiResult<SaveGuestScheduleResponse>> {
    return backend.saveGuestSchedule(payload, makeContext(token));
  },

  async sendInvitations(payload: SendInvitationsPayload, token: string | null): Promise<ApiResult<SendInvitationsResponse>> {
    return backend.sendInvitations(payload, makeContext(token));
  },

  // Participants & Lobby
  async listParticipants(meetingId: string, token: string | null): Promise<ApiResult<MeetingParticipant[]>> {
    return backend.listParticipants(meetingId, makeContext(token));
  },

  async admitParticipant(payload: AdmitParticipantPayload, token: string | null): Promise<ApiResult<AdmitParticipantResponse>> {
    return backend.admitParticipant(payload, makeContext(token));
  },

  async removeParticipant(payload: RemoveParticipantPayload, token: string | null): Promise<ApiResult<RemoveParticipantResponse>> {
    return backend.removeParticipant(payload, makeContext(token));
  },

  async changeParticipantRole(payload: ChangeParticipantRolePayload, token: string | null): Promise<ApiResult<ChangeParticipantRoleResponse>> {
    return backend.changeParticipantRole(payload, makeContext(token));
  },

  // Permissions
  async requestPermission(payload: RequestPermissionPayload, token: string | null): Promise<ApiResult<RequestPermissionResponse>> {
    return backend.requestPermission(payload, makeContext(token));
  },

  async decidePermissionRequest(payload: DecidePermissionRequestPayload, token: string | null): Promise<ApiResult<DecidePermissionRequestResponse>> {
    return backend.decidePermissionRequest(payload, makeContext(token));
  },

  async updateParticipantPermissions(payload: UpdateParticipantPermissionsPayload, token: string | null): Promise<ApiResult<UpdateParticipantPermissionsResponse>> {
    return backend.updateParticipantPermissions(payload, makeContext(token));
  },

  async bulkUpdatePermissions(payload: BulkUpdatePermissionsPayload, token: string | null): Promise<ApiResult<BulkUpdatePermissionsResponse>> {
    return backend.bulkUpdatePermissions(payload, makeContext(token));
  },

  async listPermissionRequests(meetingId: string, token: string | null): Promise<ApiResult<PermissionRequest[]>> {
    return backend.listPermissionRequests(meetingId, makeContext(token));
  },

  // Chat
  async listChatMessages(meetingId: string, token: string | null): Promise<ApiResult<ChatMessage[]>> {
    return backend.listChatMessages(meetingId, makeContext(token));
  },

  async sendChatMessage(payload: SendChatMessagePayload, token: string | null): Promise<ApiResult<SendChatMessageResponse>> {
    return backend.sendChatMessage(payload, makeContext(token));
  },

  async sendAnnouncement(payload: SendAnnouncementPayload, token: string | null): Promise<ApiResult<SendAnnouncementResponse>> {
    return backend.sendAnnouncement(payload, makeContext(token));
  },
};
