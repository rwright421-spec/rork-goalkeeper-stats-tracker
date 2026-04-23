import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { fontSize } from '@/constants/typography';
import { KeeperData, getAllSavePercentage, getRunOfPlaySavePercentage } from '@/types/game';

export type SavePercentageVariant = 'all' | 'runOfPlay';

interface SavePercentageBadgeProps {
  saves?: number;
  goalsAgainst?: number;
  label?: string;
  variant?: SavePercentageVariant;
  keeper?: KeeperData;
}

function computeFromLegacy(saves: number, goalsAgainst: number): number | null {
  const total = saves + goalsAgainst;
  if (total === 0) return null;
  return Math.round((saves / total) * 100);
}

export default React.memo(function SavePercentageBadge({ saves, goalsAgainst, label, variant, keeper }: SavePercentageBadgeProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const effectiveVariant: SavePercentageVariant = variant ?? 'all';
  const pct: number | null = useMemo(() => {
    if (keeper) {
      if (effectiveVariant === 'runOfPlay') return getRunOfPlaySavePercentage(keeper);
      return getAllSavePercentage(keeper);
    }
    return computeFromLegacy(saves ?? 0, goalsAgainst ?? 0);
  }, [keeper, effectiveVariant, saves, goalsAgainst]);

  const sublabel = effectiveVariant === 'runOfPlay' ? 'RoP Save %' : 'Save %';

  const getColor = () => {
    if (pct === null) return colors.textMuted;
    if (pct >= 75) return colors.primary;
    if (pct >= 50) return colors.warning;
    return colors.danger;
  };

  const handlePress = () => {
    if (effectiveVariant === 'runOfPlay') {
      Alert.alert('Run-of-Play Save %', 'Run-of-play save % excludes penalties. It shows save % from open play only.');
    }
  };

  const Wrapper: any = effectiveVariant === 'runOfPlay' ? TouchableOpacity : View;
  const wrapperProps = effectiveVariant === 'runOfPlay' ? { onPress: handlePress, activeOpacity: 0.7 } : {};

  return (
    <Wrapper style={styles.container} {...wrapperProps}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.badge, { borderColor: getColor() }, pct === null && styles.badgeMuted]}>
        <Text style={[styles.value, { color: getColor() }]}>{pct !== null ? `${pct}%` : '—'}</Text>
      </View>
      <Text style={styles.sublabel}>{sublabel}</Text>
    </Wrapper>
  );
});

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { alignItems: 'center' },
    label: { fontSize: fontSize.sm, fontWeight: '600' as const, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
    badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, backgroundColor: 'rgba(16, 185, 129, 0.08)' },
    badgeMuted: { opacity: 0.5 },
    value: { fontSize: fontSize.h1sm, fontWeight: '800' as const },
    sublabel: { fontSize: fontSize.xs, color: c.textMuted, marginTop: 4, fontWeight: '500' as const },
  });
}
