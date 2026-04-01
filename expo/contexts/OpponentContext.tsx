import { useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const OPPONENTS_KEY = 'gk_tracker_opponents';

async function loadOpponents(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(OPPONENTS_KEY);
    if (stored) {
      return JSON.parse(stored) as string[];
    }
    return [];
  } catch (e) {
    console.log('[OpponentContext] Error loading opponents:', e);
    return [];
  }
}

async function persistOpponents(opponents: string[]): Promise<string[]> {
  await AsyncStorage.setItem(OPPONENTS_KEY, JSON.stringify(opponents));
  return opponents;
}

function deduplicateAdd(existing: string[], newName: string): string[] {
  const trimmed = newName.trim();
  if (!trimmed) return existing;
  const alreadyExists = existing.some(
    (o) => o.toLowerCase() === trimmed.toLowerCase()
  );
  if (alreadyExists) return existing;
  return [...existing, trimmed].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}

export const [OpponentProvider, useOpponents] = createContextHook(() => {
  const queryClient = useQueryClient();

  const opponentsQuery = useQuery({
    queryKey: ['opponents'],
    queryFn: loadOpponents,
  });

  const opponents = useMemo(() => opponentsQuery.data ?? [], [opponentsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: persistOpponents,
    onSuccess: (data) => {
      queryClient.setQueryData(['opponents'], data);
    },
  });

  const addOpponent = useCallback(
    (name: string) => {
      const current = queryClient.getQueryData<string[]>(['opponents']) ?? [];
      const updated = deduplicateAdd(current, name);
      if (updated.length === current.length) return;
      queryClient.setQueryData(['opponents'], updated);
      saveMutation.mutate(updated);
      console.log('[OpponentContext] Added opponent:', name.trim());
    },
    [queryClient, saveMutation]
  );

  const removeOpponent = useCallback(
    (name: string) => {
      const current = queryClient.getQueryData<string[]>(['opponents']) ?? [];
      const updated = current.filter(
        (o) => o.toLowerCase() !== name.toLowerCase()
      );
      queryClient.setQueryData(['opponents'], updated);
      saveMutation.mutate(updated);
      console.log('[OpponentContext] Removed opponent:', name);
    },
    [queryClient, saveMutation]
  );

  const getSuggestions = useCallback(
    (query: string): string[] => {
      const trimmed = query.trim().toLowerCase();
      if (!trimmed) return [];
      return opponents.filter((o) => o.toLowerCase().includes(trimmed));
    },
    [opponents]
  );

  return useMemo(
    () => ({
      opponents,
      isLoading: opponentsQuery.isLoading,
      addOpponent,
      removeOpponent,
      getSuggestions,
    }),
    [opponents, opponentsQuery.isLoading, addOpponent, removeOpponent, getSuggestions]
  );
});
