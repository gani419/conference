import { useCallback, useEffect, useRef, useState } from 'react';
import type { DependencyList, ReactNode } from 'react';
import { backend } from './backend/supabase';
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const running = useRef(false);
  const run = async (task: () => Promise<unknown>) => {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await task();
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Something went wrong. Please retry.',
      );
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}
export function useRemote<T>(
  load: () => Promise<T>,
  deps: DependencyList,
  userId: string,
  meetingId?: string,
) {
  const [data, setData] = useState<T>(),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    let disposed = false,
      running = false,
      pending = false;
    async function update() {
      if (running) {
        pending = true;
        return;
      }
      running = true;
      try {
        const next = await load();
        if (!disposed) {
          setData(next);
          setError('');
        }
      } catch (e) {
        if (!disposed)
          setError(e instanceof Error ? e.message : 'Could not load data.');
      } finally {
        running = false;
        if (!disposed) {
          setLoading(false);
          if (pending) {
            pending = false;
            void update();
          }
        }
      }
    }
    void update();
    const timer = setInterval(() => void update(), 4000);
    const unsubscribe = backend.subscribe(
      () => void update(),
      userId,
      meetingId,
    );
    return () => {
      disposed = true;
      clearInterval(timer);
      unsubscribe();
    };
    // Callers provide the identity of their query; polling always uses that query's closure.
  }, [...deps, revision]);
  return { data, error, loading, refresh };
}
export function ErrorNotice({ message }: { message?: string }) {
  return message ? (
    <div className="notice error" role="alert">
      {message}
    </div>
  ) : null;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export const formatTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {name
        .trim()
        .split(/\s+/)
        .map(x => x[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?'}
    </span>
  );
}
