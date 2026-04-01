import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { UserPlus, ClipboardPaste, Cloud } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { isValidShareCode } from '@/lib/share-codes';

function isValidCode(code: string): boolean {
  const trimmed = code.trim();
  if (isValidShareCode(trimmed)) return true;
  if (trimmed.length >= 4 && trimmed.length <= 8 && /^[A-Z0-9]+$/i.test(trimmed)) return true;
  return false;
}

export default function JoinProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { joinByCode, supabaseReady } = useGoalkeepers();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const isValid = isValidCode(code);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePaste = useCallback(async () => {
    if (Platform.OS === 'web') {
      try {
        const text = await navigator.clipboard.readText();
        if (text) setCode(text.trim());
      } catch {
        console.log('[JoinProfile] Clipboard paste failed');
      }
    }
  }, []);

  const handleJoin = useCallback(async () => {
    if (!isValid) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsJoining(true);
    try {
      const trimmedCode = code.trim().toUpperCase();
      const result = await joinByCode(trimmedCode);
      if (result.success) {
        if (result.alreadyMember) {
          Alert.alert('Already Exists', `A profile for "${result.profileName}" already exists on this device.`, [{ text: 'OK', onPress: () => router.back() }]);
        } else {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Profile Joined!', `"${result.profileName}" has been added to your profiles. Teams and games will sync automatically.`, [{ text: 'OK', onPress: () => router.back() }]);
        }
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Invalid Code', 'Could not find a profile with this code. Make sure you entered the correct invite code.');
      }
    } finally {
      setIsJoining(false);
    }
  }, [code, isValid, joinByCode, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Join Profile', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '700' as const } }} />
      <View style={styles.content}>
        <View style={styles.iconContainer}><UserPlus size={32} color={colors.primary} /></View>
        <Text style={styles.heading}>Join a Shared Profile</Text>
        <Text style={styles.subheading}>Enter the invite code you received from the profile owner</Text>

        {supabaseReady && (
          <View style={styles.cloudBadge}>
            <Cloud size={14} color={colors.primary} />
            <Text style={styles.cloudBadgeText}>Cloud sync enabled — teams and games will sync</Text>
          </View>
        )}

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={setCode}
            placeholder="Enter invite code"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {Platform.OS === 'web' && (
            <TouchableOpacity style={styles.pasteBtn} onPress={handlePaste} activeOpacity={0.7}>
              <ClipboardPaste size={16} color={colors.primary} />
              <Text style={styles.pasteBtnText}>Paste</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.joinButton, !isValid && styles.joinButtonDisabled]}
          onPress={handleJoin}
          disabled={!isValid || isJoining}
          activeOpacity={0.8}
        >
          {isJoining ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <UserPlus size={18} color="#fff" />
              <Text style={styles.joinButtonText}>Join Profile</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            When you join a shared profile, you'll get access to all the teams and games that have been recorded. Any new games you add will also sync to other members.
          </Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, alignItems: 'center' as const },
    iconContainer: { width: 64, height: 64, borderRadius: 18, backgroundColor: c.primaryGlow, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)', marginTop: 20, marginBottom: 20 },
    heading: { fontSize: 22, fontWeight: '800' as const, color: c.text, textAlign: 'center' as const, marginBottom: 8 },
    subheading: { fontSize: 14, color: c.textMuted, textAlign: 'center' as const, marginBottom: 20, lineHeight: 20, paddingHorizontal: 20 },
    cloudBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, backgroundColor: c.primaryGlow, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
    cloudBadgeText: { fontSize: 12, fontWeight: '600' as const, color: c.primary },
    inputWrapper: { width: '100%', marginBottom: 8 },
    codeInput: {
      width: '100%',
      height: 54,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 2,
      borderColor: c.border,
      color: c.text,
      fontSize: 20,
      fontWeight: '700' as const,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      paddingHorizontal: 16,
      textAlign: 'center' as const,
      letterSpacing: 3,
    },
    pasteBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, alignSelf: 'flex-end' as const, marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: c.primaryGlow, borderWidth: 1, borderColor: c.primary },
    pasteBtnText: { fontSize: 13, fontWeight: '600' as const, color: c.primary },
    joinButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, backgroundColor: c.primaryDark, borderRadius: 14, paddingVertical: 16, width: '100%', marginTop: 12, marginBottom: 24 },
    joinButtonDisabled: { opacity: 0.4 },
    joinButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' as const },
    infoCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.border, width: '100%' },
    infoText: { fontSize: 13, color: c.textMuted, lineHeight: 20, textAlign: 'center' as const },
  });
}
