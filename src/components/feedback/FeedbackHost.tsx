import { ToastHost } from './ToastHost';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { feedback, type FeedbackMessage } from '../../services/feedback';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ModalDialog } from '../layout/ModalDialog';
export function FeedbackHost() {
  const { tokens } = useResolvedTheme();
  const [queue, setQueue] = useState<FeedbackMessage[]>([]);
  const confirmation = queue[0];
  useEffect(() => feedback.subscribe(value => { if (value.buttons) setQueue(previous => [...previous, value]); }, 'confirmation'), []);
  const dismiss = () => { confirmation?.onDismiss?.(); setQueue(previous => previous.slice(1)); };
  return <>
    <ToastHost />
    {confirmation && <ModalDialog visible title={confirmation.title} description={confirmation.message} onClose={dismiss}>
      <View style={styles.buttons}>{confirmation.buttons?.map((button, index) => <TouchableOpacity key={index} accessibilityRole="button" onPress={() => {
        dismiss();
        Promise.resolve().then(() => button.onPress?.()).catch(() => feedback.alert('Could not complete action', 'Please try again.'));
      }} style={[styles.button, { backgroundColor: button.style === 'destructive' ? tokens.danger : button.style === 'cancel' ? tokens.surfaceSubtle : tokens.primary }]}><Text style={{ color: button.style === 'cancel' ? tokens.textMain : '#FFFFFF', fontWeight: '600' }}>{button.text || 'Continue'}</Text></TouchableOpacity>)}</View>
    </ModalDialog>}
  </>;
}
const styles = StyleSheet.create({ toastLayer: { position: 'absolute', left: 16, right: 16, zIndex: 1000 }, toast: { padding: 16, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 8 }, text: { flex: 1 }, title: { fontWeight: '700', marginBottom: 4 }, buttons: { gap: 12, width: '100%' }, button: { borderRadius: 12, padding: 15, alignItems: 'center' } });