import { emailRegex } from '../schemas/authSchemas';
import Papa from 'papaparse';
import { CsvImportResult, InviteeDraft, RawCsvRow } from '../types/csv';
import { normalizeRole } from '../schemas/csvSchemas';
import { normalizeEmail, normalizePhoneToE164 } from '../utils/contactNormalization';

export const csvService = {
  getSampleCsvContent(): string {
    return [
      'display_name,phone,email,role',
      'Alex Chen,+14155550101,alex.chen@example.com,co-host',
      'Priya Shah,+14155550102,priya.shah@example.com,guest',
      'Jordan Lee,+14155550103,jordan.lee@example.com,guest',
      '"Taylor, Kim",+14155550104,taylor.kim@example.com,co_host',
      'Casey Park,,casey.park@example.com,guest',
    ].join('\n');
  },

  parseCsv(csvContent: string): CsvImportResult {
    const drafts: InviteeDraft[] = [];
    const errors: string[] = [];
    let malformedCount = 0;
    let duplicateCount = 0;

    const parsed = Papa.parse<RawCsvRow>(csvContent.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });

    if (parsed.errors && parsed.errors.length > 0) {
      for (const err of parsed.errors) {
        errors.push(`Row ${err.row ?? 'unknown'}: ${err.message}`);
      }
    }

    const seenContacts = new Set<string>();

    parsed.data.forEach((row, index) => {
      const rawName = row.display_name || row.name || '';
      const rawPhone = row.phone || '';
      const rawEmail = row.email || '';
      const rawRole = row.role;

      const trimmedName = rawName.trim();
      const normalizedEmail = rawEmail ? normalizeEmail(rawEmail) : '';
      const normalizedPhone = rawPhone ? normalizePhoneToE164(rawPhone) : '';
      const role = normalizeRole(rawRole);

      // Validate required presence of name and at least one contact
      const rowErrors: NonNullable<InviteeDraft['errors']> = {};

      if (!trimmedName) {
        rowErrors.displayName = 'Name is required';
        malformedCount++;
      }

      if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
        rowErrors.contact = 'A valid email address is required';
        malformedCount++;
      }

      const contactKey = normalizedEmail || normalizedPhone;
      if (contactKey) {
        if (seenContacts.has(contactKey)) {
          rowErrors.contact = `Duplicate contact: ${contactKey} (row ${index + 2})`;
          duplicateCount++;
        } else {
          seenContacts.add(contactKey);
        }
      }

      const isValid = Object.keys(rowErrors).length === 0;

      drafts.push({
        clientId: `csv-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        displayName: trimmedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        phoneE164: normalizedPhone || undefined,
        role,
        isValid,
        errors: Object.keys(rowErrors).length > 0 ? rowErrors : undefined,
      });
    });

    const validCount = drafts.filter((d) => d.isValid).length;

    return {
      drafts,
      totalParsed: drafts.length,
      totalRows: drafts.length,
      validCount,
      malformedCount,
      duplicateCount,
      errors,
    };
  },
};
