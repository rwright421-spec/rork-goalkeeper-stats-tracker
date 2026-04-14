import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Minus,
  Plus,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
  Play,
  Pause,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { themes, ThemeColors, ThemeName, themeOptions } from '@/constants/themes';
import { useTheme } from '@/contexts/ThemeContext';
import { fontSize } from '@/constants/typography';

const THEME_NAMES: ThemeName[] = ['dark', 'light', 'ocean', 'sunset'];
const THEME_LABELS: Record<ThemeName, string> = {
  dark: 'Dark',
  light: 'Light',
  ocean: 'Ocean',
  sunset: 'Sunset',
};

function MiniGoalkeeperCard({ c }: { c: ThemeColors }) {
  return (
    <View style={[miniStyles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={miniStyles.cardHeader}>
        <View style={[miniStyles.avatar, { backgroundColor: c.primaryGlow, borderColor: c.primary }]}>
          <Text style={[miniStyles.avatarText, { color: c.primary }]}>JD</Text>
        </View>
        <View style={miniStyles.cardHeaderText}>
          <Text style={[miniStyles.keeperName, { color: c.text }]} numberOfLines={1}>Jake Davis</Text>
          <Text style={[miniStyles.keeperSub, { color: c.textMuted }]}>U16 · Central FC</Text>
        </View>
      </View>
      <View style={[miniStyles.cardStatRow, { borderTopColor: c.border }]}>
        <View style={miniStyles.cardStat}>
          <Text style={[miniStyles.cardStatValue, { color: c.primary }]}>12</Text>
          <Text style={[miniStyles.cardStatLabel, { color: c.textMuted }]}>Games</Text>
        </View>
        <View style={[miniStyles.cardStatDivider, { backgroundColor: c.border }]} />
        <View style={miniStyles.cardStat}>
          <Text style={[miniStyles.cardStatValue, { color: c.accent }]}>78%</Text>
          <Text style={[miniStyles.cardStatLabel, { color: c.textMuted }]}>Save %</Text>
        </View>
        <View style={[miniStyles.cardStatDivider, { backgroundColor: c.border }]} />
        <View style={miniStyles.cardStat}>
          <Text style={[miniStyles.cardStatValue, { color: c.text }]}>47</Text>
          <Text style={[miniStyles.cardStatLabel, { color: c.textMuted }]}>Saves</Text>
        </View>
      </View>
    </View>
  );
}

function MiniStatEntry({ c }: { c: ThemeColors }) {
  return (
    <View style={[miniStyles.statRow, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[miniStyles.statLabel, { color: c.textSecondary }]}>SAVES</Text>
      <View style={miniStyles.statControls}>
        <View style={[miniStyles.statBtn, { backgroundColor: c.dangerGlow }]}>
          <Minus size={10} color={c.danger} strokeWidth={3} />
        </View>
        <Text style={[miniStyles.statValue, { color: c.primary }]}>5</Text>
        <View style={[miniStyles.statBtn, { backgroundColor: c.primaryGlow }]}>
          <Plus size={10} color={c.primary} strokeWidth={3} />
        </View>
      </View>
    </View>
  );
}

function MiniAnalyticsBadge({ c }: { c: ThemeColors }) {
  return (
    <View style={miniStyles.badgeRow}>
      <View style={[miniStyles.badge, { borderColor: c.primary, backgroundColor: c.primaryGlow }]}>
        <Text style={[miniStyles.badgeValue, { color: c.primary }]}>82%</Text>
        <Text style={[miniStyles.badgeSub, { color: c.textMuted }]}>Save %</Text>
      </View>
      <View style={[miniStyles.badge, { borderColor: c.accent, backgroundColor: c.accentGlow }]}>
        <Text style={[miniStyles.badgeValue, { color: c.accent }]}>6.2</Text>
        <Text style={[miniStyles.badgeSub, { color: c.textMuted }]}>Avg/Game</Text>
      </View>
      <View style={[miniStyles.badge, { borderColor: c.danger, backgroundColor: c.dangerGlow }]}>
        <Text style={[miniStyles.badgeValue, { color: c.danger }]}>1.3</Text>
        <Text style={[miniStyles.badgeSub, { color: c.textMuted }]}>GA/Game</Text>
      </View>
    </View>
  );
}

function MiniTabBar({ c }: { c: ThemeColors }) {
  const tabs = [
    { icon: LayoutDashboard, label: 'Home', active: true },
    { icon: ClipboardList, label: 'Games', active: false },
    { icon: BarChart3, label: 'Stats', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <View style={[miniStyles.tabBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <View key={tab.label} style={miniStyles.tabItem}>
            <Icon size={14} color={tab.active ? c.primary : c.textMuted} strokeWidth={2} />
            <Text style={[miniStyles.tabLabel, { color: tab.active ? c.primary : c.textMuted }]}>
              {tab.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ThemeColumn({ themeName, themeColors }: { themeName: ThemeName; themeColors: ThemeColors }) {
  return (
    <View style={[colStyles.column, { backgroundColor: themeColors.background }]}>
      <View style={[colStyles.header, { borderBottomColor: themeColors.border }]}>
        <View style={[colStyles.dot, { backgroundColor: themeColors.primary }]} />
        <Text style={[colStyles.title, { color: themeColors.text }]}>{THEME_LABELS[themeName]}</Text>
      </View>
      <View style={colStyles.content}>
        <MiniGoalkeeperCard c={themeColors} />
        <MiniStatEntry c={themeColors} />
        <MiniAnalyticsBadge c={themeColors} />
        <MiniTabBar c={themeColors} />
      </View>
    </View>
  );
}

export default function ThemePreviewScreen() {
  const { themeName: currentTheme, setTheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isCycling, setIsCycling] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const originalThemeRef = useRef<ThemeName>(currentTheme);

  useEffect(() => {
    originalThemeRef.current = currentTheme;
  }, []);

  const startCycling = useCallback(() => {
    setIsCycling(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let idx = THEME_NAMES.indexOf(currentTheme);
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % THEME_NAMES.length;
      setCycleIndex(idx);
      setTheme(THEME_NAMES[idx]);

      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }, 2000);
  }, [currentTheme, setTheme, pulseAnim]);

  const stopCycling = useCallback(() => {
    setIsCycling(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const styles = useMemo(() => createScreenStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Theme Preview',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Side-by-Side Comparison</Text>
        <Text style={styles.subtitle}>
          All four themes rendered simultaneously. Scroll horizontally to compare.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.columnsContainer}
          decelerationRate="fast"
          snapToInterval={200}
        >
          {THEME_NAMES.map((name) => (
            <ThemeColumn key={name} themeName={name} themeColors={themes[name]} />
          ))}
        </ScrollView>

        <View style={styles.cycleSection}>
          <Text style={styles.cycleTitle}>Live Theme Cycling</Text>
          <Text style={styles.cycleSubtitle}>
            {isCycling
              ? `Cycling... Currently: ${THEME_LABELS[THEME_NAMES[cycleIndex]]}`
              : 'Switch between all themes every 2 seconds to spot regressions.'}
          </Text>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              testID="cycle-themes-btn"
              style={[
                styles.cycleButton,
                isCycling && styles.cycleButtonActive,
              ]}
              onPress={isCycling ? stopCycling : startCycling}
              activeOpacity={0.7}
            >
              {isCycling ? (
                <Pause size={18} color={colors.danger} strokeWidth={2.5} />
              ) : (
                <Play size={18} color={colors.primary} strokeWidth={2.5} />
              )}
              <Text
                style={[
                  styles.cycleButtonText,
                  isCycling && styles.cycleButtonTextActive,
                ]}
              >
                {isCycling ? 'Stop Cycling' : 'Cycle Themes'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {isCycling && (
            <View style={styles.indicatorRow}>
              {THEME_NAMES.map((name, idx) => (
                <View
                  key={name}
                  style={[
                    styles.indicator,
                    {
                      backgroundColor:
                        idx === cycleIndex ? themes[name].primary : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden' as const,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 8,
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '700' as const,
  },
  cardHeaderText: {
    flex: 1,
  },
  keeperName: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  keeperSub: {
    fontSize: 8,
    marginTop: 1,
  },
  cardStatRow: {
    flexDirection: 'row' as const,
    borderTopWidth: 1,
    paddingVertical: 6,
  },
  cardStat: {
    flex: 1,
    alignItems: 'center' as const,
  },
  cardStatValue: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  cardStatLabel: {
    fontSize: 7,
    marginTop: 1,
  },
  cardStatDivider: {
    width: 1,
    height: '80%' as unknown as number,
    alignSelf: 'center' as const,
  },
  statRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  statControls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  statBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    minWidth: 18,
    textAlign: 'center' as const,
  },
  badgeRow: {
    flexDirection: 'row' as const,
    gap: 4,
    marginBottom: 8,
  },
  badge: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    alignItems: 'center' as const,
  },
  badgeValue: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  badgeSub: {
    fontSize: 6,
    marginTop: 1,
  },
  tabBar: {
    flexDirection: 'row' as const,
    borderTopWidth: 0.5,
    paddingVertical: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 2,
  },
  tabLabel: {
    fontSize: 7,
    fontWeight: '600' as const,
  },
});

const colStyles = StyleSheet.create({
  column: {
    width: 188,
    borderRadius: 14,
    overflow: 'hidden' as const,
    marginRight: 12,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  content: {
    padding: 8,
  },
});

function createScreenStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    heading: {
      fontSize: fontSize.h1sm,
      fontWeight: '800' as const,
      color: c.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: fontSize.body2,
      color: c.textMuted,
      lineHeight: 18,
      marginBottom: 20,
    },
    columnsContainer: {
      paddingRight: 20,
      paddingBottom: 4,
    },
    cycleSection: {
      marginTop: 28,
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 20,
    },
    cycleTitle: {
      fontSize: fontSize.h4,
      fontWeight: '700' as const,
      color: c.text,
      marginBottom: 4,
    },
    cycleSubtitle: {
      fontSize: fontSize.body2,
      color: c.textMuted,
      lineHeight: 18,
      marginBottom: 16,
    },
    cycleButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 10,
      backgroundColor: c.primaryGlow,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 24,
    },
    cycleButtonActive: {
      backgroundColor: c.dangerGlow,
      borderColor: c.danger,
    },
    cycleButtonText: {
      fontSize: fontSize.bodyLg,
      fontWeight: '700' as const,
      color: c.primary,
    },
    cycleButtonTextActive: {
      color: c.danger,
    },
    indicatorRow: {
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      gap: 8,
      marginTop: 14,
    },
    indicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });
}
