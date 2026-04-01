import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { GoalkeeperProfile } from '@/types/game';
import { useAuth } from '@/contexts/AuthContext';
import { encodeShareCode, decodeShareCode } from '@/lib/share-codes';
import {
  createSharedProfile,
  joinProfileByCode,
  getProfileMembers,
  removeMember,
  regenerateInviteCode,
  getUserRole,
  leaveProfile as leaveProfileDb,
  disableSharing as disableSharingDb,
  ProfileMember,
} from '@/lib/profile-db';
import { ensureTables } from '@/lib/supabase';

const PROFILES_KEY = 'gk_tracker_profiles';

async function loadLocalProfiles(): Promise<GoalkeeperProfile[]> {
  try {
    const stored = await AsyncStorage.getItem(PROFILES_KEY);
    if (stored) {
      return JSON.parse(stored) as GoalkeeperProfile[];
    }
    return [];
  } catch (e) {
    console.log('Error loading local profiles:', e);
    return [];
  }
}

async function persistLocalProfiles(profiles: GoalkeeperProfile[]): Promise<GoalkeeperProfile[]> {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  return profiles;
}

export const [GoalkeeperProvider, useGoalkeepers] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId, displayName } = useAuth();
  const [profiles, setProfiles] = useState<GoalkeeperProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await ensureTables();
      if (!cancelled) {
        setSupabaseReady(ok);
        console.log('[GoalkeeperContext] Supabase ready:', ok);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const localQuery = useQuery({
    queryKey: ['goalkeeper-profiles-local'],
    queryFn: loadLocalProfiles,
  });

  useEffect(() => {
    const localProfiles = localQuery.data ?? [];
    const sorted = [...localProfiles].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setProfiles(sorted);
  }, [localQuery.data]);

  const localSaveMutation = useMutation({
    mutationFn: persistLocalProfiles,
    onSuccess: (data) => {
      queryClient.setQueryData(['goalkeeper-profiles-local'], data);
    },
  });

  const createProfile = useCallback((name: string, birthYear?: string): GoalkeeperProfile => {
    const profile: GoalkeeperProfile = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      name: name.trim(),
      birthYear: birthYear?.trim() ?? '',
      createdAt: new Date().toISOString(),
      ownerId: userId || undefined,
    };
    const localProfiles = queryClient.getQueryData<GoalkeeperProfile[]>(['goalkeeper-profiles-local']) ?? [];
    const updated = [profile, ...localProfiles];
    queryClient.setQueryData(['goalkeeper-profiles-local'], updated);
    localSaveMutation.mutate(updated);
    console.log('[GoalkeeperContext] Created profile:', profile.id);
    return profile;
  }, [userId, queryClient, localSaveMutation]);

  const updateProfile = useCallback((profileId: string, newName: string, newBirthYear?: string) => {
    const localProfiles = queryClient.getQueryData<GoalkeeperProfile[]>(['goalkeeper-profiles-local']) ?? [];
    const updated = localProfiles.map(p => p.id === profileId ? { ...p, name: newName.trim(), birthYear: newBirthYear?.trim() ?? p.birthYear ?? '', updatedAt: new Date().toISOString() } : p);
    queryClient.setQueryData(['goalkeeper-profiles-local'], updated);
    localSaveMutation.mutate(updated);
  }, [queryClient, localSaveMutation]);

  const renameProfile = updateProfile;

  const deleteProfile = useCallback((profileId: string) => {
    const localProfiles = queryClient.getQueryData<GoalkeeperProfile[]>(['goalkeeper-profiles-local']) ?? [];
    const updated = localProfiles.filter(p => p.id !== profileId);
    queryClient.setQueryData(['goalkeeper-profiles-local'], updated);
    localSaveMutation.mutate(updated);
    AsyncStorage.removeItem(`gk_tracker_games_${profileId}`).catch(console.log);
    AsyncStorage.removeItem(`gk_tracker_teams_${profileId}`).catch(console.log);
  }, [queryClient, localSaveMutation]);

  const selectProfile = useCallback((profileId: string) => {
    setActiveProfileId(profileId);
    setIsGuest(false);
  }, []);

  const selectGuest = useCallback(() => {
    setActiveProfileId(null);
    setIsGuest(true);
  }, []);

  const clearSelection = useCallback(() => {
    setActiveProfileId(null);
    setIsGuest(false);
  }, []);

  const activeProfile = useMemo(() => {
    if (!activeProfileId) return null;
    return profiles.find(p => p.id === activeProfileId) ?? null;
  }, [profiles, activeProfileId]);

  const convertToShared = useCallback(async (profileId: string): Promise<GoalkeeperProfile | null> => {
    const localProfile = profiles.find(p => p.id === profileId);
    if (!localProfile) {
      console.log('[GoalkeeperContext] Profile not found for conversion:', profileId);
      return null;
    }
    if (localProfile.isShared && localProfile.sharedProfileId) {
      console.log('[GoalkeeperContext] Profile already shared:', profileId);
      return localProfile;
    }

    if (!supabaseReady) {
      console.log('[GoalkeeperContext] Supabase not ready, using local share code');
      const shareCode = encodeShareCode({
        name: localProfile.name,
        birthYear: localProfile.birthYear ?? '',
        sourceId: userId || profileId,
      });

      const sharedProfile: GoalkeeperProfile = {
        ...localProfile,
        isShared: true,
        ownerId: userId || undefined,
        inviteCode: shareCode,
        updatedAt: new Date().toISOString(),
      };

      const localProfiles = queryClient.getQueryData<GoalkeeperProfile[]>(['goalkeeper-profiles-local']) ?? [];
      const updatedLocal = localProfiles.map(p => p.id === profileId ? sharedProfile : p);
      queryClient.setQueryData(['goalkeeper-profiles-local'], updatedLocal);
      localSaveMutation.mutate(updatedLocal);
      return sharedProfile;
    }

    console.log('[GoalkeeperContext] Creating shared profile in Supabase...');
    const sharedDb = await createSharedProfile(
      userId || profileId,
      displayName || 'Owner',
      localProfile.name,
      localProfile.birthYear ?? '',
    );

    if (!sharedDb) {
      console.log('[GoalkeeperContext] Failed to create shared profile in Supabase');
      return null;
    }

    const sharedProfile: GoalkeeperProfile = {
      ...localProfile,
      isShared: true,
      ownerId: userId || undefined,
      sharedProfileId: sharedDb.profile_id,
      inviteCode: sharedDb.invite_code ?? '',
      updatedAt: new Date().toISOString(),
    };

    console.log('[GoalkeeperContext] Shared profile created. invite_code:', sharedDb.invite_code, 'profile_id:', sharedDb.profile_id);

    const localProfiles = queryClient.getQueryData<GoalkeeperProfile[]>(['goalkeeper-profiles-local']) ?? [];
    const updatedLocal = localProfiles.map(p => p.id === profileId ? sharedProfile : p);
    queryClient.setQueryData(['goalkeeper-profiles-local'], updatedLocal);
    localSaveMutation.mutate(updatedLocal);
    setProfiles(prev => prev.map(p => p.id === profileId ? sharedProfile : p));

    const { uploadAllProfileData } = await import('@/lib/sync');
    const teamsStored = await AsyncStorage.getItem(`gk_tracker_teams_${profileId}`);
    const gamesStored = await AsyncStorage.getItem(`gk_tracker_games_${profileId}`);
    const teams = teamsStored ? JSON.parse(teamsStored) : [];
    const games = gamesStored ? JSON.parse(gamesStored) : [];
    await uploadAllProfileData(sharedDb.profile_id, teams, games);

    console.log('[GoalkeeperContext] Profile converted to shared:', sharedDb.profile_id, 'code:', sharedDb.invite_code);
    return sharedProfile;
  }, [userId, displayName, profiles, supabaseReady, queryClient, localSaveMutation]);

  const joinByCode = useCallback(async (code: string): Promise<{ success: boolean; profileName?: string; alreadyMember?: boolean }> => {
    console.log('[GoalkeeperContext] joinByCode called with code:', code);

    const localProfiles = queryClient.getQueryData<GoalkeeperProfile[]>(['goalkeeper-profiles-local']) ?? [];

    if (supabaseReady && !code.startsWith('GK-')) {
      const result = await joinProfileByCode(code, userId || 'anonymous', displayName || 'User');
      if (result) {
        const alreadyLocal = localProfiles.some(p => p.sharedProfileId === result.profile.profile_id);
        if (alreadyLocal) {
          return { success: true, profileName: result.profile.name, alreadyMember: true };
        }

        const { downloadAllProfileData } = await import('@/lib/sync');
        const cloudData = await downloadAllProfileData(result.profile.profile_id);

        const newProfile: GoalkeeperProfile = {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
          name: result.profile.name,
          birthYear: result.profile.birth_year,
          createdAt: new Date().toISOString(),
          isShared: true,
          ownerId: result.profile.owner_id,
          sharedProfileId: result.profile.profile_id,
          inviteCode: result.profile.invite_code ?? '',
        };

        const updated = [newProfile, ...localProfiles];
        queryClient.setQueryData(['goalkeeper-profiles-local'], updated);
        localSaveMutation.mutate(updated);

        if (cloudData) {
          if (cloudData.teams.length > 0) {
            await AsyncStorage.setItem(`gk_tracker_teams_${newProfile.id}`, JSON.stringify(cloudData.teams));
            console.log('[GoalkeeperContext] Synced', cloudData.teams.length, 'teams from cloud');
          }
          if (cloudData.games.length > 0) {
            await AsyncStorage.setItem(`gk_tracker_games_${newProfile.id}`, JSON.stringify(cloudData.games));
            console.log('[GoalkeeperContext] Synced', cloudData.games.length, 'games from cloud');
          }
        }

        return { success: true, profileName: result.profile.name, alreadyMember: result.alreadyMember };
      }
    }

    const payload = decodeShareCode(code);
    if (!payload) {
      console.log('[GoalkeeperContext] Failed to decode share code');
      return { success: false };
    }

    const alreadyExists = localProfiles.some(p => p.name === payload.name && p.birthYear === payload.birthYear);
    if (alreadyExists) {
      return { success: true, profileName: payload.name, alreadyMember: true };
    }

    const newProfile: GoalkeeperProfile = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      name: payload.name,
      birthYear: payload.birthYear,
      createdAt: new Date().toISOString(),
      isShared: true,
      ownerId: payload.sourceId || undefined,
    };

    const updated = [newProfile, ...localProfiles];
    queryClient.setQueryData(['goalkeeper-profiles-local'], updated);
    localSaveMutation.mutate(updated);
    return { success: true, profileName: payload.name, alreadyMember: false };
  }, [userId, displayName, supabaseReady, queryClient, localSaveMutation]);

  const getMembers = useCallback(async (profileId: string): Promise<ProfileMember[]> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile?.sharedProfileId || !supabaseReady) {
      if (profile?.ownerId) {
        return [{
          profile_id: profileId,
          user_id: profile.ownerId,
          role: 'owner' as const,
          display_name: profile.ownerId === userId ? (displayName || 'You') : 'Owner',
          joined_at: profile.createdAt,
        }];
      }
      return [];
    }

    const members = await getProfileMembers(profile.sharedProfileId);
    return members;
  }, [profiles, supabaseReady, userId, displayName]);

  const removeProfileMember = useCallback(async (profileId: string, memberUserId: string): Promise<boolean> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile?.sharedProfileId || !supabaseReady) return false;
    return removeMember(profile.sharedProfileId, memberUserId);
  }, [profiles, supabaseReady]);

  const refreshInviteCode = useCallback(async (profileId: string): Promise<string | null> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return null;

    if (profile.sharedProfileId && supabaseReady) {
      const newCode = await regenerateInviteCode(profile.sharedProfileId);
      if (newCode) {
        const localProfiles = queryClient.getQueryData<GoalkeeperProfile[]>(['goalkeeper-profiles-local']) ?? [];
        const updated = localProfiles.map(p => p.id === profileId ? { ...p, inviteCode: newCode } : p);
        queryClient.setQueryData(['goalkeeper-profiles-local'], updated);
        localSaveMutation.mutate(updated);
        setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, inviteCode: newCode } : p));
        return newCode;
      }
    }

    const newCode = encodeShareCode({
      name: profile.name,
      birthYear: profile.birthYear ?? '',
      sourceId: userId || profileId,
    });

    const localProfiles = queryClient.getQueryData<GoalkeeperProfile[]>(['goalkeeper-profiles-local']) ?? [];
    const updated = localProfiles.map(p => p.id === profileId ? { ...p, inviteCode: newCode } : p);
    queryClient.setQueryData(['goalkeeper-profiles-local'], updated);
    localSaveMutation.mutate(updated);
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, inviteCode: newCode } : p));
    return newCode;
  }, [userId, profiles, supabaseReady, queryClient, localSaveMutation]);

  const getRole = useCallback(async (profileId: string): Promise<'owner' | 'editor' | null> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return null;

    if (profile.sharedProfileId && supabaseReady && userId) {
      const role = await getUserRole(profile.sharedProfileId, userId);
      if (role) return role;
    }

    if (profile.ownerId === userId) return 'owner';
    return 'editor';
  }, [userId, profiles, supabaseReady]);

  const getLastEditedByName = useCallback((editedByUserId: string | undefined): string => {
    if (!editedByUserId) return '';
    if (editedByUserId === userId) return 'you';
    return 'another editor';
  }, [userId]);

  const refreshProfiles = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['goalkeeper-profiles-local'] });
  }, [queryClient]);

  const stopSharing = useCallback(async (profileId: string): Promise<boolean> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return false;

    if (profile.sharedProfileId && supabaseReady) {
      const ok = await disableSharingDb(profile.sharedProfileId);
      if (!ok) {
        console.log('[GoalkeeperContext] Failed to disable sharing in Supabase');
        return false;
      }
    }

    const localProfiles = queryClient.getQueryData<GoalkeeperProfile[]>(['goalkeeper-profiles-local']) ?? [];
    const updated = localProfiles.map(p =>
      p.id === profileId
        ? { ...p, isShared: false, sharedProfileId: undefined, inviteCode: undefined, updatedAt: new Date().toISOString() }
        : p
    );
    queryClient.setQueryData(['goalkeeper-profiles-local'], updated);
    localSaveMutation.mutate(updated);
    setProfiles(prev => prev.map(p =>
      p.id === profileId
        ? { ...p, isShared: false, sharedProfileId: undefined, inviteCode: undefined, updatedAt: new Date().toISOString() }
        : p
    ));

    console.log('[GoalkeeperContext] Stopped sharing profile:', profileId);
    return true;
  }, [profiles, supabaseReady, queryClient, localSaveMutation]);

  const leaveSharedProfile = useCallback(async (profileId: string): Promise<boolean> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return false;

    if (profile.sharedProfileId && supabaseReady && userId) {
      const ok = await leaveProfileDb(profile.sharedProfileId, userId);
      if (!ok) {
        console.log('[GoalkeeperContext] Failed to leave profile in Supabase');
        return false;
      }
    }

    const localProfiles = queryClient.getQueryData<GoalkeeperProfile[]>(['goalkeeper-profiles-local']) ?? [];
    const updated = localProfiles.filter(p => p.id !== profileId);
    queryClient.setQueryData(['goalkeeper-profiles-local'], updated);
    localSaveMutation.mutate(updated);
    setProfiles(prev => prev.filter(p => p.id !== profileId));

    AsyncStorage.removeItem(`gk_tracker_games_${profileId}`).catch(console.log);
    AsyncStorage.removeItem(`gk_tracker_teams_${profileId}`).catch(console.log);

    console.log('[GoalkeeperContext] Left shared profile:', profileId);
    return true;
  }, [profiles, supabaseReady, userId, queryClient, localSaveMutation]);

  const syncProfileData = useCallback(async (profileId: string): Promise<boolean> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile?.sharedProfileId || !supabaseReady) {
      console.log('[GoalkeeperContext] Cannot sync - no sharedProfileId or Supabase not ready');
      return false;
    }

    try {
      const { downloadAllProfileData } = await import('@/lib/sync');
      const cloudData = await downloadAllProfileData(profile.sharedProfileId);
      if (!cloudData) return false;

      if (cloudData.teams.length > 0) {
        await AsyncStorage.setItem(`gk_tracker_teams_${profileId}`, JSON.stringify(cloudData.teams));
        void queryClient.invalidateQueries({ queryKey: ['teams'] });
      }
      if (cloudData.games.length > 0) {
        await AsyncStorage.setItem(`gk_tracker_games_${profileId}`, JSON.stringify(cloudData.games));
        void queryClient.invalidateQueries({ queryKey: ['games'] });
      }

      console.log('[GoalkeeperContext] Synced data from cloud for profile:', profileId);
      return true;
    } catch (e) {
      console.log('[GoalkeeperContext] Sync error:', e);
      return false;
    }
  }, [profiles, supabaseReady, queryClient]);

  return useMemo(() => ({
    profiles,
    isLoading: localQuery.isLoading,
    activeProfile,
    activeProfileId,
    isGuest,
    supabaseReady,
    userId,
    createProfile,
    renameProfile,
    updateProfile,
    deleteProfile,
    selectProfile,
    selectGuest,
    clearSelection,
    joinByCode,
    getMembers,
    removeProfileMember,
    refreshInviteCode,
    getRole,
    getLastEditedByName,
    convertToShared,
    refreshProfiles,
    syncProfileData,
    stopSharing,
    leaveSharedProfile,
  }), [
    profiles, localQuery.isLoading,
    activeProfile, activeProfileId, isGuest, supabaseReady, userId,
    createProfile, renameProfile, updateProfile, deleteProfile,
    selectProfile, selectGuest, clearSelection,
    joinByCode, getMembers, removeProfileMember, refreshInviteCode,
    getRole, getLastEditedByName, convertToShared, refreshProfiles,
    syncProfileData, stopSharing, leaveSharedProfile,
  ]);
});
