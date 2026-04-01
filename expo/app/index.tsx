import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, UserPlus, Users, UserX, Trash2, ChevronRight, Pencil, Cloud } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { GoalkeeperProfile } from '@/types/game';

function getRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function GoalkeeperSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {
    profiles, isLoading, createProfile, updateProfile, deleteProfile,
    selectProfile, selectGuest, userId, getLastEditedByName,
  } = useGoalkeepers();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBirthYear, setNewBirthYear] = useState('');
  const [editingProfile, setEditingProfile] = useState<GoalkeeperProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editBirthYear, setEditBirthYear] = useState('');

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const profile = createProfile(newName, newBirthYear);
    setNewName('');
    setNewBirthYear('');
    setShowCreate(false);
    selectProfile(profile.id);
    router.push('/(tabs)/dashboard');
  }, [newName, newBirthYear, createProfile, selectProfile, router]);

  const handleSelectProfile = useCallback((profileId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectProfile(profileId);
    router.push('/(tabs)/dashboard');
  }, [selectProfile, router]);

  const handleGuest = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectGuest();
    router.push('/(tabs)/dashboard');
  }, [selectGuest, router]);

  const handleEditProfile = useCallback((profile: GoalkeeperProfile) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingProfile(profile);
    setEditName(profile.name);
    setEditBirthYear(profile.birthYear || '');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingProfile || !editName.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile(editingProfile.id, editName, editBirthYear);
    setEditingProfile(null);
    setEditName('');
    setEditBirthYear('');
  }, [editingProfile, editName, editBirthYear, updateProfile]);

  const handleCancelEdit = useCallback(() => {
    setEditingProfile(null);
    setEditName('');
    setEditBirthYear('');
  }, []);

  const handleDeleteProfile = useCallback((profile: GoalkeeperProfile) => {
    if (profile.isShared && profile.ownerId !== userId) {
      Alert.alert('Cannot Delete', 'Only the profile owner can delete this shared profile.');
      return;
    }
    Alert.alert(
      'Delete Goalkeeper',
      `Are you sure you want to delete "${profile.name}"? This will permanently remove this goalkeeper and all games associated with them. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteProfile(profile.id);
          },
        },
      ],
    );
  }, [deleteProfile, userId]);



  const renderProfile = useCallback(({ item }: { item: GoalkeeperProfile }) => {
    if (editingProfile?.id === item.id) {
      return (
        <View style={styles.editCard}>
          <Text style={styles.createLabel}>Edit Name</Text>
          <TextInput
            style={styles.createInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="Enter name..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="next"
          />
          <Text style={styles.createLabel}>Birth Year</Text>
          <TextInput
            style={styles.createInput}
            value={editBirthYear}
            onChangeText={setEditBirthYear}
            placeholder="e.g. 2010"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={4}
            returnKeyType="done"
            onSubmitEditing={handleSaveEdit}
          />
          <View style={styles.createActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelEdit}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !editName.trim() && styles.confirmBtnDisabled]}
              onPress={handleSaveEdit}
              disabled={!editName.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const isOwner = item.ownerId === userId;
    const canDelete = !item.isShared || isOwner;
    const lastEditedName = getLastEditedByName(item.lastEditedBy);
    const relTime = getRelativeTime(item.updatedAt);

    return (
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => handleSelectProfile(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.profileAvatar, item.isShared && styles.profileAvatarShared]}>
          <Text style={styles.profileInitial}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.profileNameRow}>
            <Text style={styles.profileName} numberOfLines={1}>{item.name}</Text>
            {item.isShared && (
              <View style={styles.sharedBadge}>
                <Cloud size={9} color={colors.primary} />
                <Text style={styles.sharedBadgeText}>Shared</Text>
              </View>
            )}
          </View>
          <Text style={styles.profileDate}>
            {item.birthYear ? `Born ${item.birthYear} · ` : ''}
            Created {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          {item.isShared && lastEditedName && relTime ? (
            <Text style={styles.lastEditedText}>
              Last edited by {lastEditedName} · {relTime}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.profileEditBtn}
          onPress={() => handleEditProfile(item)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Pencil size={14} color={colors.primary} />
        </TouchableOpacity>
        {canDelete && (
          <TouchableOpacity
            style={styles.profileDeleteBtn}
            onPress={() => handleDeleteProfile(item)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={16} color={colors.danger} />
          </TouchableOpacity>
        )}
        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }, [handleSelectProfile, handleDeleteProfile, handleEditProfile, handleCancelEdit, handleSaveEdit, editingProfile, editName, editBirthYear, userId, getLastEditedByName, styles, colors]);

  const keyExtractor = useCallback((item: GoalkeeperProfile) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.logoIcon}>
          <Shield size={28} color={colors.primary} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>GK Tracker</Text>
        <Text style={styles.subtitle}>Goalkeeper Performance</Text>
        <View style={styles.cloudStatus}>
          <Cloud size={12} color={colors.primary} />
          <Text style={styles.cloudStatusText}>Sharing available</Text>
        </View>
      </View>

      <View style={styles.actionsSection}>
        {!showCreate ? (
          <TouchableOpacity
            testID="create-goalkeeper-btn"
            style={styles.actionButton}
            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCreate(true); }}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <UserPlus size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Create a Goalkeeper</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.createForm}>
            <Text style={styles.createLabel}>Goalkeeper Name</Text>
            <TextInput
              testID="new-keeper-name"
              style={styles.createInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter name..."
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="next"
            />
            <Text style={styles.createLabel}>Birth Year</Text>
            <TextInput
              testID="new-keeper-birth-year"
              style={styles.createInput}
              value={newBirthYear}
              onChangeText={setNewBirthYear}
              placeholder="e.g. 2010"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={styles.createActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowCreate(false); setNewName(''); setNewBirthYear(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="confirm-create-btn"
                style={[styles.confirmBtn, !newName.trim() && styles.confirmBtnDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim()}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          testID="guest-goalkeeper-btn"
          style={styles.guestButton}
          onPress={handleGuest}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, styles.guestIconContainer]}>
            <UserX size={20} color={colors.accent} />
          </View>
          <View style={styles.guestTextContainer}>
            <Text style={styles.guestText}>Guest Goalkeeper</Text>
            <Text style={styles.guestSubtext}>No stats saved</Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.profilesHeader}>
        <Users size={16} color={colors.textMuted} />
        <Text style={styles.profilesTitle}>Existing Goalkeepers</Text>
        <Text style={styles.profilesCount}>{profiles.length}</Text>
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : profiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Shield size={40} color={colors.border} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No Goalkeepers Yet</Text>
          <Text style={styles.emptySubtitle}>Create a goalkeeper to start tracking</Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfile}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      alignItems: 'center',
      paddingTop: 20,
      paddingBottom: 24,
    },
    logoIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
      marginBottom: 12,
    },
    title: {
      fontSize: 28,
      fontWeight: '800' as const,
      color: c.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '500' as const,
      marginTop: 2,
    },
    cloudStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: c.surface,
    },
    cloudStatusText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: c.primary,
    },
    actionsSection: {
      paddingHorizontal: 20,
      marginBottom: 24,
      gap: 10,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    actionIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    actionText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700' as const,
      color: c.text,
    },
    createForm: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    createLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: c.textSecondary,
      marginBottom: 8,
    },
    createInput: {
      backgroundColor: c.surfaceLight,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.text,
      fontSize: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 12,
    },
    createActions: {
      flexDirection: 'row',
      gap: 10,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
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
      paddingVertical: 12,
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
    guestButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    guestIconContainer: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
    },
    guestTextContainer: {
      flex: 1,
    },
    guestText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: c.text,
    },
    guestSubtext: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '500' as const,
      marginTop: 1,
    },
    profilesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 12,
      gap: 8,
    },
    profilesTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700' as const,
      color: c.textSecondary,
    },
    profilesCount: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: c.textMuted,
      backgroundColor: c.surface,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      overflow: 'hidden',
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    profileAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    profileAvatarShared: {
      borderColor: 'rgba(59, 130, 246, 0.4)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    profileInitial: {
      fontSize: 18,
      fontWeight: '800' as const,
      color: c.primary,
    },
    profileInfo: {
      flex: 1,
    },
    profileNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    profileName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: c.text,
      flexShrink: 1,
    },
    sharedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.primaryGlow,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
    },
    sharedBadgeText: {
      fontSize: 9,
      fontWeight: '700' as const,
      color: c.primary,
    },
    profileDate: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    lastEditedText: {
      fontSize: 11,
      color: c.textMuted,
      fontStyle: 'italic' as const,
      marginTop: 2,
    },
    editCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    profileEditBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    profileDeleteBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.dangerGlow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      borderWidth: 1,
      borderColor: 'rgba(248, 81, 73, 0.2)',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 60,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
      color: c.textSecondary,
      marginTop: 8,
    },
    emptySubtitle: {
      fontSize: 13,
      color: c.textMuted,
    },
  });
}
