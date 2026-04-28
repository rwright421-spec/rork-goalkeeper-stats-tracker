import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import * as secureStorage from '@/utils/secureStorage';

const RC_API_KEY = 'appl_IUuybOStRXqZRjspTXWwGuwjfLn';
const PRO_ENTITLEMENT_ID = 'pro';
const MONTHLY_PRODUCT_ID = 'com.snocoventures.gkstats.pro.monthly.v2';
const ANNUAL_PRODUCT_ID = 'com.snocoventures.gkstats.pro.annual.v2';
const DEV_PRO_OVERRIDE_KEY = 'gk_dev_pro_override';

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const [rcIsPro, setRcIsPro] = useState<boolean>(false);
  const [devProOverride, setDevProOverrideState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [rcAvailable, setRcAvailable] = useState<boolean>(false);
  const [rcLastError, setRcLastError] = useState<string | null>(null);
  const [rcCurrentOfferingId, setRcCurrentOfferingId] = useState<string | null>(null);
  const [rcOfferingCount, setRcOfferingCount] = useState<number>(0);
  const [rcPackageIds, setRcPackageIds] = useState<string[]>([]);
  const [rcAppUserId, setRcAppUserId] = useState<string | null>(null);
  const configuredRef = useRef<boolean>(false);

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

  const applyCustomerInfo = useCallback((info: CustomerInfo): boolean => {
    const isActive = !!info.entitlements.active[PRO_ENTITLEMENT_ID];
    setRcIsPro(isActive);
    return isActive;
  }, []);

  const checkEntitlement = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'ios') return;
    try {
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);
    } catch (e: any) {
      console.error('RevenueCat entitlement check failed:', e);
      setRcLastError(`getCustomerInfo: ${e?.message ?? String(e)}`);
    }
  }, [applyCustomerInfo]);

  const fetchOfferings = useCallback(async (): Promise<PurchasesOffering | null> => {
    if (Platform.OS !== 'ios') return null;
    try {
      const offerings = await Purchases.getOfferings();
      const allCount = Object.keys(offerings.all ?? {}).length;
      setRcOfferingCount(allCount);
      setRcCurrentOfferingId(offerings.current?.identifier ?? null);
      const pkgIds: string[] = offerings.current?.availablePackages?.map(
        (p: PurchasesPackage) => p.product.identifier,
      ).filter(Boolean) ?? [];
      setRcPackageIds(pkgIds);
      const current = offerings.current ?? null;
      setCurrentOffering(current);
      if (!current) {
        setRcLastError(prev => prev ?? `No current offering (offerings.all has ${allCount} entries)`);
      }
      return current;
    } catch (e: any) {
      console.error('[RevenueCat] getOfferings failed:', e);
      setRcLastError(`getOfferings: ${e?.message ?? String(e)}`);
      return null;
    }
  }, []);

  const initAndFetchOfferings = useCallback(async (): Promise<PurchasesOffering | null> => {
    if (Platform.OS !== 'ios') {
      setIsLoading(false);
      return null;
    }
    try {
      setIsLoading(true);
      setRcLastError(null);
      if (!configuredRef.current) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.configure({ apiKey: RC_API_KEY });
        configuredRef.current = true;
        setRcAvailable(true);
        Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
          applyCustomerInfo(info);
        });
      }
      try {
        const appUserId = await Purchases.getAppUserID();
        setRcAppUserId(appUserId ?? null);
      } catch (e) {
        console.log('[RevenueCat] getAppUserID failed:', e);
      }
      await checkEntitlement();
      return await fetchOfferings();
    } catch (e: any) {
      console.error('[RevenueCat] init failed:', e);
      setRcLastError(`init: ${e?.message ?? String(e)}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [applyCustomerInfo, checkEntitlement, fetchOfferings]);

  useEffect(() => {
    void initAndFetchOfferings();
  }, [initAndFetchOfferings]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'Purchases are only available on iOS.');
      return false;
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isActive = applyCustomerInfo(customerInfo);
      if (isActive) {
        Alert.alert('Welcome to Pro!', 'You now have unlimited access to all features.');
      }
      return isActive;
    } catch (e: any) {
      if (!e?.userCancelled) {
        console.error('Purchase error:', e);
        Alert.alert('Purchase Error', 'Something went wrong. Please try again.');
      }
      return false;
    }
  }, [applyCustomerInfo]);

  const purchaseByProductId = useCallback(async (productId: string): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.find(
        (p: PurchasesPackage) => p.product.identifier === productId,
      );
      if (!pkg) throw new Error(`Package not found: ${productId}`);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isActive = applyCustomerInfo(customerInfo);
      return isActive;
    } catch (e: any) {
      if (!e?.userCancelled) {
        console.error('Purchase error:', e);
      }
      return false;
    }
  }, [applyCustomerInfo]);

  const purchaseMonthly = useCallback(
    () => purchaseByProductId(MONTHLY_PRODUCT_ID),
    [purchaseByProductId],
  );

  const purchaseAnnual = useCallback(
    () => purchaseByProductId(ANNUAL_PRODUCT_ID),
    [purchaseByProductId],
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'Restore is not available on this platform.');
      return false;
    }
    setIsRestoring(true);
    try {
      const info = await Purchases.restorePurchases();
      const isActive = applyCustomerInfo(info);
      if (isActive) {
        Alert.alert('Restored!', 'Your Pro subscription has been restored.');
      } else {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
      }
      return isActive;
    } catch (e) {
      console.error('Restore failed:', e);
      Alert.alert('Restore Error', 'Something went wrong while restoring. Please try again.');
      return false;
    } finally {
      setIsRestoring(false);
    }
  }, [applyCustomerInfo]);

  return useMemo(() => ({
    isPro,
    rcIsPro,
    devProOverride,
    setDevProOverride,
    isLoading,
    isRestoring,
    offerings: currentOffering,
    currentOffering,
    purchaseMonthly,
    purchaseAnnual,
    purchasePackage,
    restorePurchases,
    checkEntitlement,
    initAndFetchOfferings,
    rcAvailable,
    rcLastError,
    rcCurrentOfferingId,
    rcOfferingCount,
    rcPackageIds,
    rcAppUserId,
  }), [
    isPro,
    rcIsPro,
    devProOverride,
    setDevProOverride,
    isLoading,
    isRestoring,
    currentOffering,
    purchaseMonthly,
    purchaseAnnual,
    purchasePackage,
    restorePurchases,
    checkEntitlement,
    initAndFetchOfferings,
    rcAvailable,
    rcLastError,
    rcCurrentOfferingId,
    rcOfferingCount,
    rcPackageIds,
    rcAppUserId,
  ]);
});
