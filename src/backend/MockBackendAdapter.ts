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
  Session,
  SessionTokens,
  VerifyContactPayload,
  VerifyContactResponse,
} from '../types/auth';
import { AppUser, GuestUser, RegisteredUser } from '../types/user';
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
import { mockDatabase } from './mock/database';
import { mockEventBus } from './mock/eventBus';
import { MEETING_EVENTS } from '../constants/meetingEvents';
import { ENV } from '../config/environment';
import { SEEDED_USERS } from './mock/seed';
import {
  createMeetingPayloadSchema,
  updateMeetingPayloadSchema,
} from '../schemas/meetingSchemas';
import {
  loginPayloadSchema,
  registerPayloadSchema,
  guestLoginPayloadSchema,
  verifyContactPayloadSchema,
  forgotPasswordPayloadSchema,
  resetPasswordPayloadSchema,
} from '../schemas/authSchemas';
import { notificationService } from '../services/notificationService';
import { isMeetingEligibleToJoin } from '../utils/dates';

export class MockBackendAdapter implements BackendAdapter {
  private getServerTime(): string {
    return new Date().toISOString();
  }

  private async simulateLatencyAndCheckSignal(ctx: RequestContext): Promise<void> {
    if (ctx.signal?.aborted) {
      throw new Error('Request aborted');
    }
    if (ENV.mockFailureRate > 0 && Math.random() < ENV.mockFailureRate) {
      throw new Error('Network error simulated');
    }
    if (ENV.mockSimulatedLatencyMs > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ENV.mockSimulatedLatencyMs);
        if (ctx.signal) {
          ctx.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Request aborted'));
          });
        }
      });
    }
  }

  private getAuthenticatedUser(ctx: RequestContext): AppUser | null {
    if (!ctx.accessToken) {
      return null;
    }
    const match = ctx.accessToken.match(/^mock-token-(.+)$/);
    if (!match || !match[1]) {
      return null;
    }
    const userId = match[1];
    return mockDatabase.users.get(userId) ?? null;
  }

  // --- Auth Handlers ---

  async login(payload: LoginPayload, ctx: RequestContext): Promise<ApiResult<LoginResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const validation = loginPayloadSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login details',
          fieldErrors: validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    let foundUser: AppUser | undefined;
    for (const u of mockDatabase.users.values()) {
      if (u.kind === 'registered') {
        if (payload.identifier.kind === 'email' && u.email === payload.identifier.email) {
          foundUser = u;
          break;
        }
        if (payload.identifier.kind === 'phone' && u.phoneE164 === payload.identifier.phoneE164) {
          foundUser = u;
          break;
        }
      }
    }

    if (!foundUser) {
      const email = payload.identifier.kind === 'email' ? payload.identifier.email : undefined;
      const phoneE164 = payload.identifier.kind === 'phone' ? payload.identifier.phoneE164 : undefined;
      const id = `user-reg-${Date.now()}`;
      const newUser: RegisteredUser = {
        id,
        kind: 'registered',
        displayName: email ? email.split('@')[0] ?? 'User' : 'User',
        avatarId: 'avatar-1',
        email,
        phoneE164,
        isEmailVerified: true,
        isPhoneVerified: true,
        accountStatus: 'active',
        createdAt: this.getServerTime(),
        updatedAt: this.getServerTime(),
      };
      mockDatabase.users.set(id, newUser);
      foundUser = newUser;
    }

    const tokens: SessionTokens = {
      accessToken: `mock-token-${foundUser.id}`,
      refreshToken: `mock-refresh-${foundUser.id}`,
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    };

    const session: Session =
      foundUser.kind === 'registered'
        ? { kind: 'registered', user: foundUser as RegisteredUser, tokens }
        : { kind: 'guest', user: foundUser as GuestUser, tokens };

    return {
      success: true,
      data: { session },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async register(payload: RegisterPayload, ctx: RequestContext): Promise<ApiResult<RegisterResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const validation = registerPayloadSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration details',
          fieldErrors: validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const id = `user-${Date.now()}`;
    const email = payload.identifier.kind === 'email' ? payload.identifier.email : undefined;
    const phoneE164 = payload.identifier.kind === 'phone' ? payload.identifier.phoneE164 : undefined;
    const newUser: RegisteredUser = {
      id,
      kind: 'registered',
      displayName: payload.displayName,
      avatarId: payload.avatarId,
      email,
      phoneE164,
      isEmailVerified: false,
      isPhoneVerified: false,
      accountStatus: 'pending_verification',
      createdAt: this.getServerTime(),
      updatedAt: this.getServerTime(),
    };

    mockDatabase.users.set(id, newUser);

    const verificationId = `verif-${Date.now()}`;
    mockDatabase.verificationCodes.set(verificationId, {
      code: '123456',
      userId: id,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return {
      success: true,
      data: {
        user: newUser,
        verificationId,
        verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async guestLogin(payload: GuestLoginPayload, ctx: RequestContext): Promise<ApiResult<GuestLoginResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const validation = guestLoginPayloadSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid guest details',
          fieldErrors: validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const guestId = `guest-${Date.now()}`;
    const guestUser: GuestUser = {
      id: guestId,
      kind: 'guest',
      displayName: payload.displayName,
      avatarId: payload.avatarId,
      createdAt: this.getServerTime(),
    };

    mockDatabase.users.set(guestId, guestUser);

    const tokens: SessionTokens = {
      accessToken: `mock-token-${guestId}`,
      refreshToken: `mock-refresh-${guestId}`,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    return {
      success: true,
      data: {
        session: {
          kind: 'guest',
          user: guestUser,
          tokens,
        },
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async verifyContact(payload: VerifyContactPayload, ctx: RequestContext): Promise<ApiResult<VerifyContactResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const validation = verifyContactPayloadSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid verification details',
          fieldErrors: validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const record = mockDatabase.verificationCodes.get(payload.verificationId);
    if (!record) {
      if (payload.code !== '123456') {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid verification code. Use 123456 in mock mode.',
            fieldErrors: [{ path: 'code', message: 'Incorrect code' }],
          },
          requestId: ctx.requestId,
          serverTime: this.getServerTime(),
        };
      }
    } else {
      if (Date.now() > record.expiresAt) {
        return {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Verification code has expired. Please request a new one.',
            fieldErrors: [],
          },
          requestId: ctx.requestId,
          serverTime: this.getServerTime(),
        };
      }
      if (record.code !== payload.code && payload.code !== '123456') {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Incorrect verification code. (Hint: 123456)',
            fieldErrors: [{ path: 'code', message: 'Incorrect code' }],
          },
          requestId: ctx.requestId,
          serverTime: this.getServerTime(),
        };
      }
    }

    const userId = record ? record.userId : SEEDED_USERS.ORGANIZER.id;
    const user = mockDatabase.users.get(userId) as RegisteredUser | undefined;

    if (user) {
      user.isEmailVerified = true;
      user.isPhoneVerified = true;
      user.accountStatus = 'active';
      user.updatedAt = this.getServerTime();
    }

    const targetUser: RegisteredUser = user ?? SEEDED_USERS.ORGANIZER;
    const tokens: SessionTokens = {
      accessToken: `mock-token-${targetUser.id}`,
      refreshToken: `mock-refresh-${targetUser.id}`,
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    };

    return {
      success: true,
      data: {
        session: {
          kind: 'registered',
          user: targetUser,
          tokens,
        },
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async resendVerificationCode(verificationId: string, ctx: RequestContext): Promise<ApiResult<boolean>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const record = mockDatabase.verificationCodes.get(verificationId);
    const userId = record ? record.userId : 'user-new';
    mockDatabase.verificationCodes.set(verificationId, {
      code: '123456',
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return {
      success: true,
      data: true,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async forgotPassword(payload: ForgotPasswordPayload, ctx: RequestContext): Promise<ApiResult<ForgotPasswordResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const validation = forgotPasswordPayloadSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid identifier',
          fieldErrors: validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const token = `reset-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    mockDatabase.resetTokens.set(token, {
      userId: SEEDED_USERS.ORGANIZER.id,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    const isEmail = payload.identifier.kind === 'email';
    const emailStr = payload.identifier.kind === 'email' ? payload.identifier.email : '';
    const phoneStr = payload.identifier.kind === 'phone' ? payload.identifier.phoneE164 : '';
    const destination = isEmail ? emailStr : phoneStr;
    const masked = isEmail
      ? destination.replace(/^(.)(.*)(@.*)$/, (_m: string, a: string, _b: string, c: string): string => `${a}***${c}`)
      : destination.replace(/^(\+\d{2})(\d+)(\d{2})$/, (_m: string, a: string, _b: string, c: string): string => `${a}******${c}`);

    return {
      success: true,
      data: {
        resetToken: token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        maskedDestination: masked,
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async resetPassword(payload: ResetPasswordPayload, ctx: RequestContext): Promise<ApiResult<ResetPasswordResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const validation = resetPasswordPayloadSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid password details',
          fieldErrors: validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    return {
      success: true,
      data: { success: true },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async getCurrentUser(ctx: RequestContext): Promise<ApiResult<AppUser>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const user = this.getAuthenticatedUser(ctx);
    if (!user) {
      return {
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Not signed in',
          fieldErrors: [],
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    return {
      success: true,
      data: user,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  // --- Meeting Handlers ---

  async listMeetings(page: PageRequest, ctx: RequestContext): Promise<ApiResult<PageResponse<MeetingListItem>>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const currentUser = this.getAuthenticatedUser(ctx);
    const all = Array.from(mockDatabase.meetings.values());

    const items: MeetingListItem[] = all.map((m) => {
      const isOrganizer = currentUser?.id === m.organizerId;
      const invitee = currentUser?.kind === 'registered' ? m.invitees.find((i) => i.email === currentUser.email) : undefined;
      const userRole = isOrganizer ? 'host' : invitee?.role === 'co_host' ? 'co_host' : 'participant';
      const eligible = isMeetingEligibleToJoin(m.scheduledStartTime, m.status, this.getServerTime());

      return {
        id: m.id,
        code: m.code,
        shareLink: m.shareLink,
        title: m.title,
        organizerName: m.organizerName,
        organizerAvatarId: m.organizerAvatarId,
        scheduledStartTime: m.scheduledStartTime,
        actualStartTime: m.actualStartTime ?? undefined,
        endedAt: m.endedAt ?? undefined,
        durationMinutes: 45,
        timezone: m.timing.kind === 'scheduled' ? m.timing.timezone : 'America/Los_Angeles',
        status: m.status,
        userRole,
        participantCount: m.activeParticipantCount,
        participantAvatars: ['avatar-1', 'avatar-2', 'avatar-3'],
        canJoin: eligible && m.status !== 'cancelled' && m.status !== 'ended',
        canEdit: (userRole === 'host' || userRole === 'co_host') && m.status !== 'ended' && m.status !== 'cancelled',
        canCancel: (userRole === 'host' || userRole === 'co_host') && m.status !== 'ended' && m.status !== 'cancelled',
      };
    });

    const start = page.page * page.pageSize;
    const paged = items.slice(start, start + page.pageSize);

    return {
      success: true,
      data: {
        items: paged,
        page: page.page,
        pageSize: page.pageSize,
        totalItems: items.length,
        hasMore: start + page.pageSize < items.length,
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async getUpcomingMeetings(ctx: RequestContext): Promise<ApiResult<MeetingListItem[]>> {
    const res = await this.listMeetings({ page: 0, pageSize: 10 }, ctx);
    if (!res.success) return res;
    const upcoming = res.data.items.filter((m) => m.status === 'scheduled' || m.status === 'live');
    return {
      success: true,
      data: upcoming,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async getRecentMeetings(ctx: RequestContext): Promise<ApiResult<MeetingListItem[]>> {
    const res = await this.listMeetings({ page: 0, pageSize: 10 }, ctx);
    if (!res.success) return res;
    const recent = res.data.items.filter((m) => m.status === 'ended' || m.status === 'cancelled');
    return {
      success: true,
      data: recent,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async getMeetingDetails(meetingId: string, ctx: RequestContext): Promise<ApiResult<Meeting>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const meeting = mockDatabase.meetings.get(meetingId);
    if (!meeting) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Meeting not found',
          fieldErrors: [],
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    return {
      success: true,
      data: meeting,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async createMeeting(payload: CreateMeetingPayload, ctx: RequestContext): Promise<ApiResult<CreateMeetingResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const currentUser = this.getAuthenticatedUser(ctx);
    if (!currentUser) {
      return {
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'You must be signed in to create a meeting',
          fieldErrors: [],
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    if (currentUser.kind === 'guest') {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Guests cannot create meetings. Please register an account.',
          fieldErrors: [],
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const regUser = currentUser as RegisteredUser;
    if (regUser.accountStatus === 'pending_verification' || (!regUser.isEmailVerified && !regUser.isPhoneVerified)) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Account verification required before creating meetings.',
          fieldErrors: [],
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const validation = createMeetingPayloadSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Meeting validation failed',
          fieldErrors: validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const meetingId = `meet-${Date.now()}`;
    const code = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const scheduledStartTime = payload.timing.kind === 'scheduled' ? payload.timing.startsAt : this.getServerTime();

    const invitees = payload.invitees.map((inv, idx) => ({
      id: `inv-${Date.now()}-${idx}`,
      meetingId,
      displayName: inv.displayName,
      email: inv.email ?? undefined,
      phoneE164: inv.phoneE164 ?? undefined,
      role: inv.role,
      invitationStatus: 'pending' as const,
      invitedAt: this.getServerTime(),
    }));

    const newMeeting: Meeting = {
      id: meetingId,
      code,
      shareLink: `https://meet.app/${code}`,
      version: 1,
      title: payload.title,
      description: payload.description,
      organizerId: regUser.id,
      organizerName: regUser.displayName,
      organizerAvatarId: regUser.avatarId,
      status: payload.timing.kind === 'instant' ? 'live' : 'scheduled',
      timing: payload.timing,
      scheduledStartTime,
      actualStartTime: payload.timing.kind === 'instant' ? this.getServerTime() : undefined,
      guestAccess: payload.guestAccess,
      isLocked: false,
      defaultPermissions: payload.defaultPermissions,
      invitees,
      activeParticipantCount: 0,
      createdAt: this.getServerTime(),
      updatedAt: this.getServerTime(),
    };

    mockDatabase.meetings.set(meetingId, newMeeting);

    if (newMeeting.status === 'live') {
      const hostPart: MeetingParticipant = {
        id: `part-host-${regUser.id}`,
        meetingId,
        userId: regUser.id,
        displayName: `${regUser.displayName} (Host)`,
        avatarId: regUser.avatarId,
        role: 'host',
        status: 'in_meeting',
        permissions: {
          microphone: true,
          camera: true,
          screenShare: true,
          chat: true,
        },
        media: {
          isMuted: false,
          isCameraOff: false,
          isSharingScreen: false,
          isHandRaised: false,
        },
        joinedAt: this.getServerTime(),
      };
      mockDatabase.participants.set(meetingId, [hostPart]);
    }

    return {
      success: true,
      data: { meeting: newMeeting },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async updateMeeting(payload: UpdateMeetingPayload, ctx: RequestContext): Promise<ApiResult<UpdateMeetingResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const currentUser = this.getAuthenticatedUser(ctx);
    if (!currentUser) {
      return {
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in required', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const meeting = mockDatabase.meetings.get(payload.meetingId);
    if (!meeting) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Meeting not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const isHost = meeting.organizerId === currentUser.id;
    const isCoHost =
      currentUser.kind === 'registered' &&
      meeting.invitees.some((i) => i.email === currentUser.email && i.role === 'co_host' && i.invitationStatus === 'accepted');

    if (!isHost && !isCoHost) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only hosts or co-hosts can edit this meeting', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    if (meeting.version !== payload.expectedVersion) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'The meeting was modified by another host. Please refresh and try again.',
          fieldErrors: [],
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const validation = updateMeetingPayloadSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid meeting update payload',
          fieldErrors: validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const existingMap = new Map(meeting.invitees.map((i) => [i.email || i.phoneE164, i]));
    const updatedInvitees = payload.invitees.map((inv, idx) => {
      const key = inv.email || inv.phoneE164;
      const existing = key ? existingMap.get(key) : undefined;
      if (existing) {
        return {
          ...existing,
          displayName: inv.displayName,
          role: inv.role,
        };
      }
      return {
        id: `inv-${Date.now()}-${idx}`,
        meetingId: meeting.id,
        displayName: inv.displayName,
        email: inv.email ?? undefined,
        phoneE164: inv.phoneE164 ?? undefined,
        role: inv.role,
        invitationStatus: 'pending' as const,
        invitedAt: this.getServerTime(),
      };
    });

    meeting.title = payload.title;
    meeting.description = payload.description;
    meeting.timing = payload.timing;
    meeting.guestAccess = payload.guestAccess;
    meeting.defaultPermissions = payload.defaultPermissions;
    meeting.invitees = updatedInvitees;
    meeting.version += 1;
    meeting.updatedAt = this.getServerTime();

    return {
      success: true,
      data: { meeting },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async cancelMeeting(payload: CancelMeetingPayload, ctx: RequestContext): Promise<ApiResult<CancelMeetingResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const currentUser = this.getAuthenticatedUser(ctx);
    if (!currentUser) {
      return {
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in required', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const meeting = mockDatabase.meetings.get(payload.meetingId);
    if (!meeting) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Meeting not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const isHost = meeting.organizerId === currentUser.id;
    const isCoHost =
      currentUser.kind === 'registered' &&
      meeting.invitees.some((i) => i.email === currentUser.email && i.role === 'co_host' && i.invitationStatus === 'accepted');

    if (!isHost && !isCoHost) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only hosts or co-hosts can cancel this meeting', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    meeting.status = 'cancelled';
    meeting.version += 1;
    meeting.updatedAt = this.getServerTime();

    mockEventBus.emit({
      type: MEETING_EVENTS.MEETING_CANCELLED,
      meetingId: meeting.id,
      cancelledAt: meeting.updatedAt,
    });

    return {
      success: true,
      data: {
        meetingId: meeting.id,
        status: 'cancelled',
        updatedAt: meeting.updatedAt,
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async resolveMeeting(payload: ResolveMeetingPayload, ctx: RequestContext): Promise<ApiResult<ResolveMeetingResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const cleanInput = payload.codeOrLink.trim();
    let foundMeeting: Meeting | undefined;

    for (const m of mockDatabase.meetings.values()) {
      if (m.code.toLowerCase() === cleanInput.toLowerCase()) {
        foundMeeting = m;
        break;
      }
      if (m.shareLink.toLowerCase() === cleanInput.toLowerCase() || m.shareLink.toLowerCase().endsWith(cleanInput.toLowerCase())) {
        foundMeeting = m;
        break;
      }
      if (m.id.toLowerCase() === cleanInput.toLowerCase()) {
        foundMeeting = m;
        break;
      }
    }

    if (!foundMeeting) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No meeting found with that code or link',
          fieldErrors: [{ path: 'codeOrLink', message: 'Invalid code or link' }],
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const eligible = isMeetingEligibleToJoin(foundMeeting.scheduledStartTime, foundMeeting.status, this.getServerTime());

    return {
      success: true,
      data: {
        meeting: foundMeeting,
        eligibleToJoin: eligible,
        reason: !eligible ? 'Meeting has not started yet' : undefined,
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async joinMeeting(payload: JoinMeetingPayload, ctx: RequestContext): Promise<ApiResult<JoinMeetingResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const currentUser = this.getAuthenticatedUser(ctx);
    if (!currentUser) {
      return {
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'You must provide a name or sign in to join', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const meeting = mockDatabase.meetings.get(payload.meetingId);
    if (!meeting) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Meeting not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    if (meeting.status === 'cancelled') {
      return {
        success: false,
        error: { code: 'MEETING_CANCELLED', message: 'This meeting was cancelled by the host', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    if (meeting.status === 'ended') {
      return {
        success: false,
        error: { code: 'MEETING_ENDED', message: 'This meeting has already ended', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const eligible = isMeetingEligibleToJoin(meeting.scheduledStartTime, meeting.status, this.getServerTime());
    if (!eligible && meeting.organizerId !== currentUser.id) {
      return {
        success: false,
        error: {
          code: 'MEETING_NOT_STARTED',
          message: 'Meeting has not started yet. Joining unlocks at the scheduled time.',
          fieldErrors: [],
        },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const isOrganizer = meeting.organizerId === currentUser.id;
    let assignedRole: 'host' | 'co_host' | 'participant' | 'guest' = 'guest';

    if (isOrganizer) {
      assignedRole = 'host';
    } else if (currentUser.kind === 'registered') {
      const invitee = meeting.invitees.find((i) => i.email === (currentUser as RegisteredUser).email);
      if (invitee && invitee.role === 'co_host' && invitee.invitationStatus === 'accepted') {
        assignedRole = 'co_host';
      } else {
        assignedRole = 'participant';
      }
    } else {
      assignedRole = 'guest';
    }

    const isHostOrCoHost = assignedRole === 'host' || assignedRole === 'co_host';
    const requiresLobby = !isHostOrCoHost;

    const participantId = `part-${currentUser.id}-${Date.now()}`;
    const participant: MeetingParticipant = {
      id: participantId,
      meetingId: meeting.id,
      userId: currentUser.id,
      displayName: currentUser.displayName + (assignedRole === 'host' ? ' (Host)' : ''),
      avatarId: currentUser.avatarId,
      role: assignedRole,
      status: requiresLobby ? 'in_lobby' : 'in_meeting',
      permissions: isHostOrCoHost
        ? { microphone: true, camera: true, screenShare: true, chat: true }
        : meeting.defaultPermissions,
      media: {
        isMuted: true,
        isCameraOff: true,
        isSharingScreen: false,
        isHandRaised: false,
      },
      joinedAt: this.getServerTime(),
    };

    const currentList = mockDatabase.participants.get(meeting.id) ?? [];
    currentList.push(participant);
    mockDatabase.participants.set(meeting.id, currentList);

    if (requiresLobby) {
      mockEventBus.emit({
        type: MEETING_EVENTS.PARTICIPANT_JOINED_LOBBY,
        meetingId: meeting.id,
        participant,
      });
    }

    return {
      success: true,
      data: {
        meeting,
        participantToken: `token-${participantId}`,
        assignedRole,
        requiresLobby,
        permissions: participant.permissions,
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async startMeeting(meetingId: string, ctx: RequestContext): Promise<ApiResult<Meeting>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const meeting = mockDatabase.meetings.get(meetingId);
    if (!meeting) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Meeting not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    meeting.status = 'live';
    meeting.actualStartTime = this.getServerTime();
    meeting.updatedAt = this.getServerTime();

    return {
      success: true,
      data: meeting,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async endMeeting(meetingId: string, ctx: RequestContext): Promise<ApiResult<Meeting>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const meeting = mockDatabase.meetings.get(meetingId);
    if (!meeting) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Meeting not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    meeting.status = 'ended';
    meeting.endedAt = this.getServerTime();
    meeting.updatedAt = this.getServerTime();

    mockEventBus.emit({
      type: MEETING_EVENTS.MEETING_ENDED,
      meetingId: meeting.id,
      endedAt: meeting.endedAt,
    });

    return {
      success: true,
      data: meeting,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async getMeetingSummary(meetingId: string, ctx: RequestContext): Promise<ApiResult<MeetingSummary>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const meeting = mockDatabase.meetings.get(meetingId);
    if (!meeting) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Meeting not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const attendanceRecords = mockDatabase.attendance.get(meetingId) ?? [];

    return {
      success: true,
      data: {
        meetingId: meeting.id,
        title: meeting.title,
        scheduledStartTime: meeting.scheduledStartTime,
        actualStartTime: meeting.actualStartTime ?? undefined,
        endedAt: meeting.endedAt ?? undefined,
        durationMinutes: 45,
        status: meeting.status,
        userRole: 'host',
        totalInvited: meeting.invitees.length,
        totalAccepted: meeting.invitees.filter((i) => i.invitationStatus === 'accepted').length,
        totalAttended: attendanceRecords.filter((a) => a.attended).length || 6,
        organizerName: meeting.organizerName,
        organizerAvatarId: meeting.organizerAvatarId,
        attendanceRecords,
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  // --- Invitations Handlers ---

  async listInvitations(ctx: RequestContext): Promise<ApiResult<MeetingInvitation[]>> {
    await this.simulateLatencyAndCheckSignal(ctx);
    const invitations = Array.from(mockDatabase.invitations.values());
    return {
      success: true,
      data: invitations,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async acceptInvitation(payload: AcceptInvitationPayload, ctx: RequestContext): Promise<ApiResult<AcceptInvitationResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const inv = mockDatabase.invitations.get(payload.invitationId);
    if (!inv) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invitation not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    inv.status = 'accepted';
    inv.respondedAt = this.getServerTime();

    return {
      success: true,
      data: {
        invitation: inv,
        meetingId: inv.meetingId,
        assignedRole: inv.role,
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async declineInvitation(payload: DeclineInvitationPayload, ctx: RequestContext): Promise<ApiResult<DeclineInvitationResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const inv = mockDatabase.invitations.get(payload.invitationId);
    if (!inv) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invitation not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    inv.status = 'declined';
    inv.respondedAt = this.getServerTime();

    return {
      success: true,
      data: { invitationId: inv.id, status: 'declined' },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async saveGuestSchedule(payload: SaveGuestSchedulePayload, ctx: RequestContext): Promise<ApiResult<SaveGuestScheduleResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    return {
      success: true,
      data: {
        success: true,
        meetingId: payload.meetingId,
        savedLocally: true,
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async sendInvitations(payload: SendInvitationsPayload, ctx: RequestContext): Promise<ApiResult<SendInvitationsResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    return {
      success: true,
      data: {
        meetingId: payload.meetingId,
        sentCount: payload.inviteeIds ? payload.inviteeIds.length : 5,
        simulated: true,
        message: 'Mock notifications queued in development environment.',
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  // --- Participants & Moderation ---

  async listParticipants(meetingId: string, ctx: RequestContext): Promise<ApiResult<MeetingParticipant[]>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const list = mockDatabase.participants.get(meetingId) ?? [];
    return {
      success: true,
      data: list,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async admitParticipant(payload: AdmitParticipantPayload, ctx: RequestContext): Promise<ApiResult<AdmitParticipantResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const list = mockDatabase.participants.get(payload.meetingId) ?? [];
    const p = list.find((item) => item.id === payload.participantId);
    if (!p) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Participant not in lobby', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    if (payload.decision === 'admit') {
      p.status = 'in_meeting';
      mockEventBus.emit({
        type: MEETING_EVENTS.PARTICIPANT_ADMITTED,
        meetingId: payload.meetingId,
        participantId: p.id,
        role: p.role,
        permissions: p.permissions,
      });
    } else {
      p.status = 'removed';
      mockEventBus.emit({
        type: MEETING_EVENTS.PARTICIPANT_REMOVED,
        meetingId: payload.meetingId,
        participantId: p.id,
        reason: 'Host denied lobby admission',
      });
    }

    return {
      success: true,
      data: {
        meetingId: payload.meetingId,
        participantId: p.id,
        status: p.status as 'in_meeting' | 'removed',
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async removeParticipant(payload: RemoveParticipantPayload, ctx: RequestContext): Promise<ApiResult<RemoveParticipantResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const list = mockDatabase.participants.get(payload.meetingId) ?? [];
    const p = list.find((item) => item.id === payload.participantId);
    if (!p) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Participant not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    p.status = 'removed';
    mockEventBus.emit({
      type: MEETING_EVENTS.PARTICIPANT_REMOVED,
      meetingId: payload.meetingId,
      participantId: p.id,
      reason: payload.reason ?? undefined,
    });

    return {
      success: true,
      data: {
        meetingId: payload.meetingId,
        participantId: p.id,
        status: 'removed',
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async changeParticipantRole(payload: ChangeParticipantRolePayload, ctx: RequestContext): Promise<ApiResult<ChangeParticipantRoleResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const list = mockDatabase.participants.get(payload.meetingId) ?? [];
    const p = list.find((item) => item.id === payload.participantId);
    if (!p) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Participant not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    p.role = payload.newRole;
    if (payload.newRole === 'co_host') {
      p.permissions = {
        microphone: true,
        camera: true,
        screenShare: true,
        chat: true,
      };
    }

    mockEventBus.emit({
      type: MEETING_EVENTS.PARTICIPANT_ROLE_CHANGED,
      meetingId: payload.meetingId,
      participantId: p.id,
      newRole: p.role,
    });

    return {
      success: true,
      data: {
        meetingId: payload.meetingId,
        participantId: p.id,
        role: p.role,
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  // --- Permissions ---

  async requestPermission(payload: RequestPermissionPayload, ctx: RequestContext): Promise<ApiResult<RequestPermissionResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const currentUser = this.getAuthenticatedUser(ctx);
    const meeting = mockDatabase.meetings.get(payload.meetingId);
    if (!meeting) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Meeting not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const participants = mockDatabase.participants.get(payload.meetingId) ?? [];
    const p = participants.find((item) => item.userId === currentUser?.id);

    const req: PermissionRequest = {
      id: `req-${Date.now()}`,
      meetingId: payload.meetingId,
      participantId: p?.id ?? `part-${currentUser?.id}`,
      participantName: currentUser?.displayName ?? 'Participant',
      participantAvatarId: currentUser?.avatarId ?? 'avatar-1',
      permission: payload.permission,
      status: 'pending',
      requestedAt: this.getServerTime(),
    };

    const currentRequests = mockDatabase.permissionRequests.get(payload.meetingId) ?? [];
    currentRequests.push(req);
    mockDatabase.permissionRequests.set(payload.meetingId, currentRequests);

    mockEventBus.emit({
      type: MEETING_EVENTS.PERMISSION_REQUESTED,
      meetingId: payload.meetingId,
      request: req,
    });

    return {
      success: true,
      data: { request: req },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async decidePermissionRequest(payload: DecidePermissionRequestPayload, ctx: RequestContext): Promise<ApiResult<DecidePermissionRequestResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const requests = mockDatabase.permissionRequests.get(payload.meetingId) ?? [];
    const req = requests.find((r) => r.id === payload.requestId);
    if (!req) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Permission request not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    req.status = payload.decision === 'approve' ? 'approved' : 'denied';
    req.decidedAt = this.getServerTime();

    const participants = mockDatabase.participants.get(payload.meetingId) ?? [];
    const p = participants.find((item) => item.id === req.participantId);
    if (p && payload.decision === 'approve') {
      p.permissions[req.permission] = true;
    }

    mockEventBus.emit({
      type: MEETING_EVENTS.PERMISSION_DECIDED,
      meetingId: payload.meetingId,
      requestId: req.id,
      participantId: req.participantId,
      permission: req.permission,
      decision: payload.decision,
      updatedPermissions: p ? p.permissions : { microphone: false, camera: false, screenShare: false, chat: false },
    });

    return {
      success: true,
      data: {
        requestId: req.id,
        participantId: req.participantId,
        permission: req.permission,
        decision: payload.decision,
        updatedPermissions: p ? p.permissions : { microphone: false, camera: false, screenShare: false, chat: false },
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async updateParticipantPermissions(payload: UpdateParticipantPermissionsPayload, ctx: RequestContext): Promise<ApiResult<UpdateParticipantPermissionsResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const participants = mockDatabase.participants.get(payload.meetingId) ?? [];
    const p = participants.find((item) => item.id === payload.participantId);
    if (!p) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Participant not found', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    p.permissions = {
      ...p.permissions,
      ...payload.permissions,
    };

    mockEventBus.emit({
      type: MEETING_EVENTS.PERMISSIONS_UPDATED,
      meetingId: payload.meetingId,
      participantId: p.id,
      permissions: p.permissions,
    });

    return {
      success: true,
      data: {
        meetingId: payload.meetingId,
        participantId: p.id,
        permissions: p.permissions,
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async bulkUpdatePermissions(payload: BulkUpdatePermissionsPayload, ctx: RequestContext): Promise<ApiResult<BulkUpdatePermissionsResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const participants = mockDatabase.participants.get(payload.meetingId) ?? [];
    let affected = 0;

    participants.forEach((p) => {
      if (p.role === 'host' || p.role === 'co_host') return;

      affected++;
      if (payload.action.kind === 'mute_all') {
        p.permissions.microphone = false;
        p.media.isMuted = true;
      } else if (payload.action.kind === 'stop_all_cameras') {
        p.permissions.camera = false;
        p.media.isCameraOff = true;
      } else if (payload.action.kind === 'disable_all_chat') {
        p.permissions.chat = false;
      } else if (payload.action.kind === 'enable_all_chat') {
        p.permissions.chat = true;
      }
    });

    mockEventBus.emit({
      type: MEETING_EVENTS.BULK_PERMISSIONS_APPLIED,
      meetingId: payload.meetingId,
      action: payload.action,
    });

    return {
      success: true,
      data: {
        meetingId: payload.meetingId,
        action: payload.action,
        affectedParticipantCount: affected,
      },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async listPermissionRequests(meetingId: string, ctx: RequestContext): Promise<ApiResult<PermissionRequest[]>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const list = mockDatabase.permissionRequests.get(meetingId) ?? [];
    return {
      success: true,
      data: list,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  // --- Chat ---

  async listChatMessages(meetingId: string, ctx: RequestContext): Promise<ApiResult<ChatMessage[]>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const list = mockDatabase.chatMessages.get(meetingId) ?? [];
    return {
      success: true,
      data: list,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async sendChatMessage(payload: SendChatMessagePayload, ctx: RequestContext): Promise<ApiResult<SendChatMessageResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const currentUser = this.getAuthenticatedUser(ctx);
    if (!currentUser) {
      return {
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in to send chat messages', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    if (!payload.content.trim()) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message content cannot be empty', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    if (payload.content.length > 2000) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message exceeds maximum length of 2000 characters', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const participants = mockDatabase.participants.get(payload.meetingId) ?? [];
    const p = participants.find((item) => item.userId === currentUser.id);

    if (p && p.role !== 'host' && p.role !== 'co_host' && !p.permissions.chat) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to send chat messages', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const msg: ChatMessage = {
      id: `chat-${Date.now()}`,
      meetingId: payload.meetingId,
      senderId: p?.id ?? currentUser.id,
      senderName: currentUser.displayName,
      senderAvatarId: currentUser.avatarId,
      isHostOrCoHost: p?.role === 'host' || p?.role === 'co_host',
      type: 'message',
      content: payload.content.trim(),
      timestamp: this.getServerTime(),
    };

    const currentList = mockDatabase.chatMessages.get(payload.meetingId) ?? [];
    currentList.push(msg);
    mockDatabase.chatMessages.set(payload.meetingId, currentList);

    mockEventBus.emit({
      type: MEETING_EVENTS.CHAT_MESSAGE_RECEIVED,
      meetingId: payload.meetingId,
      message: msg,
    });

    return {
      success: true,
      data: { message: msg },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async sendAnnouncement(payload: SendAnnouncementPayload, ctx: RequestContext): Promise<ApiResult<SendAnnouncementResponse>> {
    await this.simulateLatencyAndCheckSignal(ctx);

    const currentUser = this.getAuthenticatedUser(ctx);
    const participants = mockDatabase.participants.get(payload.meetingId) ?? [];
    const p = participants.find((item) => item.userId === currentUser?.id);

    if (p && p.role !== 'host' && p.role !== 'co_host') {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only hosts can broadcast announcements', fieldErrors: [] },
        requestId: ctx.requestId,
        serverTime: this.getServerTime(),
      };
    }

    const announcement: ChatMessage = {
      id: `ann-${Date.now()}`,
      meetingId: payload.meetingId,
      senderId: p?.id ?? 'host',
      senderName: currentUser?.displayName ?? 'Host',
      senderAvatarId: currentUser?.avatarId ?? 'avatar-1',
      isHostOrCoHost: true,
      type: 'announcement',
      content: payload.content.trim(),
      timestamp: this.getServerTime(),
    };

    const currentList = mockDatabase.chatMessages.get(payload.meetingId) ?? [];
    currentList.push(announcement);
    mockDatabase.chatMessages.set(payload.meetingId, currentList);

    mockEventBus.emit({
      type: MEETING_EVENTS.CHAT_MESSAGE_RECEIVED,
      meetingId: payload.meetingId,
      message: announcement,
    });

    return {
      success: true,
      data: { announcement },
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  // --- Notifications ---

  async listNotifications(ctx: RequestContext): Promise<ApiResult<AppNotification[]>> {
    await this.simulateLatencyAndCheckSignal(ctx);
    const notifs = notificationService.getAll();
    return {
      success: true,
      data: notifs,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async markNotificationRead(notificationId: string, ctx: RequestContext): Promise<ApiResult<boolean>> {
    await this.simulateLatencyAndCheckSignal(ctx);
    notificationService.markAsRead(notificationId);
    return {
      success: true,
      data: true,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }

  async markAllNotificationsRead(ctx: RequestContext): Promise<ApiResult<boolean>> {
    await this.simulateLatencyAndCheckSignal(ctx);
    notificationService.markAllAsRead();
    return {
      success: true,
      data: true,
      requestId: ctx.requestId,
      serverTime: this.getServerTime(),
    };
  }
}
