import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import { Alert, Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import Purchases, { PurchasesOffering, CustomerInfo } from 'react-native-purchases';

const RC_API_KEY = 'appl_tHhrbyQZcKyEfWVYDxxyxYaZGra';
const ENTITLEMENT_ID = 'pro';

let rcConfigured = false;

function configureRC() {
  if (rcConfigured) return;
  try {
    Purchases.configure({ apiKey: RC_API_KEY });
    rcConfigured = true;
  } catch (e) {
    Sentry.captureException(e);
  }
}

if (Platform.OS !== 'web') {
  configureRC();
}

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);

  const checkEntitlementFromInfo = useCallback((info: CustomerInfo) => {
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
      configureRC();

      const customerInfo = await Purchases.getCustomerInfo();
      checkEntitlementFromInfo(customerInfo);

      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setCurrentOffering(offerings.current);
      }
      return offerings.current ?? null;
    } catch (e) {
      Sentry.captureException(e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [checkEntitlementFromInfo]);

  const purchasePackage = useCallback(async (pkg: any) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasPro = checkEntitlementFromInfo(customerInfo);
      if (hasPro) {
        Alert.alert('Welcome to Pro!', 'You now have unlimited access to all features.');
      }
      return hasPro;
    } catch (e: any) {
      if (e.userCancelled) {
        // User cancelled — no action needed
      } else {
        Sentry.captureException(e);
        Alert.alert('Purchase Error', 'Something went wrong. Please try again.');
      }
      return false;
    }
  }, [checkEntitlementFromInfo]);

  const restorePurchases = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Restore is not available on web.');
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
      Sentry.captureException(e);
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
