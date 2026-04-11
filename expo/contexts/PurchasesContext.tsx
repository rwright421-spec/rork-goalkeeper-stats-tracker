import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const RC_TEST_API_KEY = 'test_HcQzwKLIXZlgMxLsPDISZrUZodq';
const RC_IOS_API_KEY = 'test_HcQzwKLIXZlgMxLsPDISZrUZodq';
const RC_ANDROID_API_KEY = 'placeholder_android_not_used';

function getRCApiKey(): string {
  if (Platform.OS === 'web') {
    return '';
  }
  if (__DEV__) {
    return RC_TEST_API_KEY;
  }
  return Platform.select({
    ios: RC_IOS_API_KEY,
    android: RC_ANDROID_API_KEY,
    default: RC_TEST_API_KEY,
  }) as string;
}

let rcConfigured = false;

function ensureConfigured(): boolean {
  if (Platform.OS === 'web') return false;
  if (rcConfigured) return true;

  const key = getRCApiKey();
  if (!key) return false;

  try {
    Purchases.configure({ apiKey: key });
    rcConfigured = true;
    console.log('[PurchasesContext] RevenueCat configured with key:', key.substring(0, 8) + '...');
    return true;
  } catch (e) {
    console.log('[PurchasesContext] RevenueCat configure error:', e);
    return false;
  }
}

async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  if (!ensureConfigured()) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    console.log('[PurchasesContext] Customer info fetched, active entitlements:', Object.keys(info.entitlements.active));
    return info;
  } catch (e) {
    console.log('[PurchasesContext] Error fetching customer info:', e);
    return null;
  }
}

async function fetchOfferings(): Promise<PurchasesOffering | null> {
  if (!ensureConfigured()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    console.log('[PurchasesContext] Offerings fetched:', offerings.current?.identifier);
    return offerings.current ?? null;
  } catch (e) {
    console.log('[PurchasesContext] Error fetching offerings:', e);
    return null;
  }
}

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [isPro, setIsPro] = useState<boolean>(false);
  const configuredRef = useRef(false);

  useEffect(() => {
    if (configuredRef.current) return;
    try {
      const ok = ensureConfigured();
      configuredRef.current = ok;
      console.log('[PurchasesContext] Init in useEffect, configured:', ok);
    } catch (e) {
      console.log('[PurchasesContext] Init error in useEffect:', e);
    }
  }, []);

  const customerInfoQuery = useQuery({
    queryKey: ['customerInfo'],
    queryFn: fetchCustomerInfo,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const offeringsQuery = useQuery({
    queryKey: ['rcOfferings'],
    queryFn: fetchOfferings,
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });

  useEffect(() => {
    if (customerInfoQuery.data) {
      const proActive = !!customerInfoQuery.data.entitlements.active['pro'];
      console.log('[PurchasesContext] Pro entitlement active:', proActive);
      setIsPro(proActive);
    }
  }, [customerInfoQuery.data]);

  useEffect(() => {
    if (Platform.OS === 'web' || !rcConfigured) return;
    const listener = (info: CustomerInfo) => {
      const proActive = !!info.entitlements.active['pro'];
      console.log('[PurchasesContext] Customer info updated via listener, isPro:', proActive);
      setIsPro(proActive);
      queryClient.setQueryData(['customerInfo'], info);
    };
    try {
      Purchases.addCustomerInfoUpdateListener(listener);
      return () => {
        try {
          Purchases.removeCustomerInfoUpdateListener(listener);
        } catch (e) {
          console.log('[PurchasesContext] Error removing listener:', e);
        }
      };
    } catch (e) {
      console.log('[PurchasesContext] Error adding listener:', e);
    }
  }, [queryClient]);

  const checkEntitlement = useCallback(async () => {
    console.log('[PurchasesContext] Manually checking entitlement');
    await queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
  }, [queryClient]);

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!ensureConfigured()) throw new Error('RevenueCat not configured');
      const info = await Purchases.restorePurchases();
      return info;
    },
    onSuccess: (info) => {
      const proActive = !!info.entitlements.active['pro'];
      setIsPro(proActive);
      queryClient.setQueryData(['customerInfo'], info);
      if (proActive) {
        Alert.alert('Restored', 'Your Pro subscription has been restored.');
      } else {
        Alert.alert('No Subscription Found', 'No active subscription was found for this account.');
      }
      console.log('[PurchasesContext] Restore completed, isPro:', proActive);
    },
    onError: (error) => {
      console.log('[PurchasesContext] Restore error:', error);
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
    },
  });

  const restorePurchases = useCallback(async () => {
    restoreMutation.mutate();
  }, [restoreMutation]);

  return useMemo(() => ({
    isPro,
    isLoading: customerInfoQuery.isLoading,
    currentOffering: offeringsQuery.data ?? null,
    checkEntitlement,
    restorePurchases,
    isRestoring: restoreMutation.isPending,
  }), [isPro, customerInfoQuery.isLoading, offeringsQuery.data, checkEntitlement, restorePurchases, restoreMutation.isPending]);
});
