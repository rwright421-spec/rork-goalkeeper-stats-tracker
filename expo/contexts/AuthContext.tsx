import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react-native';
import * as secureStorage from '@/utils/secureStorage';
import { useQuery, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const USER_ID_KEY = 'gk_device_user_id';
const DISPLAY_NAME_KEY = 'gk_device_display_name';

function generateUserId(): string {
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

async function loadUserIdentity(): Promise<{ userId: string; displayName: string }> {
  try {
    let userId = await secureStorage.getRawString(USER_ID_KEY);
    if (!userId) {
      userId = generateUserId();
      await secureStorage.setRawString(USER_ID_KEY, userId);
    }
    const displayName = (await secureStorage.getRawString(DISPLAY_NAME_KEY)) || '';
    return { userId, displayName };
  } catch (e) {
    Sentry.captureException(e);
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
      await secureStorage.setRawString(DISPLAY_NAME_KEY, name);
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
