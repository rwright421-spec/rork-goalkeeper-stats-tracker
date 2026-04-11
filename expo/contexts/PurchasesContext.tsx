import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRO_STATUS_KEY = 'gk_pro_status';

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [currentOffering, setCurrentOffering] = useState<any>(null);
  const [rcAvailable] = useState<boolean>(false);

  const initAndFetchOfferings = useCallback(async () => {
    console.log('[PurchasesContext] Purchases not available (native module removed for iOS 26 compatibility)');
    return null;
  }, []);

  const checkEntitlement = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(PRO_STATUS_KEY);
      if (stored === 'true') {
        setIsPro(true);
      }
    } catch (e) {
      console.log('[PurchasesContext] Error checking entitlement:', e);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    setIsRestoring(true);
    try {
      Alert.alert(
        'Restore Unavailable',
        'In-app purchases are being updated for compatibility. Please check back in a future update.'
      );
    } finally {
      setIsRestoring(false);
    }
  }, []);

  return useMemo(() => ({
    isPro,
    isLoading,
    currentOffering,
    checkEntitlement,
    restorePurchases,
    isRestoring,
    initAndFetchOfferings,
    rcAvailable,
  }), [isPro, isLoading, currentOffering, checkEntitlement, restorePurchases, isRestoring, initAndFetchOfferings, rcAvailable]);
});
