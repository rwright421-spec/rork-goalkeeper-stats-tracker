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
    console.log('[Sync] No Supabase client available');
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
      console.log('[Sync] Upload error for', dataKey, ':', error.message, error.code);
      if (isGameLimitError(error)) {
        throw new Error(GAME_LIMIT_ERROR_KEY);
      }
      return false;
    }

    console.log('[Sync] Uploaded', dataKey, ':', data.length, 'items for profile:', sharedProfileId);
    return true;
  } catch (e: any) {
    console.log('[Sync] Upload exception:', e);
    if (e?.message === GAME_LIMIT_ERROR_KEY) {
      throw e;
    }
    return false;
  }
}

export async function downloadProfileData<T>(
  sharedProfileId: string,
  dataKey: 'teams' | 'games',
): Promise<T[] | null> {
  const sb = getSupabase();
  if (!sb) {
    console.log('[Sync] No Supabase client for download');
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
      console.log('[Sync] Download error for', dataKey, ':', error.message);
      return null;
    }

    if (!data) {
      console.log('[Sync] No cloud data found for', dataKey, 'profile:', sharedProfileId);
      return [];
    }

    const parsed = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
    console.log('[Sync] Downloaded', dataKey, ':', Array.isArray(parsed) ? parsed.length : 0, 'items');
    return parsed as T[];
  } catch (e) {
    console.log('[Sync] Download exception:', e);
    return null;
  }
}

export async function uploadAllProfileData(
  sharedProfileId: string,
  teams: Team[],
  games: SavedGame[],
): Promise<boolean> {
  console.log('[Sync] Uploading all data for profile:', sharedProfileId);
  const [teamsOk, gamesOk] = await Promise.all([
    uploadProfileData(sharedProfileId, 'teams', teams),
    uploadProfileData(sharedProfileId, 'games', games),
  ]);
  console.log('[Sync] Upload results - teams:', teamsOk, 'games:', gamesOk);
  return teamsOk && gamesOk;
}

export async function downloadAllProfileData(
  sharedProfileId: string,
): Promise<SyncData | null> {
  console.log('[Sync] Downloading all data for profile:', sharedProfileId);
  const [teams, games] = await Promise.all([
    downloadProfileData<Team>(sharedProfileId, 'teams'),
    downloadProfileData<SavedGame>(sharedProfileId, 'games'),
  ]);

  if (teams === null && games === null) {
    console.log('[Sync] No cloud data available');
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
    console.log('[Sync] No Supabase client — cannot generate server game ID');
    return null;
  }

  try {
    const { data, error } = await sb.rpc('generate_game_id');
    if (error) {
      console.log('[Sync] generate_game_id RPC error:', error.message, error.code);
      return null;
    }
    if (data && typeof data === 'string') {
      console.log('[Sync] Server-generated game ID:', data);
      return data;
    }
    console.log('[Sync] Unexpected RPC response:', data);
    return null;
  } catch (e) {
    console.log('[Sync] generateServerGameId network error (likely offline):', e);
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
    console.log('[Sync] Still offline — cannot sync pending game:', game.id);
    return { id: game.id, synced: false };
  }

  console.log('[Sync] Synced pending game. Old ID:', game.id, '-> New ID:', serverId);
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
