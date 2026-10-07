import Contacts from 'react-native-contacts';
import { PermissionsAndroid, Platform } from 'react-native';
import { DeviceContact } from '../types/contacts';

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
        return [];
      }
      const raw = await Contacts.getAll();
      if (!raw || raw.length === 0) {
        return [];
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
      return [];
    }
  },
};
