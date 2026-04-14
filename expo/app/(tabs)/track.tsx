// Track - Game list and management screen
import React, { useCallback, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal, Pressable, TextInput, Animated, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Shield, Filter, ChevronDown, Users, Check, ArrowLeftRight, Zap, ClipboardList } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGames, FREE_GAME_LIMIT } from '@/contexts/GameContext';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useTeams } from '@/contexts/TeamContext';
import { usePurchases } from '@/contexts/PurchasesContext';
import GameCard from '@/components/GameCard';
import MoveGameModal from '@/components/MoveGameModal';
import { useOpponents } from '@/contexts/OpponentContext';
import { SavedGame } from '@/types/game';
import SyncStatusBanner from '@/components/SyncStatusBanner';
import { GameListSkeleton } from '@/components/LoadingSkeleton';

export default function TrackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { games, isLoading, deleteGame, isAtFreeLimit, totalGameCount } = useGames();
  const { activeProfile, isGuest, clearSelection } = useGoalkeepers();
  const { isPro } = usePurchases();
  const { teams, activeTeam, activeTeamId, viewAllGames, selectTeam, showAllGames, clearTeamSelection } = useTeams();

  const { addOpponent, getSuggestions } = useOpponents();

  const [showNewGameSheet, setShowNewGameSheet] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [quickOpponent, setQuickOpponent] = useState('');
  const [quickOpponentSuggestions, setQuickOpponentSuggestions] = useState<string[]>([]);
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const quickStartAnim = useRef(new Animated.Value(0)).current;

  const handleSwitchGoalkeeper = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearSelection();
    clearTeamSelection();
    if (Platform.OS === 'web') {
      router.replace('/');
    } else {
      try { router.dismissAll(); } catch (_e) { /* dismissAll may fail if no screens to dismiss */ }
      setTimeout(() => router.replace('/'), 100);
    }
  }, [clearSelection, clearTeamSelection, router]);

  const [moveGame, setMoveGame] = useState<SavedGame | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  const displayName = isGuest ? 'Guest' : (activeProfile?.name ?? 'Goalkeeper');
  const filterLabel = viewAllGames || !activeTeam ? 'All Games' : `${activeTeam.teamName} (${activeTeam.year})`;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const openNewGameSheet = useCallback(() => {
    if (!isPro && isAtFreeLimit) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/paywall');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowNewGameSheet(true);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }, [sheetAnim, isPro, isAtFreeLimit, router]);

  const closeNewGameSheet = useCallback(() => {
    Animated.timing(sheetAnim, { toValue: 0, useNativeDriver: true, duration: 200 }).start(() => {
      setShowNewGameSheet(false);
      setShowQuickStart(false);
      setQuickOpponent('');
      setQuickOpponentSuggestions([]);
      setShowQuickSuggestions(false);
    });
  }, [sheetAnim]);

  const handleFullSetup = useCallback(() => {
    closeNewGameSheet();
    setTimeout(() => router.push('/new-game'), 250);
  }, [closeNewGameSheet, router]);

  const openQuickStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQuickStart(true);
    Animated.spring(quickStartAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }, [quickStartAnim]);

  const handleQuickOpponentChange = useCallback((text: string) => {
    setQuickOpponent(text);
    if (text.trim().length > 0) {
      const suggestions = getSuggestions(text);
      setQuickOpponentSuggestions(suggestions);
      setShowQuickSuggestions(suggestions.length > 0);
    } else {
      setQuickOpponentSuggestions([]);
      setShowQuickSuggestions(false);
    }
  }, [getSuggestions]);

  const handleQuickStart = useCallback(() => {
    if (!quickOpponent.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    const opponent = quickOpponent.trim();
    addOpponent(opponent);
    const now = new Date();
    const todayDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    closeNewGameSheet();
    setTimeout(() => {
      router.push({
        pathname: '/game-tracking',
        params: {
          eventName: '',
          date: todayDate,
          gameName: opponent,
          keeperSelection: 'home',
          ageGroup: '',
          quickStart: '1',
        },
      });
    }, 250);
  }, [quickOpponent, addOpponent, closeNewGameSheet, router]);

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
            <Text style={styles.title} numberOfLines={1}>{displayName}</Text>
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
          <TouchableOpacity
            testID="switch-goalkeeper-track-btn"
            style={styles.switchKeeperBtn}
            onPress={handleSwitchGoalkeeper}
            activeOpacity={0.7}
          >
            <ArrowLeftRight size={13} color={colors.primary} />
            <Text style={styles.switchKeeperText}>Switch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showTeamPicker && !isGuest && teams.length > 0 && (
        <View style={styles.teamPickerDropdown}>
          <TouchableOpacity
            testID="team-picker-all"
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
              testID={`team-picker-${team.id}`}
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

      <SyncStatusBanner />

      <TouchableOpacity
        testID="new-game-button"
        style={styles.newGameButton}
        onPress={openNewGameSheet}
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
            testID="filter-all-games"
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
              testID={`filter-team-${team.id}`}
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
        <View style={styles.listContent}>
          <GameListSkeleton count={4} />
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

      <Modal
        visible={showNewGameSheet}
        transparent
        animationType="none"
        onRequestClose={closeNewGameSheet}
        statusBarTranslucent
      >
        <Pressable style={styles.sheetOverlay} onPress={closeNewGameSheet}>
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                transform: [{
                  translateY: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [400, 0],
                  }),
                }],
                opacity: sheetAnim,
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              {!showQuickStart ? (
                <View style={styles.sheetContent}>
                  <Text style={styles.sheetTitle}>Start a Game</Text>
                  <TouchableOpacity
                    testID="quick-start-option"
                    style={styles.sheetOption}
                    onPress={openQuickStart}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sheetOptionIcon, { backgroundColor: 'rgba(250, 204, 21, 0.15)' }]}>
                      <Zap size={20} color="#facc15" />
                    </View>
                    <View style={styles.sheetOptionTextWrap}>
                      <Text style={styles.sheetOptionTitle}>Quick Start</Text>
                      <Text style={styles.sheetOptionDesc}>Just an opponent name — start tracking now</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="full-setup-option"
                    style={styles.sheetOption}
                    onPress={handleFullSetup}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sheetOptionIcon, { backgroundColor: colors.primaryGlow }]}>
                      <ClipboardList size={20} color={colors.primary} />
                    </View>
                    <View style={styles.sheetOptionTextWrap}>
                      <Text style={styles.sheetOptionTitle}>Full Setup</Text>
                      <Text style={styles.sheetOptionDesc}>Event, team, age group, and all details</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <Animated.View
                  style={[
                    styles.sheetContent,
                    {
                      opacity: quickStartAnim,
                      transform: [{
                        translateX: quickStartAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      }],
                    },
                  ]}
                >
                  <View style={styles.quickStartHeader}>
                    <Zap size={18} color="#facc15" />
                    <Text style={styles.sheetTitle}>Quick Start</Text>
                  </View>
                  <Text style={styles.quickStartHint}>Enter the opponent and go. Fill in the rest later.</Text>
                  <View style={styles.quickStartInputWrap}>
                    <TextInput
                      testID="quick-opponent-input"
                      style={styles.quickStartInput}
                      value={quickOpponent}
                      onChangeText={handleQuickOpponentChange}
                      placeholder="Opponent name"
                      placeholderTextColor={colors.textMuted}
                      autoFocus
                      returnKeyType="go"
                      onSubmitEditing={handleQuickStart}
                    />
                    {showQuickSuggestions && quickOpponentSuggestions.length > 0 && (
                      <View style={styles.quickSuggestions}>
                        {quickOpponentSuggestions.slice(0, 4).map((s) => (
                          <TouchableOpacity
                            key={s}
                            style={styles.quickSuggestionItem}
                            onPress={() => {
                              setQuickOpponent(s);
                              setShowQuickSuggestions(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.quickSuggestionText}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    testID="quick-start-go-btn"
                    style={[
                      styles.quickStartBtn,
                      !quickOpponent.trim() && styles.quickStartBtnDisabled,
                    ]}
                    onPress={handleQuickStart}
                    disabled={!quickOpponent.trim()}
                    activeOpacity={0.8}
                  >
                    <Zap size={18} color={colors.white} />
                    <Text style={styles.quickStartBtnText}>Start Tracking</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
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
    switchKeeperBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.primaryGlow,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    switchKeeperText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: c.primary,
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheetContainer: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
      borderWidth: 1,
      borderColor: c.border,
      borderBottomWidth: 0,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderLight,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 8,
    },
    sheetContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 8,
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: '800' as const,
      color: c.text,
      marginBottom: 16,
    },
    sheetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.background,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    sheetOptionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    sheetOptionTextWrap: {
      flex: 1,
    },
    sheetOptionTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: c.text,
      marginBottom: 2,
    },
    sheetOptionDesc: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '500' as const,
    },
    quickStartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    quickStartHint: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '500' as const,
      marginBottom: 16,
    },
    quickStartInputWrap: {
      marginBottom: 16,
    },
    quickStartInput: {
      backgroundColor: c.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: c.text,
      fontSize: 16,
      borderWidth: 1.5,
      borderColor: 'rgba(250, 204, 21, 0.3)',
    },
    quickSuggestions: {
      backgroundColor: c.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 4,
      overflow: 'hidden' as const,
    },
    quickSuggestionItem: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    quickSuggestionText: {
      fontSize: 14,
      color: c.text,
      fontWeight: '500' as const,
    },
    quickStartBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#b8960a',
      borderRadius: 14,
      paddingVertical: 16,
    },
    quickStartBtnDisabled: {
      opacity: 0.4,
    },
    quickStartBtnText: {
      color: c.white,
      fontSize: 17,
      fontWeight: '700' as const,
    },
  });
}
