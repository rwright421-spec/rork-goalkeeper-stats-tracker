import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';

let Purchases: any = null;
let rcConfigured = false;

const ENTITLEMENT_ID = 'pro';

function getRCApiKey(): string | null {
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  const testKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;

  if (Platform.OS === 'ios' && iosKey) return iosKey;
  if (Platform.OS === 'android' && androidKey) return androidKey;
  if (testKey) return testKey;
  return null;
}

async function configureRC() {
  if (rcConfigured || Platform.OS === 'web') return;
  const apiKey = getRCApiKey();
  if (!apiKey) {
    console.log('[RevenueCat] No API key configured, skipping initialization');
    return;
  }
  try {
    const mod = await import('react-native-purchases');
    Purchases = mod.default;
    Purchases.configure({ apiKey });
    rcConfigured = true;
    console.log('[RevenueCat] Configured successfully');
  } catch (e) {
    console.log('[RevenueCat] Configuration failed:', e);
  }
}

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [currentOffering, setCurrentOffering] = useState<any>(null);

  const checkEntitlementFromInfo = useCallback((info: any) => {
    const entitlement = info.entitlements.active[ENTITLEMENT_ID];
    const hasPro = !!entitlement;
    setIsPro(hasPro);
    return hasPro;
  }, []);

  const initAndFetchOfferings = useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      await configureRC();

      if (!Purchases || !rcConfigured) {
        console.log('[RevenueCat] Not configured, skipping fetch');
        return null;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      checkEntitlementFromInfo(customerInfo);

      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setCurrentOffering(offerings.current);
      }
      return offerings.current ?? null;
    } catch (e) {
      console.log('[RevenueCat] Error fetching offerings:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [checkEntitlementFromInfo]);

  const purchasePackage = useCallback(async (pkg: any) => {
    if (!Purchases || !rcConfigured) {
      Alert.alert('Not Available', 'Purchases are not configured.');
      return false;
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasPro = checkEntitlementFromInfo(customerInfo);
      if (hasPro) {
        Alert.alert('Welcome to Pro!', 'You now have unlimited access to all features.');
      }
      return hasPro;
    } catch (e: any) {
      if (e.userCancelled) {
        // User cancelled
      } else {
        console.log('[RevenueCat] Purchase error:', e);
        Alert.alert('Purchase Error', 'Something went wrong. Please try again.');
      }
      return false;
    }
  }, [checkEntitlementFromInfo]);

  const restorePurchases = useCallback(async () => {
    if (Platform.OS === 'web' || !Purchases || !rcConfigured) {
      Alert.alert('Not Available', 'Restore is not available.');
      return;
    }
    setIsRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasPro = checkEntitlementFromInfo(customerInfo);
      if (hasPro) {
        Alert.alert('Restored!', 'Your Pro subscription has been restored.');
      } else {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
      }
    } catch (e) {
      console.log('[RevenueCat] Restore error:', e);
      Alert.alert('Restore Error', 'Something went wrong while restoring. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }, [checkEntitlementFromInfo]);

  useEffect(() => {
    initAndFetchOfferings();
  }, [initAndFetchOfferings]);

  return useMemo(() => ({
    isPro,
    isLoading,
    currentOffering,
    checkEntitlement: initAndFetchOfferings,
    restorePurchases,
    isRestoring,
    initAndFetchOfferings,
    purchasePackage,
    rcAvailable: rcConfigured,
  }), [isPro, isLoading, currentOffering, restorePurchases, isRestoring, initAndFetchOfferings, purchasePackage]);
});
