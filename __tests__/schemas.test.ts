import {
  createMeetingPayloadSchema,
  updateMeetingPayloadSchema,
  inviteePayloadSchema,
} from '../src/schemas/meetingSchemas';

describe('meetingSchemas', () => {
  it('validates a valid instant meeting payload', () => {
    const valid = {
      title: 'Quick Sync',
      description: 'Discussing project milestones',
      timing: { kind: 'instant' as const },
      guestAccess: true,
      defaultPermissions: {
        microphone: false,
        camera: false,
        screenShare: false,
        chat: true,
      },
      invitees: [
        {
          clientId: 'inv-1',
          displayName: 'Alex Chen',
          role: 'co_host' as const,
          email: 'alex@example.com',
        },
      ],
    };

    const parsed = createMeetingPayloadSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('validates scheduled meeting requires startsAt and timezone', () => {
    const scheduled = {
      title: 'Sprint Planning',
      description: '',
      timing: {
        kind: 'scheduled' as const,
        startsAt: new Date(Date.now() + 3600000).toISOString(),
        timezone: 'America/New_York',
      },
      guestAccess: false,
      defaultPermissions: {
        microphone: false,
        camera: false,
        screenShare: false,
        chat: false,
      },
      invitees: [],
    };

    const parsed = createMeetingPayloadSchema.safeParse(scheduled);
    expect(parsed.success).toBe(true);

    const invalidTiming = {
      ...scheduled,
      timing: {
        kind: 'scheduled' as const,
        startsAt: 'not-a-date',
        timezone: 'UTC',
      },
    };
    const invalidParsed = createMeetingPayloadSchema.safeParse(invalidTiming);
    expect(invalidParsed.success).toBe(false);
  });

  it('rejects invitee without email or phone', () => {
    const invalidInvitee = {
      clientId: 'inv-2',
      displayName: 'No Contact User',
      role: 'guest' as const,
    };
    const parsed = inviteePayloadSchema.safeParse(invalidInvitee);
    expect(parsed.success).toBe(false);
  });

  it('rejects duplicate invitees in createMeetingPayloadSchema', () => {
    const duplicatePayload = {
      title: 'Team Standup',
      description: '',
      timing: { kind: 'instant' as const },
      guestAccess: true,
      defaultPermissions: {
        microphone: false,
        camera: false,
        screenShare: false,
        chat: true,
      },
      invitees: [
        {
          clientId: 'inv-1',
          displayName: 'User One',
          role: 'guest' as const,
          email: 'dup@example.com',
        },
        {
          clientId: 'inv-2',
          displayName: 'User Two',
          role: 'guest' as const,
          email: 'dup@example.com',
        },
      ],
    };

    const parsed = createMeetingPayloadSchema.safeParse(duplicatePayload);
    expect(parsed.success).toBe(false);
  });
});
