import { AvatarId, ISODateTime } from './common';

export type ChatMessageType = 'message' | 'announcement';

export interface ChatMessage {
  id: string;
  meetingId: string;
  senderId: string;
  senderName: string;
  senderAvatarId: AvatarId;
  isHostOrCoHost: boolean;
  type: ChatMessageType;
  content: string;
  timestamp: ISODateTime;
}

export interface SendChatMessagePayload {
  meetingId: string;
  content: string;
}

export interface SendChatMessageResponse {
  message: ChatMessage;
}

export interface SendAnnouncementPayload {
  meetingId: string;
  content: string;
}

export interface SendAnnouncementResponse {
  announcement: ChatMessage;
}
