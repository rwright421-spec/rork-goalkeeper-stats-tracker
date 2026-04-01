import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeftRight, Users, Pencil, Share2, KeyRound, Cloud, ChevronRight, XCircle, LogOut } from 'lucide-react-native';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useTeams } from '@/contexts/TeamContext';

export default function ProfilesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { activeProfile, isGuest, clearSelection, userId, stopSharing, leaveSharedProfile, updateProfile } = useGoalkeepers();
  const { activeTeam, viewAllGames, clearTeamSelection } = useTeams();

  const [editingProfileMode, setEditingProfileMode] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileBirthYear, setEditProfileBirthYear] = useState('');
  const [editProfileYearPickerOpen, setEditProfileYearPickerOpen] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const currentYear = new Date().getFullYear();
  const YEARS: string[] = useMemo(() => {
    const yrs: string[] = [];
    for (let y = currentYear; y >= 1975; y--) yrs.push(String(y));
    return yrs;
  }, [currentYear]);

  const displayName = isGuest ? 'Guest' : (activeProfile?.name ?? 'Goalkeeper');
  const teamLabel = viewAllGames ? 'All Games' : (activeTeam ? `${activeTeam.teamName} (${activeTeam.year})` : 'No team selected');

  const handleSwitchGoalkeeper = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearSelection();
    clearTeamSelection();
    if (Platform.OS === 'web') {
      router.replace('/');
    } else {
      router.dismissAll();
    }
  }, [clearSelection, clearTeamSelection, router]);

  const handleSwitchTeam = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearTeamSelection();
    if (Platform.OS === 'web') {
      router.replace('/team-select');
    } else {
      router.push('/team-select');
    }
  }, [clearTeamSelection, router]);

  const handleEditProfile = useCallback(() => {
    if (!activeProfile) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditProfileName(activeProfile.name);
    setEditProfileBirthYear(activeProfile.birthYear ?? '');
    setEditingProfileMode(true);
    setEditProfileYearPickerOpen(false);
  }, [activeProfile]);

  const handleSaveEditProfile = useCallback(() => {
    if (!activeProfile || !editProfileName.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile(activeProfile.id, editProfileName, editProfileBirthYear || undefined);
    setEditingProfileMode(false);
    setEditProfileYearPickerOpen(false);
  }, [activeProfile, editProfileName, editProfileBirthYear, updateProfile]);

  const handleCancelEditProfile = useCallback(() => {
    setEditingProfileMode(false);
    setEditProfileYearPickerOpen(false);
  }, []);

  const handleShareProfile = useCallback(() => {
    if (!activeProfile) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/share-profile' as any, params: { profileId: activeProfile.id } });
  }, [activeProfile, router]);

  const handleJoinProfile = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/join-profile');
  }, [router]);

  const handleManageMembers = useCallback(() => {
    if (!activeProfile) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/manage-members' as any, params: { profileId: activeProfile.id } });
  }, [activeProfile, router]);

  const isSharedByMe = activeProfile?.isShared === true && 
    (!activeProfile.ownerId || !userId || activeProfile.ownerId === userId);
  const isSharedWithMe = activeProfile?.isShared === true && 
    !!activeProfile.ownerId && !!userId && activeProfile.ownerId !== userId;

  console.log('[Profiles] isShared:', activeProfile?.isShared, 'ownerId:', JSON.stringify(activeProfile?.ownerId), 'userId:', JSON.stringify(userId), 'isSharedByMe:', isSharedByMe, 'isSharedWithMe:', isSharedWithMe);

  const handleStopSharing = useCallback(() => {
    if (!activeProfile) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Stop Sharing',
      `This will disable cloud sharing for "${activeProfile.name}". Other members will lose access. Your local data will be kept. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Sharing',
          style: 'destructive',
          onPress: async () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const ok = await stopSharing(activeProfile.id);
            if (ok) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Sharing Disabled', 'This profile is now local only.');
            } else {
              Alert.alert('Error', 'Could not disable sharing. Please try again.');
            }
          },
        },
      ]
    );
  }, [activeProfile, stopSharing]);

  const handleLeaveProfile = useCallback(() => {
    if (!activeProfile) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Leave Profile',
      `This will remove "${activeProfile.name}" from your device and you will no longer have access. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const ok = await leaveSharedProfile(activeProfile.id);
            if (ok) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              clearSelection();
              clearTeamSelection();
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
          },
        },
      ]
    );
  }, [activeProfile, leaveSharedProfile, clearSelection, clearTeamSelection, router]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {editingProfileMode ? (
          <View style={styles.editProfileCard}>
            <Text style={styles.fieldLabel}>Goalkeeper Name</Text>
            <TextInput
              testID="edit-profile-name"
              style={styles.editInput}
              value={editProfileName}
              onChangeText={setEditProfileName}
              placeholder="Goalkeeper name"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="next"
            />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Birth Year</Text>
            <TouchableOpacity
              style={styles.yearSelector}
              onPress={() => setEditProfileYearPickerOpen(!editProfileYearPickerOpen)}
              activeOpacity={0.7}
            >
              <Text style={styles.yearText}>{editProfileBirthYear || 'Not set'}</Text>
            </TouchableOpacity>
            {editProfileYearPickerOpen && (
              <View style={styles.yearDropdown}>
                <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                  <TouchableOpacity
                    style={[styles.yearOption, !editProfileBirthYear && styles.yearOptionActive]}
                    onPress={() => {
                      setEditProfileBirthYear('');
                      setEditProfileYearPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.yearOptionText, !editProfileBirthYear && styles.yearOptionTextActive]}>
                      Not set
                    </Text>
                  </TouchableOpacity>
                  {YEARS.map((yr) => (
                    <TouchableOpacity
                      key={yr}
                      style={[styles.yearOption, editProfileBirthYear === yr && styles.yearOptionActive]}
                      onPress={() => {
                        setEditProfileBirthYear(yr);
                        setEditProfileYearPickerOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.yearOptionText, editProfileBirthYear === yr && styles.yearOptionTextActive]}>
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelEditProfile}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="save-edit-profile-btn"
                style={[styles.confirmBtn, !editProfileName.trim() && styles.confirmBtnDisabled]}
                onPress={handleSaveEditProfile}
                disabled={!editProfileName.trim()}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileCard}>
            <View style={[styles.profileAvatar, activeProfile?.isShared && styles.profileAvatarShared]}>
              <Text style={styles.profileInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{displayName}</Text>
                {activeProfile?.isShared && (
                  <View style={styles.sharedBadge}>
                    <Cloud size={10} color={colors.primary} />
                    <Text style={styles.sharedBadgeText}>Shared</Text>
                  </View>
                )}
              </View>
              <Text style={styles.profileMeta}>
                {isGuest ? 'Guest Mode' : teamLabel}
              </Text>
              {activeProfile?.birthYear ? (
                <Text style={styles.profileBirthYear}>Born {activeProfile.birthYear}</Text>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Quick Actions</Text>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            testID="switch-goalkeeper-btn"
            style={styles.actionRow}
            onPress={handleSwitchGoalkeeper}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accentGlow }]}>
              <ArrowLeftRight size={18} color={colors.accent} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Switch Goalkeeper</Text>
              <Text style={styles.actionSubtitle}>Choose a different profile</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {!isGuest && (
            <TouchableOpacity
              testID="switch-team-btn"
              style={styles.actionRow}
              onPress={handleSwitchTeam}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primaryGlow }]}>
                <Users size={18} color={colors.primary} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Switch Team</Text>
                <Text style={styles.actionSubtitle}>Select a different team</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {!isGuest && activeProfile && (
            <TouchableOpacity
              testID="edit-profile-btn"
              style={styles.actionRow}
              onPress={handleEditProfile}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                <Pencil size={18} color="#8B5CF6" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Edit Profile</Text>
                <Text style={styles.actionSubtitle}>Update name or birth year</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {!isGuest && activeProfile && (
            <TouchableOpacity
              testID="share-profile-quick-btn"
              style={styles.actionRow}
              onPress={handleShareProfile}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <Share2 size={18} color="#3B82F6" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Share Profile</Text>
                <Text style={styles.actionSubtitle}>Invite others to collaborate</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {!isGuest && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>Sharing</Text>
            </View>

            <View style={styles.actionsSection}>
              {activeProfile?.isShared && !isSharedWithMe && (
                <TouchableOpacity
                  testID="manage-members-btn"
                  style={styles.actionRow}
                  onPress={handleManageMembers}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIcon, { backgroundColor: colors.primaryGlow }]}>
                    <Users size={18} color={colors.primary} />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Manage Members</Text>
                    <Text style={styles.actionSubtitle}>View or remove editors</Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                testID="join-profile-btn"
                style={styles.actionRow}
                onPress={handleJoinProfile}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <KeyRound size={18} color="#3B82F6" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Join a Shared Profile</Text>
                  <Text style={styles.actionSubtitle}>Enter an invite code</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {activeProfile?.isShared && !isSharedWithMe && (
                <TouchableOpacity
                  testID="stop-sharing-btn"
                  style={styles.actionRow}
                  onPress={handleStopSharing}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(248, 81, 73, 0.1)' }]}>
                    <XCircle size={18} color="#F85149" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionTitle, { color: '#F85149' }]}>Stop Sharing</Text>
                    <Text style={styles.actionSubtitle}>Disable cloud sharing for this profile</Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}

              {activeProfile?.isShared && isSharedWithMe && (
                <TouchableOpacity
                  testID="leave-profile-btn"
                  style={styles.actionRow}
                  onPress={handleLeaveProfile}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(248, 81, 73, 0.1)' }]}>
                    <LogOut size={18} color="#F85149" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionTitle, { color: '#F85149' }]}>Leave Shared Profile</Text>
                    <Text style={styles.actionSubtitle}>Remove this profile from your device</Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 28,
      borderWidth: 1,
      borderColor: c.border,
      gap: 14,
    },
    profileAvatar: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    profileAvatarShared: {
      borderColor: 'rgba(59, 130, 246, 0.4)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    profileInitial: {
      fontSize: 24,
      fontWeight: '800' as const,
      color: c.primary,
    },
    profileInfo: {
      flex: 1,
    },
    profileNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    profileName: {
      fontSize: 20,
      fontWeight: '800' as const,
      color: c.text,
    },
    sharedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primaryGlow,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    sharedBadgeText: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: c.primary,
    },
    profileMeta: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '500' as const,
      marginTop: 3,
    },
    profileBirthYear: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '500' as const,
      marginTop: 2,
    },
    editProfileCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 28,
      borderWidth: 1,
      borderColor: c.primary,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: c.textSecondary,
      marginBottom: 6,
    },
    editInput: {
      backgroundColor: c.surfaceLight,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: c.text,
      fontSize: 15,
      borderWidth: 1,
      borderColor: c.border,
    },
    yearSelector: {
      backgroundColor: c.surfaceLight,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    yearText: {
      fontSize: 15,
      color: c.text,
      fontWeight: '500' as const,
    },
    yearDropdown: {
      backgroundColor: c.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 4,
      overflow: 'hidden',
    },
    yearScroll: {
      maxHeight: 180,
    },
    yearOption: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    yearOptionActive: {
      backgroundColor: c.primaryGlow,
    },
    yearOptionText: {
      fontSize: 14,
      color: c.text,
      fontWeight: '500' as const,
    },
    yearOptionTextActive: {
      color: c.primary,
      fontWeight: '700' as const,
    },
    formActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.surfaceLight,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    cancelText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: c.textSecondary,
    },
    confirmBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.primaryDark,
      alignItems: 'center',
    },
    confirmBtnDisabled: {
      opacity: 0.4,
    },
    confirmText: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: c.white,
    },
    sectionHeader: {
      marginBottom: 12,
    },
    sectionHeaderText: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    actionsSection: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      marginBottom: 24,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    actionTextContainer: {
      flex: 1,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: c.text,
    },
    actionSubtitle: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '500' as const,
      marginTop: 1,
    },
  });
}
