import React, { useState, useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react-native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Linking } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { X, Shield, Check, Crown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { usePurchases } from '@/contexts/PurchasesContext';
import { fontSize } from '@/constants/typography';

type PlanType = 'annual' | 'monthly';

const MONTHLY_ID = 'com.snocoventures.gkstats.pro.monthly';
const ANNUAL_ID = 'com.snocoventures.gkstats.pro.annual';

const FEATURES = [
  'Unlimited games',
  'Unlimited goalkeeper profiles',
  'Unlimited teams',
  'Advanced stats: GAA, 1v1 Save Rate & more',
];

const PRIVACY_URL = 'https://smiling-gorgonzola-c76.notion.site/Privacy-Policy-a70ef03840ca4301b83bb7a302c070fa?pvs=74';

export default function PaywallScreen() {
  const router = useRouter();
  const colors = useColors();
  const { restorePurchases, isRestoring, currentOffering, purchasePackage, isPro, initAndFetchOfferings, isLoading } = usePurchases();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);

  React.useEffect(() => {
    if (!currentOffering && !isLoading) {
      console.log('[Paywall] No offering loaded, retrying fetch...');
      initAndFetchOfferings(true);
    }
  }, [currentOffering, isLoading, initAndFetchOfferings]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleClose = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleSelectPlan = useCallback((plan: PlanType) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  }, []);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await initAndFetchOfferings(true);
    } finally {
      setRetrying(false);
    }
  }, [initAndFetchOfferings]);

  const handlePurchase = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!currentOffering) {
      Alert.alert(
        'Loading Plans',
        'Subscription options are still loading. Would you like to retry?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => initAndFetchOfferings(true) },
        ]
      );
      return;
    }
    const targetId = selectedPlan === 'annual' ? ANNUAL_ID : MONTHLY_ID;
    const pkg = currentOffering.availablePackages.find(
      (p: any) => p.product.identifier === targetId
    );
    if (!pkg) {
      Alert.alert('Unavailable', 'This plan is not available right now. Please try again later.');
      Sentry.captureMessage('Paywall package not found', { level: 'warning', extra: { targetId, available: currentOffering.availablePackages.map((p: any) => p.product.identifier) } });
      return;
    }
    setIsPurchasing(true);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        router.back();
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [currentOffering, selectedPlan, purchasePackage, router]);

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
          style={[styles.subscribeButton, isPurchasing && styles.subscribeButtonDisabled]}
          onPress={handlePurchase}
          activeOpacity={0.8}
          disabled={isPurchasing}
        >
          <Text style={styles.subscribeButtonText}>
            {isPurchasing ? 'Processing...' : 'Start Free Trial'}
          </Text>
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
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      zIndex: 10,
    },
    headerSection: {
      alignItems: 'center' as const,
      marginBottom: 28,
      marginTop: 8,
    },
    shieldContainer: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: c.primaryGlow,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 20,
    },
    headline: {
      fontSize: fontSize.display3,
      fontWeight: '800' as const,
      color: c.text,
      textAlign: 'center' as const,
      marginBottom: 8,
    },
    subheadline: {
      fontSize: fontSize.bodyLg,
      color: c.textSecondary,
      textAlign: 'center' as const,
      lineHeight: 22,
    },
    featureList: {
      marginBottom: 20,
      gap: 12,
    },
    featureRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    featureCheckContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primaryGlow,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    featureText: {
      fontSize: fontSize.bodyLg,
      color: c.text,
      fontWeight: '500' as const,
      flex: 1,
    },
    trialBadge: {
      backgroundColor: c.primary,
      borderRadius: 24,
      paddingVertical: 10,
      paddingHorizontal: 20,
      alignSelf: 'center' as const,
      marginBottom: 24,
    },
    trialBadgeText: {
      color: c.white,
      fontSize: fontSize.bodyLg,
      fontWeight: '700' as const,
      textAlign: 'center' as const,
    },
    planSelector: {
      flexDirection: 'row' as const,
      gap: 12,
      marginBottom: 24,
    },
    planCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center' as const,
      borderWidth: 2,
      borderColor: c.border,
    },
    planCardActive: {
      borderColor: c.primary,
      backgroundColor: c.primaryGlow,
    },
    planLabel: {
      fontSize: fontSize.body,
      fontWeight: '600' as const,
      color: c.textMuted,
      marginBottom: 6,
    },
    planLabelActive: {
      color: c.text,
    },
    planPrice: {
      fontSize: fontSize.h1,
      fontWeight: '800' as const,
      color: c.textSecondary,
    },
    planPriceActive: {
      color: c.text,
    },
    planPeriod: {
      fontSize: fontSize.body2,
      color: c.textMuted,
      fontWeight: '500' as const,
      marginTop: 2,
    },
    planPeriodActive: {
      color: c.textSecondary,
    },
    bestValueTag: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: c.primary,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      marginBottom: 8,
    },
    bestValueText: {
      fontSize: fontSize.xs,
      fontWeight: '700' as const,
      color: c.white,
      textTransform: 'uppercase' as const,
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
      fontSize: fontSize.caption,
      fontWeight: '700' as const,
      color: c.primary,
    },
    subscribeButton: {
      backgroundColor: c.primaryDark,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 6,
    },
    subscribeButtonDisabled: {
      opacity: 0.6,
    },
    subscribeButtonText: {
      color: c.white,
      fontSize: fontSize.h4,
      fontWeight: '700' as const,
    },
    captionText: {
      fontSize: fontSize.caption,
      color: c.textMuted,
      textAlign: 'center' as const,
      marginBottom: 16,
    },
    restoreButton: {
      paddingVertical: 10,
      alignItems: 'center' as const,
      marginBottom: 24,
    },
    restoreText: {
      fontSize: fontSize.body,
      color: c.textSecondary,
      fontWeight: '500' as const,
      textDecorationLine: 'underline' as const,
    },
    footer: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      gap: 4,
    },
    footerLink: {
      fontSize: fontSize.sm,
      color: c.textSecondary,
      textDecorationLine: 'underline' as const,
    },
    footerSeparator: {
      fontSize: fontSize.sm,
      color: c.textMuted,
    },
    footerNote: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      textAlign: 'center' as const,
    },

  });
}
