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
  size?: 'regular' | 'compact';
  labelMinHeight?: number;
  alignLabelTop?: boolean;
}

export default React.memo(function StatCounter({
  label,
  value,
  onIncrement,
  onDecrement,
  accentColor,
  disableIncrement,
  size = 'regular',
  labelMinHeight,
  alignLabelTop,
}: StatCounterProps) {
  const colors = useColors();
  const finalAccent = accentColor ?? colors.primary;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const styles = useMemo(() => createStyles(colors, size), [colors, size]);

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

  const iconSize = size === 'compact' ? 16 : 18;
  const hitSlop = size === 'compact' ? { top: 8, bottom: 8, left: 8, right: 8 } : { top: 4, bottom: 4, left: 4, right: 4 };

  return (
    <View style={styles.container}>
      <View style={[
        styles.labelWrap,
        labelMinHeight ? { minHeight: labelMinHeight } : null,
        alignLabelTop ? styles.labelWrapTop : null,
      ]}>
        <Text style={styles.label} numberOfLines={2}>{label}</Text>
      </View>
      <View style={styles.counterRow}>
        <TouchableOpacity
          testID={`${label}-decrement`}
          style={[styles.button, styles.decrementButton, value === 0 && styles.buttonDisabled]}
          onPress={handleDecrement}
          disabled={value === 0}
          activeOpacity={0.7}
          hitSlop={hitSlop}
        >
          <Minus size={iconSize} color={value === 0 ? colors.textMuted : colors.danger} strokeWidth={2.5} />
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
          hitSlop={hitSlop}
        >
          <Plus size={iconSize} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

function createStyles(c: ThemeColors, size: 'regular' | 'compact') {
  const compact = size === 'compact';
  const buttonSize = compact ? 32 : 36;
  const valueSize = compact ? fontSize.h2 : fontSize.display2;
  const gap = compact ? 6 : 10;
  const minValueWidth = compact ? 28 : 40;
  return StyleSheet.create({
    container: { alignItems: 'center', flex: 1, minWidth: 0 },
    labelWrap: { justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8, alignSelf: 'stretch' },
    labelWrapTop: { justifyContent: 'flex-start' },
    label: { fontSize: compact ? fontSize.xs : fontSize.sm, fontWeight: '600' as const, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
    counterRow: { flexDirection: 'row', alignItems: 'center', gap },
    button: { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2, alignItems: 'center', justifyContent: 'center' },
    decrementButton: { backgroundColor: c.dangerGlow, borderWidth: 1, borderColor: 'rgba(248, 81, 73, 0.3)' },
    incrementButton: { backgroundColor: c.primaryGlow, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
    buttonDisabled: { opacity: 0.4 },
    valueContainer: { minWidth: minValueWidth, alignItems: 'center' },
    value: { fontSize: valueSize, fontWeight: '700' as const },
  });
}
