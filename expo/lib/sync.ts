import * as Sentry from '@sentry/react-native';
import { getSupabase } from './supabase';
import { Team, SavedGame } from '@/types/game';

export interface SyncData {
  teams: Team[];
  games: SavedGame[];
  updatedAt: string;
}

export const GAME_LIMIT_ERROR_KEY = 'GAME_LIMIT_EXCEEDED';

export function isGameLimitError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  return !!error.message?.includes(GAME_LIMIT_ERROR_KEY);
}

export async function uploadProfileData(
  sharedProfileId: string,
  dataKey: 'teams' | 'games',
  data: unknown[],
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) {
    return false;
  }

  try {
    const { error } = await sb
      .from('profile_data')
      .upsert({
        profile_id: sharedProfileId,
        data_key: dataKey,
        data: JSON.stringify(data),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'profile_id,data_key',
      });

    if (error) {
      if (isGameLimitError(error)) {
        throw new Error(GAME_LIMIT_ERROR_KEY);
      }
      return false;
    }

    return true;
  } catch (e: any) {
    if (e?.message === GAME_LIMIT_ERROR_KEY) {
      throw e;
    }
    Sentry.captureException(e);
    return false;
  }
}

export async function downloadProfileData<T>(
  sharedProfileId: string,
  dataKey: 'teams' | 'games',
): Promise<T[] | null> {
  const sb = getSupabase();
  if (!sb) {
    return null;
  }

  try {
    const { data, error } = await sb
      .from('profile_data')
      .select('data, updated_at')
      .eq('profile_id', sharedProfileId)
      .eq('data_key', dataKey)
      .maybeSingle();

    if (error) {
      return null;
    }

    if (!data) {
      return [];
    }

    const parsed = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
    return parsed as T[];
  } catch (e) {
    Sentry.captureException(e);
    return null;
  }
}

export async function uploadAllProfileData(
  sharedProfileId: string,
  teams: Team[],
  games: SavedGame[],
): Promise<boolean> {
  const [teamsOk, gamesOk] = await Promise.all([
    uploadProfileData(sharedProfileId, 'teams', teams),
    uploadProfileData(sharedProfileId, 'games', games),
  ]);
  return teamsOk && gamesOk;
}

export async function downloadAllProfileData(
  sharedProfileId: string,
): Promise<SyncData | null> {
  const [teams, games] = await Promise.all([
    downloadProfileData<Team>(sharedProfileId, 'teams'),
    downloadProfileData<SavedGame>(sharedProfileId, 'games'),
  ]);

  if (teams === null && games === null) {
    return null;
  }

  return {
    teams: teams ?? [],
    games: games ?? [],
    updatedAt: new Date().toISOString(),
  };
}

export async function generateServerGameId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) {
    return null;
  }

  try {
    const { data, error } = await sb.rpc('generate_game_id');
    if (error) {
      return null;
    }
    if (data && typeof data === 'string') {
      return data;
    }
    return null;
  } catch (e) {
    Sentry.captureException(e);
    return null;
  }
}

export function createLocalGameId(): string {
  return 'local_' + Date.now().toString() + Math.random().toString(36).slice(2, 8);
}

export function isLocalGameId(id: string): boolean {
  return id.startsWith('local_');
}

export async function syncPendingGame(
  game: SavedGame,
): Promise<{ id: string; synced: boolean }> {
  if (!game.pendingSync) {
    return { id: game.id, synced: true };
  }

  const serverId = await generateServerGameId();
  if (!serverId) {
    return { id: game.id, synced: false };
  }

  return { id: serverId, synced: true };
}

export async function getCloudUpdateTime(
  sharedProfileId: string,
  dataKey: 'teams' | 'games',
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('profile_data')
      .select('updated_at')
      .eq('profile_id', sharedProfileId)
      .eq('data_key', dataKey)
      .maybeSingle();

    if (error || !data) return null;
    return data.updated_at as string;
  } catch {
    return null;
  }
}
