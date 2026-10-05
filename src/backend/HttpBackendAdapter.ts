import { BackendAdapter } from './BackendAdapter';
import { ApiResult, PageRequest, PageResponse, RequestContext } from '../types/common';
import {
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  GuestLoginPayload,
  GuestLoginResponse,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  VerifyContactPayload,
  VerifyContactResponse,
} from '../types/auth';
import { AppUser } from '../types/user';
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
import { AppNotification } from '../types/notification';
import { API_ROUTES } from '../constants/apiRoutes';

export class HttpBackendAdapter implements BackendAdapter {
  constructor(private baseUrl: string) {}

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    ctx: RequestContext,
    body?: unknown,
  ): Promise<ApiResult<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': ctx.requestId,
    };
    if (ctx.accessToken) {
      headers.Authorization = `Bearer ${ctx.accessToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: ctx.signal
          ? (ctx.signal as unknown as NonNullable<Parameters<typeof fetch>[1]>['signal'])
          : undefined,
      });

      const json = (await response.json()) as ApiResult<T>;
      return json;
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'Network request failed',
          fieldErrors: [],
        },
        requestId: ctx.requestId,
        serverTime: new Date().toISOString(),
      };
    }
  }

  async login(payload: LoginPayload, ctx: RequestContext): Promise<ApiResult<LoginResponse>> {
    return this.request<LoginResponse>(API_ROUTES.AUTH.LOGIN, 'POST', ctx, payload);
  }

  async register(payload: RegisterPayload, ctx: RequestContext): Promise<ApiResult<RegisterResponse>> {
    return this.request<RegisterResponse>(API_ROUTES.AUTH.REGISTER, 'POST', ctx, payload);
  }

  async guestLogin(payload: GuestLoginPayload, ctx: RequestContext): Promise<ApiResult<GuestLoginResponse>> {
    return this.request<GuestLoginResponse>(API_ROUTES.AUTH.GUEST_LOGIN, 'POST', ctx, payload);
  }

  async verifyContact(payload: VerifyContactPayload, ctx: RequestContext): Promise<ApiResult<VerifyContactResponse>> {
    return this.request<VerifyContactResponse>(API_ROUTES.AUTH.VERIFY_CONTACT, 'POST', ctx, payload);
  }

  async resendVerificationCode(verificationId: string, ctx: RequestContext): Promise<ApiResult<boolean>> {
    return this.request<boolean>(API_ROUTES.AUTH.RESEND_CODE, 'POST', ctx, { verificationId });
  }

  async forgotPassword(payload: ForgotPasswordPayload, ctx: RequestContext): Promise<ApiResult<ForgotPasswordResponse>> {
    return this.request<ForgotPasswordResponse>(API_ROUTES.AUTH.FORGOT_PASSWORD, 'POST', ctx, payload);
  }

  async resetPassword(payload: ResetPasswordPayload, ctx: RequestContext): Promise<ApiResult<ResetPasswordResponse>> {
    return this.request<ResetPasswordResponse>(API_ROUTES.AUTH.RESET_PASSWORD, 'POST', ctx, payload);
  }

  async getCurrentUser(ctx: RequestContext): Promise<ApiResult<AppUser>> {
    return this.request<AppUser>(API_ROUTES.AUTH.ME, 'GET', ctx);
  }

  async listMeetings(page: PageRequest, ctx: RequestContext): Promise<ApiResult<PageResponse<MeetingListItem>>> {
    return this.request<PageResponse<MeetingListItem>>(
      `${API_ROUTES.MEETINGS.LIST}?page=${page.page}&pageSize=${page.pageSize}`,
      'GET',
      ctx,
    );
  }

  async getUpcomingMeetings(ctx: RequestContext): Promise<ApiResult<MeetingListItem[]>> {
    return this.request<MeetingListItem[]>(API_ROUTES.MEETINGS.UPCOMING, 'GET', ctx);
  }

  async getRecentMeetings(ctx: RequestContext): Promise<ApiResult<MeetingListItem[]>> {
    return this.request<MeetingListItem[]>(API_ROUTES.MEETINGS.RECENT, 'GET', ctx);
  }

  async getMeetingDetails(meetingId: string, ctx: RequestContext): Promise<ApiResult<Meeting>> {
    return this.request<Meeting>(API_ROUTES.MEETINGS.DETAILS(meetingId), 'GET', ctx);
  }

  async createMeeting(payload: CreateMeetingPayload, ctx: RequestContext): Promise<ApiResult<CreateMeetingResponse>> {
    return this.request<CreateMeetingResponse>(API_ROUTES.MEETINGS.CREATE, 'POST', ctx, payload);
  }

  async updateMeeting(payload: UpdateMeetingPayload, ctx: RequestContext): Promise<ApiResult<UpdateMeetingResponse>> {
    return this.request<UpdateMeetingResponse>(API_ROUTES.MEETINGS.UPDATE(payload.meetingId), 'PUT', ctx, payload);
  }

  async cancelMeeting(payload: CancelMeetingPayload, ctx: RequestContext): Promise<ApiResult<CancelMeetingResponse>> {
    return this.request<CancelMeetingResponse>(API_ROUTES.MEETINGS.CANCEL(payload.meetingId), 'POST', ctx, payload);
  }

  async resolveMeeting(payload: ResolveMeetingPayload, ctx: RequestContext): Promise<ApiResult<ResolveMeetingResponse>> {
    return this.request<ResolveMeetingResponse>(API_ROUTES.MEETINGS.RESOLVE, 'POST', ctx, payload);
  }

  async joinMeeting(payload: JoinMeetingPayload, ctx: RequestContext): Promise<ApiResult<JoinMeetingResponse>> {
    return this.request<JoinMeetingResponse>(API_ROUTES.MEETINGS.JOIN(payload.meetingId), 'POST', ctx, payload);
  }

  async startMeeting(meetingId: string, ctx: RequestContext): Promise<ApiResult<Meeting>> {
    return this.request<Meeting>(API_ROUTES.MEETINGS.START(meetingId), 'POST', ctx);
  }

  async endMeeting(meetingId: string, ctx: RequestContext): Promise<ApiResult<Meeting>> {
    return this.request<Meeting>(API_ROUTES.MEETINGS.END(meetingId), 'POST', ctx);
  }

  async getMeetingSummary(meetingId: string, ctx: RequestContext): Promise<ApiResult<MeetingSummary>> {
    return this.request<MeetingSummary>(API_ROUTES.MEETINGS.SUMMARY(meetingId), 'GET', ctx);
  }

  async listInvitations(ctx: RequestContext): Promise<ApiResult<MeetingInvitation[]>> {
    return this.request<MeetingInvitation[]>(API_ROUTES.INVITATIONS.LIST, 'GET', ctx);
  }

  async acceptInvitation(payload: AcceptInvitationPayload, ctx: RequestContext): Promise<ApiResult<AcceptInvitationResponse>> {
    return this.request<AcceptInvitationResponse>(API_ROUTES.INVITATIONS.ACCEPT(payload.invitationId), 'POST', ctx);
  }

  async declineInvitation(payload: DeclineInvitationPayload, ctx: RequestContext): Promise<ApiResult<DeclineInvitationResponse>> {
    return this.request<DeclineInvitationResponse>(API_ROUTES.INVITATIONS.DECLINE(payload.invitationId), 'POST', ctx, payload);
  }

  async saveGuestSchedule(payload: SaveGuestSchedulePayload, ctx: RequestContext): Promise<ApiResult<SaveGuestScheduleResponse>> {
    return this.request<SaveGuestScheduleResponse>(API_ROUTES.INVITATIONS.SAVE_GUEST, 'POST', ctx, payload);
  }

  async sendInvitations(payload: SendInvitationsPayload, ctx: RequestContext): Promise<ApiResult<SendInvitationsResponse>> {
    return this.request<SendInvitationsResponse>(API_ROUTES.INVITATIONS.SEND(payload.meetingId), 'POST', ctx, payload);
  }

  async listParticipants(meetingId: string, ctx: RequestContext): Promise<ApiResult<MeetingParticipant[]>> {
    return this.request<MeetingParticipant[]>(API_ROUTES.PARTICIPANTS.LIST(meetingId), 'GET', ctx);
  }

  async admitParticipant(payload: AdmitParticipantPayload, ctx: RequestContext): Promise<ApiResult<AdmitParticipantResponse>> {
    return this.request<AdmitParticipantResponse>(
      API_ROUTES.PARTICIPANTS.ADMIT(payload.meetingId, payload.participantId),
      'POST',
      ctx,
      payload,
    );
  }

  async removeParticipant(payload: RemoveParticipantPayload, ctx: RequestContext): Promise<ApiResult<RemoveParticipantResponse>> {
    return this.request<RemoveParticipantResponse>(
      API_ROUTES.PARTICIPANTS.REMOVE(payload.meetingId, payload.participantId),
      'POST',
      ctx,
      payload,
    );
  }

  async changeParticipantRole(payload: ChangeParticipantRolePayload, ctx: RequestContext): Promise<ApiResult<ChangeParticipantRoleResponse>> {
    return this.request<ChangeParticipantRoleResponse>(
      API_ROUTES.PARTICIPANTS.CHANGE_ROLE(payload.meetingId, payload.participantId),
      'POST',
      ctx,
      payload,
    );
  }

  async requestPermission(payload: RequestPermissionPayload, ctx: RequestContext): Promise<ApiResult<RequestPermissionResponse>> {
    return this.request<RequestPermissionResponse>(API_ROUTES.PERMISSIONS.REQUEST(payload.meetingId), 'POST', ctx, payload);
  }

  async decidePermissionRequest(payload: DecidePermissionRequestPayload, ctx: RequestContext): Promise<ApiResult<DecidePermissionRequestResponse>> {
    return this.request<DecidePermissionRequestResponse>(
      API_ROUTES.PERMISSIONS.DECIDE(payload.meetingId, payload.requestId),
      'POST',
      ctx,
      payload,
    );
  }

  async updateParticipantPermissions(payload: UpdateParticipantPermissionsPayload, ctx: RequestContext): Promise<ApiResult<UpdateParticipantPermissionsResponse>> {
    return this.request<UpdateParticipantPermissionsResponse>(
      API_ROUTES.PERMISSIONS.UPDATE(payload.meetingId, payload.participantId),
      'POST',
      ctx,
      payload,
    );
  }

  async bulkUpdatePermissions(payload: BulkUpdatePermissionsPayload, ctx: RequestContext): Promise<ApiResult<BulkUpdatePermissionsResponse>> {
    return this.request<BulkUpdatePermissionsResponse>(API_ROUTES.PERMISSIONS.BULK_UPDATE(payload.meetingId), 'POST', ctx, payload);
  }

  async listPermissionRequests(meetingId: string, ctx: RequestContext): Promise<ApiResult<PermissionRequest[]>> {
    return this.request<PermissionRequest[]>(API_ROUTES.PERMISSIONS.REQUEST(meetingId), 'GET', ctx);
  }

  async listChatMessages(meetingId: string, ctx: RequestContext): Promise<ApiResult<ChatMessage[]>> {
    return this.request<ChatMessage[]>(API_ROUTES.CHAT.MESSAGES(meetingId), 'GET', ctx);
  }

  async sendChatMessage(payload: SendChatMessagePayload, ctx: RequestContext): Promise<ApiResult<SendChatMessageResponse>> {
    return this.request<SendChatMessageResponse>(API_ROUTES.CHAT.SEND(payload.meetingId), 'POST', ctx, payload);
  }

  async sendAnnouncement(payload: SendAnnouncementPayload, ctx: RequestContext): Promise<ApiResult<SendAnnouncementResponse>> {
    return this.request<SendAnnouncementResponse>(API_ROUTES.CHAT.ANNOUNCE(payload.meetingId), 'POST', ctx, payload);
  }

  async listNotifications(ctx: RequestContext): Promise<ApiResult<AppNotification[]>> {
    return this.request<AppNotification[]>(API_ROUTES.NOTIFICATIONS.LIST, 'GET', ctx);
  }

  async markNotificationRead(notificationId: string, ctx: RequestContext): Promise<ApiResult<boolean>> {
    return this.request<boolean>(API_ROUTES.NOTIFICATIONS.MARK_READ(notificationId), 'POST', ctx);
  }

  async markAllNotificationsRead(ctx: RequestContext): Promise<ApiResult<boolean>> {
    return this.request<boolean>(API_ROUTES.NOTIFICATIONS.MARK_ALL_READ, 'POST', ctx);
  }
}
