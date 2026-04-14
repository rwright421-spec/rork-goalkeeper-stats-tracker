import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, Pressable } from 'react-native';
import { User, UserPlus, PenTool, Check, X, Link, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { fontSize } from '@/constants/typography';
import { GoalkeeperProfile } from '@/types/game';

export type KeeperSelectionMode = 'profile' | 'new' | 'manual';

export interface KeeperSelectionState {
  mode: KeeperSelectionMode;
  profileId: string | null;
  profileName: string;
  isLinked: boolean;
}

interface KeeperSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  profiles: GoalkeeperProfile[];
  currentSelection: KeeperSelectionState;
  onSelectProfile: (profile: GoalkeeperProfile) => void;
  onCreateProfile: (name: string, birthYear: string) => void;
  onManualEntry: (name: string) => void;
  halfLabel: string;
}

export function getSelectionIndicator(selection: KeeperSelectionState): { label: string; color: string } {
  if (selection.mode === 'profile' && selection.isLinked) {
    return { label: 'Linked', color: '#3B82F6' };
  }
  if (selection.mode === 'new' && selection.isLinked) {
    return { label: 'New', color: '#8B5CF6' };
  }
  return { label: 'Not Saved', color: '#F59E0B' };
}

export default React.memo(function KeeperSelectorSheet({
  visible,
  onClose,
  profiles,
  currentSelection,
  onSelectProfile,
  onCreateProfile,
  onManualEntry,
  halfLabel,
}: KeeperSelectorSheetProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeOption, setActiveOption] = useState<KeeperSelectionMode | null>(null);
  const [newName, setNewName] = useState('');
  const [newBirthYear, setNewBirthYear] = useState('');
  const [manualName, setManualName] = useState('');

  const handleOpen = useCallback(() => {
    setActiveOption(null);
    setNewName('');
    setNewBirthYear('');
    setManualName(currentSelection.mode === 'manual' ? currentSelection.profileName : '');
  }, [currentSelection]);

  React.useEffect(() => {
    if (visible) handleOpen();
  }, [visible, handleOpen]);

  const handleSelectProfile = useCallback((profile: GoalkeeperProfile) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectProfile(profile);
    onClose();
  }, [onSelectProfile, onClose]);

  const handleCreateProfile = useCallback(() => {
    if (!newName.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreateProfile(newName.trim(), newBirthYear.trim());
    onClose();
  }, [newName, newBirthYear, onCreateProfile, onClose]);

  const handleManualEntry = useCallback(() => {
    if (!manualName.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onManualEntry(manualName.trim());
    onClose();
  }, [manualName, onManualEntry, onClose]);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{halfLabel} Keeper</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeButton}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              testID="option-select-profile"
              style={[styles.optionCard, activeOption === 'profile' && styles.optionCardActive]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveOption(activeOption === 'profile' ? null : 'profile');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <User size={18} color="#3B82F6" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Select Saved Profile</Text>
                <Text style={styles.optionDesc}>Link to an existing goalkeeper profile</Text>
              </View>
            </TouchableOpacity>

            {activeOption === 'profile' && (
              <View style={styles.optionBody}>
                {sortedProfiles.length === 0 ? (
                  <Text style={styles.emptyText}>No saved profiles yet</Text>
                ) : (
                  sortedProfiles.map((profile) => {
                    const isSelected = currentSelection.profileId === profile.id && currentSelection.mode === 'profile';
                    const badge = profile.isShared ? 'Shared' : 'Local';
                    return (
                      <TouchableOpacity
                        key={profile.id}
                        testID={`profile-option-${profile.id}`}
                        style={[styles.profileRow, isSelected && styles.profileRowSelected]}
                        onPress={() => handleSelectProfile(profile)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.profileInfo}>
                          <Text style={styles.profileName}>{profile.name}</Text>
                          <View style={[styles.badge, profile.isShared ? styles.badgeShared : styles.badgeLocal]}>
                            <Text style={[styles.badgeText, profile.isShared ? styles.badgeTextShared : styles.badgeTextLocal]}>{badge}</Text>
                          </View>
                        </View>
                        {isSelected && <Check size={18} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            <TouchableOpacity
              testID="option-create-profile"
              style={[styles.optionCard, activeOption === 'new' && styles.optionCardActive]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveOption(activeOption === 'new' ? null : 'new');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <UserPlus size={18} color="#8B5CF6" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Create New Profile</Text>
                <Text style={styles.optionDesc}>Save a new goalkeeper and link immediately</Text>
              </View>
            </TouchableOpacity>

            {activeOption === 'new' && (
              <View style={styles.optionBody}>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Name</Text>
                  <TextInput
                    testID="new-profile-name"
                    style={styles.formInput}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Goalkeeper name"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Birth Year</Text>
                  <TextInput
                    testID="new-profile-birth-year"
                    style={styles.formInput}
                    value={newBirthYear}
                    onChangeText={setNewBirthYear}
                    placeholder="e.g. 2012"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <TouchableOpacity
                  testID="create-profile-confirm"
                  style={[styles.confirmButton, !newName.trim() && styles.confirmButtonDisabled]}
                  onPress={handleCreateProfile}
                  activeOpacity={0.7}
                  disabled={!newName.trim()}
                >
                  <Sparkles size={16} color={colors.white} />
                  <Text style={styles.confirmButtonText}>Create & Select</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              testID="option-manual-entry"
              style={[styles.optionCard, activeOption === 'manual' && styles.optionCardActive]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveOption(activeOption === 'manual' ? null : 'manual');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <PenTool size={18} color="#F59E0B" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Enter Name Only</Text>
                <Text style={styles.optionDesc}>Type a name without saving a profile</Text>
              </View>
            </TouchableOpacity>

            {activeOption === 'manual' && (
              <View style={styles.optionBody}>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Goalkeeper name (not saved)</Text>
                  <TextInput
                    testID="manual-keeper-name"
                    style={styles.formInput}
                    value={manualName}
                    onChangeText={setManualName}
                    placeholder="Type goalkeeper name"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  testID="manual-entry-confirm"
                  style={[styles.confirmButton, styles.confirmButtonManual, !manualName.trim() && styles.confirmButtonDisabled]}
                  onPress={handleManualEntry}
                  activeOpacity={0.7}
                  disabled={!manualName.trim()}
                >
                  <Check size={16} color={colors.white} />
                  <Text style={styles.confirmButtonText}>Use This Name</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export function KeeperSelectorButton({
  selectionState,
  onPress,
  label,
}: {
  selectionState: KeeperSelectionState;
  onPress: () => void;
  label: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createButtonStyles(colors), [colors]);
  const indicator = getSelectionIndicator(selectionState);
  const displayName = selectionState.profileName || 'Select keeper...';
  const hasSelection = !!selectionState.profileName;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        testID={`keeper-selector-${label.toLowerCase().replace(/\s/g, '-')}`}
        style={styles.button}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.buttonContent}>
          {hasSelection ? (
            <Link size={14} color={indicator.color} />
          ) : (
            <User size={14} color={colors.textMuted} />
          )}
          <Text style={[styles.buttonText, !hasSelection && styles.buttonPlaceholder]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        {hasSelection && (
          <View style={[styles.indicatorBadge, { backgroundColor: indicator.color + '20' }]}>
            <Text style={[styles.indicatorText, { color: indicator.color }]}>{indicator.label}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

function createButtonStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    label: { fontSize: fontSize.caption, color: c.textSecondary, fontWeight: '600' as const, marginBottom: 6 },
    button: {
      backgroundColor: c.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    buttonText: { fontSize: fontSize.bodyLg, color: c.text, flex: 1 },
    buttonPlaceholder: { color: c.textMuted },
    indicatorBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
    indicatorText: { fontSize: fontSize.sm, fontWeight: '700' as const },
  });
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      paddingBottom: 34,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderLight,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: {
      fontSize: fontSize.h4,
      fontWeight: '700' as const,
      color: c.text,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { flex: 1 },
    contentContainer: { padding: 20, gap: 8 },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    optionCardActive: {
      borderColor: c.primary,
      backgroundColor: c.surfaceLight,
    },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTextWrap: { flex: 1 },
    optionTitle: { fontSize: fontSize.bodyLg, fontWeight: '700' as const, color: c.text },
    optionDesc: { fontSize: fontSize.caption, color: c.textMuted, marginTop: 2 },
    optionBody: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      gap: 12,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    profileRowSelected: {
      backgroundColor: c.primaryGlow,
    },
    profileInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    profileName: { fontSize: fontSize.bodyLg, fontWeight: '600' as const, color: c.text },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    badgeLocal: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    badgeShared: { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
    badgeText: { fontSize: fontSize.xs, fontWeight: '700' as const },
    badgeTextLocal: { color: '#10B981' },
    badgeTextShared: { color: '#3B82F6' },
    emptyText: { fontSize: fontSize.body, color: c.textMuted, textAlign: 'center', paddingVertical: 16 },
    formField: { gap: 6 },
    formLabel: { fontSize: fontSize.caption, color: c.textSecondary, fontWeight: '600' as const },
    formInput: {
      backgroundColor: c.background,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.text,
      fontSize: fontSize.bodyLg,
      borderWidth: 1,
      borderColor: c.border,
    },
    confirmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primaryDark,
      borderRadius: 10,
      paddingVertical: 14,
      marginTop: 4,
    },
    confirmButtonManual: {
      backgroundColor: '#D97706',
    },
    confirmButtonDisabled: {
      opacity: 0.4,
    },
    confirmButtonText: {
      color: c.white,
      fontSize: fontSize.bodyLg,
      fontWeight: '700' as const,
    },
  });
}
