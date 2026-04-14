import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { X, Shield, Users, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as secureStorage from '@/utils/secureStorage';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { fontSize } from '@/constants/typography';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useGames } from '@/contexts/GameContext';
import { GoalkeeperProfile, Team, SavedGame } from '@/types/game';

interface MoveGameModalProps {
  visible: boolean;
  onClose: () => void;
  game: SavedGame | null;
  onMoveComplete: () => void;
}

export default function MoveGameModal({ visible, onClose, game, onMoveComplete }: MoveGameModalProps) {
  const colors = useColors();
  const { profiles, activeProfileId, userId } = useGoalkeepers();
  const { moveGameToProfile } = useGames();
  const [isMoving, setIsMoving] = useState(false);
  const [destinationTeams, setDestinationTeams] = useState<Record<string, Team[]>>({});

  const styles = useMemo(() => createStyles(colors), [colors]);

  const availableProfiles = useMemo(() => {
    return profiles.filter(p => {
      if (p.id === activeProfileId) return false;
      if (p.isShared && p.ownerId !== userId) {
        return true;
      }
      return true;
    });
  }, [profiles, activeProfileId, userId]);

  useEffect(() => {
    if (!visible) return;
    const loadDestTeams = async () => {
      const result: Record<string, Team[]> = {};
      for (const profile of availableProfiles) {
        try {
          const key = `gk_tracker_teams_${profile.id}`;
          const teams = await secureStorage.getItem<Team[]>(key);
          result[profile.id] = teams ?? [];
        } catch {
          result[profile.id] = [];
        }
      }
      setDestinationTeams(result);
    };
    void loadDestTeams();
  }, [visible, availableProfiles]);

  const handleSelectProfile = useCallback(async (destProfile: GoalkeeperProfile) => {
    if (!game || isMoving) return;

    const gameTeamName = game.homeKeeper?.teamName || game.awayKeeper?.teamName || '';
    const gameYear = game.homeKeeper?.year || game.awayKeeper?.year || '';

    const destTeams = destinationTeams[destProfile.id] ?? [];
    let targetTeamId: string | null = null;

    const existingTeam = destTeams.find(t =>
      t.teamName.toLowerCase() === gameTeamName.toLowerCase() && t.year === gameYear
    );

    if (existingTeam) {
      targetTeamId = existingTeam.id;
    } else if (gameTeamName) {
      const newTeam: Team = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        goalkeeperProfileId: destProfile.id,
        year: gameYear,
        teamName: gameTeamName,
        createdAt: new Date().toISOString(),
      };
      targetTeamId = newTeam.id;

      const destKey = `gk_tracker_teams_${destProfile.id}`;
      const updatedTeams = [newTeam, ...destTeams];
      await secureStorage.setItem(destKey, updatedTeams);

    }

    const currentProfileName = profiles.find(p => p.id === activeProfileId)?.name ?? 'current goalkeeper';

    Alert.alert(
      'Move Game',
      `Move this game to ${destProfile.name}? The game will no longer appear under ${currentProfileName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          style: 'default',
          onPress: async () => {
            setIsMoving(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const success = await moveGameToProfile(game.id, destProfile.id, targetTeamId);
            setIsMoving(false);
            if (success) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onClose();
              onMoveComplete();
            } else {
              Alert.alert('Error', 'Failed to move the game. Please try again.');
            }
          },
        },
      ],
    );
  }, [game, isMoving, destinationTeams, profiles, activeProfileId, moveGameToProfile, onClose, onMoveComplete]);

  const renderProfile = useCallback(({ item }: { item: GoalkeeperProfile }) => {
    const teamCount = (destinationTeams[item.id] ?? []).length;
    return (
      <TouchableOpacity
        testID={`move-dest-${item.id}`}
        style={styles.profileRow}
        onPress={() => handleSelectProfile(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.profileIcon, item.isShared && styles.profileIconShared]}>
          {item.isShared ? (
            <Users size={18} color={colors.accent} />
          ) : (
            <Shield size={18} color={colors.primary} />
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.profileMeta}>
            {item.isShared ? 'Shared' : 'Local'}{teamCount > 0 ? ` · ${teamCount} team${teamCount > 1 ? 's' : ''}` : ''}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }, [destinationTeams, styles, colors, handleSelectProfile]);

  const keyExtractor = useCallback((item: GoalkeeperProfile) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Move to Goalkeeper</Text>
            <TouchableOpacity
              testID="move-modal-close"
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {game && (
            <View style={styles.gameSummary}>
              <Text style={styles.gameSummaryText} numberOfLines={1}>
                {game.setup.eventName} · vs {game.setup.gameName}
              </Text>
              <Text style={styles.gameSummaryDate}>{game.setup.date}</Text>
            </View>
          )}

          {isMoving ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Moving game…</Text>
            </View>
          ) : availableProfiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Shield size={40} color={colors.border} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No Other Goalkeepers</Text>
              <Text style={styles.emptySubtitle}>Create another goalkeeper profile first.</Text>
            </View>
          ) : (
            <FlatList
              data={availableProfiles}
              renderItem={renderProfile}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '75%',
      paddingBottom: 40,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: fontSize.h3,
      fontWeight: '700' as const,
      color: c.text,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gameSummary: {
      marginHorizontal: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 12,
    },
    gameSummaryText: {
      fontSize: fontSize.body,
      fontWeight: '600' as const,
      color: c.text,
    },
    gameSummaryDate: {
      fontSize: fontSize.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    profileIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    profileIconShared: {
      backgroundColor: c.accentGlow,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: fontSize.bodyLg,
      fontWeight: '600' as const,
      color: c.text,
    },
    profileMeta: {
      fontSize: fontSize.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 12,
    },
    loadingText: {
      fontSize: fontSize.body,
      color: c.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 8,
    },
    emptyTitle: {
      fontSize: fontSize.subtitle,
      fontWeight: '600' as const,
      color: c.textSecondary,
      marginTop: 4,
    },
    emptySubtitle: {
      fontSize: fontSize.body2,
      color: c.textMuted,
    },
  });
}
