export type FeedbackButton = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void | Promise<void> };
export type FeedbackMessage = { id: number; title: string; message: string; buttons?: FeedbackButton[]; onDismiss?: () => void };
let sequence = 0;
const listeners = new Set<(message: FeedbackMessage) => void>();
const pending: FeedbackMessage[] = [];

export const feedback = {
  alert(title: string, message = '', buttons?: FeedbackButton[], options?: { onDismiss?: () => void; cancelable?: boolean }) {
    const confirmation = buttons && (buttons.length > 1 || buttons.some(button => button.onPress));
    const value: FeedbackMessage = { id: ++sequence, title, message, ...(confirmation ? { buttons } : {}), ...(options?.onDismiss ? { onDismiss: options.onDismiss } : {}) };
    if (listeners.size) listeners.forEach(listener => listener(value)); else pending.push(value);
  },
  subscribe(next: (message: FeedbackMessage) => void, kind?: 'toast' | 'confirmation') {
    listeners.add(next);
    for (let index = pending.length - 1; index >= 0; index--) { const value = pending[index]; if (value && (!kind || (!!value.buttons === (kind === 'confirmation')))) { pending.splice(index, 1); next(value); } }
    return () => { listeners.delete(next); };
  },
};
