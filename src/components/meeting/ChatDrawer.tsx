import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { ChatMessage } from '../../types/chat';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { getAvatarDefinition } from '../../constants/avatars';

export interface ChatDrawerProps {
  messages: ChatMessage[];
  canChat: boolean;
  onSendMessage: (text: string) => void | boolean | Promise<void | boolean>;
  onSendAnnouncement?: ((text: string) => Promise<boolean>) | undefined;
  onClose?: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  messages,
  canChat,
  onSendMessage,
  onSendAnnouncement,
  onClose,
}) => {
  const { tokens } = useResolvedTheme();
  const [inputText, setInputText] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async (): Promise<void> => {
    if (!inputText.trim() || !canChat || sending) return;
    setSending(true);
    try {
      const result = await (isAnnouncement && onSendAnnouncement
        ? onSendAnnouncement(inputText.trim())
        : onSendMessage(inputText.trim()));
      if (result !== false) setInputText('');
    } catch {
      Alert.alert('Message not sent', 'Please try sending your message again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.container,
        {
          backgroundColor: tokens.surface,
          borderLeftColor: tokens.border,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <Text style={[styles.title, { color: tokens.textMain }]}>
          Meeting Chat
        </Text>
        {onSendAnnouncement && (
          <TouchableOpacity
            onPress={() => setIsAnnouncement(!isAnnouncement)}
            accessibilityRole="button"
          >
            <Text style={{ color: tokens.primary }}>
              {isAnnouncement ? 'Announcement' : 'Chat message'}
            </Text>
          </TouchableOpacity>
        )}
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: tokens.textMuted }]}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Message List */}
      <ScrollView
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
              No messages yet. Say hello!
            </Text>
          </View>
        ) : (
          messages.map(msg => {
            const avatarDef = getAvatarDefinition(msg.senderAvatarId);
            const isAnnouncementMessage = msg.type === 'announcement';

            if (isAnnouncementMessage) {
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.announcementCard,
                    {
                      backgroundColor: tokens.primaryLight,
                      borderColor: tokens.primary,
                    },
                  ]}
                >
                  <View style={styles.announcementHeader}>
                    <Text style={styles.announcementIcon}>📢</Text>
                    <Text
                      style={[
                        styles.announcementTitle,
                        { color: tokens.primary },
                      ]}
                    >
                      Host Announcement
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.announcementText,
                      { color: tokens.textMain },
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              );
            }

            return (
              <View key={msg.id} style={styles.messageRow}>
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: avatarDef.backgroundColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarInitials,
                      { color: avatarDef.textColor },
                    ]}
                  >
                    {avatarDef.initials}
                  </Text>
                </View>
                <View style={styles.messageContent}>
                  <View style={styles.senderRow}>
                    <Text
                      style={[styles.senderName, { color: tokens.textMain }]}
                    >
                      {msg.senderName}
                    </Text>
                    {msg.isHostOrCoHost && (
                      <Text
                        style={[styles.hostBadge, { color: tokens.primary }]}
                      >
                        Host
                      </Text>
                    )}
                    <Text
                      style={[styles.timestamp, { color: tokens.textMuted }]}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.bubble,
                      { backgroundColor: tokens.surfaceSubtle },
                    ]}
                  >
                    <Text
                      style={[styles.bubbleText, { color: tokens.textMain }]}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Input or Disabled Notice */}
      {!canChat ? (
        <View
          style={[
            styles.disabledNotice,
            { backgroundColor: tokens.surfaceSubtle },
          ]}
        >
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={[styles.disabledText, { color: tokens.textMuted }]}>
            Chat is not available. The host has disabled chat for attendees.
          </Text>
        </View>
      ) : (
        <View style={[styles.inputBar, { borderTopColor: tokens.border }]}>
          <TextInput
            placeholder={
              isAnnouncement ? 'Send an announcement…' : 'Send a message…'
            }
            editable={!sending}
            placeholderTextColor={tokens.textSubtle}
            value={inputText}
            onChangeText={setInputText}
            maxLength={2000}
            style={[
              styles.input,
              {
                color: tokens.textMain,
                backgroundColor: tokens.surfaceSubtle,
              },
            ]}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim()
                  ? tokens.primary
                  : tokens.surfaceSubtle,
              },
            ]}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    borderLeftWidth: 1,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  announcementCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  announcementIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  announcementTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  announcementText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '700',
  },
  messageContent: {
    flex: 1,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  hostBadge: {
    fontSize: 10,
    fontWeight: '700',
    marginRight: 6,
  },
  timestamp: {
    fontSize: 11,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  disabledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    margin: 12,
    borderRadius: 12,
  },
  lockIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  disabledText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
