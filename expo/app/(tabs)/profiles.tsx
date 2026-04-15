// Profiles - Goalkeeper profile management screen
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeftRight, Users, Pencil, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useTeams } from '@/contexts/TeamContext';
import { fontSize } from '@/constants/typography';

const currentYear = new Date().getFullYear();
const YEARS: string[] = [];
for (let y = currentYear; y >= 1975; y--) YEARS.push(String(y));

export default function ProfilesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { activeProfile, isGuest, clearSelection, updateProfile } = useGoalkeepers();
  const { activeTeam, viewAllGames, clearTeamSelection } = useTeams();

  const [editingProfileMode, setEditingProfileMode] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileBirthYear, setEditProfileBirthYear] = useState('');
  const [editProfileYearPickerOpen, setEditProfileYearPickerOpen] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayName = isGuest ? 'Guest' : (activeProfile?.name ?? 'Goalkeeper');
  const teamLabel = viewAllGames ? 'All Games' : (activeTeam ? `${activeTeam.teamName} (${activeTeam.year})` : 'No team selected');

  const handleSwitchGoalkeeper = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearSelection();
    clearTeamSelection();
    try {
      router.replace('/');
    } catch (e) {
      console.error('[Profiles] Navigation error:', e);
      router.replace('/');
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
    Keyboard.dismiss();
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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 64 }]}
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
              testID="edit-profile-year-selector"
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
                testID="cancel-edit-profile"
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
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
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
            testID="switch-goalkeeper-profiles-btn"
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
              style={[styles.actionRow, { borderBottomWidth: 0 }]}
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
        </View>
      </ScrollView>
    </View>
    </TouchableWithoutFeedback>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, padding: 18, marginBottom: 28, borderWidth: 1, borderColor: c.border, gap: 14 },
    profileAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: c.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(16, 185, 129, 0.3)' },
    profileInitial: { fontSize: fontSize.h1, fontWeight: '800' as const, color: c.primary },
    profileInfo: { flex: 1 },
    profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    profileName: { fontSize: fontSize.h2, fontWeight: '800' as const, color: c.text, flexShrink: 1 },
    profileMeta: { fontSize: fontSize.body, color: c.textSecondary, fontWeight: '500' as const, marginTop: 3 },
    profileBirthYear: { fontSize: fontSize.caption, color: c.textMuted, fontWeight: '500' as const, marginTop: 2 },
    editProfileCard: { backgroundColor: c.surface, borderRadius: 16, padding: 18, marginBottom: 28, borderWidth: 1, borderColor: c.primary },
    fieldLabel: { fontSize: fontSize.caption, fontWeight: '600' as const, color: c.textSecondary, marginBottom: 6 },
    editInput: { backgroundColor: c.surfaceLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: c.text, fontSize: fontSize.bodyLg, borderWidth: 1, borderColor: c.border },
    yearSelector: { backgroundColor: c.surfaceLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: c.border },
    yearText: { fontSize: fontSize.bodyLg, color: c.text, fontWeight: '500' as const },
    yearDropdown: { backgroundColor: c.background, borderRadius: 10, borderWidth: 1, borderColor: c.border, marginTop: 4, overflow: 'hidden' },
    yearScroll: { maxHeight: 180 },
    yearOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
    yearOptionActive: { backgroundColor: c.primaryGlow },
    yearOptionText: { fontSize: fontSize.body, color: c.text, fontWeight: '500' as const },
    yearOptionTextActive: { color: c.primary, fontWeight: '700' as const },
    formActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
    cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: c.surfaceLight, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    cancelText: { fontSize: fontSize.body, fontWeight: '600' as const, color: c.textSecondary },
    confirmBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: c.primaryDark, alignItems: 'center' },
    confirmBtnDisabled: { opacity: 0.4 },
    confirmText: { fontSize: fontSize.body, fontWeight: '700' as const, color: c.white },
    sectionHeader: { marginBottom: 12 },
    sectionHeaderText: { fontSize: fontSize.body2, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    actionsSection: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden', marginBottom: 24 },
    actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    actionTextContainer: { flex: 1 },
    actionTitle: { fontSize: fontSize.subtitle, fontWeight: '600' as const, color: c.text },
    actionSubtitle: { fontSize: fontSize.caption, color: c.textMuted, fontWeight: '500' as const, marginTop: 1 },
  });
}
