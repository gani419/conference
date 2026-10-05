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

export interface BackendAdapter {
  // Auth
  login(payload: LoginPayload, ctx: RequestContext): Promise<ApiResult<LoginResponse>>;
  register(payload: RegisterPayload, ctx: RequestContext): Promise<ApiResult<RegisterResponse>>;
  guestLogin(payload: GuestLoginPayload, ctx: RequestContext): Promise<ApiResult<GuestLoginResponse>>;
  verifyContact(payload: VerifyContactPayload, ctx: RequestContext): Promise<ApiResult<VerifyContactResponse>>;
  resendVerificationCode(verificationId: string, ctx: RequestContext): Promise<ApiResult<boolean>>;
  forgotPassword(payload: ForgotPasswordPayload, ctx: RequestContext): Promise<ApiResult<ForgotPasswordResponse>>;
  resetPassword(payload: ResetPasswordPayload, ctx: RequestContext): Promise<ApiResult<ResetPasswordResponse>>;
  getCurrentUser(ctx: RequestContext): Promise<ApiResult<AppUser>>;

  // Meetings
  listMeetings(page: PageRequest, ctx: RequestContext): Promise<ApiResult<PageResponse<MeetingListItem>>>;
  getUpcomingMeetings(ctx: RequestContext): Promise<ApiResult<MeetingListItem[]>>;
  getRecentMeetings(ctx: RequestContext): Promise<ApiResult<MeetingListItem[]>>;
  getMeetingDetails(meetingId: string, ctx: RequestContext): Promise<ApiResult<Meeting>>;
  createMeeting(payload: CreateMeetingPayload, ctx: RequestContext): Promise<ApiResult<CreateMeetingResponse>>;
  updateMeeting(payload: UpdateMeetingPayload, ctx: RequestContext): Promise<ApiResult<UpdateMeetingResponse>>;
  cancelMeeting(payload: CancelMeetingPayload, ctx: RequestContext): Promise<ApiResult<CancelMeetingResponse>>;
  resolveMeeting(payload: ResolveMeetingPayload, ctx: RequestContext): Promise<ApiResult<ResolveMeetingResponse>>;
  joinMeeting(payload: JoinMeetingPayload, ctx: RequestContext): Promise<ApiResult<JoinMeetingResponse>>;
  startMeeting(meetingId: string, ctx: RequestContext): Promise<ApiResult<Meeting>>;
  endMeeting(meetingId: string, ctx: RequestContext): Promise<ApiResult<Meeting>>;
  getMeetingSummary(meetingId: string, ctx: RequestContext): Promise<ApiResult<MeetingSummary>>;

  // Invitations
  listInvitations(ctx: RequestContext): Promise<ApiResult<MeetingInvitation[]>>;
  acceptInvitation(payload: AcceptInvitationPayload, ctx: RequestContext): Promise<ApiResult<AcceptInvitationResponse>>;
  declineInvitation(payload: DeclineInvitationPayload, ctx: RequestContext): Promise<ApiResult<DeclineInvitationResponse>>;
  saveGuestSchedule(payload: SaveGuestSchedulePayload, ctx: RequestContext): Promise<ApiResult<SaveGuestScheduleResponse>>;
  sendInvitations(payload: SendInvitationsPayload, ctx: RequestContext): Promise<ApiResult<SendInvitationsResponse>>;

  // Participants & Moderation
  listParticipants(meetingId: string, ctx: RequestContext): Promise<ApiResult<MeetingParticipant[]>>;
  admitParticipant(payload: AdmitParticipantPayload, ctx: RequestContext): Promise<ApiResult<AdmitParticipantResponse>>;
  removeParticipant(payload: RemoveParticipantPayload, ctx: RequestContext): Promise<ApiResult<RemoveParticipantResponse>>;
  changeParticipantRole(payload: ChangeParticipantRolePayload, ctx: RequestContext): Promise<ApiResult<ChangeParticipantRoleResponse>>;

  // Permissions
  requestPermission(payload: RequestPermissionPayload, ctx: RequestContext): Promise<ApiResult<RequestPermissionResponse>>;
  decidePermissionRequest(payload: DecidePermissionRequestPayload, ctx: RequestContext): Promise<ApiResult<DecidePermissionRequestResponse>>;
  updateParticipantPermissions(payload: UpdateParticipantPermissionsPayload, ctx: RequestContext): Promise<ApiResult<UpdateParticipantPermissionsResponse>>;
  bulkUpdatePermissions(payload: BulkUpdatePermissionsPayload, ctx: RequestContext): Promise<ApiResult<BulkUpdatePermissionsResponse>>;
  listPermissionRequests(meetingId: string, ctx: RequestContext): Promise<ApiResult<PermissionRequest[]>>;

  // Chat
  listChatMessages(meetingId: string, ctx: RequestContext): Promise<ApiResult<ChatMessage[]>>;
  sendChatMessage(payload: SendChatMessagePayload, ctx: RequestContext): Promise<ApiResult<SendChatMessageResponse>>;
  sendAnnouncement(payload: SendAnnouncementPayload, ctx: RequestContext): Promise<ApiResult<SendAnnouncementResponse>>;

  // Notifications
  listNotifications(ctx: RequestContext): Promise<ApiResult<AppNotification[]>>;
  markNotificationRead(notificationId: string, ctx: RequestContext): Promise<ApiResult<boolean>>;
  markAllNotificationsRead(ctx: RequestContext): Promise<ApiResult<boolean>>;
}
