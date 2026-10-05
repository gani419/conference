import { AvatarId } from './common';

export interface DeviceContact {
  recordID: string;
  displayName: string;
  givenName?: string | undefined;
  familyName?: string | undefined;
  phoneNumbers: { label: string; number: string }[];
  emailAddresses: { label: string; email: string }[];
  avatarId?: AvatarId | undefined;
}

export interface ContactSelectionResult {
  contactId: string;
  displayName: string;
  selectedPhone?: string | undefined;
  selectedEmail?: string | undefined;
  avatarId?: AvatarId | undefined;
}
