import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { UserMinus, Crown, Pencil, Shield, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { ProfileMember } from '@/lib/profile-db';

export default function ManageMembersScreen() {
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const colors = useColors();
  const { profiles, getMembers, removeProfileMember, userId } = useGoalkeepers();
  const profile = profiles.find(p => p.id === profileId);
  const isOwner = profile?.ownerId === userId;
  const [members, setMembers] = useState<ProfileMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const loadMembers = useCallback(async (showLoading: boolean) => {
    if (!profileId) return;
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await getMembers(profileId);
      setMembers(data);
      console.log('[ManageMembers] Loaded', data.length, 'members');
    } catch (e) {
      console.log('[ManageMembers] Error loading members:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [profileId, getMembers]);

  useEffect(() => {
    void loadMembers(true);
  }, [loadMembers]);

  const handleRefresh = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void loadMembers(false);
  }, [loadMembers]);

  const handleRemoveMember = useCallback((member: ProfileMember) => {
    if (member.role === 'owner') { Alert.alert('Cannot Remove', 'The profile owner cannot be removed.'); return; }
    Alert.alert('Remove Editor', `Remove "${member.display_name || 'Unknown'}" from this profile? They will lose access.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setRemovingId(member.user_id);
        const success = await removeProfileMember(profileId ?? '', member.user_id);
        if (success) { setMembers(prev => prev.filter(m => m.user_id !== member.user_id)); }
        else { Alert.alert('Error', 'Failed to remove member.'); }
        setRemovingId(null);
      }},
    ]);
  }, [profileId, removeProfileMember]);

  const renderMember = useCallback(({ item }: { item: ProfileMember }) => {
    const isMe = item.user_id === userId;
    const isItemOwner = item.role === 'owner';
    return (
      <View style={styles.memberCard}>
        <View style={[styles.memberAvatar, isItemOwner && styles.memberAvatarOwner]}>
          <Text style={styles.memberInitial}>{(item.display_name || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{item.display_name || 'Unknown'}{isMe ? ' (you)' : ''}</Text>
            {isItemOwner && (<View style={styles.ownerBadge}><Crown size={10} color={colors.accent} /><Text style={styles.ownerBadgeText}>Owner</Text></View>)}
            {!isItemOwner && (<View style={styles.editorBadge}><Pencil size={10} color={colors.primary} /><Text style={styles.editorBadgeText}>Editor</Text></View>)}
          </View>
          <Text style={styles.memberJoined}>Joined {new Date(item.joined_at).toLocaleDateString()}</Text>
        </View>
        {isOwner && !isItemOwner && (
          <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveMember(item)} activeOpacity={0.7} disabled={removingId === item.user_id}>
            {removingId === item.user_id ? <ActivityIndicator size="small" color={colors.danger} /> : <UserMinus size={16} color={colors.danger} />}
          </TouchableOpacity>
        )}
      </View>
    );
  }, [userId, isOwner, handleRemoveMember, removingId, styles, colors]);

  const keyExtractor = useCallback((item: ProfileMember) => item.user_id, []);

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: 'Members', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Text style={styles.errorText}>Profile not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `${profile.name} · Members`, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '700' as const } }} />
      <View style={styles.headerSection}>
        <View style={styles.headerLeft}>
          <Shield size={16} color={colors.primary} />
          <Text style={styles.headerText}>{members.length} member{members.length !== 1 ? 's' : ''} can access this profile</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} activeOpacity={0.7} style={styles.refreshBtn}>
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <RefreshCw size={16} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {!profile.sharedProfileId && (
        <View style={styles.localNotice}>
          <Text style={styles.localNoticeText}>
            This profile uses local sharing. Enable cloud sharing from the Share Profile screen to see real-time members.
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No members found. Share the invite code so others can join.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 20 },
    errorText: { color: c.textSecondary, fontSize: 16 },
    emptyText: { color: c.textMuted, fontSize: 14, textAlign: 'center' as const, lineHeight: 20 },
    headerSection: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 20, paddingVertical: 16 },
    headerLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, flex: 1 },
    headerText: { fontSize: 14, fontWeight: '600' as const, color: c.textSecondary },
    refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryGlow, alignItems: 'center' as const, justifyContent: 'center' as const },
    localNotice: { marginHorizontal: 20, marginBottom: 12, padding: 12, backgroundColor: c.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: c.border },
    localNoticeText: { fontSize: 12, color: c.textMuted, lineHeight: 18 },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    memberCard: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    memberAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surfaceLight, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12, borderWidth: 1, borderColor: c.border },
    memberAvatarOwner: { backgroundColor: c.accentGlow, borderColor: 'rgba(245, 158, 11, 0.3)' },
    memberInitial: { fontSize: 18, fontWeight: '700' as const, color: c.text },
    memberInfo: { flex: 1 },
    memberNameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, flexWrap: 'wrap' as const },
    memberName: { fontSize: 15, fontWeight: '600' as const, color: c.text },
    ownerBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: c.accentGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    ownerBadgeText: { fontSize: 10, fontWeight: '700' as const, color: c.accent },
    editorBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: c.primaryGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    editorBadgeText: { fontSize: 10, fontWeight: '700' as const, color: c.primary },
    memberJoined: { fontSize: 12, color: c.textMuted, marginTop: 3 },
    removeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.dangerGlow, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: 'rgba(248, 81, 73, 0.2)' },
  });
}
