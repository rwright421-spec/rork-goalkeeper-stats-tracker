import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, GestureResponderEvent } from 'react-native';
import { Info } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { fontSize } from '@/constants/typography';
import { STAT_INFO } from '@/constants/statInfo';
import { AgeBand, AGE_BAND_LABELS } from '@/constants/ageBands';

interface StatInfoBubbleProps {
  statKey: string;
  ageBand?: AgeBand;
  size?: number;
  color?: string;
  testID?: string;
}

function StatInfoBubble({ statKey, ageBand = 'u15', size = 14, color, testID }: StatInfoBubbleProps) {
  const colors = useColors();
  const [open, setOpen] = useState<boolean>(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const info = STAT_INFO[statKey];

  const handlePress = useCallback((e: GestureResponderEvent) => {
    e.stopPropagation?.();
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  if (!info) return null;

  const bandLabel = AGE_BAND_LABELS[ageBand];
  const typicalText = typeof info.typicalRange === 'string' ? info.typicalRange : info.typicalRange[ageBand];

  return (
    <>
      <TouchableOpacity
        testID={testID ?? `info-${statKey}`}
        onPress={handlePress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel={`Info about ${info.label}`}
        accessibilityRole="button"
        style={styles.iconBtn}
        activeOpacity={0.6}
      >
        <Info size={size} color={color ?? colors.textMuted} strokeWidth={2} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{info.label}</Text>

            <Text style={styles.sectionHeader}>What it is</Text>
            <Text style={styles.body}>{info.definition}</Text>

            <Text style={styles.sectionHeader}>How to count it</Text>
            <Text style={styles.body}>{info.countingRule}</Text>

            <Text style={styles.sectionHeader}>Typical range for {bandLabel}</Text>
            <Text style={styles.body}>{typicalText}</Text>

            <TouchableOpacity
              testID={`info-${statKey}-dismiss`}
              style={styles.dismissBtn}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default React.memo(StatInfoBubble);

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    iconBtn: {
      width: 24,
      height: 24,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: c.border,
      gap: 8,
    },
    title: {
      fontSize: fontSize.h3,
      fontWeight: '800' as const,
      color: c.text,
      marginBottom: 4,
    },
    sectionHeader: {
      fontSize: fontSize.xs,
      fontWeight: '700' as const,
      color: c.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
      marginTop: 8,
    },
    body: {
      fontSize: fontSize.body2,
      color: c.textSecondary,
      lineHeight: 20,
      fontWeight: '500' as const,
    },
    dismissBtn: {
      marginTop: 16,
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    dismissText: {
      color: c.white,
      fontSize: fontSize.body,
      fontWeight: '700' as const,
    },
  });
}
