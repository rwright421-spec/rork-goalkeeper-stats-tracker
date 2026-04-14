import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as secureStorage from '@/utils/secureStorage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Team } from '@/types/game';
import { validateAndSanitizeArray } from '@/utils/validation';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { uploadProfileData, downloadProfileData } from '@/lib/sync';
import { useSyncStatus } from '@/contexts/SyncStatusContext';

const TEAMS_KEY_PREFIX = 'gk_tracker_teams_';

function getTeamsKey(profileId: string | null): string {
  if (!profileId) return 'gk_tracker_teams_guest';
  return `${TEAMS_KEY_PREFIX}${profileId}`;
}

async function loadTeams(key: string): Promise<Team[]> {
  try {
    console.log('[TeamContext] Loading teams for key:', key);
    const stored = await secureStorage.getItem<unknown[]>(key);
    if (stored) {
      const validated = validateAndSanitizeArray('Team', stored);
      console.log('[TeamContext] Loaded', validated.length, 'teams');
      return validated;
    }
    return [];
  } catch (e) {
    console.log('[TeamContext] Error loading teams:', e);
    return [];
  }
}

export const [TeamProvider, useTeams] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { activeProfileId, activeProfile, isGuest, supabaseReady } = useGoalkeepers();

  const storageKey = getTeamsKey(isGuest ? null : activeProfileId);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [viewAllGames, setViewAllGames] = useState(true);
  const syncInProgress = useRef(false);
  const lastSyncTime = useRef<number>(0);

  const sharedProfileId = activeProfile?.sharedProfileId;
  const isShared = !!activeProfile?.isShared && !!sharedProfileId;
  const { markSyncing, markSuccess, markFailed } = useSyncStatus();

  const teamsQuery = useQuery({
    queryKey: ['teams', storageKey],
    queryFn: () => loadTeams(storageKey),
    staleTime: 0,
  });

  useEffect(() => {
    if (!isShared || !sharedProfileId || !supabaseReady || syncInProgress.current) return;
    const now = Date.now();
    if (now - lastSyncTime.current < 10000) return;

    syncInProgress.current = true;
    lastSyncTime.current = now;

    void (async () => {
      markSyncing();
      try {
        const cloudTeams = await downloadProfileData<Team>(sharedProfileId, 'teams');
        if (cloudTeams && cloudTeams.length > 0 && activeProfileId) {
          const localTeams: Team[] = await secureStorage.getItem<Team[]>(storageKey) ?? [];

          const merged = mergeTeams(localTeams, cloudTeams);
          if (merged.length !== localTeams.length || JSON.stringify(merged) !== JSON.stringify(localTeams)) {
            await secureStorage.setItem(storageKey, merged);
            queryClient.setQueryData(['teams', storageKey], merged);
            console.log('[TeamContext] Merged cloud teams, total:', merged.length);
          }
        }
        markSuccess();
      } catch (e) {
        console.log('[TeamContext] Cloud sync error:', e);
        markFailed(async () => {
          const retryCloud = await downloadProfileData<Team>(sharedProfileId!, 'teams');
          if (retryCloud && retryCloud.length > 0 && activeProfileId) {
            const retryLocal: Team[] = await secureStorage.getItem<Team[]>(storageKey) ?? [];
            const retryMerged = mergeTeams(retryLocal, retryCloud);
            await secureStorage.setItem(storageKey, retryMerged);
            queryClient.setQueryData(['teams', storageKey], retryMerged);
          }
        });
      } finally {
        syncInProgress.current = false;
      }
    })();
  }, [isShared, sharedProfileId, supabaseReady, activeProfileId, storageKey, queryClient]);

  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data]);

  const activeTeam = useMemo(() => {
    if (!activeTeamId) return null;
    return teams.find(t => t.id === activeTeamId) ?? null;
  }, [teams, activeTeamId]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, updatedTeams }: { key: string; updatedTeams: Team[] }) => {
      console.log('[TeamContext] Persisting', updatedTeams.length, 'teams to key:', key);
      await secureStorage.setItem(key, updatedTeams);
      return updatedTeams;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['teams', variables.key], data);

      if (isShared && sharedProfileId && supabaseReady) {
        console.log('[TeamContext] Uploading teams to cloud for shared profile');
        void (async () => {
          markSyncing();
          try {
            await uploadProfileData(sharedProfileId, 'teams', data);
            markSuccess();
          } catch (e) {
            console.log('[TeamContext] Upload error:', e);
            markFailed(async () => {
              await uploadProfileData(sharedProfileId!, 'teams', data);
            });
          }
        })();
      }
    },
  });

  const createTeam = useCallback((year: string, teamName: string): Team => {
    const team: Team = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      goalkeeperProfileId: activeProfileId ?? 'guest',
      year: year.trim(),
      teamName: teamName.trim(),
      createdAt: new Date().toISOString(),
    };
    const currentTeams = queryClient.getQueryData<Team[]>(['teams', storageKey]) ?? [];
    const updated = [team, ...currentTeams];
    queryClient.setQueryData(['teams', storageKey], updated);
    saveMutation.mutate({ key: storageKey, updatedTeams: updated });
    console.log('[TeamContext] Created team:', team.teamName, team.year);
    return team;
  }, [activeProfileId, storageKey, saveMutation, queryClient]);

  const updateTeam = useCallback((teamId: string, year: string, teamName: string) => {
    const currentTeams = queryClient.getQueryData<Team[]>(['teams', storageKey]) ?? [];
    const updated = currentTeams.map(t =>
      t.id === teamId ? { ...t, year: year.trim(), teamName: teamName.trim() } : t
    );
    queryClient.setQueryData(['teams', storageKey], updated);
    saveMutation.mutate({ key: storageKey, updatedTeams: updated });
  }, [storageKey, saveMutation, queryClient]);

  const deleteTeam = useCallback((teamId: string) => {
    const currentTeams = queryClient.getQueryData<Team[]>(['teams', storageKey]) ?? [];
    const updated = currentTeams.filter(t => t.id !== teamId);
    queryClient.setQueryData(['teams', storageKey], updated);
    saveMutation.mutate({ key: storageKey, updatedTeams: updated });
    if (activeTeamId === teamId) {
      setActiveTeamId(null);
    }
  }, [storageKey, saveMutation, queryClient, activeTeamId]);

  const selectTeam = useCallback((teamId: string) => {
    setActiveTeamId(teamId);
    setViewAllGames(false);
    console.log('[TeamContext] Selected team:', teamId);
  }, []);

  const clearTeamSelection = useCallback(() => {
    setActiveTeamId(null);
    setViewAllGames(false);
  }, []);

  const showAllGames = useCallback(() => {
    setActiveTeamId(null);
    setViewAllGames(true);
    console.log('[TeamContext] Viewing all games');
  }, []);

  useEffect(() => {
    setActiveTeamId(null);
    setViewAllGames(true);
    lastSyncTime.current = 0;
  }, [activeProfileId]);

  const forceSync = useCallback(async () => {
    if (!isShared || !sharedProfileId || !supabaseReady) return;
    syncInProgress.current = false;
    lastSyncTime.current = 0;

    const cloudTeams = await downloadProfileData<Team>(sharedProfileId, 'teams');
    if (cloudTeams && activeProfileId) {
      const localTeams: Team[] = await secureStorage.getItem<Team[]>(storageKey) ?? [];
      const merged = mergeTeams(localTeams, cloudTeams);
      await secureStorage.setItem(storageKey, merged);
      queryClient.setQueryData(['teams', storageKey], merged);
      console.log('[TeamContext] Force synced teams:', merged.length);
    }
  }, [isShared, sharedProfileId, supabaseReady, activeProfileId, storageKey, queryClient]);

  return useMemo(() => ({
    teams,
    isLoading: teamsQuery.isLoading,
    activeTeam,
    activeTeamId,
    viewAllGames,
    createTeam,
    updateTeam,
    deleteTeam,
    selectTeam,
    clearTeamSelection,
    showAllGames,
    forceSync,
  }), [teams, teamsQuery.isLoading, activeTeam, activeTeamId, viewAllGames, createTeam, updateTeam, deleteTeam, selectTeam, clearTeamSelection, showAllGames, forceSync]);
});

function mergeTeams(local: Team[], cloud: Team[]): Team[] {
  const map = new Map<string, Team>();
  for (const t of cloud) {
    map.set(t.id, t);
  }
  for (const t of local) {
    map.set(t.id, t);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
