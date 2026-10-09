import Papa from 'papaparse';
import type { MeetingDraft } from './backend/types';
export type ImportedInvitee = Omit<
  MeetingDraft['invitees'][number],
  'clientId'
>;
export type ImportRow = {
  row: number;
  invitee: ImportedInvitee;
  error?: string;
};
export const MAX_IMPORT_BYTES = 1024 * 1024;
export const MAX_IMPORT_ROWS = 500;
export const sampleCsv =
  'display_name,email,role\nAlex Chen,alex@example.com,guest\n"Taylor, Kim",taylor@example.com,co_host\n';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateImport(
  rows: ImportRow[],
  existing: { email: string }[],
): ImportRow[] {
  const seen = new Set(
    existing.map(i => i.email.trim().toLowerCase()).filter(Boolean),
  );
  return rows.map(row => {
    const { displayName, email } = row.invitee;
    let error = row.error;
    if (!error && (!displayName || displayName.length > 100))
      error = 'Name must contain 1–100 characters.';
    if (!error && (!emailPattern.test(email) || email.length > 254))
      error = 'A valid email address is required.';
    if (!error && seen.has(email))
      error = 'This email is already in the invitation list or import.';
    if (!error) seen.add(email);
    return { ...row, error };
  });
}
export function parseInvitationCsv(text: string): ImportRow[] {
  const parsed = Papa.parse<Record<string, string>>(
    text.replace(/^\uFEFF/, ''),
    {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: h =>
        h
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, ''),
    },
  );
  const fields = parsed.meta.fields || [];
  const nameKey = ['display_name', 'name', 'full_name'].find(key =>
    fields.includes(key),
  );
  const emailKey = ['email', 'email_address', 'e_mail_1_value'].find(key =>
    fields.includes(key),
  );
  if (!nameKey || !emailKey)
    throw new Error(
      'CSV needs name (or display_name) and email columns. Download the sample to get started.',
    );
  if (
    (
      parsed.meta as typeof parsed.meta & {
        renamedHeaders?: Record<string, string>;
      }
    ).renamedHeaders
  )
    throw new Error(
      'CSV has duplicate column headings. Give each column a unique name.',
    );
  if (
    parsed.errors.some(
      error => error.type === 'Quotes' || error.row === undefined,
    )
  )
    throw new Error(
      'CSV formatting could not be read. Check the quotation marks and column headings.',
    );
  if (!parsed.data.length) throw new Error('This CSV has no invitation rows.');
  if (parsed.data.length > MAX_IMPORT_ROWS)
    throw new Error(`Import up to ${MAX_IMPORT_ROWS} rows at a time.`);
  return parsed.data.map((record, index) => {
    const rawRole =
      (record.role || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_') || 'guest';
    const role =
      rawRole === 'co_host' || rawRole === 'cohost' ? 'co_host' : 'guest';
    const error =
      parsed.errors.find(e => e.row === index)?.message ||
      (!['guest', 'co_host', 'cohost'].includes(rawRole)
        ? 'Role must be guest or co_host.'
        : undefined);
    return {
      row: index + 2,
      invitee: {
        displayName: (record[nameKey] || '').trim(),
        email: (record[emailKey] || '').trim().toLowerCase(),
        role,
      },
      error,
    };
  });
}
export type BrowserContact = { name?: string[]; email?: string[] };
export type ContactPicker = {
  getProperties(): Promise<string[]>;
  select(
    properties: string[],
    options: { multiple: boolean },
  ): Promise<BrowserContact[]>;
};
export function browserContactPicker(): ContactPicker | undefined {
  if (!window.isSecureContext || window.top !== window) return;
  const contacts = (navigator as Navigator & { contacts?: ContactPicker })
    .contacts;
  return typeof contacts?.select === 'function' &&
    typeof contacts.getProperties === 'function'
    ? contacts
    : undefined;
}
export function contactInvitationRows(contacts: BrowserContact[]): ImportRow[] {
  return contacts
    .flatMap(contact => {
      const name = contact.name?.find(n => n.trim())?.trim();
      const emails = contact.email?.length ? contact.email : [''];
      return emails.map(email => ({
        row: 0,
        invitee: {
          displayName: name || email.trim(),
          email: email.trim().toLowerCase(),
          role: 'guest' as const,
        },
      }));
    })
    .map((row, index) => ({ ...row, row: index + 1 }));
}
