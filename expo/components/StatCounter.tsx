import React, { useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { fontSize } from '@/constants/typography';

interface StatCounterProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  accentColor?: string;
  disableIncrement?: boolean;
}

export default React.memo(function StatCounter({
  label,
  value,
  onIncrement,
  onDecrement,
  accentColor,
  disableIncrement,
}: StatCounterProps) {
  const colors = useColors();
  const finalAccent = accentColor ?? colors.primary;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim]);

  const handleIncrement = useCallback(() => {
    if (disableIncrement) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pulse();
    onIncrement();
  }, [onIncrement, pulse, disableIncrement]);

  const handleDecrement = useCallback(() => {
    if (value > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDecrement();
    }
  }, [onDecrement, value]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.counterRow}>
        <TouchableOpacity
          testID={`${label}-decrement`}
          style={[styles.button, styles.decrementButton, value === 0 && styles.buttonDisabled]}
          onPress={handleDecrement}
          disabled={value === 0}
          activeOpacity={0.7}
        >
          <Minus size={18} color={value === 0 ? colors.textMuted : colors.danger} strokeWidth={2.5} />
        </TouchableOpacity>
        <Animated.View style={[styles.valueContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={[styles.value, { color: finalAccent }]}>{value}</Text>
        </Animated.View>
        <TouchableOpacity
          testID={`${label}-increment`}
          style={[styles.button, styles.incrementButton, disableIncrement && styles.buttonDisabled]}
          onPress={handleIncrement}
          disabled={disableIncrement}
          activeOpacity={0.7}
        >
          <Plus size={18} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { alignItems: 'center', flex: 1 },
    label: { fontSize: fontSize.sm, fontWeight: '600' as const, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, textAlign: 'center' },
    counterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    button: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    decrementButton: { backgroundColor: c.dangerGlow, borderWidth: 1, borderColor: 'rgba(248, 81, 73, 0.3)' },
    incrementButton: { backgroundColor: c.primaryGlow, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
    buttonDisabled: { opacity: 0.4 },
    valueContainer: { minWidth: 40, alignItems: 'center' },
    value: { fontSize: fontSize.display2, fontWeight: '700' as const },
  });
}
