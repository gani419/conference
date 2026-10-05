import { z } from 'zod';
import { emailRegex, phoneE164Regex } from './authSchemas';

export function normalizeRole(roleStr?: string): 'guest' | 'co_host' {
  if (!roleStr) {
    return 'guest';
  }
  const clean = roleStr.trim().toLowerCase().replace(/[-_\s]/g, '');
  if (clean === 'cohost' || clean === 'host') {
    return 'co_host';
  }
  return 'guest';
}

export const csvRowSchema = z.object({
  display_name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  role: z.string().trim().optional(),
}).refine((data) => {
  const hasPhone = data.phone && data.phone.length > 0;
  const hasEmail = data.email && data.email.length > 0;
  return hasPhone || hasEmail;
}, {
  message: 'Row must provide at least one phone number or email address',
});

export const strictInviteeDraftSchema = z.object({
  clientId: z.string(),
  displayName: z.string().trim().min(1, 'Display name is required'),
  role: z.enum(['guest', 'co_host']),
  email: z.string().trim().regex(emailRegex, 'Valid email required').optional().or(z.literal('')),
  phone: z.string().trim().regex(phoneE164Regex, 'Valid E.164 phone required').optional().or(z.literal('')),
}).refine((data) => (data.email && data.email.length > 0) || (data.phone && data.phone.length > 0), {
  message: 'At least one contact method (email or phone) is required',
});
