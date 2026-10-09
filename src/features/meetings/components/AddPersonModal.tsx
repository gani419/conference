import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ModalDialog } from '../../../components/layout/ModalDialog';
import { AppInput } from '../../../components/forms/AppInput';
import { AppButton } from '../../../components/forms/AppButton';
import { SegmentedControl } from '../../../components/forms/SegmentedControl';
import { AppIcon } from '../../../components/icons/AppIcon';
import { InviteePayload, InviteeRole } from '../../../types/meeting';
import { useResolvedTheme } from '../../../hooks/useResolvedTheme';
import { emailRegex } from '../../../schemas/authSchemas';
import { normalizeEmail } from '../../../utils/contactNormalization';
import { hostedRequest } from '../../../backend/SupabaseBackendAdapter';
type Suggestion = { display_name: string; email: string; avatar_id: string; source: string };
export const AddPersonModal: React.FC<{ visible: boolean; onClose: () => void; onAdd: (invitee: InviteePayload) => void }> = ({ visible, onClose, onAdd }) => {
  const { tokens } = useResolvedTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteeRole>('guest');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!visible) return;
    let active = true;
    const timer = setTimeout(() => {
      hostedRequest<{ data: Suggestion[] }>('conference-api', { mode: 'read', action: 'invitee_suggestions', payload: { query } }).then(result => { if (active) setSuggestions(result.data); }).catch(() => { if (active) setSuggestions([]); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [visible, query]);
  const close = () => { setDisplayName(''); setEmail(''); setQuery(''); setRole('guest'); setError(''); setSuggestions([]); onClose(); };
  const save = () => {
    if (!displayName.trim()) return setError('Enter a display name.');
    if (!emailRegex.test(email.trim())) return setError('Enter a valid email address.');
    onAdd({ clientId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, displayName: displayName.trim(), email: normalizeEmail(email), role });
    close();
  };
  return <ModalDialog visible={visible} onClose={close} title="Add invitee" testID="add-person-modal">
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }} contentContainerStyle={styles.form}>
      <AppInput label="Display Name" value={displayName} onChangeText={value => { setDisplayName(value); setQuery(value); }} placeholder="Search recent invitees or enter a name" autoCapitalize="words" />
      <Text style={{ color: tokens.textMuted }}>Contact method: Email</Text>
      <AppInput label="Email Address" icon="mail" value={email} onChangeText={value => { setEmail(value); setQuery(value); }} placeholder="person@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      {!!suggestions.length && <View style={styles.suggestions}><Text style={{ color: tokens.textMuted }}>Suggested people</Text>{suggestions.map(person => <TouchableOpacity key={person.email} accessibilityRole="button" onPress={() => { setDisplayName(person.display_name); setEmail(person.email); setQuery(''); setSuggestions([]); }} style={[styles.person, { backgroundColor: tokens.surfaceSubtle }]}><AppIcon name="user" size={22} /><View style={{ flex: 1 }}><Text style={{ color: tokens.textMain, fontWeight: '600' }}>{person.display_name}</Text><Text style={{ color: tokens.textMuted }}>{person.email}</Text></View></TouchableOpacity>)}</View>}
      <Text style={{ color: tokens.textMuted }}>Meeting role</Text>
      <SegmentedControl options={[{ label: 'Guest', value: 'guest' }, { label: 'Co-host', value: 'co_host' }]} selectedValue={role} onSelect={value => setRole(value as InviteeRole)} />
      <Text style={{ color: tokens.textMuted, fontSize: 12 }}>{role === 'co_host' ? 'Co-hosts can help admit participants and manage the call.' : 'Guests wait for host admission.'}</Text>
      {!!error && <Text accessibilityRole="alert" style={{ color: tokens.danger }}>{error}</Text>}
      <View style={styles.actions}><AppButton title="Cancel" variant="secondary" onPress={close} style={{ flex: 1 }} /><AppButton title="Add invitee" icon="plus" onPress={save} style={{ flex: 1 }} /></View>
    </ScrollView>
  </ModalDialog>;
};
const styles = StyleSheet.create({ form: { width: '100%', gap: 12, paddingVertical: 12 }, suggestions: { gap: 8 }, person: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12 }, actions: { flexDirection: 'row', gap: 12 } });