import { useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { SavedGame, normalizeKeeper } from '@/types/game';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useTeams } from '@/contexts/TeamContext';
import { uploadProfileData, downloadProfileData } from '@/lib/sync';

export const FREE_GAME_LIMIT = 5;

function migrateSavedGame(game: SavedGame): SavedGame {
  return {
    ...game,
    homeKeeper: game.homeKeeper ? normalizeKeeper(game.homeKeeper) : undefined,
    awayKeeper: game.awayKeeper ? normalizeKeeper(game.awayKeeper) : undefined,
  };
}

function getStorageKey(profileId: string | null, isGuest: boolean): string {
  if (isGuest || !profileId) return 'gk_tracker_games_guest';
  return `gk_tracker_games_${profileId}`;
}

async function loadGamesFromStorage(storageKey: string): Promise<SavedGame[]> {
  try {
    console.log('[GameContext] Loading games for key:', storageKey);
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as SavedGame[];
      const migrated = parsed.map(migrateSavedGame);
      console.log('[GameContext] Loaded', migrated.length, 'games for key:', storageKey);
      return migrated;
    }
    console.log('[GameContext] No games found for key:', storageKey);
    return [];
  } catch (e) {
    console.log('[GameContext] Error loading games:', e);
    return [];
  }
}

export const [GameProvider, useGames] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { activeProfileId, activeProfile, isGuest, supabaseReady } = useGoalkeepers();
  const { activeTeamId, viewAllGames } = useTeams();

  const storageKey = getStorageKey(activeProfileId, isGuest);
  const prevKeyRef = useRef(storageKey);
  const syncInProgress = useRef(false);
  const lastSyncTime = useRef<number>(0);

  const sharedProfileId = activeProfile?.sharedProfileId;
  const isShared = !!activeProfile?.isShared && !!sharedProfileId;

  const gamesQuery = useQuery({
    queryKey: ['games', storageKey],
    queryFn: () => loadGamesFromStorage(storageKey),
    staleTime: 0,
  });

  const allGames = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);

  const games = useMemo(() => {
    if (viewAllGames || !activeTeamId) return allGames;
    return allGames.filter(g => g.teamId === activeTeamId);
  }, [allGames, activeTeamId, viewAllGames]);

  useEffect(() => {
    if (prevKeyRef.current !== storageKey) {
      console.log('[GameContext] Storage key changed from', prevKeyRef.current, 'to', storageKey);
      prevKeyRef.current = storageKey;
      lastSyncTime.current = 0;
      void queryClient.invalidateQueries({ queryKey: ['games', storageKey] });
    }
  }, [storageKey, queryClient]);

  useEffect(() => {
    if (!isShared || !sharedProfileId || !supabaseReady || syncInProgress.current) return;
    const now = Date.now();
    if (now - lastSyncTime.current < 10000) return;

    syncInProgress.current = true;
    lastSyncTime.current = now;

    void (async () => {
      try {
        const cloudGames = await downloadProfileData<SavedGame>(sharedProfileId, 'games');
        if (cloudGames && cloudGames.length > 0 && activeProfileId) {
          const localStored = await AsyncStorage.getItem(storageKey);
          const localGames: SavedGame[] = localStored ? JSON.parse(localStored).map(migrateSavedGame) : [];

          const merged = mergeGames(localGames, cloudGames);
          if (merged.length !== localGames.length || JSON.stringify(merged) !== JSON.stringify(localGames)) {
            await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
            queryClient.setQueryData(['games', storageKey], merged);
            console.log('[GameContext] Merged cloud games, total:', merged.length);
          }
        }
      } catch (e) {
        console.log('[GameContext] Cloud sync error:', e);
      } finally {
        syncInProgress.current = false;
      }
    })();
  }, [isShared, sharedProfileId, supabaseReady, activeProfileId, storageKey, queryClient]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, updatedGames }: { key: string; updatedGames: SavedGame[] }) => {
      if (key !== 'gk_tracker_games_guest') {
        console.log('[GameContext] Persisting', updatedGames.length, 'games to key:', key);
        await AsyncStorage.setItem(key, JSON.stringify(updatedGames));
      } else {
        console.log('[GameContext] Guest mode - not persisting games');
      }
      return updatedGames;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['games', variables.key], data);

      if (isShared && sharedProfileId && supabaseReady) {
        console.log('[GameContext] Uploading games to cloud for shared profile');
        void uploadProfileData(sharedProfileId, 'games', data);
      }
    },
  });

  const addGame = useCallback((game: SavedGame) => {
    const currentGames = queryClient.getQueryData<SavedGame[]>(['games', storageKey]) ?? [];
    const updated = [game, ...currentGames];
    queryClient.setQueryData(['games', storageKey], updated);
    saveMutation.mutate({ key: storageKey, updatedGames: updated });
    console.log('[GameContext] Added game, total now:', updated.length);
  }, [storageKey, saveMutation, queryClient]);

  const deleteGame = useCallback((gameId: string) => {
    const currentGames = queryClient.getQueryData<SavedGame[]>(['games', storageKey]) ?? [];
    const updated = currentGames.filter(g => g.id !== gameId);
    queryClient.setQueryData(['games', storageKey], updated);
    saveMutation.mutate({ key: storageKey, updatedGames: updated });
    console.log('[GameContext] Deleted game, total now:', updated.length);
  }, [storageKey, saveMutation, queryClient]);

  const updateGame = useCallback((updatedGame: SavedGame) => {
    const currentGames = queryClient.getQueryData<SavedGame[]>(['games', storageKey]) ?? [];
    const updated = currentGames.map(g => g.id === updatedGame.id ? updatedGame : g);
    queryClient.setQueryData(['games', storageKey], updated);
    saveMutation.mutate({ key: storageKey, updatedGames: updated });
    console.log('[GameContext] Updated game:', updatedGame.id);
  }, [storageKey, saveMutation, queryClient]);

  const getGame = useCallback((gameId: string): SavedGame | undefined => {
    const currentGames = queryClient.getQueryData<SavedGame[]>(['games', storageKey]) ?? [];
    return currentGames.find(g => g.id === gameId);
  }, [storageKey, queryClient]);

  const moveGameToProfile = useCallback(async (gameId: string, destinationProfileId: string, destinationTeamId: string | null): Promise<boolean> => {
    try {
      const currentGames = queryClient.getQueryData<SavedGame[]>(['games', storageKey]) ?? [];
      const gameToMove = currentGames.find(g => g.id === gameId);
      if (!gameToMove) {
        console.log('[GameContext] Game not found for move:', gameId);
        return false;
      }

      const destKey = `gk_tracker_games_${destinationProfileId}`;
      const destStored = await AsyncStorage.getItem(destKey);
      const destGames: SavedGame[] = destStored ? (JSON.parse(destStored) as SavedGame[]).map(migrateSavedGame) : [];

      const movedGame: SavedGame = {
        ...gameToMove,
        teamId: destinationTeamId ?? gameToMove.teamId,
      };
      const updatedDestGames = [movedGame, ...destGames];
      await AsyncStorage.setItem(destKey, JSON.stringify(updatedDestGames));
      queryClient.setQueryData(['games', destKey], updatedDestGames);
      console.log('[GameContext] Added game to destination profile:', destinationProfileId);

      const updatedSourceGames = currentGames.filter(g => g.id !== gameId);
      queryClient.setQueryData(['games', storageKey], updatedSourceGames);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedSourceGames));
      console.log('[GameContext] Removed game from source, remaining:', updatedSourceGames.length);

      return true;
    } catch (e) {
      console.log('[GameContext] Error moving game:', e);
      return false;
    }
  }, [storageKey, queryClient]);

  const forceSync = useCallback(async () => {
    if (!isShared || !sharedProfileId || !supabaseReady) return;
    syncInProgress.current = false;
    lastSyncTime.current = 0;

    const cloudGames = await downloadProfileData<SavedGame>(sharedProfileId, 'games');
    if (cloudGames && activeProfileId) {
      const localStored = await AsyncStorage.getItem(storageKey);
      const localGames: SavedGame[] = localStored ? JSON.parse(localStored).map(migrateSavedGame) : [];
      const merged = mergeGames(localGames, cloudGames);
      await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
      queryClient.setQueryData(['games', storageKey], merged);
      console.log('[GameContext] Force synced games:', merged.length);
    }
  }, [isShared, sharedProfileId, supabaseReady, activeProfileId, storageKey, queryClient]);

  const totalGameCount = allGames.length;
  const isAtFreeLimit = totalGameCount >= FREE_GAME_LIMIT;

  return useMemo(() => ({
    games,
    allGames,
    isLoading: gamesQuery.isLoading,
    addGame,
    updateGame,
    deleteGame,
    getGame,
    moveGameToProfile,
    forceSync,
    totalGameCount,
    isAtFreeLimit,
  }), [games, allGames, gamesQuery.isLoading, addGame, updateGame, deleteGame, getGame, moveGameToProfile, forceSync, totalGameCount, isAtFreeLimit]);
});

function mergeGames(local: SavedGame[], cloud: SavedGame[]): SavedGame[] {
  const map = new Map<string, SavedGame>();
  for (const g of cloud) {
    map.set(g.id, migrateSavedGame(g));
  }
  for (const g of local) {
    map.set(g.id, g);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
