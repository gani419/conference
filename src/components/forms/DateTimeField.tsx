import React, { useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { AppIcon } from '../icons/AppIcon';
import { ModalDialog } from '../layout/ModalDialog';
export function DateTimeField({ label, value, onChange, minimumDate }: { label: string; value: Date; onChange: (value: Date) => void; minimumDate?: Date | undefined }) {
  const { tokens, isDark } = useResolvedTheme();
  const [mode, setMode] = useState<'date' | 'time' | null>(null);
  const pick = (next: 'date' | 'time') => {
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value, mode: next, ...(next === 'date' && minimumDate ? { minimumDate } : {}), onValueChange: (_event, date) => {
      const result = new Date(value);
      if (next === 'date') result.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      else result.setHours(date.getHours(), date.getMinutes(), 0, 0);
      onChange(result);
    } });
    else setMode(next);
  };
  return <View style={styles.field}><Text style={[styles.label, { color: tokens.textMain }]}>{label}</Text><View style={styles.row}>
    {(['date', 'time'] as const).map(part => <TouchableOpacity key={part} accessibilityRole="button" accessibilityLabel={`${label} ${part}`} onPress={() => pick(part)} style={[styles.button, { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border }]}><AppIcon name={part === 'date' ? 'calendar' : 'clock'} size={20} /><Text style={{ color: tokens.textMain }}>{part === 'date' ? value.toLocaleDateString() : value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></TouchableOpacity>)}
  </View><Text style={{ color: tokens.textMuted, fontSize: 12 }}>{Intl.DateTimeFormat().resolvedOptions().timeZone}</Text>
  {mode && <ModalDialog visible title={label} onClose={() => setMode(null)} primaryButtonText="Done" primaryButtonVariant="primary" onPrimaryPress={() => setMode(null)}><DateTimePicker value={value} mode={mode} display="spinner" themeVariant={isDark ? 'dark' : 'light'} {...(mode === 'date' && minimumDate ? { minimumDate } : {})} onValueChange={(_event, date) => onChange(date)} /></ModalDialog>}
  </View>;
}
const styles = StyleSheet.create({ field: { width: '100%', gap: 10, marginVertical: 12 }, label: { fontWeight: '600', fontSize: 14 }, row: { flexDirection: 'row', gap: 10 }, button: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' } });