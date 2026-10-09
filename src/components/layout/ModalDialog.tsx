import { ToastHost } from '../feedback/ToastHost';
import { AppIcon } from '../icons/AppIcon';
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export interface ModalDialogProps {
  visible: boolean;
  icon?: string;
  title: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonVariant?: 'danger' | 'primary';
  onPrimaryPress?: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  onClose?: () => void;
  extraContent?: React.ReactNode;
  children?: React.ReactNode;
  testID?: string;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  visible,
  icon,
  title,
  description,
  primaryButtonText,
  primaryButtonVariant = 'danger',
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  onClose,
  extraContent,
  children,
  testID,
}) => {
  const { tokens } = useResolvedTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.overlay} onPress={onClose} testID={testID}>
        <Pressable
          style={[styles.dialogCard, { backgroundColor: tokens.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: tokens.primaryLight }]}>
              <AppIcon style={styles.iconText} name={icon} />
            </View>
          )}

          <Text style={[styles.title, { color: tokens.textMain }]}>{title}</Text>
          {description ? (
            <Text style={[styles.description, { color: tokens.textMuted }]}>{description}</Text>
          ) : null}

          {children && <View style={{ width: '100%', flexShrink: 1 }}>{children}</View>}

          {extraContent && <View style={styles.extraContent}>{extraContent}</View>}

          {primaryButtonText && onPrimaryPress ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor:
                      primaryButtonVariant === 'danger' ? tokens.danger : tokens.primary,
                  },
                ]}
                onPress={onPrimaryPress}
              >
                <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
              </TouchableOpacity>

              {secondaryButtonText && (
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { borderColor: tokens.border, backgroundColor: tokens.surface },
                  ]}
                  onPress={onSecondaryPress || onClose}
                >
                  <Text style={[styles.secondaryButtonText, { color: tokens.textMain }]}>
                    {secondaryButtonText}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
      <ToastHost />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 26,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  extraContent: {
    width: '100%',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
