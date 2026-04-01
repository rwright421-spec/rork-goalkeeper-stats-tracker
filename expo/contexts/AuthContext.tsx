import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const USER_ID_KEY = 'gk_device_user_id';
const DISPLAY_NAME_KEY = 'gk_device_display_name';

function generateUserId(): string {
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

async function loadUserIdentity(): Promise<{ userId: string; displayName: string }> {
  try {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = generateUserId();
      await AsyncStorage.setItem(USER_ID_KEY, userId);
      console.log('[Auth] Generated new user ID:', userId);
    }
    const displayName = (await AsyncStorage.getItem(DISPLAY_NAME_KEY)) || '';
    console.log('[Auth] Loaded identity - userId:', userId, 'displayName:', displayName);
    return { userId, displayName };
  } catch (e) {
    console.log('[Auth] Error loading identity:', e);
    const fallback = generateUserId();
    return { userId: fallback, displayName: '' };
  }
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [userId, setUserId] = useState<string>('');
  const [displayName, setDisplayNameState] = useState<string>('');

  const identityQuery = useQuery({
    queryKey: ['device-identity'],
    queryFn: loadUserIdentity,
  });

  useEffect(() => {
    if (identityQuery.data) {
      setUserId(identityQuery.data.userId);
      setDisplayNameState(identityQuery.data.displayName);
    }
  }, [identityQuery.data]);

  const saveNameMutation = useMutation({
    mutationFn: async (name: string) => {
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, name);
      return name;
    },
  });

  const setDisplayName = useCallback((name: string) => {
    setDisplayNameState(name);
    saveNameMutation.mutate(name);
  }, [saveNameMutation]);

  return useMemo(() => ({
    userId,
    displayName,
    setDisplayName,
    isReady: !!userId,
  }), [userId, displayName, setDisplayName]);
});
