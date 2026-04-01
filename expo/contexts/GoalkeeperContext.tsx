import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { GoalkeeperProfile } from '@/types/game';
import { useAuth } from '@/contexts/AuthContext';

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
  const { userId } = useAuth();
  const [profiles, setProfiles] = useState<GoalkeeperProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);


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

  const refreshProfiles = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['goalkeeper-profiles-local'] });
  }, [queryClient]);

  return useMemo(() => ({
    profiles,
    isLoading: localQuery.isLoading,
    activeProfile,
    activeProfileId,
    isGuest,
    userId,
    createProfile,
    renameProfile,
    updateProfile,
    deleteProfile,
    selectProfile,
    selectGuest,
    clearSelection,
    refreshProfiles,
  }), [
    profiles, localQuery.isLoading,
    activeProfile, activeProfileId, isGuest, userId,
    createProfile, renameProfile, updateProfile, deleteProfile,
    selectProfile, selectGuest, clearSelection,
    refreshProfiles,
  ]);
});
