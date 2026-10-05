import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ModalDialog } from '../../../components/layout/ModalDialog';
import { AppInput } from '../../../components/forms/AppInput';
import { AppButton } from '../../../components/forms/AppButton';
import { SegmentedControl } from '../../../components/forms/SegmentedControl';
import { InviteePayload, InviteeRole } from '../../../types/meeting';
import { useResolvedTheme } from '../../../hooks/useResolvedTheme';
import { emailRegex, phoneE164Regex } from '../../../schemas/authSchemas';
import { normalizeEmail, normalizePhoneToE164 } from '../../../utils/contactNormalization';

interface AddPersonModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (invitee: InviteePayload) => void;
}

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const { tokens } = useResolvedTheme();
  const [displayName, setDisplayName] = useState('');
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<InviteeRole>('guest');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetState = () => {
    setDisplayName('');
    setEmail('');
    setPhone('');
    setRole('guest');
    setErrors({});
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      newErrors.displayName = 'Name is required';
    }

    let normalizedEmail: string | undefined;
    let normalizedPhone: string | undefined;

    if (contactMethod === 'email') {
      const trimmed = email.trim();
      if (!trimmed) {
        newErrors.contact = 'Email is required';
      } else if (!emailRegex.test(trimmed)) {
        newErrors.contact = 'Enter a valid email address';
      } else {
        normalizedEmail = normalizeEmail(trimmed);
      }
    } else {
      const trimmed = phone.trim();
      if (!trimmed) {
        newErrors.contact = 'Phone number is required';
      } else {
        const e164 = normalizePhoneToE164(trimmed);
        if (!e164 || !phoneE164Regex.test(e164)) {
          newErrors.contact = 'Enter valid E.164 phone (e.g. +14155550100)';
        } else {
          normalizedPhone = e164;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newInvitee: InviteePayload = {
      clientId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      displayName: trimmedName,
      role,
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      ...(normalizedPhone ? { phoneE164: normalizedPhone } : {}),
    };

    onAdd(newInvitee);
    handleClose();
  };

  return (
    <ModalDialog
      visible={visible}
      onClose={handleClose}
      title="Add Person"
      testID="add-person-modal"
    >
      <View style={styles.form}>
        <AppInput
          label="Display Name"
          value={displayName}
          onChangeText={(val) => {
            setDisplayName(val);
            if (errors.displayName) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.displayName;
                return next;
              });
            }
          }}
          placeholder="Jane Doe"
          error={errors.displayName}
          autoCapitalize="words"
        />

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>
            Contact Method
          </Text>
          <SegmentedControl
            options={[
              { label: 'Email', value: 'email' },
              { label: 'Phone', value: 'phone' },
            ]}
            selectedValue={contactMethod}
            onSelect={(val) => {
              setContactMethod(val as 'email' | 'phone');
              if (errors.contact) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.contact;
                  return next;
                });
              }
            }}
          />
        </View>

        {contactMethod === 'email' ? (
          <AppInput
            label="Email Address"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (errors.contact) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.contact;
                  return next;
                });
              }
            }}
            placeholder="jane@example.com"
            error={errors.contact}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        ) : (
          <AppInput
            label="Phone Number (E.164)"
            value={phone}
            onChangeText={(val) => {
              setPhone(val);
              if (errors.contact) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.contact;
                  return next;
                });
              }
            }}
            placeholder="+14155550100"
            error={errors.contact}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        )}

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>
            Meeting Role
          </Text>
          <SegmentedControl
            options={[
              { label: 'Guest', value: 'guest' },
              { label: 'Co-Host', value: 'co_host' },
            ]}
            selectedValue={role}
            onSelect={(val) => setRole(val as InviteeRole)}
          />
          <Text style={[styles.roleHint, { color: tokens.textMuted }]}>
            {role === 'co_host'
              ? 'Co-hosts have full moderation controls including admitting participants, muting, and ending meeting.'
              : 'Guests enter the lobby upon arrival and wait for host admission.'}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: tokens.borderSubtle }]}
            onPress={handleClose}
          >
            <Text style={[styles.cancelBtnText, { color: tokens.textMain }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <View style={styles.submitBtnContainer}>
            <AppButton title="Add Invitee" onPress={handleSave} variant="primary" />
          </View>
        </View>
      </View>
    </ModalDialog>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  roleHint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
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
  submitBtnContainer: {
    flex: 1.5,
  },
});
