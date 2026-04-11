import { useCallback, useMemo, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const RC_IOS_API_KEY = 'test_HcQzwKLIXZlgMxLsPDISZrUZodq';
const RC_ANDROID_API_KEY = 'placeholder_android_not_used';
const RC_TEST_API_KEY = 'test_HcQzwKLIXZlgMxLsPDISZrUZodq';

let rcConfigured = false;
let PurchasesModule: any = null;

function isValidKey(key: string | undefined | null): boolean {
  if (!key) return false;
  if (key === 'placeholder_android_not_used') return false;
  if (key.length < 10) return false;
  return true;
}

function getRCApiKey(): string {
  if (Platform.OS === 'web') return '';
  if (__DEV__) return RC_TEST_API_KEY;
  return Platform.select({
    ios: RC_IOS_API_KEY,
    android: RC_ANDROID_API_KEY,
    default: RC_TEST_API_KEY,
  }) as string;
}

async function ensureConfiguredLazy(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (rcConfigured && PurchasesModule) return true;

  const key = getRCApiKey();
  if (!isValidKey(key)) {
    console.log('[PurchasesContext] No valid RevenueCat API key, skipping init');
    return false;
  }

  try {
    if (!PurchasesModule) {
      PurchasesModule = require('react-native-purchases').default;
    }
    if (!rcConfigured) {
      PurchasesModule.configure({ apiKey: key });
      rcConfigured = true;
      console.log('[PurchasesContext] RevenueCat configured lazily with key:', key.substring(0, 8) + '...');
    }
    return true;
  } catch (e) {
    console.log('[PurchasesContext] RevenueCat lazy configure error:', e);
    rcConfigured = false;
    PurchasesModule = null;
    return false;
  }
}

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [currentOffering, setCurrentOffering] = useState<any>(null);

  const initAndFetchOfferings = useCallback(async () => {
    if (Platform.OS === 'web') return null;
    setIsLoading(true);
    try {
      const ok = await ensureConfiguredLazy();
      if (!ok || !PurchasesModule) {
        console.log('[PurchasesContext] Cannot fetch offerings, RC not configured');
        return null;
      }

      const info = await PurchasesModule.getCustomerInfo();
      const proActive = !!info?.entitlements?.active?.['pro'];
      setIsPro(proActive);
      console.log('[PurchasesContext] Customer info fetched, isPro:', proActive);

      const offerings = await PurchasesModule.getOfferings();
      const current = offerings?.current ?? null;
      setCurrentOffering(current);
      console.log('[PurchasesContext] Offerings fetched:', current?.identifier);
      return current;
    } catch (e) {
      console.log('[PurchasesContext] Error during lazy init/fetch:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkEntitlement = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const ok = await ensureConfiguredLazy();
      if (!ok || !PurchasesModule) return;
      const info = await PurchasesModule.getCustomerInfo();
      const proActive = !!info?.entitlements?.active?.['pro'];
      console.log('[PurchasesContext] Manual entitlement check, isPro:', proActive);
      setIsPro(proActive);
    } catch (e) {
      console.log('[PurchasesContext] Error checking entitlement:', e);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    if (Platform.OS === 'web') return;
    setIsRestoring(true);
    try {
      const ok = await ensureConfiguredLazy();
      if (!ok || !PurchasesModule) {
        Alert.alert('Unavailable', 'Purchase restoration is not available right now.');
        return;
      }
      const info = await PurchasesModule.restorePurchases();
      const proActive = !!info?.entitlements?.active?.['pro'];
      setIsPro(proActive);
      if (proActive) {
        Alert.alert('Restored', 'Your Pro subscription has been restored.');
      } else {
        Alert.alert('No Subscription Found', 'No active subscription was found for this account.');
      }
      console.log('[PurchasesContext] Restore completed, isPro:', proActive);
    } catch (e) {
      console.log('[PurchasesContext] Restore error:', e);
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
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
  }), [isPro, isLoading, currentOffering, checkEntitlement, restorePurchases, isRestoring, initAndFetchOfferings]);
});
