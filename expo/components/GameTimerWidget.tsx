import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Animated, Platform, KeyboardAvoidingView, TextInput } from 'react-native';
import { Play, Square, RotateCcw, Flag, CheckCircle2, Pencil } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { fontSize } from '@/constants/typography';
import { TimerPhase } from '@/types/game';
import { formatMMSS } from '@/hooks/useGameTimer';
import KeyboardDoneBar, { KEYBOARD_DONE_BAR_ID } from '@/components/KeyboardDoneBar';

interface GameTimerWidgetProps {
  phase: TimerPhase;
  firstHalfSeconds: number;
  secondHalfSeconds: number;
  liveElapsedSeconds: number;
  onStart: () => void;
  onPause: () => void;
  onEndHalf: () => void;
  onResetCurrentHalf: () => void;
  onEditHalfTimes: (firstSeconds: number, secondSeconds: number) => void;
}

function isFirstHalfPhase(p: TimerPhase): boolean {
  return p === 'pre-1st' || p === 'in-1st' || p === 'paused-1st';
}
function isSecondHalfPhase(p: TimerPhase): boolean {
  return p === 'between' || p === 'in-2nd' || p === 'paused-2nd';
}

export default function GameTimerWidget({
  phase,
  firstHalfSeconds,
  secondHalfSeconds,
  liveElapsedSeconds,
  onStart,
  onPause,
  onEndHalf,
  onResetCurrentHalf,
  onEditHalfTimes,
}: GameTimerWidgetProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [resetVisible, setResetVisible] = useState<boolean>(false);
  const [endVisible, setEndVisible] = useState<boolean>(false);
  const [editVisible, setEditVisible] = useState<boolean>(false);

  const pulse = useRef(new Animated.Value(0)).current;
  const lastPhaseRef = useRef<TimerPhase>(phase);
  useEffect(() => {
    if (lastPhaseRef.current !== phase && phase === 'between') {
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ]).start();
    }
    lastPhaseRef.current = phase;
  }, [phase, pulse]);

  const isSecond = isSecondHalfPhase(phase) || phase === 'post-2nd';
  const halfLabel = isSecond ? '2nd Half' : '1st Half';
  const showRunning = phase === 'in-1st' || phase === 'in-2nd';
  const showPaused = phase === 'paused-1st' || phase === 'paused-2nd';
  const showStartFresh = phase === 'pre-1st' || phase === 'between';
  const showActive = showRunning || showPaused;

  const liveDisplay = formatMMSS(liveElapsedSeconds);

  const handleStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStart();
  }, [onStart]);

  const handlePause = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPause();
  }, [onPause]);

  const handleEndPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEndVisible(true);
  }, []);

  const confirmEndHalf = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onEndHalf();
    setEndVisible(false);
  }, [onEndHalf]);

  const handleResetPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResetVisible(true);
  }, []);

  const confirmReset = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onResetCurrentHalf();
    setResetVisible(false);
  }, [onResetCurrentHalf]);

  const bgColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.primaryGlow],
  });

  const endHalfNumber = isSecondHalfPhase(phase) ? '2nd' : '1st';
  const endHalfMMSS = formatMMSS(liveElapsedSeconds);

  return (
    <Animated.View style={[styles.card, { backgroundColor: bgColor }]} testID="game-timer-widget">
      {/* Top: half labels and live display */}
      <View style={styles.headerRow}>
        <Text style={styles.label}>Game Timer</Text>
        {showActive ? (
          <TouchableOpacity
            testID="timer-reset"
            onPress={handleResetPress}
            style={styles.resetBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Reset ${endHalfNumber === '2nd' ? '2nd half' : '1st half'} timer`}
          >
            <RotateCcw size={11} color={colors.textSecondary} />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {(isSecond || phase === 'post-2nd') && firstHalfSeconds > 0 ? (
        <View style={styles.firstHalfBadge}>
          <CheckCircle2 size={12} color={colors.primary} />
          <Text style={styles.firstHalfBadgeText}>1st Half: {formatMMSS(firstHalfSeconds)}</Text>
        </View>
      ) : null}

      <View style={styles.displayRow}>
        <Text style={styles.halfLabel}>{phase === 'post-2nd' ? '2nd Half' : halfLabel}</Text>
        <Text style={styles.display} testID="timer-display">
          {phase === 'pre-1st' ? '00:00'
            : phase === 'between' ? '00:00'
            : phase === 'post-2nd' ? formatMMSS(secondHalfSeconds)
            : liveDisplay}
        </Text>
      </View>

      {phase === 'post-2nd' ? (
        <>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatMMSS(firstHalfSeconds + secondHalfSeconds)}</Text>
          </View>
          <TouchableOpacity
            testID="timer-edit-half-times"
            style={styles.editLink}
            onPress={() => setEditVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Edit half times"
          >
            <Pencil size={12} color={colors.primary} />
            <Text style={styles.editLinkText}>Edit half times</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.buttonsRow}>
          {showStartFresh ? (
            <TouchableOpacity
              testID="timer-start"
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleStart}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={phase === 'between' ? 'Start 2nd Half' : 'Start'}
            >
              <Play size={14} color={colors.white} fill={colors.white} />
              <Text style={styles.primaryBtnText}>{phase === 'between' ? 'START 2ND HALF' : 'START'}</Text>
            </TouchableOpacity>
          ) : null}

          {showRunning ? (
            <TouchableOpacity
              testID="timer-stop"
              style={[styles.smallBtn, { backgroundColor: colors.danger }]}
              onPress={handlePause}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Stop"
            >
              <Square size={11} color={colors.white} fill={colors.white} />
              <Text style={styles.smallBtnText}>STOP</Text>
            </TouchableOpacity>
          ) : null}

          {showPaused ? (
            <TouchableOpacity
              testID="timer-resume"
              style={[styles.smallBtn, { backgroundColor: colors.primary }]}
              onPress={handleStart}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Resume"
            >
              <Play size={11} color={colors.white} fill={colors.white} />
              <Text style={styles.smallBtnText}>RESUME</Text>
            </TouchableOpacity>
          ) : null}

          {showActive ? (
            <TouchableOpacity
              testID="timer-end-half"
              style={[styles.endBtn, { backgroundColor: colors.primaryDark }]}
              onPress={handleEndPress}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`End ${endHalfNumber} Half`}
            >
              <Flag size={13} color={colors.white} />
              <Text style={styles.endBtnText}>END {endHalfNumber} HALF</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Reset confirm modal */}
      <ConfirmModal
        visible={resetVisible}
        title={`Reset ${endHalfNumber === '2nd' ? "2nd half's" : "this half's"} timer?`}
        body={`Resetting will erase the current half's elapsed time. If the half just ended, tap End ${endHalfNumber} Half instead — that records the time into your game stats.`}
        primaryLabel="Reset Anyway"
        primaryDestructive
        onPrimary={confirmReset}
        onCancel={() => setResetVisible(false)}
      />

      {/* End half confirm modal */}
      <ConfirmModal
        visible={endVisible}
        title={`End the ${endHalfNumber} Half?`}
        body={
          endHalfNumber === '1st'
            ? `This locks ${endHalfMMSS} as your first-half time and gets the second-half timer ready to start. You can't undo this from the timer (you can edit half times manually after the game ends).`
            : `This locks ${endHalfMMSS} as your second-half time and finishes the game timer.`
        }
        primaryLabel={`End ${endHalfNumber} Half`}
        onPrimary={confirmEndHalf}
        onCancel={() => setEndVisible(false)}
      />

      <HalfTimesEditModal
        visible={editVisible}
        firstHalfSeconds={firstHalfSeconds}
        secondHalfSeconds={secondHalfSeconds}
        onCancel={() => setEditVisible(false)}
        onSave={(f, s) => {
          onEditHalfTimes(f, s);
          setEditVisible(false);
        }}
      />
    </Animated.View>
  );
}

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  body: string;
  primaryLabel: string;
  primaryDestructive?: boolean;
  onPrimary: () => void;
  onCancel: () => void;
}

function ConfirmModal({ visible, title, body, primaryLabel, primaryDestructive, onPrimary, onCancel }: ConfirmModalProps) {
  const colors = useColors();
  const styles = useMemo(() => createModalStyles(colors), [colors]);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
    else anim.setValue(0);
  }, [visible, anim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Animated.View style={[styles.container, { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }], opacity: anim }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.content}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.body}>{body}</Text>
              <TouchableOpacity
                testID="confirm-modal-primary"
                style={[styles.primaryBtn, primaryDestructive && { backgroundColor: colors.danger }]}
                onPress={onPrimary}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryText}>{primaryLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="confirm-modal-cancel" style={styles.tertiaryBtn} onPress={onCancel} activeOpacity={0.7}>
                <Text style={styles.tertiaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

interface HalfTimesEditModalProps {
  visible: boolean;
  firstHalfSeconds: number;
  secondHalfSeconds: number;
  onCancel: () => void;
  onSave: (firstSeconds: number, secondSeconds: number) => void;
}

export function HalfTimesEditModal({ visible, firstHalfSeconds, secondHalfSeconds, onCancel, onSave }: HalfTimesEditModalProps) {
  const colors = useColors();
  const styles = useMemo(() => createModalStyles(colors), [colors]);
  const anim = useRef(new Animated.Value(0)).current;

  const [firstMin, setFirstMin] = useState<string>(String(Math.floor(firstHalfSeconds / 60)));
  const [firstSec, setFirstSec] = useState<string>(String(firstHalfSeconds % 60).padStart(2, '0'));
  const [secondMin, setSecondMin] = useState<string>(String(Math.floor(secondHalfSeconds / 60)));
  const [secondSec, setSecondSec] = useState<string>(String(secondHalfSeconds % 60).padStart(2, '0'));

  useEffect(() => {
    if (visible) {
      setFirstMin(String(Math.floor(firstHalfSeconds / 60)));
      setFirstSec(String(firstHalfSeconds % 60).padStart(2, '0'));
      setSecondMin(String(Math.floor(secondHalfSeconds / 60)));
      setSecondSec(String(secondHalfSeconds % 60).padStart(2, '0'));
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible, firstHalfSeconds, secondHalfSeconds, anim]);

  const handleSave = useCallback(() => {
    const f = Math.max(0, parseInt(firstMin || '0', 10)) * 60 + Math.max(0, Math.min(59, parseInt(firstSec || '0', 10)));
    const s = Math.max(0, parseInt(secondMin || '0', 10)) * 60 + Math.max(0, Math.min(59, parseInt(secondSec || '0', 10)));
    onSave(f, s);
  }, [firstMin, firstSec, secondMin, secondSec, onSave]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlay} onPress={onCancel}>
          <Animated.View style={[styles.container, { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }], opacity: anim }]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />
              <View style={styles.content}>
                <Text style={styles.title}>Edit Half Times</Text>
                <Text style={styles.body}>Adjust the recorded minutes and seconds for each half. These values flow into Minutes Played for this game.</Text>

                <Text style={styles.editLabel}>1st Half</Text>
                <View style={styles.editRow}>
                  <TextInput
                    testID="edit-first-half-min"
                    style={styles.editInput}
                    value={firstMin}
                    onChangeText={setFirstMin}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_DONE_BAR_ID : undefined}
                  />
                  <Text style={styles.editColon}>:</Text>
                  <TextInput
                    testID="edit-first-half-sec"
                    style={styles.editInput}
                    value={firstSec}
                    onChangeText={setFirstSec}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={colors.textMuted}
                    inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_DONE_BAR_ID : undefined}
                  />
                </View>

                <Text style={styles.editLabel}>2nd Half</Text>
                <View style={styles.editRow}>
                  <TextInput
                    testID="edit-second-half-min"
                    style={styles.editInput}
                    value={secondMin}
                    onChangeText={setSecondMin}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_DONE_BAR_ID : undefined}
                  />
                  <Text style={styles.editColon}>:</Text>
                  <TextInput
                    testID="edit-second-half-sec"
                    style={styles.editInput}
                    value={secondSec}
                    onChangeText={setSecondSec}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={colors.textMuted}
                    inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_DONE_BAR_ID : undefined}
                  />
                </View>

                <TouchableOpacity testID="edit-half-times-save" style={styles.primaryBtn} onPress={handleSave} activeOpacity={0.85}>
                  <Text style={styles.primaryText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="edit-half-times-cancel" style={styles.tertiaryBtn} onPress={onCancel} activeOpacity={0.7}>
                  <Text style={styles.tertiaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
        <KeyboardDoneBar />
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: { marginHorizontal: 20, marginBottom: 12, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: c.border },
    headerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 4 },
    label: { fontSize: fontSize.caption, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase' as const, letterSpacing: 1 },
    resetBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
    resetText: { fontSize: fontSize.caption, color: c.textSecondary, fontWeight: '600' as const },
    firstHalfBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginTop: 4, marginBottom: 2, alignSelf: 'flex-start' as const, backgroundColor: c.primaryGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    firstHalfBadgeText: { fontSize: fontSize.caption, color: c.primary, fontWeight: '700' as const },
    displayRow: { flexDirection: 'row' as const, alignItems: 'baseline' as const, justifyContent: 'space-between' as const, marginTop: 2, marginBottom: 8 },
    halfLabel: { fontSize: fontSize.body2, color: c.textSecondary, fontWeight: '600' as const },
    display: { fontSize: 28, fontWeight: '800' as const, color: c.text, fontVariant: ['tabular-nums'] as const, letterSpacing: 1 },
    buttonsRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    primaryBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
    primaryBtnText: { color: c.white, fontSize: fontSize.body2, fontWeight: '800' as const, letterSpacing: 1 },
    smallBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 5, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
    smallBtnText: { color: c.white, fontSize: fontSize.caption, fontWeight: '800' as const, letterSpacing: 1 },
    endBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10 },
    endBtnText: { color: c.white, fontSize: fontSize.caption, fontWeight: '800' as const, letterSpacing: 0.8 },
    totalRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginTop: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    totalLabel: { fontSize: fontSize.body2, color: c.textSecondary, fontWeight: '700' as const },
    totalValue: { fontSize: fontSize.bodyLg, color: c.text, fontWeight: '800' as const, fontVariant: ['tabular-nums'] as const },
    editLink: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, marginTop: 8, paddingVertical: 6 },
    editLinkText: { fontSize: fontSize.caption, color: c.primary, fontWeight: '700' as const },
  });
}

function createModalStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' as const },
    container: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, borderWidth: 1, borderColor: c.border, borderBottomWidth: 0 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderLight, alignSelf: 'center' as const, marginTop: 12, marginBottom: 8 },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
    title: { fontSize: fontSize.h2, fontWeight: '800' as const, color: c.text, marginBottom: 12 },
    body: { fontSize: fontSize.body, color: c.textSecondary, lineHeight: 20, marginBottom: 22 },
    primaryBtn: { backgroundColor: c.primaryDark, borderRadius: 14, paddingVertical: 16, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 10 },
    primaryText: { color: c.white, fontSize: fontSize.h4, fontWeight: '700' as const },
    tertiaryBtn: { paddingVertical: 12, alignItems: 'center' as const, justifyContent: 'center' as const },
    tertiaryText: { color: c.textMuted, fontSize: fontSize.body, fontWeight: '600' as const },
    editLabel: { fontSize: fontSize.caption, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6, marginTop: 4 },
    editRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 14 },
    editInput: { flex: 1, backgroundColor: c.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: fontSize.h3, fontWeight: '700' as const, borderWidth: 1, borderColor: c.border, textAlign: 'center' as const, fontVariant: ['tabular-nums'] as const },
    editColon: { fontSize: fontSize.h2, fontWeight: '800' as const, color: c.textMuted },
  });
}
