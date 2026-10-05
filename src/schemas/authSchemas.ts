import { z } from 'zod';

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phoneE164Regex = /^\+[1-9]\d{1,14}$/;

export const authIdentifierSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('email'),
    email: z.string().trim().regex(emailRegex, 'Please enter a valid email address'),
  }),
  z.object({
    kind: z.literal('phone'),
    phoneE164: z.string().trim().regex(phoneE164Regex, 'Please enter a valid E.164 phone number (e.g. +14155550123)'),
  }),
]);

export const loginPayloadSchema = z.object({
  identifier: authIdentifierSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerPayloadSchema = z.object({
  displayName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  identifier: authIdentifierSchema,
  password: z.string().min(12, 'Password must be at least 12 characters'),
  avatarId: z.string().min(1, 'Please select an avatar'),
});

export const registerFormSchema = registerPayloadSchema.extend({
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const guestLoginPayloadSchema = z.object({
  displayName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  avatarId: z.string().min(1, 'Please select an avatar'),
});

export const verifyContactPayloadSchema = z.object({
  verificationId: z.string().min(1, 'Verification ID is required'),
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Code must contain only digits'),
});

export const forgotPasswordPayloadSchema = z.object({
  identifier: authIdentifierSchema,
});

export const resetPasswordPayloadSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(12, 'Password must be at least 12 characters'),
});

export const resetPasswordFormSchema = resetPasswordPayloadSchema.extend({
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
