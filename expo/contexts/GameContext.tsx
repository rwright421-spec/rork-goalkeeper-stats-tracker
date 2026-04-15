import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import * as secureStorage from '@/utils/secureStorage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { SavedGame, normalizeKeeper, normalizeHalf } from '@/types/game';
import { validateAndSanitizeArray } from '@/utils/validation';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useTeams } from '@/contexts/TeamContext';
import { uploadProfileData, downloadProfileData, GAME_LIMIT_ERROR_KEY, syncPendingGame, isLocalGameId } from '@/lib/sync';
import { useSyncStatus } from '@/contexts/SyncStatusContext';

export const FREE_GAME_LIMIT = 5;

function migrateSavedGame(game: SavedGame): SavedGame {
  return {
    ...game,
    homeKeeper: game.homeKeeper ? normalizeKeeper(game.homeKeeper) : undefined,
    awayKeeper: game.awayKeeper ? normalizeKeeper(game.awayKeeper) : undefined,
  };
}

function needsHalfBackfill(game: SavedGame): boolean {
  const keepers = [game.homeKeeper, game.awayKeeper].filter(Boolean);
  for (const k of keepers) {
    if (!k) continue;
    if (!k.firstHalf || !k.secondHalf) return true;
    if (k.firstHalf.distribution === undefined || k.firstHalf.penalties === undefined) return true;
    if (k.secondHalf.distribution === undefined || k.secondHalf.penalties === undefined) return true;
  }
  return false;
}

function backfillHalfStats(game: SavedGame): SavedGame {
  const patched = { ...game };
  if (patched.homeKeeper) {
    patched.homeKeeper = {
      ...patched.homeKeeper,
      firstHalf: normalizeHalf(patched.homeKeeper.firstHalf),
      secondHalf: normalizeHalf(patched.homeKeeper.secondHalf),
    };
  }
  if (patched.awayKeeper) {
    patched.awayKeeper = {
      ...patched.awayKeeper,
      firstHalf: normalizeHalf(patched.awayKeeper.firstHalf),
      secondHalf: normalizeHalf(patched.awayKeeper.secondHalf),
    };
  }
  return patched;
}

function getStorageKey(profileId: string | null, isGuest: boolean): string {
  if (isGuest || !profileId) return 'gk_tracker_games_guest';
  return `gk_tracker_games_${profileId}`;
}

