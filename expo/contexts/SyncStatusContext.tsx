import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import createContextHook from '@nkzw/create-context-hook';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

const BACKOFF_DELAYS = [5000, 30000, 300000];
const MAX_RETRIES = 3;

export const [SyncStatusProvider, useSyncStatus] = createContextHook(() => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [showSuccess, setShowSuccess] = useState(false);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRetryFn = useRef<(() => Promise<void>) | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearRetryTimer();
    };
  }, [clearRetryTimer]);

  const markSyncing = useCallback(() => {
    setSyncStatus('syncing');
    console.log('[SyncStatus] Status -> syncing');
  }, []);

  const markSuccess = useCallback(() => {
    clearRetryTimer();
    retryCount.current = 0;
    pendingRetryFn.current = null;
    setSyncStatus('idle');
    setShowSuccess(true);
    console.log('[SyncStatus] Status -> idle (success)');
    setTimeout(() => setShowSuccess(false), 2500);
  }, [clearRetryTimer]);

  const scheduleRetry = useCallback((retryFn: () => Promise<void>) => {
    const attempt = retryCount.current;
    if (attempt >= MAX_RETRIES) {
      setSyncStatus('error');
      pendingRetryFn.current = retryFn;
      console.log('[SyncStatus] Max retries reached, status -> error');
      return;
    }

    const delay = BACKOFF_DELAYS[attempt] ?? BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
    console.log('[SyncStatus] Scheduling retry', attempt + 1, 'in', delay, 'ms');
    setSyncStatus('error');

    clearRetryTimer();
    retryTimer.current = setTimeout(async () => {
      retryCount.current += 1;
      setSyncStatus('syncing');
      try {
        await retryFn();
        retryCount.current = 0;
        pendingRetryFn.current = null;
        setSyncStatus('idle');
        setShowSuccess(true);
        console.log('[SyncStatus] Retry succeeded');
        setTimeout(() => setShowSuccess(false), 2500);
      } catch (e) {
        console.log('[SyncStatus] Retry failed:', e);
        Sentry.captureException(e);
        scheduleRetry(retryFn);
      }
    }, delay);
  }, [clearRetryTimer]);

  const markFailed = useCallback((retryFn: () => Promise<void>) => {
    console.log('[SyncStatus] Sync failed, starting backoff');
    pendingRetryFn.current = retryFn;
    retryCount.current = 0;
    scheduleRetry(retryFn);
  }, [scheduleRetry]);

  const manualRetry = useCallback(async () => {
    const fn = pendingRetryFn.current;
    if (!fn) {
      console.log('[SyncStatus] No pending retry function');
      return;
    }
    clearRetryTimer();
    retryCount.current = 0;
    setSyncStatus('syncing');
    console.log('[SyncStatus] Manual retry triggered');
    try {
      await fn();
      retryCount.current = 0;
      pendingRetryFn.current = null;
      setSyncStatus('idle');
      setShowSuccess(true);
      console.log('[SyncStatus] Manual retry succeeded');
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (e) {
      console.log('[SyncStatus] Manual retry failed:', e);
      Sentry.captureException(e);
      scheduleRetry(fn);
    }
  }, [clearRetryTimer, scheduleRetry]);

  return useMemo(() => ({
    syncStatus,
    showSuccess,
    markSyncing,
    markSuccess,
    markFailed,
    manualRetry,
  }), [syncStatus, showSuccess, markSyncing, markSuccess, markFailed, manualRetry]);
});
