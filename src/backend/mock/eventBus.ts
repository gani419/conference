import { MeetingEventPayload } from '../../constants/meetingEvents';

type MeetingEventListener = (event: MeetingEventPayload) => void;

class MockEventBus {
  private listeners: Set<MeetingEventListener> = new Set();

  subscribe(listener: MeetingEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: MeetingEventPayload): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in mock event listener:', err);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const mockEventBus = new MockEventBus();
