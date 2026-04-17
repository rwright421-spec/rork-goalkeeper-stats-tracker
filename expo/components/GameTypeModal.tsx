import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, Animated, Platform, KeyboardAvoidingView, Switch } from 'react-native';
import { Home, Plane, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { fontSize } from '@/constants/typography';

interface GameTypeModalProps {
  visible: boolean;
  onClose: () => void;
  initialIsHome?: boolean;
  initialTrackBoth?: boolean;
  onConfirm: (isHome: boolean, trackBoth: boolean) => void;
}

export default function GameTypeModal({ visible, onClose, initialIsHome = true, initialTrackBoth = false, onConfirm }: GameTypeModalProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const anim = useRef(new Animated.Value(0)).current;
  const [isHome, setIsHome] = useState<boolean>(initialIsHome);
  const [trackBoth, setTrackBoth] = useState<boolean>(initialTrackBoth);

  useEffect(() => {
    if (visible) {
      setIsHome(initialIsHome);
      setTrackBoth(initialTrackBoth);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible, initialIsHome, initialTrackBoth, anim]);

  const handleClose = useCallback(() => {
    Animated.timing(anim, { toValue: 0, useNativeDriver: true, duration: 180 }).start(() => {
      onClose();
    });
  }, [anim, onClose]);

  const selectHome = useCallback((home: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsHome(home);
  }, []);

  const toggleTrackBoth = useCallback((v: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTrackBoth(v);
  }, []);

  const handleConfirm = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(isHome, trackBoth);
    Animated.timing(anim, { toValue: 0, useNativeDriver: true, duration: 180 }).start(() => {
      onClose();
    });
  }, [anim, isHome, trackBoth, onConfirm, onClose]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Animated.View
            style={[
              styles.container,
              {
                transform: [{
                  translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }),
                }],
                opacity: anim,
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />
              <View style={styles.content}>
                <View style={styles.header}>
                  <Text style={styles.title}>Game Type</Text>
                  <TouchableOpacity testID="game-type-close" onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                    <X size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>Is this game home or away?</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    testID="game-type-home"
                    style={[styles.toggleOption, isHome && styles.toggleOptionActiveHome]}
                    onPress={() => selectHome(true)}
                    activeOpacity={0.7}
                  >
                    <Home size={16} color={isHome ? colors.cardHome : colors.textMuted} />
                    <Text style={[styles.toggleText, isHome && { color: colors.cardHome }]}>Home</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="game-type-away"
                    style={[styles.toggleOption, !isHome && styles.toggleOptionActiveAway]}
                    onPress={() => selectHome(false)}
                    activeOpacity={0.7}
                  >
                    <Plane size={16} color={!isHome ? colors.cardAway : colors.textMuted} />
                    <Text style={[styles.toggleText, !isHome && { color: colors.cardAway }]}>Away</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.switchBlock}>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Track both keepers</Text>
                    <Switch
                      testID="game-type-track-both"
                      value={trackBoth}
                      onValueChange={toggleTrackBoth}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={Platform.OS === 'android' ? (trackBoth ? colors.primaryLight : colors.surfaceLight) : undefined}
                    />
                  </View>
                  <Text style={styles.switchHint}>Turn on to record stats for the opponent&apos;s goalkeeper too.</Text>
                </View>

                <TouchableOpacity
                  testID="game-type-confirm"
                  style={styles.confirmBtn}
                  onPress={handleConfirm}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmText}>Continue</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
    title: { fontSize: fontSize.h2, fontWeight: '800' as const, color: c.text },
    closeBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: c.background },
    sectionLabel: { fontSize: fontSize.body, fontWeight: '600' as const, color: c.textSecondary, marginBottom: 10 },
    toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
    toggleOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: c.background, borderWidth: 1.5, borderColor: c.border },
    toggleOptionActiveHome: { borderColor: c.cardHome, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    toggleOptionActiveAway: { borderColor: c.cardAway, backgroundColor: 'rgba(59, 130, 246, 0.12)' },
    toggleText: { fontSize: fontSize.bodyLg, fontWeight: '700' as const, color: c.textMuted },
    switchBlock: { backgroundColor: c.background, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 22 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    switchLabel: { fontSize: fontSize.bodyLg, fontWeight: '700' as const, color: c.text },
    switchHint: { fontSize: fontSize.caption, color: c.textMuted, fontWeight: '500' as const, marginTop: 6, lineHeight: 16 },
    confirmBtn: { backgroundColor: c.primaryDark, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    confirmText: { color: c.white, fontSize: fontSize.h4, fontWeight: '700' as const },
  });
}
