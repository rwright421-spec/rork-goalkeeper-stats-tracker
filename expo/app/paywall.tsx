import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { X, Shield, Check, Crown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { usePurchases } from '@/contexts/PurchasesContext';

type PlanType = 'annual' | 'monthly';

const PRODUCT_IDS = {
  monthly: 'com.snocoventures.gkstats.pro.monthly',
  annual: 'com.snocoventures.gkstats.pro.annual',
} as const;

const FEATURES = [
  'Unlimited games',
  'Unlimited goalkeeper profiles',
  'Unlimited teams',
  'Advanced stats: GAA, 1v1 Save Rate & more',
];

const PRIVACY_URL = 'https://smiling-gorgonzola-c76.notion.site/Privacy-Policy-a70ef03840ca4301b83bb7a302c070fa?pvs=74';

export default function PaywallScreen() {
  console.log('[Paywall] Screen rendered');
  const router = useRouter();
  const colors = useColors();
  const { checkEntitlement, restorePurchases, isRestoring, currentOffering, initAndFetchOfferings, isLoading: isLoadingOfferings, rcAvailable } = usePurchases();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [initAttempted, setInitAttempted] = useState(false);

  useEffect(() => {
    console.log('[Paywall] Lazily initializing RevenueCat on paywall open');
    initAndFetchOfferings().finally(() => setInitAttempted(true));
  }, [initAndFetchOfferings]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleClose = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleSelectPlan = useCallback((plan: PlanType) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  }, []);

  const handlePurchase = useCallback(async () => {
    if (!rcAvailable) {
      Alert.alert('Unavailable', 'Subscriptions are temporarily unavailable. Please try again later.');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPurchasing(true);
    try {
      const productId = PRODUCT_IDS[selectedPlan];
      console.log('[Paywall] Attempting purchase for product:', productId);

      let PurchasesModule: any;
      try {
        PurchasesModule = require('react-native-purchases').default;
      } catch (e) {
        console.log('[Paywall] Cannot load react-native-purchases:', e);
        Alert.alert('Unavailable', 'Purchases are not available on this platform.');
        return;
      }

      if (currentOffering) {
        const pkg = currentOffering.availablePackages?.find(
          (p: any) => p.product.identifier === productId
        );
        if (pkg) {
          const { customerInfo } = await PurchasesModule.purchasePackage(pkg);
          if (customerInfo?.entitlements?.active?.['pro']) {
            console.log('[Paywall] Purchase successful, pro entitlement active');
            await checkEntitlement();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Welcome to Pro!', 'You now have unlimited access to all features.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
            return;
          }
        }
      }

      const products = await PurchasesModule.getProducts([productId]);
      if (products && products.length > 0) {
        const { customerInfo } = await PurchasesModule.purchaseStoreProduct(products[0]);
        if (customerInfo?.entitlements?.active?.['pro']) {
          console.log('[Paywall] Purchase successful via direct product');
          await checkEntitlement();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Welcome to Pro!', 'You now have unlimited access to all features.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
      }

      console.log('[Paywall] Product not found:', productId);
      Alert.alert('Error', 'Unable to find the product. Please try again later.');
    } catch (e: any) {
      if (e?.userCancelled) {
        console.log('[Paywall] User cancelled purchase');
        return;
      }
      console.log('[Paywall] Purchase error:', e);
      Alert.alert('Purchase Error', 'Something went wrong. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  }, [selectedPlan, currentOffering, checkEntitlement, router, rcAvailable]);

  const handleRestore = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await restorePurchases();
  }, [restorePurchases]);

  const handlePrivacy = useCallback(() => {
    void Linking.openURL(PRIVACY_URL);
  }, []);

  const captionText = selectedPlan === 'annual'
    ? 'Then $14.99/year. Cancel anytime.'
    : 'Then $2.99/month. Cancel anytime.';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TouchableOpacity
          testID="paywall-close"
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerSection}>
          <View style={styles.shieldContainer}>
            <Shield size={52} color={colors.primary} />
          </View>
          <Text style={styles.headline}>Unlock GK Stats Pro</Text>
          <Text style={styles.subheadline}>Track unlimited games, goalkeepers, and teams.</Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={styles.featureCheckContainer}>
                <Check size={16} color={colors.primary} strokeWidth={3} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {initAttempted && !rcAvailable ? (
          <View style={styles.unavailableBanner}>
            <Text style={styles.unavailableText}>Subscriptions are temporarily unavailable. Please try again later.</Text>
          </View>
        ) : null}

        <View style={styles.trialBadge}>
          <Text style={styles.trialBadgeText}>Start free — 7 days on us</Text>
        </View>

        <View style={styles.planSelector}>
          <TouchableOpacity
            testID="plan-monthly"
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
            onPress={() => handleSelectPlan('monthly')}
            activeOpacity={0.7}
          >
            <Text style={[styles.planLabel, selectedPlan === 'monthly' && styles.planLabelActive]}>Monthly</Text>
            <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceActive]}>$2.99</Text>
            <Text style={[styles.planPeriod, selectedPlan === 'monthly' && styles.planPeriodActive]}>/month</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="plan-annual"
            style={[styles.planCard, selectedPlan === 'annual' && styles.planCardActive]}
            onPress={() => handleSelectPlan('annual')}
            activeOpacity={0.7}
          >
            <View style={styles.bestValueTag}>
              <Crown size={10} color={colors.white} />
              <Text style={styles.bestValueText}>Best Value</Text>
            </View>
            <Text style={[styles.planLabel, selectedPlan === 'annual' && styles.planLabelActive]}>Annual</Text>
            <Text style={[styles.planPrice, selectedPlan === 'annual' && styles.planPriceActive]}>$14.99</Text>
            <Text style={[styles.planPeriod, selectedPlan === 'annual' && styles.planPeriodActive]}>/year</Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Save 58%</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          testID="subscribe-button"
          style={[styles.subscribeButton, (isPurchasing || (initAttempted && !rcAvailable)) && styles.subscribeButtonDisabled]}
          onPress={handlePurchase}
          disabled={isPurchasing || (initAttempted && !rcAvailable)}
          activeOpacity={0.8}
        >
          {isPurchasing ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.subscribeButtonText}>{initAttempted && !rcAvailable ? 'Coming Soon' : 'Try Free for 7 Days'}</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.captionText}>{captionText}</Text>

        <TouchableOpacity
          testID="restore-purchases"
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isRestoring}
          activeOpacity={0.7}
        >
          <Text style={styles.restoreText}>
            {isRestoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handlePrivacy} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}>·</Text>
          <Text style={styles.footerNote}>Recurring billing. Cancel anytime in App Store Settings.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 40,
    },
    closeButton: {
      position: 'absolute' as const,
      top: Platform.OS === 'ios' ? 16 : 8,
      left: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: 28,
      marginTop: 8,
    },
    shieldContainer: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    headline: {
      fontSize: 26,
      fontWeight: '800' as const,
      color: c.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subheadline: {
      fontSize: 15,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    featureList: {
      marginBottom: 20,
      gap: 12,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    featureCheckContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: {
      fontSize: 15,
      color: c.text,
      fontWeight: '500' as const,
      flex: 1,
    },
    trialBadge: {
      backgroundColor: c.primary,
      borderRadius: 24,
      paddingVertical: 10,
      paddingHorizontal: 20,
      alignSelf: 'center',
      marginBottom: 24,
    },
    trialBadgeText: {
      color: c.white,
      fontSize: 15,
      fontWeight: '700' as const,
      textAlign: 'center',
    },
    planSelector: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    planCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: c.border,
    },
    planCardActive: {
      borderColor: c.primary,
      backgroundColor: c.primaryGlow,
    },
    planLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: c.textMuted,
      marginBottom: 6,
    },
    planLabelActive: {
      color: c.text,
    },
    planPrice: {
      fontSize: 24,
      fontWeight: '800' as const,
      color: c.textSecondary,
    },
    planPriceActive: {
      color: c.text,
    },
    planPeriod: {
      fontSize: 13,
      color: c.textMuted,
      fontWeight: '500' as const,
      marginTop: 2,
    },
    planPeriodActive: {
      color: c.textSecondary,
    },
    bestValueTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primary,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      marginBottom: 8,
    },
    bestValueText: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: c.white,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    savingsBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      marginTop: 8,
    },
    savingsText: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: c.primary,
    },
    subscribeButton: {
      backgroundColor: c.primaryDark,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    subscribeButtonDisabled: {
      opacity: 0.6,
    },
    subscribeButtonText: {
      color: c.white,
      fontSize: 17,
      fontWeight: '700' as const,
    },
    captionText: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: 'center',
      marginBottom: 16,
    },
    restoreButton: {
      paddingVertical: 10,
      alignItems: 'center',
      marginBottom: 24,
    },
    restoreText: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '500' as const,
      textDecorationLine: 'underline',
    },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
    },
    footerLink: {
      fontSize: 11,
      color: c.textSecondary,
      textDecorationLine: 'underline',
    },
    footerSeparator: {
      fontSize: 11,
      color: c.textMuted,
    },
    footerNote: {
      fontSize: 11,
      color: c.textMuted,
      textAlign: 'center',
    },
    unavailableBanner: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
      alignItems: 'center',
    },
    unavailableText: {
      fontSize: 13,
      color: '#EF4444',
      fontWeight: '600' as const,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
}
