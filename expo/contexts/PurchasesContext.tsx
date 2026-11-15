import { useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';

// RevenueCat has been removed: the app is free for everyone.
// This context keeps its previous shape so existing screens keep working.
// Every paid gate reads `isPro`, which is always true.

const noopAsync = async (): Promise<boolean> => false;

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const isPro = true;

  const setDevProOverride = useCallback(async (_value: boolean): Promise<void> => {}, []);
  const checkEntitlement = useCallback(async (): Promise<void> => {}, []);
  const initAndFetchOfferings = useCallback(async (): Promise<null> => null, []);
  const purchaseMonthly = useCallback(noopAsync, []);
  const purchaseAnnual = useCallback(noopAsync, []);
  const purchasePackage = useCallback(async (_pkg: unknown): Promise<boolean> => false, []);
  const restorePurchases = useCallback(noopAsync, []);

  return useMemo(() => ({
    isPro,
    rcIsPro: false,
    devProOverride: false,
    setDevProOverride,
    isLoading: false,
    isRestoring: false,
    offerings: null,
    currentOffering: null,
    purchaseMonthly,
    purchaseAnnual,
    purchasePackage,
    restorePurchases,
    checkEntitlement,
    initAndFetchOfferings,
    rcAvailable: false,
    rcLastError: null as string | null,
    rcCurrentOfferingId: null as string | null,
    rcOfferingCount: 0,
    rcPackageIds: [] as string[],
    rcAppUserId: null as string | null,
  }), [
    isPro,
    setDevProOverride,
    purchaseMonthly,
    purchaseAnnual,
    purchasePackage,
    restorePurchases,
    checkEntitlement,
    initAndFetchOfferings,
  ]);
});
