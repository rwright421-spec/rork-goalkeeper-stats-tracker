import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, Animated, Platform, KeyboardAvoidingView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { fontSize } from '@/constants/typography';

interface SwapStatsConfirmModalProps {
  visible: boolean;
  onSwapStats: () => void;
  onKeepStats: () => void;
  onCancel: () => void;
}

export default function SwapStatsConfirmModal({ visible, onSwapStats, onKeepStats, onCancel }: SwapStatsConfirmModalProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible, anim]);

  const handleSwap = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSwapStats();
  }, [onSwapStats]);

  const handleKeep = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onKeepStats();
  }, [onKeepStats]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={handleCancel}>
          <Animated.View
            style={[
              styles.container,
              {
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }],
                opacity: anim,
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />
              <View style={styles.content}>
                <Text style={styles.title}>Switch stats too?</Text>
                <Text style={styles.body}>
                  You&apos;re changing the game type. The keeper names will swap between HOME and AWAY. Should the stats swap as well?{'\n\n'}
                  Tap &quot;Yes, swap stats&quot; if you&apos;re correcting a mislabeled game — the stats should follow the keeper. Tap &quot;No, keep stats&quot; only if the stats are already on the correct side.
                </Text>

                <TouchableOpacity testID="swap-stats-yes" style={styles.primaryBtn} onPress={handleSwap} activeOpacity={0.85}>
                  <Text style={styles.primaryText}>Yes, swap stats</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="swap-stats-no" style={styles.secondaryBtn} onPress={handleKeep} activeOpacity={0.85}>
                  <Text style={styles.secondaryText}>No, keep stats</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="swap-stats-cancel" style={styles.tertiaryBtn} onPress={handleCancel} activeOpacity={0.7}>
                  <Text style={styles.tertiaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    container: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, borderWidth: 1, borderColor: c.border, borderBottomWidth: 0 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderLight, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
    title: { fontSize: fontSize.h2, fontWeight: '800' as const, color: c.text, marginBottom: 12 },
    body: { fontSize: fontSize.body, color: c.textSecondary, lineHeight: 20, marginBottom: 22 },
    primaryBtn: { backgroundColor: c.primaryDark, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    primaryText: { color: c.white, fontSize: fontSize.h4, fontWeight: '700' as const },
    secondaryBtn: { backgroundColor: c.background, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.border, marginBottom: 8 },
    secondaryText: { color: c.text, fontSize: fontSize.h4, fontWeight: '700' as const },
    tertiaryBtn: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    tertiaryText: { color: c.textMuted, fontSize: fontSize.body, fontWeight: '600' as const },
  });
}
