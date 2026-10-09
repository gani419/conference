import { z } from 'zod';
import { emailRegex, phoneE164Regex } from './authSchemas';

export const participantPermissionsSchema = z.object({
  microphone: z.boolean(),
  camera: z.boolean(),
  screenShare: z.boolean(),
  chat: z.boolean(),
});

export const meetingTimingSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('instant'),
  }),
  z.object({
    kind: z.literal('scheduled'),
    startsAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date string',
    }),
    timezone: z.string().min(1, 'Timezone is required'),
  }),
]);

export const inviteeRoleSchema = z.enum(['guest', 'co_host']);

export const inviteePayloadSchema = z
  .object({
    clientId: z.string().min(1),
    displayName: z.string().trim().min(1, 'Name is required').max(100),
    role: inviteeRoleSchema,
    email: z.string().trim().regex(emailRegex, 'Invalid email').optional(),
    phoneE164: z.string().trim().regex(phoneE164Regex, 'Invalid E.164 phone').optional(),
  })
  .refine((data) => Boolean(data.email || data.phoneE164), {
    message: 'At least one contact method (email or phone) is required',
    path: ['email'],
  });

export const createMeetingPayloadSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120, 'Title cannot exceed 120 characters'),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').default(''),
    timing: meetingTimingSchema,
    expiresAt: z.string().datetime().optional(),
    guestAccess: z.boolean().default(true),
    defaultPermissions: participantPermissionsSchema,
    invitees: z.array(inviteePayloadSchema).default([]),
  })
  .refine(
    (data) => {
      // Check for duplicate emails or phones across invitees
      const seenEmails = new Set<string>();
      const seenPhones = new Set<string>();
      for (const invitee of data.invitees) {
        if (invitee.email) {
          const lower = invitee.email.toLowerCase();
          if (seenEmails.has(lower)) {
            return false;
          }
          seenEmails.add(lower);
        }
        if (invitee.phoneE164) {
          if (seenPhones.has(invitee.phoneE164)) {
            return false;
          }
          seenPhones.add(invitee.phoneE164);
        }
      }
      return true;
    },
    {
      message: 'Duplicate contact found in invitee list',
      path: ['invitees'],
    },
  );

export const updateMeetingPayloadSchema = z
  .object({
    meetingId: z.string().min(1),
    expectedVersion: z.number().int().min(1),
    title: z.string().trim().min(1, 'Title is required').max(120, 'Title cannot exceed 120 characters'),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').default(''),
    timing: meetingTimingSchema,
    expiresAt: z.string().datetime().optional(),
    guestAccess: z.boolean(),
    defaultPermissions: participantPermissionsSchema,
    invitees: z.array(inviteePayloadSchema),
  })
  .refine(
    (data) => {
      const seenEmails = new Set<string>();
      const seenPhones = new Set<string>();
      for (const invitee of data.invitees) {
        if (invitee.email) {
          const lower = invitee.email.toLowerCase();
          if (seenEmails.has(lower)) {
            return false;
          }
          seenEmails.add(lower);
        }
        if (invitee.phoneE164) {
          if (seenPhones.has(invitee.phoneE164)) {
            return false;
          }
          seenPhones.add(invitee.phoneE164);
        }
      }
      return true;
    },
    {
      message: 'Duplicate contact found in invitee list',
      path: ['invitees'],
    },
  );

export const cancelMeetingPayloadSchema = z.object({
  meetingId: z.string().min(1),
  expectedVersion: z.number().int().min(1),
});

export const resolveMeetingPayloadSchema = z.object({
  codeOrLink: z.string().trim().min(1, 'Meeting code or link is required'),
});
