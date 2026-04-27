import { useCallback, useEffect, useRef, useState } from 'react';
import { TimerPhase } from '@/types/game';

export interface GameTimerState {
  phase: TimerPhase;
  firstHalfSeconds: number;
  secondHalfSeconds: number;
  liveElapsedSeconds: number;
  totalSeconds: number;
}

export interface GameTimerControls {
  start: () => void;
  pause: () => void;
  endHalf: () => void;
  resetCurrentHalf: () => void;
  setHalfDurations: (firstSeconds: number, secondSeconds: number) => void;
}

export interface GameTimerHydrate {
  phase: TimerPhase;
  firstHalfSeconds: number;
  secondHalfSeconds: number;
  firstHalfPausedOffset: number;
  secondHalfPausedOffset: number;
  lastStartTimestamp: number | null;
}

export interface GameTimerSnapshot extends GameTimerHydrate {}

export type UseGameTimerReturn = GameTimerState & GameTimerControls & {
  hydrate: (state: GameTimerHydrate) => void;
  snapshot: () => GameTimerSnapshot;
  isRunning: boolean;
};

export function useGameTimer(): UseGameTimerReturn {
  const [phase, setPhase] = useState<TimerPhase>('pre-1st');
  const [firstHalfSeconds, setFirstHalfSeconds] = useState<number>(0);
  const [secondHalfSeconds, setSecondHalfSeconds] = useState<number>(0);
  const [tick, setTick] = useState<number>(0);

  const firstPausedOffsetRef = useRef<number>(0);
  const secondPausedOffsetRef = useRef<number>(0);
  const lastStartRef = useRef<number | null>(null);

  const isRunning = phase === 'in-1st' || phase === 'in-2nd';

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [isRunning]);

  const computeLiveSeconds = useCallback((): number => {
    if (phase === 'in-1st') {
      const offset = firstPausedOffsetRef.current;
      const delta = lastStartRef.current !== null ? Date.now() - lastStartRef.current : 0;
      return Math.max(0, Math.floor((offset + delta) / 1000));
    }
    if (phase === 'paused-1st') {
      return Math.max(0, Math.floor(firstPausedOffsetRef.current / 1000));
    }
    if (phase === 'in-2nd') {
      const offset = secondPausedOffsetRef.current;
      const delta = lastStartRef.current !== null ? Date.now() - lastStartRef.current : 0;
      return Math.max(0, Math.floor((offset + delta) / 1000));
    }
    if (phase === 'paused-2nd') {
      return Math.max(0, Math.floor(secondPausedOffsetRef.current / 1000));
    }
    return 0;
  }, [phase]);

  const liveElapsedSeconds = computeLiveSeconds();
  // tick used to force re-render
  void tick;

  const start = useCallback(() => {
    setPhase((current) => {
      if (current === 'pre-1st' || current === 'paused-1st') {
        lastStartRef.current = Date.now();
        return 'in-1st';
      }
      if (current === 'between' || current === 'paused-2nd') {
        lastStartRef.current = Date.now();
        return 'in-2nd';
      }
      return current;
    });
  }, []);

  const pause = useCallback(() => {
    setPhase((current) => {
      if (current === 'in-1st') {
        if (lastStartRef.current !== null) {
          firstPausedOffsetRef.current += Date.now() - lastStartRef.current;
          lastStartRef.current = null;
        }
        return 'paused-1st';
      }
      if (current === 'in-2nd') {
        if (lastStartRef.current !== null) {
          secondPausedOffsetRef.current += Date.now() - lastStartRef.current;
          lastStartRef.current = null;
        }
        return 'paused-2nd';
      }
      return current;
    });
  }, []);

  const endHalf = useCallback(() => {
    setPhase((current) => {
      if (current === 'in-1st' || current === 'paused-1st') {
        if (current === 'in-1st' && lastStartRef.current !== null) {
          firstPausedOffsetRef.current += Date.now() - lastStartRef.current;
          lastStartRef.current = null;
        }
        const total = Math.floor(firstPausedOffsetRef.current / 1000);
        setFirstHalfSeconds(Math.max(0, total));
        return 'between';
      }
      if (current === 'in-2nd' || current === 'paused-2nd') {
        if (current === 'in-2nd' && lastStartRef.current !== null) {
          secondPausedOffsetRef.current += Date.now() - lastStartRef.current;
          lastStartRef.current = null;
        }
        const total = Math.floor(secondPausedOffsetRef.current / 1000);
        setSecondHalfSeconds(Math.max(0, total));
        return 'post-2nd';
      }
      return current;
    });
  }, []);

  const resetCurrentHalf = useCallback(() => {
    setPhase((current) => {
      if (current === 'in-1st') {
        firstPausedOffsetRef.current = 0;
        lastStartRef.current = Date.now();
        return current;
      }
      if (current === 'paused-1st') {
        firstPausedOffsetRef.current = 0;
        lastStartRef.current = null;
        return current;
      }
      if (current === 'in-2nd') {
        secondPausedOffsetRef.current = 0;
        lastStartRef.current = Date.now();
        return current;
      }
      if (current === 'paused-2nd') {
        secondPausedOffsetRef.current = 0;
        lastStartRef.current = null;
        return current;
      }
      return current;
    });
  }, []);

  const setHalfDurations = useCallback((firstSeconds: number, secondSeconds: number) => {
    setFirstHalfSeconds(Math.max(0, Math.round(firstSeconds)));
    setSecondHalfSeconds(Math.max(0, Math.round(secondSeconds)));
  }, []);

  const hydrate = useCallback((state: GameTimerHydrate) => {
    firstPausedOffsetRef.current = Math.max(0, state.firstHalfPausedOffset);
    secondPausedOffsetRef.current = Math.max(0, state.secondHalfPausedOffset);
    lastStartRef.current = state.lastStartTimestamp;
    setFirstHalfSeconds(Math.max(0, state.firstHalfSeconds));
    setSecondHalfSeconds(Math.max(0, state.secondHalfSeconds));
    setPhase(state.phase);
  }, []);

  const snapshot = useCallback((): GameTimerSnapshot => {
    return {
      phase,
      firstHalfSeconds,
      secondHalfSeconds,
      firstHalfPausedOffset: firstPausedOffsetRef.current,
      secondHalfPausedOffset: secondPausedOffsetRef.current,
      lastStartTimestamp: lastStartRef.current,
    };
  }, [phase, firstHalfSeconds, secondHalfSeconds]);

  let totalSeconds = firstHalfSeconds + secondHalfSeconds;
  if (phase === 'in-1st' || phase === 'paused-1st') totalSeconds = liveElapsedSeconds;
  else if (phase === 'in-2nd' || phase === 'paused-2nd') totalSeconds = firstHalfSeconds + liveElapsedSeconds;

  return {
    phase,
    firstHalfSeconds,
    secondHalfSeconds,
    liveElapsedSeconds,
    totalSeconds,
    isRunning,
    start,
    pause,
    endHalf,
    resetCurrentHalf,
    setHalfDurations,
    hydrate,
    snapshot,
  };
}

export function formatMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
