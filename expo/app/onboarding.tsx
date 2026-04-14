// Onboarding - First-time user welcome and setup flow
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, LayoutDashboard, ClipboardList, BarChart3, Settings, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useTeams } from '@/contexts/TeamContext';
import { fontSize } from '@/constants/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_PAGES = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { profiles, createProfile, selectProfile } = useGoalkeepers();
  const { teams, createTeam } = useTeams();

  const hasProfiles = profiles.length > 0;
  const hasTeams = teams.length > 0;

  const initialPage = hasProfiles ? (hasTeams ? 3 : 2) : 0;

  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    if (!initialScrollDone.current && initialPage > 0) {
      initialScrollDone.current = true;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: initialPage * SCREEN_WIDTH, animated: false });
      }, 50);
    }
  }, [initialPage]);

  const [keeperName, setKeeperName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);

  const [teamName, setTeamName] = useState('');
  const [seasonYear, setSeasonYear] = useState(() => new Date().getFullYear().toString());

  const dotAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const goToPage = useCallback((page: number) => {
    scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
    setCurrentPage(page);
    Animated.spring(dotAnim, {
      toValue: page,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [dotAnim]);

  const handleSkipAll = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/');
  }, [router]);

  const handleGetStarted = useCallback(() => {
    Keyboard.dismiss();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    goToPage(1);
  }, [goToPage]);

  const handleCreateProfile = useCallback(() => {
    Keyboard.dismiss();
    if (!keeperName.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const profile = createProfile(keeperName.trim(), birthYear.trim() || undefined);
    selectProfile(profile.id);
    setCreatedProfileId(profile.id);
    goToPage(2);
  }, [keeperName, birthYear, createProfile, selectProfile, goToPage]);

  const handleSkipProfile = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToPage(2);
  }, [goToPage]);

  const handleCreateTeam = useCallback(() => {
    Keyboard.dismiss();
    if (!teamName.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const team = createTeam(seasonYear.trim() || new Date().getFullYear().toString(), teamName.trim());
    goToPage(3);
  }, [teamName, seasonYear, createTeam, goToPage]);

  const handleSkipTeam = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToPage(3);
  }, [goToPage]);

  const handleFinish = useCallback(async () => {
    Keyboard.dismiss();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem('onboarding_complete', 'true');
    if (createdProfileId) {
      router.replace('/(tabs)/dashboard');
    } else {
      router.replace('/');
    }
  }, [router, createdProfileId]);

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (page !== currentPage && page >= 0 && page < TOTAL_PAGES) {
      setCurrentPage(page);
    }
  }, [currentPage]);

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            currentPage === i && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );

  const renderSkip = () => {
    if (currentPage >= TOTAL_PAGES - 1) return <View style={styles.skipPlaceholder} />;
    return (
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkipAll}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.skipPlaceholder} />
        {renderDots()}
        {renderSkip()}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onMomentumScrollEnd={handleScroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Screen 1 — Welcome */}
        <View style={styles.page}>
          <View style={styles.pageContent}>
            <View style={styles.welcomeIconContainer}>
              <View style={styles.welcomeIconOuter}>
                <View style={styles.welcomeIconInner}>
                  <Shield size={52} color={colors.primary} strokeWidth={2} />
                </View>
              </View>
              <View style={styles.welcomeIconGlow} />
            </View>

            <Text style={styles.welcomeHeadline}>Track Every Save.</Text>
            <Text style={styles.welcomeSubheadline}>
              The stat tracker built for goalkeepers, coaches, and the parents who never miss a game.
            </Text>

            <TouchableOpacity
              testID="onboarding-get-started"
              style={styles.primaryButton}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <ChevronRight size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Screen 2 — Create Profile */}
        <KeyboardAvoidingView
          style={styles.page}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.pageScrollView}
            contentContainerStyle={styles.pageScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formIconRow}>
              <View style={styles.formIconBadge}>
                <Text style={styles.formIconEmoji}>🧤</Text>
              </View>
            </View>

            <Text style={styles.formHeadline}>Who are we tracking?</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Goalkeeper Name</Text>
              <TextInput
                testID="onboarding-keeper-name"
                style={styles.input}
                value={keeperName}
                onChangeText={setKeeperName}
                placeholder="Enter goalkeeper name"
                placeholderTextColor={colors.textMuted}
                autoFocus={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Birth Year (optional)</Text>
              <TextInput
                testID="onboarding-birth-year"
                style={styles.input}
                value={birthYear}
                onChangeText={setBirthYear}
                placeholder="e.g. 2012"
                placeholderTextColor={colors.textMuted}
                keyboardType={Platform.OS === 'web' ? 'default' : 'number-pad'}
                maxLength={4}
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              testID="onboarding-create-profile"
              style={[styles.primaryButton, !keeperName.trim() && styles.primaryButtonDisabled]}
              onPress={handleCreateProfile}
              disabled={!keeperName.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
              <ChevronRight size={20} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="onboarding-skip-profile"
              style={styles.secondaryButton}
              onPress={handleSkipProfile}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Screen 3 — Create Team */}
        <KeyboardAvoidingView
          style={styles.page}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.pageScrollView}
            contentContainerStyle={styles.pageScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formIconRow}>
              <View style={styles.formIconBadge}>
                <Text style={styles.formIconEmoji}>⚽</Text>
              </View>
            </View>

            <Text style={styles.formHeadline}>Add a team to organize your games.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Team Name</Text>
              <TextInput
                testID="onboarding-team-name"
                style={styles.input}
                value={teamName}
                onChangeText={setTeamName}
                placeholder="e.g. Lightning FC"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Season Year</Text>
              <TextInput
                testID="onboarding-season-year"
                style={styles.input}
                value={seasonYear}
                onChangeText={setSeasonYear}
                placeholder="e.g. 2026"
                placeholderTextColor={colors.textMuted}
                keyboardType={Platform.OS === 'web' ? 'default' : 'number-pad'}
                maxLength={4}
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              testID="onboarding-create-team"
              style={[styles.primaryButton, !teamName.trim() && styles.primaryButtonDisabled]}
              onPress={handleCreateTeam}
              disabled={!teamName.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Create Team</Text>
              <ChevronRight size={20} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="onboarding-skip-team"
              style={styles.secondaryButton}
              onPress={handleSkipTeam}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Screen 4 — You're Ready */}
        <View style={styles.page}>
          <View style={styles.pageContent}>
            <View style={styles.welcomeIconContainer}>
              <View style={styles.readyIconOuter}>
                <Text style={styles.readyEmoji}>🎉</Text>
              </View>
            </View>

            <Text style={styles.welcomeHeadline}>You're all set.</Text>
            <Text style={styles.readyBody}>
              Head to Games to log your first match, or explore Stats to see your career numbers once you've played a few.
            </Text>

            <View style={styles.tabHintContainer}>
              <View style={styles.tabHintItem}>
                <View style={styles.tabHintIcon}>
                  <LayoutDashboard size={20} color={colors.primary} />
                </View>
                <Text style={styles.tabHintLabel}>Profile</Text>
              </View>
              <View style={styles.tabHintItem}>
                <View style={styles.tabHintIcon}>
                  <ClipboardList size={20} color={colors.textMuted} />
                </View>
                <Text style={styles.tabHintLabel}>Games</Text>
              </View>
              <View style={styles.tabHintItem}>
                <View style={styles.tabHintIcon}>
                  <BarChart3 size={20} color={colors.textMuted} />
                </View>
                <Text style={styles.tabHintLabel}>Stats</Text>
              </View>
              <View style={styles.tabHintItem}>
                <View style={styles.tabHintIcon}>
                  <Settings size={20} color={colors.textMuted} />
                </View>
                <Text style={styles.tabHintLabel}>Settings</Text>
              </View>
            </View>

            <TouchableOpacity
              testID="onboarding-finish"
              style={styles.primaryButton}
              onPress={handleFinish}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Start Tracking</Text>
              <ChevronRight size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(c: ThemeColors, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: insets.top + 8,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    skipPlaceholder: {
      width: 50,
    },
    skipButton: {
      width: 50,
      alignItems: 'flex-end',
    },
    skipText: {
      fontSize: fontSize.bodyLg,
      fontWeight: '600' as const,
      color: c.textMuted,
    },
    dotsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.border,
    },
    dotActive: {
      backgroundColor: c.primary,
      width: 24,
      borderRadius: 4,
    },
    page: {
      width: SCREEN_WIDTH,
      flex: 1,
    },
    pageContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingBottom: insets.bottom + 40,
    },
    pageScrollView: {
      flex: 1,
    },
    pageScrollContent: {
      paddingHorizontal: 28,
      paddingTop: 40,
      paddingBottom: insets.bottom + 40,
    },
    welcomeIconContainer: {
      marginBottom: 36,
      alignItems: 'center',
    },
    welcomeIconOuter: {
      width: 110,
      height: 110,
      borderRadius: 32,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    welcomeIconInner: {
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    welcomeIconGlow: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(16, 185, 129, 0.06)',
      top: -15,
    },
    welcomeHeadline: {
      fontSize: fontSize.display1,
      fontWeight: '800' as const,
      color: c.text,
      textAlign: 'center',
      letterSpacing: -0.5,
      marginBottom: 12,
    },
    welcomeSubheadline: {
      fontSize: fontSize.subtitle,
      fontWeight: '500' as const,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 48,
      paddingHorizontal: 8,
    },
    formIconRow: {
      alignItems: 'center',
      marginBottom: 24,
    },
    formIconBadge: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    formIconEmoji: {
      fontSize: fontSize.display,
    },
    formHeadline: {
      fontSize: fontSize.display3,
      fontWeight: '800' as const,
      color: c.text,
      letterSpacing: -0.3,
      marginBottom: 28,
    },
    inputGroup: {
      marginBottom: 18,
    },
    inputLabel: {
      fontSize: fontSize.body,
      color: c.textSecondary,
      fontWeight: '600' as const,
      marginBottom: 8,
    },
    input: {
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: c.text,
      fontSize: fontSize.subtitle,
      borderWidth: 1,
      borderColor: c.border,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primaryDark,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 32,
      width: '100%',
      marginTop: 8,
    },
    primaryButtonDisabled: {
      opacity: 0.35,
    },
    primaryButtonText: {
      color: c.white,
      fontSize: fontSize.h4,
      fontWeight: '700' as const,
    },
    secondaryButton: {
      alignItems: 'center',
      paddingVertical: 14,
      marginTop: 4,
    },
    secondaryButtonText: {
      fontSize: fontSize.bodyLg,
      fontWeight: '600' as const,
      color: c.textMuted,
    },
    readyBody: {
      fontSize: fontSize.bodyLg,
      fontWeight: '500' as const,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 23,
      marginBottom: 36,
      paddingHorizontal: 4,
    },
    readyIconOuter: {
      width: 100,
      height: 100,
      borderRadius: 30,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    readyEmoji: {
      fontSize: fontSize.hero,
    },
    tabHintContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      backgroundColor: c.surface,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 36,
      width: '100%',
    },
    tabHintItem: {
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    tabHintIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    tabHintLabel: {
      fontSize: fontSize.sm,
      fontWeight: '600' as const,
      color: c.textMuted,
    },
  });
}
