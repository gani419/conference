import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feedback, type FeedbackMessage } from '../../services/feedback';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { AppIcon } from '../icons/AppIcon';
export function ToastHost() {
  const { tokens } = useResolvedTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<FeedbackMessage | null>(null);
  useEffect(() => feedback.subscribe(value => { if (!value.buttons) setToast(value); }, 'toast'), []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timer); }, [toast]);
  if (!toast) return null;
  return <View pointerEvents="box-none" style={[styles.layer, { top: insets.top + 12 }]}>
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.toast, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <AppIcon name={/error|failed|not found/i.test(toast.title) ? 'circle-help' : 'check'} color={tokens.primary} size={22} />
      <View style={styles.text}><Text style={[styles.title, { color: tokens.textMain }]}>{toast.title}</Text>{!!toast.message && <Text style={{ color: tokens.textMuted }}>{toast.message}</Text>}</View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={() => setToast(null)}><AppIcon name="x" size={20} /></TouchableOpacity>
    </View>
  </View>;
}
const styles = StyleSheet.create({ layer: { position: 'absolute', left: 16, right: 16, zIndex: 1000 }, toast: { padding: 16, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 8 }, text: { flex: 1 }, title: { fontWeight: '700', marginBottom: 4 } });
