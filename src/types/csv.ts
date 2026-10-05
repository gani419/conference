import { InviteeRole } from './meeting';

export interface RawCsvRow {
  display_name?: string | undefined;
  name?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  role?: string | undefined;
  [key: string]: string | undefined;
}

export interface InviteeDraft {
  clientId: string;
  displayName: string;
  phone: string;
  phoneE164?: string | undefined;
  email: string;
  role: InviteeRole;
  isValid?: boolean | undefined;
  errors?: {
    displayName?: string | undefined;
    contact?: string | undefined;
    role?: string | undefined;
  } | undefined;
}

export interface CsvImportResult {
  drafts: InviteeDraft[];
  totalParsed: number;
  totalRows?: number | undefined;
  validCount?: number | undefined;
  malformedCount: number;
  duplicateCount: number;
  errors: string[];
}
