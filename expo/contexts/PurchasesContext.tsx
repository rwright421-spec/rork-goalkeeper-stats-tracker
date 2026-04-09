import { useEffect, useState, useCallback, useMemo } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

function getRCApiKey(): string {
  if (__DEV__ || Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '';
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '',
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '',
  }) as string;
}

const rcApiKey = getRCApiKey();

if (rcApiKey) {
  try {
    Purchases.configure({ apiKey: rcApiKey });
    console.log('[PurchasesContext] RevenueCat configured with key:', rcApiKey.substring(0, 8) + '...');
  } catch (e) {
    console.log('[PurchasesContext] RevenueCat configure error:', e);
  }
} else {
  console.log('[PurchasesContext] No RevenueCat API key found, skipping configuration');
}

async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  if (!rcApiKey) return null;
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
  if (!rcApiKey) return null;
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
    if (!rcApiKey) return;
    const listener = (info: CustomerInfo) => {
      const proActive = !!info.entitlements.active['pro'];
      console.log('[PurchasesContext] Customer info updated via listener, isPro:', proActive);
      setIsPro(proActive);
      queryClient.setQueryData(['customerInfo'], info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [queryClient]);

  const checkEntitlement = useCallback(async () => {
    console.log('[PurchasesContext] Manually checking entitlement');
    await queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
  }, [queryClient]);

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!rcApiKey) throw new Error('RevenueCat not configured');
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