async function loadGamesFromStorage(storageKey: string): Promise<SavedGame[]> {
  try {
    const stored = await secureStorage.getItem<unknown[]>(storageKey);
    if (stored) {
      const validated = validateAndSanitizeArray('SavedGame', stored);
      const migrated = validated.map(migrateSavedGame);

      let didBackfill = false;
      const backfilled = migrated.map(g => {
        if (needsHalfBackfill(g)) {
          didBackfill = true;
          return backfillHalfStats(g);
        }
        return g;
      });

      if (didBackfill) {
        await secureStorage.setItem(storageKey, backfilled);
      }

      return backfilled;
    }
    return [];
  } catch (e) {
    console.error('[Game] Error:', e);
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
  const isDirty = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sharedProfileId = activeProfile?.sharedProfileId;
  const isShared = !!activeProfile?.isShared && !!sharedProfileId;
  const [gameLimitExceeded, setGameLimitExceeded] = useState<boolean>(false);
  const pendingSyncInProgress = useRef(false);
  const { markSyncing, markSuccess, markFailed } = useSyncStatus();

  const gamesQuery = useQuery({
    queryKey: ['games', storageKey],
    queryFn: () => loadGamesFromStorage(storageKey),
    staleTime: 30000,
  });

  const allGames = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);

  const games = useMemo(() => {
    if (viewAllGames || !activeTeamId) return allGames;
    return allGames.filter(g => g.teamId === activeTeamId);
  }, [allGames, activeTeamId, viewAllGames]);

  useEffect(() => {
    if (prevKeyRef.current !== storageKey) {
      prevKeyRef.current = storageKey;
      lastSyncTime.current = 0;
      void queryClient.invalidateQueries({ queryKey: ['games', storageKey] });
    }
  }, [storageKey, queryClient]);

  const runGameSync = useCallback(async (force?: boolean) => {
    if (!isShared || !sharedProfileId || !supabaseReady || syncInProgress.current) return;
    if (!force && !isDirty.current) {
      return;
    }

    syncInProgress.current = true;
    lastSyncTime.current = Date.now();
    markSyncing();

    try {
      if (isDirty.current) {
        const currentData = queryClient.getQueryData<SavedGame[]>(['games', storageKey]) ?? [];
        await uploadProfileData(sharedProfileId, 'games', currentData);
        isDirty.current = false;
      }

      const cloudGames = await downloadProfileData<SavedGame>(sharedProfileId, 'games');
      if (cloudGames && cloudGames.length > 0 && activeProfileId) {
        const localGamesRaw = await secureStorage.getItem<SavedGame[]>(storageKey);
        const localGames: SavedGame[] = localGamesRaw ? localGamesRaw.map(migrateSavedGame) : [];

        const merged = mergeGames(localGames, cloudGames);
        if (merged.length !== localGames.length || JSON.stringify(merged) !== JSON.stringify(localGames)) {
          await secureStorage.setItem(storageKey, merged);
          queryClient.setQueryData(['games', storageKey], merged);
        }
      }
      markSuccess();
    } catch (e) {
      console.error('[Game] Error:', e);
      markFailed(async () => {
        const currentData = queryClient.getQueryData<SavedGame[]>(['games', storageKey]) ?? [];
        await uploadProfileData(sharedProfileId!, 'games', currentData);
        isDirty.current = false;
        const retryCloudGames = await downloadProfileData<SavedGame>(sharedProfileId!, 'games');
        if (retryCloudGames && retryCloudGames.length > 0 && activeProfileId) {
          const retryLocalRaw = await secureStorage.getItem<SavedGame[]>(storageKey);
          const retryLocal: SavedGame[] = retryLocalRaw ? retryLocalRaw.map(migrateSavedGame) : [];
          const retryMerged = mergeGames(retryLocal, retryCloudGames);
          await secureStorage.setItem(storageKey, retryMerged);
          queryClient.setQueryData(['games', storageKey], retryMerged);
        }
      });
    } finally {
      syncInProgress.current = false;
    }
  }, [isShared, sharedProfileId, supabaseReady, activeProfileId, storageKey, queryClient, markSyncing, markSuccess, markFailed]);

  useEffect(() => {
    if (!isShared || !sharedProfileId || !supabaseReady) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    void runGameSync(true);

    syncIntervalRef.current = setInterval(() => {
      void runGameSync();
    }, 60000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isShared, sharedProfileId, supabaseReady, runGameSync]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, updatedGames }: { key: string; updatedGames: SavedGame[] }) => {
      if (key !== 'gk_tracker_games_guest') {
        await secureStorage.setItem(key, updatedGames);
      }
      return updatedGames;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['games', variables.key], data);

      if (isShared && sharedProfileId && supabaseReady) {
        isDirty.current = true;
      }
    },
  });

  const clearGameLimitExceeded = useCallback(() => {
    setGameLimitExceeded(false);
  }, []);

  useEffect(() => {
    if (pendingSyncInProgress.current) return;
    const pendingGames = allGames.filter(g => g.pendingSync && isLocalGameId(g.id));
    if (pendingGames.length === 0) return;

    pendingSyncInProgress.current = true;

    void (async () => {
      try {
        let changed = false;
        const currentGames = queryClient.getQueryData<SavedGame[]>(['games', storageKey]) ?? [];
        const updatedGames = [...currentGames];

        for (const pending of pendingGames) {
          const result = await syncPendingGame(pending);
          if (result.synced && result.id !== pending.id) {
            const idx = updatedGames.findIndex(g => g.id === pending.id);
            if (idx !== -1) {
              updatedGames[idx] = {
                ...updatedGames[idx],
                id: result.id,
                pendingSync: undefined,
              };
              changed = true;
            }
          }
        }

        if (changed) {
          queryClient.setQueryData(['games', storageKey], updatedGames);
          if (storageKey !== 'gk_tracker_games_guest') {
            await secureStorage.setItem(storageKey, updatedGames);
          }

          if (isShared && sharedProfileId && supabaseReady) {
            markSyncing();
            try {
              await uploadProfileData(sharedProfileId, 'games', updatedGames);
              markSuccess();
            } catch (e: any) {
              if (e?.message === GAME_LIMIT_ERROR_KEY) {
                setGameLimitExceeded(true);
              } else {
                console.error('[Game] Error:', e);
                markFailed(async () => {
                  await uploadProfileData(sharedProfileId!, 'games', updatedGames);
                });
              }
            }
          }
        }
      } catch (e) {
        console.error('[Game] Error:', e);
      } finally {
        pendingSyncInProgress.current = false;
      }
    })();
  }, [allGames, storageKey, queryClient, isShared, sharedProfileId, supabaseReady]);

  const addGame = useCallback((game: SavedGame) => {
    const currentGames = queryClient.getQueryData<SavedGame[]>(['games', storageKey]) ?? [];
    const updated = [game, ...currentGames];
    queryClient.setQueryData(['games', storageKey], updated);
    saveMutation.mutate({ key: storageKey, updatedGames: updated });
  }, [storageKey, saveMutation, queryClient]);

  const deleteGame = useCallback((gameId: string) => {
    const currentGames = queryClient.getQueryData<SavedGame[]>(['games', storageKey]) ?? [];
    const updated = currentGames.filter(g => g.id !== gameId);
    queryClient.setQueryData(['games', storageKey], updated);
    saveMutation.mutate({ key: storageKey, updatedGames: updated });
  }, [storageKey, saveMutation, queryClient]);

  const updateGame = useCallback((updatedGame: SavedGame) => {
    const currentGames = queryClient.getQueryData<SavedGame[]>(['games', storageKey]) ?? [];
    const updated = currentGames.map(g => g.id === updatedGame.id ? updatedGame : g);
    queryClient.setQueryData(['games', storageKey], updated);
    saveMutation.mutate({ key: storageKey, updatedGames: updated });
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
        return false;
      }

      const destKey = `gk_tracker_games_${destinationProfileId}`;
      const destGamesRaw = await secureStorage.getItem<SavedGame[]>(destKey);
      const destGames: SavedGame[] = destGamesRaw ? destGamesRaw.map(migrateSavedGame) : [];

      const movedGame: SavedGame = {
        ...gameToMove,
        teamId: destinationTeamId ?? gameToMove.teamId,
      };
      const updatedDestGames = [movedGame, ...destGames];
      await secureStorage.setItem(destKey, updatedDestGames);
      queryClient.setQueryData(['games', destKey], updatedDestGames);

      const updatedSourceGames = currentGames.filter(g => g.id !== gameId);
      queryClient.setQueryData(['games', storageKey], updatedSourceGames);
      await secureStorage.setItem(storageKey, updatedSourceGames);

      return true;
    } catch (e) {
      console.error('[Game] Error:', e);
      return false;
    }
  }, [storageKey, queryClient]);

  const forceSync = useCallback(async () => {
    if (!isShared || !sharedProfileId || !supabaseReady) return;
    isDirty.current = true;
    syncInProgress.current = false;
    await runGameSync(true);
  }, [isShared, sharedProfileId, supabaseReady, runGameSync]);

  const { profiles } = useGoalkeepers();
  const [globalGameCount, setGlobalGameCount] = useState<number>(0);
  const countDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allGamesLengthRef = useRef(allGames.length);

  useEffect(() => {
    if (allGamesLengthRef.current === allGames.length && globalGameCount > 0) {
      return;
    }
    allGamesLengthRef.current = allGames.length;

    if (countDebounceRef.current) {
      clearTimeout(countDebounceRef.current);
    }

    let cancelled = false;
    countDebounceRef.current = setTimeout(() => {
      async function countAllGames() {
        try {
          let total = 0;
          const guestGames = await secureStorage.getItem<SavedGame[]>('gk_tracker_games_guest');
          if (guestGames) {
            total += guestGames.length;
          }
          for (const profile of profiles) {
            const key = `gk_tracker_games_${profile.id}`;
            const profileGames = await secureStorage.getItem<SavedGame[]>(key);
            if (profileGames) {
              total += profileGames.length;
            }
          }
          if (!cancelled) {
            setGlobalGameCount(total);
          }
        } catch (e) {
          console.error('[Game] Error:', e);
        }
      }
      void countAllGames();
    }, 500);

    return () => {
      cancelled = true;
      if (countDebounceRef.current) {
        clearTimeout(countDebounceRef.current);
      }
    };
  }, [profiles, allGames.length, globalGameCount]);

  const totalGameCount = globalGameCount;
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
    gameLimitExceeded,
    clearGameLimitExceeded,
  }), [games, allGames, gamesQuery.isLoading, addGame, updateGame, deleteGame, getGame, moveGameToProfile, forceSync, totalGameCount, isAtFreeLimit, gameLimitExceeded, clearGameLimitExceeded]);
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
