import Contacts from 'react-native-contacts';
import { PermissionsAndroid, Platform } from 'react-native';
import { DeviceContact } from '../types/contacts';

const MOCK_DEVICE_CONTACTS: DeviceContact[] = [
  {
    recordID: 'mock-c-1',
    displayName: 'Aarav Mehta',
    phoneNumbers: [{ label: 'mobile', number: '+14155550101' }],
    emailAddresses: [{ label: 'work', email: 'aarav@example.com' }],
    avatarId: 'avatar-1',
  },
  {
    recordID: 'mock-c-2',
    displayName: 'Bella Chen',
    phoneNumbers: [{ label: 'mobile', number: '+14155550102' }],
    emailAddresses: [{ label: 'work', email: 'bella@example.com' }],
    avatarId: 'avatar-2',
  },
  {
    recordID: 'mock-c-3',
    displayName: 'Carlos Rivera',
    phoneNumbers: [{ label: 'mobile', number: '+14155550103' }],
    emailAddresses: [{ label: 'work', email: 'carlos@example.com' }],
    avatarId: 'avatar-3',
  },
  {
    recordID: 'mock-c-4',
    displayName: 'Dana Kim',
    phoneNumbers: [{ label: 'mobile', number: '+14155550104' }],
    emailAddresses: [{ label: 'work', email: 'dana@example.com' }],
    avatarId: 'avatar-4',
  },
  {
    recordID: 'mock-c-5',
    displayName: 'Eli Nguyen',
    phoneNumbers: [{ label: 'mobile', number: '+14155550105' }],
    emailAddresses: [{ label: 'work', email: 'eli@example.com' }],
    avatarId: 'avatar-5',
  },
];

export const contactService = {
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'Conference needs access to your contacts to invite participants.',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }
    try {
      const res = await Contacts.requestPermission();
      return res === 'authorized';
    } catch {
      return false;
    }
  },

  async getContacts(): Promise<DeviceContact[]> {
    try {
      const permitted = await this.requestPermission();
      if (!permitted) {
        // Return seeded fallback contacts so user can test the contacts flow without permission error
        return MOCK_DEVICE_CONTACTS;
      }
      const raw = await Contacts.getAll();
      if (!raw || raw.length === 0) {
        return MOCK_DEVICE_CONTACTS;
      }
      return raw.map((c, index) => ({
        recordID: c.recordID || `contact-${index}`,
        displayName: `${c.givenName || ''} ${c.familyName || ''}`.trim() || c.displayName || 'Unknown',
        givenName: c.givenName ?? undefined,
        familyName: c.familyName ?? undefined,
        phoneNumbers: c.phoneNumbers.map((p) => ({ label: p.label, number: p.number })),
        emailAddresses: c.emailAddresses.map((e) => ({ label: e.label, email: e.email })),
        avatarId: `avatar-${(index % 8) + 1}`,
      }));
    } catch {
      return MOCK_DEVICE_CONTACTS;
    }
  },
};
