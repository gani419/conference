import { ISODateTime } from '../types/common';

export function isValidISODateTime(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }
  const timestamp = Date.parse(str);
  return !isNaN(timestamp);
}

export function formatMeetingDateTime(isoString: ISODateTime, timezone?: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    return isoString;
  }
}

export function formatTimeRange(startIso: ISODateTime, durationMinutes = 60, timezone?: string): string {
  try {
    const start = new Date(startIso);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    };
    const startStr = new Intl.DateTimeFormat('en-US', timeOptions).format(start);
    const endStr = new Intl.DateTimeFormat('en-US', timeOptions).format(end);
    return `${startStr} – ${endStr}`;
  } catch {
    return startIso;
  }
}

export function getCountdownToMeeting(startIso: ISODateTime, currentServerTimeIso?: ISODateTime): {
  isPast: boolean;
  minutesRemaining: number;
  label: string;
} {
  const targetTime = Date.parse(startIso);
  const now = currentServerTimeIso ? Date.parse(currentServerTimeIso) : Date.now();
  const diffMs = targetTime - now;

  if (diffMs <= 0) {
    return { isPast: true, minutesRemaining: 0, label: 'Now' };
  }

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return { isPast: false, minutesRemaining: minutes, label: `in ${days}d ${hours % 24}h` };
  }
  if (hours > 0) {
    return { isPast: false, minutesRemaining: minutes, label: `in ${hours}h ${minutes % 60}m` };
  }
  return { isPast: false, minutesRemaining: minutes, label: `in ${minutes} mins` };
}

export function isMeetingEligibleToJoin(
  scheduledStartIso: ISODateTime,
  status: string,
  serverTimeIso?: ISODateTime,
): boolean {
  if (status === 'live') {
    return true;
  }
  if (status === 'cancelled' || status === 'ended') {
    return false;
  }
  const targetTime = Date.parse(scheduledStartIso);
  const now = serverTimeIso ? Date.parse(serverTimeIso) : Date.now();
  // Eligible if now >= scheduledStartTime or within 10 minutes buffer
  return now >= targetTime - 10 * 60 * 1000;
}
