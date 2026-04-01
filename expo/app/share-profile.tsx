import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, Animated, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Share2, Copy, Users, Shield, CloudUpload, RefreshCw, XCircle, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { getSupabase } from '@/lib/supabase';


export default function ShareProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const { profiles, userId, convertToShared, syncProfileData, stopSharing, leaveSharedProfile } = useGoalkeepers();
  const profile = profiles.find(p => p.id === profileId);
  const [isConverting, setIsConverting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resolvedCode, setResolvedCode] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const [isLoadingCode, setIsLoadingCode] = useState(false);

  useEffect(() => {
    if (!profile?.sharedProfileId) return;
    const storedCode = profile.inviteCode ?? '';
    if (storedCode && !storedCode.startsWith('GK-') && storedCode.length <= 8) {
      console.log('[ShareProfile] Using stored short invite code:', storedCode);
      setResolvedCode(storedCode);
      return;
    }
    console.log('[ShareProfile] No valid local code, fetching from Supabase. storedCode:', JSON.stringify(storedCode));
    const sb = getSupabase();
    if (!sb) {
      console.log('[ShareProfile] Supabase client not available');
      return;
    }
    setIsLoadingCode(true);
    void (async () => {
      try {
        const { data, error } = await sb
          .from('profiles')
          .select('invite_code')
          .eq('profile_id', profile.sharedProfileId!)
          .single();
        console.log('[ShareProfile] Supabase response - data:', JSON.stringify(data), 'error:', error?.message);
        if (!error && data?.invite_code) {
          console.log('[ShareProfile] Resolved short invite code:', data.invite_code);
          setResolvedCode(data.invite_code);
        } else {
          console.log('[ShareProfile] Could not resolve invite code, generating fallback');
        }
      } catch (e) {
        console.log('[ShareProfile] Error fetching invite code:', e);
      } finally {
        setIsLoadingCode(false);
      }
    })();
  }, [profile?.sharedProfileId, profile?.inviteCode]);

  const inviteCode = resolvedCode || profile?.inviteCode || '';
  console.log('[ShareProfile] Final inviteCode:', JSON.stringify(inviteCode), 'resolvedCode:', JSON.stringify(resolvedCode), 'profile.inviteCode:', JSON.stringify(profile?.inviteCode));
  const isCloudShared = !!profile?.sharedProfileId;

  const handleShareCode = useCallback(async () => {
    if (!inviteCode) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        Alert.alert('Share Code', inviteCode);
      }
    } else {
      const { Share } = await import('react-native');
      await Share.share({
        message: `Join my goalkeeper profile "${profile?.name ?? ''}" in GK Tracker!\n\nPaste this code in the app:\n${inviteCode}`,
        title: 'GK Tracker Invite',
      });
    }
  }, [inviteCode, profile?.name]);

  const handleManageMembers = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/manage-members' as any, params: { profileId: profileId ?? '' } });
  }, [router, profileId]);

  const handleSync = useCallback(async () => {
    if (!profileId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSyncing(true);
    try {
      const ok = await syncProfileData(profileId);
      if (ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Synced', 'Profile data has been synced from the cloud.');
      } else {
        Alert.alert('Sync Issue', 'Could not sync data. The cloud may not have any data yet, or Supabase is unavailable.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong during sync.');
    } finally {
      setIsSyncing(false);
    }
  }, [profileId, syncProfileData]);

  const isOwner = profile?.isShared
    ? (!profile.ownerId || profile.ownerId === userId)
    : true;

  const handleStopSharing = useCallback(async () => {
    if (!profileId) return;
    Alert.alert(
      'Stop Sharing',
      `This will disable cloud sharing for "${profile?.name ?? 'this profile'}". Other members will lose access. Your local data will be kept. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Sharing',
          style: 'destructive',
          onPress: async () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setIsStopping(true);
            try {
              const ok = await stopSharing(profileId);
              if (ok) {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Sharing Disabled', 'This profile is now local only. Other members have lost access.', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              } else {
                Alert.alert('Error', 'Could not disable sharing. Please try again.');
              }
            } catch {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setIsStopping(false);
            }
          },
        },
      ]
    );
  }, [profileId, profile?.name, stopSharing, router]);

  const handleLeaveProfile = useCallback(async () => {
    if (!profileId) return;
    Alert.alert(
      'Leave Profile',
      `This will remove "${profile?.name ?? 'this profile'}" from your device and you will no longer have access. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setIsLeaving(true);
            try {
              const ok = await leaveSharedProfile(profileId);
              if (ok) {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Left Profile', 'You no longer have access to this shared profile.', [
                  { text: 'OK', onPress: () => {
                    if (Platform.OS === 'web') {
                      router.replace('/');
                    } else {
                      router.dismissAll();
                    }
                  }},
                ]);
              } else {
                Alert.alert('Error', 'Could not leave profile. Please try again.');
              }
            } catch {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  }, [profileId, profile?.name, leaveSharedProfile, router]);

  const handleConvertToShared = useCallback(async () => {
    if (!profileId) return;
    Alert.alert(
      'Enable Cloud Sharing',
      `This will upload "${profile?.name ?? 'this profile'}" to the cloud so others can access the same teams and games. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable Sharing',
          onPress: async () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsConverting(true);
            try {
              const converted = await convertToShared(profileId);
              if (converted) {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Cloud Sharing Enabled!', 'Your teams and games are now synced to the cloud. Share the invite code with others so they can access this profile.');
              } else {
                Alert.alert('Error', 'Could not enable sharing. Please try again.');
              }
            } catch {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setIsConverting(false);
            }
          },
        },
      ]
    );
  }, [profileId, profile?.name, convertToShared]);

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: 'Share Profile', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Text style={styles.errorText}>Profile not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ title: 'Share Profile', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '700' as const } }} />
      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}><Shield size={24} color={colors.primary} /></View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileMeta}>
              {profile.birthYear ? `Born ${profile.birthYear} · ` : ''}
              {isOwner ? 'You own this profile' : 'Shared profile'}
              {isCloudShared ? ' · Cloud synced' : ''}
            </Text>
          </View>
        </View>
        {!profile.isShared ? (
          <View style={styles.notSharedCard}>
            <View style={styles.notSharedIconRow}>
              <CloudUpload size={28} color={colors.primary} />
            </View>
            <Text style={styles.notSharedTitle}>Enable Cloud Sharing</Text>
            <Text style={styles.notSharedText}>
              Upload this profile to the cloud so others can join and see the same teams, games, and stats — synced across all devices.
            </Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                testID="convert-to-shared-btn"
                style={styles.convertBtn}
                onPress={handleConvertToShared}
                activeOpacity={0.7}
                disabled={isConverting}
              >
                {isConverting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Share2 size={18} color="#fff" />
                    <Text style={styles.convertBtnText}>Enable Cloud Sharing</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        ) : (
          <>
            <View style={styles.codeSection}>
              <Text style={styles.codeSectionTitle}>INVITE CODE</Text>
              <Text style={styles.codeSectionSubtitle}>
                {isCloudShared
                  ? 'Share this code with others — they\'ll get access to all teams and games in real time'
                  : 'Share this code so others can import a copy of this profile'}
              </Text>
              <View style={styles.codeDisplay}>
                {isLoadingCode ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : inviteCode ? (
                  <Text style={styles.codeText} selectable>{inviteCode}</Text>
                ) : (
                  <Text style={[styles.codeText, { color: colors.textMuted, fontSize: 13 }]}>Code unavailable — try refreshing</Text>
                )}
              </View>
              <View style={styles.codeActions}>
                <TouchableOpacity style={styles.codeActionBtn} onPress={handleShareCode} activeOpacity={0.7}>
                  {copied ? (
                    <Text style={[styles.codeActionText, { color: colors.primary }]}>Copied!</Text>
                  ) : (
                    <>
                      {Platform.OS === 'web' ? <Copy size={16} color={colors.primary} /> : <Share2 size={16} color={colors.primary} />}
                      <Text style={styles.codeActionText}>{Platform.OS === 'web' ? 'Copy Code' : 'Share Code'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {isCloudShared && (
              <TouchableOpacity
                style={styles.syncBtn}
                onPress={handleSync}
                activeOpacity={0.7}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <RefreshCw size={18} color={colors.primary} />
                )}
                <Text style={styles.syncBtnText}>
                  {isSyncing ? 'Syncing...' : 'Sync from Cloud'}
                </Text>
              </TouchableOpacity>
            )}

            {isOwner && (
              <TouchableOpacity style={styles.manageMembersBtn} onPress={handleManageMembers} activeOpacity={0.7}>
                <Users size={18} color={colors.text} /><Text style={styles.manageMembersText}>Manage Members</Text>
              </TouchableOpacity>
            )}

            {isOwner && isCloudShared && (
              <TouchableOpacity
                testID="stop-sharing-btn"
                style={styles.dangerBtn}
                onPress={handleStopSharing}
                activeOpacity={0.7}
                disabled={isStopping}
              >
                {isStopping ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <XCircle size={18} color={colors.danger} />
                )}
                <Text style={styles.dangerBtnText}>
                  {isStopping ? 'Disabling...' : 'Stop Sharing This Profile'}
                </Text>
              </TouchableOpacity>
            )}

            {!isOwner && profile?.isShared && (
              <TouchableOpacity
                testID="leave-profile-btn"
                style={styles.dangerBtn}
                onPress={handleLeaveProfile}
                activeOpacity={0.7}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <LogOut size={18} color={colors.danger} />
                )}
                <Text style={styles.dangerBtnText}>
                  {isLeaving ? 'Leaving...' : 'Leave This Shared Profile'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>How cloud sharing works</Text>
              <Text style={styles.infoText}>
                {isCloudShared
                  ? '• Share the invite code with others\n• They paste it in "Join a Shared Profile"\n• Teams and games sync across all devices\n• Any member can add games and they\'ll appear for everyone\n• Pull latest changes with "Sync from Cloud"'
                  : '• Copy the share code and send it to others\n• They paste it in "Join a Shared Profile"\n• A copy of this profile will be created on their device'}
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    contentContainer: { flexGrow: 1 },
    centered: { alignItems: 'center' as const, justifyContent: 'center' as const },
    errorText: { color: c.textSecondary, fontSize: 16 },
    content: { padding: 20, gap: 16 },
    profileCard: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: c.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.border, gap: 14 },
    profileAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: c.primaryGlow, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)' },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: '700' as const, color: c.text },
    profileMeta: { fontSize: 13, color: c.textMuted, fontWeight: '500' as const, marginTop: 2 },
    notSharedCard: { backgroundColor: c.surfaceLight, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: c.border },
    notSharedTitle: { fontSize: 16, fontWeight: '700' as const, color: c.textSecondary, marginBottom: 8, textAlign: 'center' as const },
    notSharedText: { fontSize: 14, color: c.textMuted, lineHeight: 20, textAlign: 'center' as const },
    notSharedIconRow: { alignItems: 'center' as const, marginBottom: 12 },
    convertBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, backgroundColor: c.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 18 },
    convertBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },
    codeSection: { backgroundColor: c.surfaceLight, borderRadius: 14, padding: 20, borderWidth: 1.5, borderColor: c.primary, alignItems: 'center' as const },
    codeSectionTitle: { fontSize: 12, fontWeight: '800' as const, color: c.primary, letterSpacing: 2, marginBottom: 4 },
    codeSectionSubtitle: { fontSize: 13, color: c.textMuted, textAlign: 'center' as const, marginBottom: 20 },
    codeDisplay: { backgroundColor: c.background, borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: c.primary, width: '100%', marginBottom: 20 },
    codeText: { fontSize: 16, fontWeight: '700' as const, color: c.primaryLight, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center' as const, letterSpacing: 1.5 },
    codeActions: { flexDirection: 'row' as const, gap: 10, width: '100%' },
    codeActionBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    codeActionText: { fontSize: 14, fontWeight: '600' as const, color: c.primary },
    syncBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, paddingVertical: 14, borderRadius: 12, backgroundColor: c.primaryGlow, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
    syncBtnText: { fontSize: 15, fontWeight: '600' as const, color: c.primary },
    manageMembersBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, paddingVertical: 14, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    manageMembersText: { fontSize: 15, fontWeight: '600' as const, color: c.text },
    dangerBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, paddingVertical: 14, borderRadius: 12, backgroundColor: c.dangerGlow ?? 'rgba(248, 81, 73, 0.08)', borderWidth: 1, borderColor: 'rgba(248, 81, 73, 0.25)' },
    dangerBtnText: { fontSize: 15, fontWeight: '600' as const, color: c.danger ?? '#F85149' },
    infoCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.border },
    infoTitle: { fontSize: 13, fontWeight: '700' as const, color: c.textSecondary, marginBottom: 8 },
    infoText: { fontSize: 13, color: c.textMuted, lineHeight: 20 },
  });
}
