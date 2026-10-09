import { AppIcon } from '../../../components/icons/AppIcon';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { ModalDialog } from '../../../components/layout/ModalDialog';
import { AppInput } from '../../../components/forms/AppInput';
import { AppButton } from '../../../components/forms/AppButton';
import { SegmentedControl } from '../../../components/forms/SegmentedControl';
import { InviteePayload, InviteeRole } from '../../../types/meeting';
import { DeviceContact } from '../../../types/contacts';
import { contactService } from '../../../services/contactService';
import { useResolvedTheme } from '../../../hooks/useResolvedTheme';
import { normalizeEmail, normalizePhoneToE164 } from '../../../utils/contactNormalization';

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onAddContacts: (invitees: InviteePayload[]) => void;
  existingInvitees: InviteePayload[];
}

export const ContactPickerModal: React.FC<ContactPickerModalProps> = ({
  visible,
  onClose,
  onAddContacts,
  existingInvitees,
}) => {
  const { tokens } = useResolvedTheme();
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<InviteeRole>('guest');

  useEffect(() => {
    if (visible) {
      setLoading(true);
      contactService
        .getContacts()
        .then((list) => {
          setContacts(list.filter(contact=>contact.emailAddresses.length>0));
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
      setSelectedIds(new Set());
      setSearch('');
    }
  }, [visible]);

  const existingEmails = useMemo(
    () => new Set(existingInvitees.map((i) => i.email?.toLowerCase()).filter(Boolean)),
    [existingInvitees],
  );
  const existingPhones = useMemo(
    () => new Set(existingInvitees.map((i) => i.phoneE164).filter(Boolean)),
    [existingInvitees],
  );

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.emailAddresses.some((e) => e.email.toLowerCase().includes(q)) ||
        c.phoneNumbers.some((p) => p.number.includes(q)),
    );
  }, [contacts, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleImport = () => {
    const chosenContacts = contacts.filter((c) => selectedIds.has(c.recordID));
    const results: InviteePayload[] = [];

    for (const c of chosenContacts) {
      const primaryEmail = c.emailAddresses[0]?.email
        ? normalizeEmail(c.emailAddresses[0].email)
        : undefined;
      const primaryPhone = c.phoneNumbers[0]?.number
        ? normalizePhoneToE164(c.phoneNumbers[0].number) ?? undefined
        : undefined;

      if (!primaryEmail) {
        continue;
      }

      // Check if already in meeting
      if (primaryEmail && existingEmails.has(primaryEmail.toLowerCase())) {
        continue;
      }
      if (primaryPhone && existingPhones.has(primaryPhone)) {
        continue;
      }

      results.push({
        clientId: `contact-${c.recordID}-${Date.now()}`,
        displayName: c.displayName,
        role,
        ...(primaryEmail ? { email: primaryEmail } : {}),

      });
    }

    onAddContacts(results);
    onClose();
  };

  return (
    <ModalDialog
      visible={visible}
      onClose={onClose}
      title="Import from Contacts"
      testID="contact-picker-modal"
    >
      <View style={styles.container}>
        <AppInput
          label="Search Contacts"
          value={search}
          onChangeText={setSearch}
          placeholder="Filter by name, email, or phone..."
          autoCapitalize="none"
        />

        <View style={styles.roleRow}>
          <Text style={[styles.roleLabel, { color: tokens.textMuted }]}>
            Assign Role:
          </Text>
          <View style={styles.segmentedWrap}>
            <SegmentedControl
              options={[
                { label: 'Guest', value: 'guest' },
                { label: 'Co-Host', value: 'co_host' },
              ]}
              selectedValue={role}
              onSelect={(val) => setRole(val as InviteeRole)}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={tokens.primary} />
            <Text style={[styles.loadingText, { color: tokens.textMuted }]}>
              Loading contacts...
            </Text>
          </View>
        ) : filteredContacts.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
              No matching contacts found
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.recordID}
            style={styles.contactList}
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.recordID);
              const email = item.emailAddresses[0]?.email;
              const phone = item.phoneNumbers[0]?.number;
              const isAlreadyAdded =
                (email && existingEmails.has(email.toLowerCase())) ||
                (phone && existingPhones.has(normalizePhoneToE164(phone) ?? ''));

              return (
                <TouchableOpacity
                  style={[
                    styles.contactItem,
                    {
                      borderColor: isSelected
                        ? tokens.primary
                        : tokens.borderSubtle,
                      backgroundColor: isSelected
                        ? tokens.surfaceActive
                        : tokens.surface,
                    },
                    (isAlreadyAdded || !email) && styles.contactDisabled,
                  ]}
                  disabled={Boolean(isAlreadyAdded) || !email}
                  onPress={() => toggleSelect(item.recordID)}
                >
                  <View style={styles.checkbox}>
                    <AppIcon style={[
                        styles.checkIcon,
                        { color: isSelected ? tokens.primary : tokens.borderSubtle },
                      ]} name={isSelected ? 'square-check' : 'square'} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text
                      style={[styles.contactName, { color: tokens.textMain }]}
                    >
                      {item.displayName}
                    </Text>
                    <Text
                      style={[styles.contactSub, { color: tokens.textMuted }]}
                    >
                      {email || phone || 'No contact details'}
                    </Text>
                  </View>
                  {isAlreadyAdded && (
                    <Text style={[styles.addedBadge, { color: tokens.textMuted }]}>
                      Added
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: tokens.borderSubtle }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelBtnText, { color: tokens.textMain }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <View style={styles.importBtnContainer}>
            <AppButton
              title={`Import Selected (${selectedIds.size})`}
              onPress={handleImport}
              variant="primary"
              disabled={selectedIds.size === 0}
            />
          </View>
        </View>
      </View>
    </ModalDialog>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexShrink: 1,
    gap: 12,
    maxHeight: 480,
  },
  roleRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  segmentedWrap: {
    width: '100%',
  },
  centerContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 13,
  },
  contactList: {
    maxHeight: 220,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  contactDisabled: {
    opacity: 0.45,
  },
  checkbox: {
    width: 24,
    alignItems: 'center',
  },
  checkIcon: {
    fontSize: 18,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactSub: {
    fontSize: 12,
    marginTop: 2,
  },
  addedBadge: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  importBtnContainer: {
    flex: 1.5,
  },
});
