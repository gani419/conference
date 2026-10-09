import React from 'react';
import { View, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Lock,
  MonitorUp,
  MessageCircle,
  Users,
  Hand,
  Megaphone,
  PhoneOff,
  Calendar,
  CalendarClock,
  Clock,
  Bell,
  House,
  Settings,
  Link,
  Zap,
  Wrench,
  User,
  Mail,
  Inbox,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  Check,
  SquareCheck,
  Square,
  ChevronLeft,
  X,
  Send,
  ArrowRight,
  Plus,
  Handshake,
  Sparkles,
  Smartphone,
  ShieldCheck,
  CircleHelp,
  LogOut,
  FileUp,
  Contact,
  Shield,
  Unlock,
  CircleStop,
  File,
  Copy,
} from 'lucide-react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
const icons = {
  file: File,
  copy: Copy,
  camera: Video,
  'screen-share': MonitorUp,
  video: Video,
  'video-off': VideoOff,
  mic: Mic,
  'mic-off': MicOff,
  lock: Lock,
  'monitor-up': MonitorUp,
  'message-circle': MessageCircle,
  users: Users,
  hand: Hand,
  megaphone: Megaphone,
  'phone-off': PhoneOff,
  calendar: Calendar,
  'calendar-clock': CalendarClock,
  clock: Clock,
  bell: Bell,
  house: House,
  settings: Settings,
  link: Link,
  zap: Zap,
  wrench: Wrench,
  user: User,
  mail: Mail,
  inbox: Inbox,
  eye: Eye,
  'eye-off': EyeOff,
  pin: Pin,
  'pin-off': PinOff,
  check: Check,
  'square-check': SquareCheck,
  square: Square,
  'chevron-left': ChevronLeft,
  x: X,
  send: Send,
  'arrow-right': ArrowRight,
  plus: Plus,
  handshake: Handshake,
  sparkles: Sparkles,
  smartphone: Smartphone,
  'circle-help': CircleHelp,
  'log-out': LogOut,
  'file-up': FileUp,
  contact: Contact,
  shield: Shield,
  unlock: Unlock,
  'circle-stop': CircleStop,
  'shield-check': ShieldCheck,
};
export function AppIcon({
  name,
  size,
  color,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { tokens } = useResolvedTheme();
  const flattened = StyleSheet.flatten(style) || {};
  const {
    fontSize,
    fontWeight: _weight,
    lineHeight: _line,
    color: styleColor,
    ...layout
  } = flattened;
  const Icon = icons[name as keyof typeof icons] || CircleHelp;
  return (
    <View
      style={layout}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Icon
        size={size ?? fontSize ?? 22}
        color={color ?? styleColor ?? tokens.textMain}
        strokeWidth={1.8}
      />
    </View>
  );
}
