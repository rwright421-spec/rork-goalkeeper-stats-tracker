import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';

interface SavePercentageBadgeProps {
  saves: number;
  goalsAgainst: number;
  label?: string;
}

export default React.memo(function SavePercentageBadge({ saves, goalsAgainst, label }: SavePercentageBadgeProps) {
  const colors = useColors();
  const total = saves + goalsAgainst;
  const pct = total === 0 ? 0 : Math.round((saves / total) * 100);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getColor = () => {
    if (total === 0) return colors.textMuted;
    if (pct >= 75) return colors.primary;
    if (pct >= 50) return colors.warning;
    return colors.danger;
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.badge, { borderColor: getColor() }]}>
        <Text style={[styles.value, { color: getColor() }]}>{pct}%</Text>
      </View>
      <Text style={styles.sublabel}>Save %</Text>
    </View>
  );
});

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { alignItems: 'center' },
    label: { fontSize: 11, fontWeight: '600' as const, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
    badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, backgroundColor: 'rgba(16, 185, 129, 0.08)' },
    value: { fontSize: 22, fontWeight: '800' as const },
    sublabel: { fontSize: 10, color: c.textMuted, marginTop: 4, fontWeight: '500' as const },
  });
}
