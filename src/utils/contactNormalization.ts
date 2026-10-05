export function normalizeEmail(email: string): string {
  // Conservative normalization: trim leading/trailing whitespace and lowercase domain/user
  return email.trim().toLowerCase();
}

export function normalizePhoneToE164(phone: string, defaultCountryCode = '+1'): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) {
    return '';
  }
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = `${defaultCountryCode}${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = `+${cleaned}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }
  return cleaned;
}
