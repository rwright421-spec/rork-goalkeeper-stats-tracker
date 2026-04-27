import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeeperData, KeeperSelection, TimerPhase } from '@/types/game';

export const DRAFT_KEY = 'trackGame:draft:v1';

export interface DraftTimerState {
  running: boolean;
  baseMs: number;
  startedAt: number | null;
  phase?: TimerPhase;
  firstHalfSeconds?: number;
  secondHalfSeconds?: number;
  firstHalfPausedOffset?: number;
  secondHalfPausedOffset?: number;
  lastStartTimestamp?: number | null;
}

export interface DraftPayload {
  version: 1;
  savedAt: number;
  profileId: string | null;
  profileName: string | null;
  setup: {
    eventName: string;
    date: string;
    gameName: string;
    ageGroup: string;
    isHome: boolean;
    halfLengthMinutes?: number;
    keeperSelection: KeeperSelection;
    quickStart: boolean;
    editGameId?: string;
  };
  homeKeeper: KeeperData;
  awayKeeper: KeeperData;
  activeTab: 'home' | 'away';
  homeScoreOverride: string;
  awayScoreOverride: string;
  timer: DraftTimerState;
}

export async function loadDraft(): Promise<DraftPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
      if (__DEV__) console.log('[Draft] Discarding incompatible draft schema', parsed?.version);
      return null;
    }
    return parsed as DraftPayload;
  } catch (e) {
    if (__DEV__) console.log('[Draft] Failed to parse draft, discarding:', e);
    return null;
  }
}

export async function saveDraft(payload: DraftPayload): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('[Draft] Failed to save draft:', e);
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    console.error('[Draft] Failed to clear draft:', e);
  }
}

export function formatRelativeTime(savedAt: number): string {
  const diffMs = Date.now() - savedAt;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
