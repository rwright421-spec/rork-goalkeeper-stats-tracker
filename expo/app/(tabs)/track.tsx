import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Shield, Filter, ChevronDown, Users, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGames } from '@/contexts/GameContext';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useTeams } from '@/contexts/TeamContext';
import GameCard from '@/components/GameCard';
import MoveGameModal from '@/components/MoveGameModal';
import { SavedGame } from '@/types/game';

export default function TrackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { games, isLoading, deleteGame } = useGames();
  const { activeProfile, isGuest } = useGoalkeepers();
  const { teams, activeTeam, activeTeamId, viewAllGames, selectTeam, showAllGames } = useTeams();

  const [moveGame, setMoveGame] = useState<SavedGame | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  const displayName = isGuest ? 'Guest' : (activeProfile?.name ?? 'Goalkeeper');
  const filterLabel = viewAllGames || !activeTeam ? 'All Games' : `${activeTeam.teamName} (${activeTeam.year})`;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleNewGame = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/new-game');
  }, [router]);

  const handleViewGame = useCallback((gameId: string) => {
    router.push(`/game-detail?id=${gameId}`);
  }, [router]);

  const handleMoveGame = useCallback((game: SavedGame) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMoveGame(game);
  }, []);

  const handleMoveComplete = useCallback(() => {
    setMoveGame(null);
  }, []);

  const handleDeleteGame = useCallback((game: SavedGame) => {
    Alert.alert(
      'Delete Game',
      `Delete "${game.setup.eventName}" stats?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteGame(game.id);
          },
        },
      ],
    );
  }, [deleteGame]);

  const handleFilterAll = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showAllGames();
    setShowFilter(false);
  }, [showAllGames]);

  const handleFilterTeam = useCallback((teamId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    selectTeam(teamId);
    setShowFilter(false);
  }, [selectTeam]);

  const renderItem = useCallback(({ item }: { item: SavedGame }) => (
    <GameCard
      game={item}
      onPress={() => handleViewGame(item.id)}
      onDelete={() => handleDeleteGame(item)}
      onMove={() => handleMoveGame(item)}
    />
  ), [handleViewGame, handleDeleteGame, handleMoveGame]);

  const keyExtractor = useCallback((item: SavedGame) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Shield size={22} color={colors.primary} strokeWidth={2.5} />
          </View>
          <View style={styles.logoTextContainer}>
            <Text style={styles.title}>{displayName}</Text>
            {!isGuest && teams.length > 0 ? (
              <TouchableOpacity
                testID="team-picker-btn"
                style={styles.teamPickerBtn}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowTeamPicker(!showTeamPicker);
                  setShowFilter(false);
                }}
                activeOpacity={0.7}
              >
                <Users size={12} color={colors.primary} />
                <Text style={styles.teamPickerText}>{filterLabel}</Text>
                <ChevronDown size={12} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.subtitle}>{isGuest ? 'Guest Mode · Stats not saved' : filterLabel}</Text>
            )}
          </View>
        </View>
      </View>

      {showTeamPicker && !isGuest && teams.length > 0 && (
        <View style={styles.teamPickerDropdown}>
          <TouchableOpacity
            style={[styles.teamPickerOption, (viewAllGames || !activeTeamId) && styles.teamPickerOptionActive]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              showAllGames();
              setShowTeamPicker(false);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.teamPickerOptionLeft}>
              <View style={[styles.teamPickerDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.teamPickerOptionText, (viewAllGames || !activeTeamId) && styles.teamPickerOptionTextActive]}>All Games</Text>
            </View>
            {(viewAllGames || !activeTeamId) && <Check size={14} color={colors.primary} />}
          </TouchableOpacity>
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[styles.teamPickerOption, activeTeamId === team.id && styles.teamPickerOptionActive]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                selectTeam(team.id);
                setShowTeamPicker(false);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.teamPickerOptionLeft}>
                <View style={[styles.teamPickerDot, { backgroundColor: colors.primary }]} />
                <View>
                  <Text style={[styles.teamPickerOptionText, activeTeamId === team.id && styles.teamPickerOptionTextActive]}>{team.teamName}</Text>
                  <Text style={styles.teamPickerOptionMeta}>{team.year} Season</Text>
                </View>
              </View>
              {activeTeamId === team.id && <Check size={14} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        testID="new-game-button"
        style={styles.newGameButton}
        onPress={handleNewGame}
        activeOpacity={0.8}
      >
        <View style={styles.newGameInner}>
          <Plus size={22} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.newGameText}>New Game</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.priorHeader}>
        <Text style={styles.priorTitle}>Games</Text>
        <Text style={styles.priorCount}>{games.length}</Text>
        {!isGuest && teams.length > 0 && (
          <TouchableOpacity
            testID="filter-games-btn"
            style={styles.filterBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFilter(!showFilter);
            }}
            activeOpacity={0.7}
          >
            <Filter size={14} color={activeTeamId ? colors.primary : colors.textMuted} />
            <Text style={[styles.filterBtnText, activeTeamId ? { color: colors.primary } : null]}>
              {activeTeamId ? 'Filtered' : 'Filter'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showFilter && (
        <View style={styles.filterDropdown}>
          <TouchableOpacity
            style={[styles.filterOption, (!activeTeamId || viewAllGames) && styles.filterOptionActive]}
            onPress={handleFilterAll}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterOptionText, (!activeTeamId || viewAllGames) && styles.filterOptionTextActive]}>
              All Games
            </Text>
          </TouchableOpacity>
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[styles.filterOption, activeTeamId === team.id && styles.filterOptionActive]}
              onPress={() => handleFilterTeam(team.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterOptionText, activeTeamId === team.id && styles.filterOptionTextActive]}>
                {team.teamName} ({team.year})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : games.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Shield size={48} color={colors.border} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No Games Yet</Text>
          <Text style={styles.emptySubtitle}>Tap "New Game" to start tracking</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <MoveGameModal
        visible={moveGame !== null}
        onClose={() => setMoveGame(null)}
        game={moveGame}
        onMoveComplete={handleMoveComplete}
      />
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
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoTextContainer: {
      flex: 1,
    },
    logoIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    title: {
      fontSize: 24,
      fontWeight: '800' as const,
      color: c.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '500' as const,
      marginTop: 1,
    },
    teamPickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.primaryGlow,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      marginTop: 4,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    teamPickerText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: c.primary,
    },
    teamPickerDropdown: {
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    teamPickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    teamPickerOptionActive: {
      backgroundColor: c.primaryGlow,
    },
    teamPickerOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    teamPickerDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    teamPickerOptionText: {
      fontSize: 15,
      fontWeight: '500' as const,
      color: c.text,
    },
    teamPickerOptionTextActive: {
      color: c.primary,
      fontWeight: '700' as const,
    },
    teamPickerOptionMeta: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: '500' as const,
      marginTop: 1,
    },
    newGameButton: {
      marginHorizontal: 20,
      marginBottom: 20,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: c.primaryDark,
    },
    newGameInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 16,
    },
    newGameText: {
      color: c.white,
      fontSize: 17,
      fontWeight: '700' as const,
    },
    priorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 12,
      gap: 8,
    },
    priorTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: c.text,
      flex: 1,
    },
    priorCount: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: c.textMuted,
      backgroundColor: c.surface,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      overflow: 'hidden',
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    filterBtnText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: c.textMuted,
    },
    filterDropdown: {
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    filterOption: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    filterOptionActive: {
      backgroundColor: c.primaryGlow,
    },
    filterOptionText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: c.text,
    },
    filterOptionTextActive: {
      color: c.primary,
      fontWeight: '700' as const,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 80,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: c.textSecondary,
      marginTop: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: c.textMuted,
    },
  });
}
