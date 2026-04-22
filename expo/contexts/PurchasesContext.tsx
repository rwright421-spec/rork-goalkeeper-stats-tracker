import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import * as secureStorage from '@/utils/secureStorage';

let Purchases: any = null;
let rcConfigured = false;
let rcConfigureError: string | null = null;

const ENTITLEMENT_ID = 'pro';
const DEV_PRO_OVERRIDE_KEY = 'gk_dev_pro_override';

function getRCApiKey(): string | null {
  if (Platform.OS === 'ios') return 'appl_tHhrbyQZcKyEfWVYDxxyxYaZGra';
  return null;
}

async function configureRC() {
  if (rcConfigured || Platform.OS === 'web') return;
  const apiKey = getRCApiKey();
  if (!apiKey) {
    rcConfigureError = 'No API key configured';
    console.log('[RevenueCat] No API key configured, skipping initialization');
    return;
  }
  try {
    const mod = await import('react-native-purchases');
    Purchases = mod.default;
    Purchases.configure({ apiKey });
    rcConfigured = true;
    rcConfigureError = null;
    console.log('[RevenueCat] Configured successfully');
  } catch (e: any) {
    rcConfigureError = e?.message ?? String(e);
    console.log('[RevenueCat] Configuration failed:', e);
  }
}

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const [rcIsPro, setRcIsPro] = useState<boolean>(false);
  const [devProOverride, setDevProOverrideState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [currentOffering, setCurrentOffering] = useState<any>(null);
  const [rcLastError, setRcLastError] = useState<string | null>(null);
  const [rcCurrentOfferingId, setRcCurrentOfferingId] = useState<string | null>(null);
  const [rcOfferingCount, setRcOfferingCount] = useState<number>(0);
  const [rcPackageIds, setRcPackageIds] = useState<string[]>([]);
  const [rcAppUserId, setRcAppUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await secureStorage.getRawString(DEV_PRO_OVERRIDE_KEY);
        setDevProOverrideState(raw === '1');
      } catch (e) {
        console.log('[RevenueCat] Failed to load dev override:', e);
      }
    })();
  }, []);

  const setDevProOverride = useCallback(async (value: boolean) => {
    setDevProOverrideState(value);
    try {
      await secureStorage.setRawString(DEV_PRO_OVERRIDE_KEY, value ? '1' : '0');
    } catch (e) {
      console.log('[RevenueCat] Failed to persist dev override:', e);
    }
  }, []);

  const isPro = rcIsPro || devProOverride;

  const checkEntitlementFromInfo = useCallback((info: any) => {
    try {
      const entitlement = info?.entitlements?.active?.[ENTITLEMENT_ID];
      const hasPro = !!entitlement;
      setRcIsPro(hasPro);
      return hasPro;
    } catch (e) {
      console.log('[RevenueCat] Error checking entitlements:', e);
      setRcIsPro(false);
      return false;
    }
  }, []);

  const initAndFetchOfferings = useCallback(async (forceRetry = false) => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      setRcLastError(null);
      await configureRC();

      if (!Purchases || !rcConfigured) {
        const msg = rcConfigureError ?? 'SDK not configured';
        setRcLastError(msg);
        console.log('[RevenueCat] Not configured, skipping fetch.', msg);
        return null;
      }

      try {
        const appUserId = await Purchases.getAppUserID();
        setRcAppUserId(appUserId ?? null);
      } catch (e: any) {
        console.log('[RevenueCat] Error fetching appUserId:', e);
      }

      try {
        const customerInfo = await Purchases.getCustomerInfo();
        checkEntitlementFromInfo(customerInfo);
      } catch (infoErr: any) {
        const msg = infoErr?.message ?? String(infoErr);
        setRcLastError(`getCustomerInfo: ${msg}`);
        console.log('[RevenueCat] Error fetching customer info:', infoErr);
      }

      try {
        const offerings = await Purchases.getOfferings();
        const allCount = Object.keys(offerings?.all ?? {}).length;
        setRcOfferingCount(allCount);
        setRcCurrentOfferingId(offerings?.current?.identifier ?? null);
        const pkgIds: string[] = offerings?.current?.availablePackages?.map(
          (p: any) => p?.product?.identifier
        ).filter(Boolean) ?? [];
        setRcPackageIds(pkgIds);
        if (offerings?.current) {
          setCurrentOffering(offerings.current);
        } else {
          setRcLastError(prev => prev ?? `No current offering (offerings.all has ${allCount} entries)`);
        }
        return offerings?.current ?? null;
      } catch (offerErr: any) {
        const msg = offerErr?.message ?? String(offerErr);
        setRcLastError(`getOfferings: ${msg}`);
        console.log('[RevenueCat] Error fetching offerings:', offerErr);
        return null;
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setRcLastError(`init: ${msg}`);
      console.log('[RevenueCat] Error in initAndFetchOfferings:', e);
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
    rcIsPro,
    devProOverride,
    setDevProOverride,
    isLoading,
    currentOffering,
    checkEntitlement: initAndFetchOfferings,
    restorePurchases,
    isRestoring,
    initAndFetchOfferings,
    purchasePackage,
    rcAvailable: rcConfigured,
    rcLastError,
    rcCurrentOfferingId,
    rcOfferingCount,
    rcPackageIds,
    rcAppUserId,
  }), [isPro, rcIsPro, devProOverride, setDevProOverride, isLoading, currentOffering, restorePurchases, isRestoring, initAndFetchOfferings, purchasePackage, rcLastError, rcCurrentOfferingId, rcOfferingCount, rcPackageIds, rcAppUserId]);
});
