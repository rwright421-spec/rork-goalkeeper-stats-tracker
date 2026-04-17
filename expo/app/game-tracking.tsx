// Game Tracking - Live stat entry screen for game tracking
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Platform, Keyboard, InputAccessoryView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Save, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { KeeperSelection, KeeperData, FinalScore, createEmptyKeeperData, SavedGame, GoalkeeperProfile, getTotalGoalsAgainst, normalizeKeeper } from '@/types/game';
import { useGames, FREE_GAME_LIMIT } from '@/contexts/GameContext';
import { usePurchases } from '@/contexts/PurchasesContext';
import { generateServerGameId, createLocalGameId } from '@/lib/sync';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useTeams } from '@/contexts/TeamContext';
import { useOpponents } from '@/contexts/OpponentContext';
import KeeperStatsSection from '@/components/KeeperStatsSection';
import { fontSize } from '@/constants/typography';

export default function GameTrackingScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{
    eventName: string;
    date: string;
    gameName: string;
    keeperSelection: string;
    gameId?: string;
    ageGroup?: string;
    quickStart?: string;
    isHome?: string;
  }>();

  const { addGame, updateGame, getGame, isAtFreeLimit, totalGameCount, gameLimitExceeded, clearGameLimitExceeded } = useGames();
  const { isPro } = usePurchases();
  const isEditMode = !!params.gameId;
  const existingGame = isEditMode ? getGame(params.gameId!) : undefined;
  const { activeProfile, profiles, createProfile } = useGoalkeepers();
  const { activeTeam, activeTeamId } = useTeams();
  const { addOpponent, getSuggestions } = useOpponents();

  useEffect(() => {
    if (gameLimitExceeded && !isPro) {
      clearGameLimitExceeded();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/paywall');
    }
  }, [gameLimitExceeded, isPro, clearGameLimitExceeded, router]);

  const allProfiles = useMemo(() => profiles ?? [], [profiles]);

  const handleCreateProfile = useCallback((name: string, birthYear: string): GoalkeeperProfile => {
    return createProfile(name, birthYear);
  }, [createProfile]);
  const initialKeeperSelection = (params.keeperSelection || existingGame?.setup.keeperSelection || 'home') as KeeperSelection;
  const [keeperSelection, setKeeperSelection] = useState<KeeperSelection>(initialKeeperSelection);
  const initialIsHome = (() => {
    if (params.isHome === '1') return true;
    if (params.isHome === '0') return false;
    if (existingGame?.setup.isHome !== undefined) return existingGame.setup.isHome;
    return true;
  })();
  const [isHomeGame, setIsHomeGame] = useState<boolean>(initialIsHome);

  const profileName = activeProfile?.name ?? '';
  const teamYear = activeTeam?.year ?? '';
  const teamName = activeTeam?.teamName ?? '';

  const hasHome = keeperSelection === 'home' || keeperSelection === 'both';
  const hasAway = keeperSelection === 'away' || keeperSelection === 'both';
  const isBoth = keeperSelection === 'both';

  const [editEventName, setEditEventName] = useState(() => params.eventName || existingGame?.setup.eventName || '');
  const [editAgeGroup, setEditAgeGroup] = useState(() => params.ageGroup || existingGame?.setup.ageGroup || '');
  const [editDate, setEditDate] = useState(() => params.date || existingGame?.setup.date || '');
  const [editGameName, setEditGameName] = useState(() => params.gameName || existingGame?.setup.gameName || '');
  const [editOpponentSuggestions, setEditOpponentSuggestions] = useState<string[]>([]);
  const [showEditOpponentSuggestions, setShowEditOpponentSuggestions] = useState(false);

  const [homeKeeper, setHomeKeeper] = useState<KeeperData>(() => {
    if (existingGame?.homeKeeper) return normalizeKeeper(existingGame.homeKeeper);
    const data = createEmptyKeeperData();
    if (hasHome && profileName) { data.name = profileName; data.secondHalfName = profileName; }
    if (hasHome && teamYear) { data.year = teamYear; data.secondHalfYear = teamYear; }
    if (hasHome && teamName) { data.teamName = teamName; data.secondHalfTeamName = teamName; }
    if (hasHome && activeProfile) {
      data.keeperProfileId = activeProfile.id;
      data.keeperIsLinked = true;
      data.secondHalfKeeperProfileId = activeProfile.id;
      data.secondHalfKeeperIsLinked = true;
    }
    return data;
  });
  const [awayKeeper, setAwayKeeper] = useState<KeeperData>(() => {
    if (existingGame?.awayKeeper) return normalizeKeeper(existingGame.awayKeeper);
    const data = createEmptyKeeperData();
    if (hasAway && !hasHome && profileName) { data.name = profileName; data.secondHalfName = profileName; }
    if (hasAway && !hasHome && teamYear) { data.year = teamYear; data.secondHalfYear = teamYear; }
    if (hasAway && !hasHome && teamName) { data.teamName = teamName; data.secondHalfTeamName = teamName; }
    if (hasAway && !hasHome && activeProfile) {
      data.keeperProfileId = activeProfile.id;
      data.keeperIsLinked = true;
      data.secondHalfKeeperProfileId = activeProfile.id;
      data.secondHalfKeeperIsLinked = true;
    }
    return data;
  });
  const [activeTab, setActiveTab] = useState<'home' | 'away'>(hasHome ? 'home' : 'away');
  const [homeScoreOverride, setHomeScoreOverride] = useState<string>(() => {
    if (existingGame?.finalScore && !isBoth && hasHome && !hasAway) return String(existingGame.finalScore.home);
    return '';
  });
  const [awayScoreOverride, setAwayScoreOverride] = useState<string>(() => {
    if (existingGame?.finalScore && !isBoth && hasAway && !hasHome) return String(existingGame.finalScore.away);
    return '';
  });
  const isQuickStart = params.quickStart === '1' && !isEditMode;
  const [gameDetailsCollapsed, setGameDetailsCollapsed] = useState<boolean>(true);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleEditGameNameChange = useCallback((text: string) => {
    setEditGameName(text);
    if (text.trim().length > 0) {
      const suggestions = getSuggestions(text);
      setEditOpponentSuggestions(suggestions);
      setShowEditOpponentSuggestions(suggestions.length > 0);
    } else {
      setEditOpponentSuggestions([]);
      setShowEditOpponentSuggestions(false);
    }
  }, [getSuggestions]);

  const handleSelectEditOpponentSuggestion = useCallback((name: string) => {
    setEditGameName(name);
    setShowEditOpponentSuggestions(false);
    setEditOpponentSuggestions([]);
  }, []);

  const handleKeeperSelectionChange = useCallback((newSelection: KeeperSelection) => {
    const prevSelection = keeperSelection;
    setKeeperSelection(newSelection);
    const newHasHome = newSelection === 'home' || newSelection === 'both';
    const newHasAway = newSelection === 'away' || newSelection === 'both';
    const prevHasHome = prevSelection === 'home' || prevSelection === 'both';
    const prevHasAway = prevSelection === 'away' || prevSelection === 'both';
    if (newHasHome && !prevHasHome) {
      const data = createEmptyKeeperData();
      if (profileName) { data.name = profileName; data.secondHalfName = profileName; }
      if (teamYear) { data.year = teamYear; data.secondHalfYear = teamYear; }
      if (teamName) { data.teamName = teamName; data.secondHalfTeamName = teamName; }
      if (activeProfile) {
        data.keeperProfileId = activeProfile.id;
        data.keeperIsLinked = true;
        data.secondHalfKeeperProfileId = activeProfile.id;
        data.secondHalfKeeperIsLinked = true;
      }
      setHomeKeeper(data);
    }
    if (newHasAway && !prevHasAway) {
      const data = createEmptyKeeperData();
      if (!newHasHome && profileName) { data.name = profileName; data.secondHalfName = profileName; }
      if (!newHasHome && teamYear) { data.year = teamYear; data.secondHalfYear = teamYear; }
      if (!newHasHome && teamName) { data.teamName = teamName; data.secondHalfTeamName = teamName; }
      if (!newHasHome && activeProfile) {
        data.keeperProfileId = activeProfile.id;
        data.keeperIsLinked = true;
        data.secondHalfKeeperProfileId = activeProfile.id;
        data.secondHalfKeeperIsLinked = true;
      }
      setAwayKeeper(data);
    }
    if (newHasHome) { setActiveTab('home'); } else { setActiveTab('away'); }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [keeperSelection, profileName, teamYear, teamName, activeProfile]);

  const showTabs = hasHome && hasAway;
  const homeGoalsAgainst = hasHome ? getTotalGoalsAgainst(homeKeeper) : 0;
  const awayGoalsAgainst = hasAway ? getTotalGoalsAgainst(awayKeeper) : 0;
  const homeShootoutGA = hasHome ? (homeKeeper.shootout?.goalsAgainst ?? 0) : 0;
  const awayShootoutGA = hasAway ? (awayKeeper.shootout?.goalsAgainst ?? 0) : 0;

  const computedFinalScore = useMemo((): FinalScore => {
    if (isBoth) return { home: awayGoalsAgainst + awayShootoutGA, away: homeGoalsAgainst + homeShootoutGA };
    if (hasHome) {
      const homeScore = homeScoreOverride !== '' ? parseInt(homeScoreOverride, 10) || 0 : 0;
      return { home: homeScore, away: homeGoalsAgainst + homeShootoutGA };
    }
    const awayScore = awayScoreOverride !== '' ? parseInt(awayScoreOverride, 10) || 0 : 0;
    return { home: awayGoalsAgainst + awayShootoutGA, away: awayScore };
  }, [isBoth, hasHome, homeGoalsAgainst, awayGoalsAgainst, homeScoreOverride, awayScoreOverride, homeShootoutGA, awayShootoutGA]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    Keyboard.dismiss();
    if (isSaving) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isEditMode && existingGame) {
      const opponentName = editGameName.trim() || existingGame.setup.gameName;
      if (opponentName) addOpponent(opponentName);
      const updated: SavedGame = {
        ...existingGame,
        setup: { eventName: editEventName.trim() || existingGame.setup.eventName, date: editDate.trim() || existingGame.setup.date, gameName: opponentName, keeperSelection, ageGroup: (editAgeGroup || existingGame.setup.ageGroup || '') as any, isHome: isHomeGame },
        homeKeeper: hasHome ? homeKeeper : undefined,
        awayKeeper: hasAway ? awayKeeper : undefined,
        finalScore: computedFinalScore,
      };
      updateGame(updated);
      Alert.alert('Game Updated', 'Stats have been updated.', [{ text: 'OK', onPress: () => { router.replace('/(tabs)/dashboard'); } }]);
    } else {
      if (!isPro && isAtFreeLimit) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.push('/paywall');
        return;
      }

      const finalEventName = isQuickStart ? (editEventName.trim() || params.eventName || '') : (params.eventName || '');
      const finalDate = isQuickStart ? (editDate.trim() || params.date || '') : (params.date || '');
      const finalGameName = isQuickStart ? (editGameName.trim() || params.gameName || '') : (params.gameName || '');
      const finalAgeGroup = isQuickStart ? (editAgeGroup || params.ageGroup || '') : (params.ageGroup || '');
      if (finalGameName) addOpponent(finalGameName);

      setIsSaving(true);
      let gameId: string;
      let pendingSync = false;

      try {
        const serverId = await generateServerGameId();
        if (serverId) {
          gameId = serverId;
        } else {
          gameId = createLocalGameId();
          pendingSync = true;
        }
      } catch (e) {
        console.error('[GameTracking] Error generating game ID:', e);
        gameId = createLocalGameId();
        pendingSync = true;
      }

      const game: SavedGame = {
        id: gameId,
        teamId: activeTeamId ?? undefined,
        setup: { eventName: finalEventName, date: finalDate, gameName: finalGameName, keeperSelection, ageGroup: finalAgeGroup as any, isHome: isHomeGame },
        homeKeeper: hasHome ? homeKeeper : undefined,
        awayKeeper: hasAway ? awayKeeper : undefined,
        finalScore: computedFinalScore,
        createdAt: new Date().toISOString(),
        ...(pendingSync ? { pendingSync: true } : {}),
      };

      addGame(game);
      setIsSaving(false);
      const savedMsg = pendingSync
        ? 'Stats saved locally. Will sync with server when online.'
        : 'Stats have been saved to Prior Games.';
      Alert.alert('Game Saved', savedMsg, [{ text: 'OK', onPress: () => { router.replace('/(tabs)/dashboard'); } }]);
    }
  }, [isSaving, isEditMode, isQuickStart, existingGame, params, keeperSelection, hasHome, hasAway, homeKeeper, awayKeeper, computedFinalScore, addGame, updateGame, router, editEventName, editDate, editGameName, editAgeGroup, activeTeamId, addOpponent, isPro, isAtFreeLimit, totalGameCount, isHomeGame]);

  const headerSubtitle = useMemo(() => {
    if (isEditMode) return `${editEventName} · ${editDate}`;
    return `${params.eventName} · ${params.date}`;
  }, [isEditMode, editEventName, editDate, params.eventName, params.date]);

  const scoreInputAccessoryId = 'score-input-done';

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: isEditMode ? `Edit: ${params.gameName || 'Game'}` : (params.gameName || 'Game Tracking'),
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      {(isEditMode || isQuickStart) ? (
        <View style={styles.editInfoSection}>
          <TouchableOpacity testID="toggle-game-details" style={styles.editInfoHeader} onPress={() => setGameDetailsCollapsed(!gameDetailsCollapsed)} activeOpacity={0.7}>
            <Text style={styles.editInfoTitle}>Game Details</Text>
            <View style={styles.editInfoHeaderRight}>
              {gameDetailsCollapsed && isQuickStart && !editEventName ? <Text style={styles.quickStartDetailHint}>Tap to fill in game details</Text> : null}
              {gameDetailsCollapsed && !isQuickStart ? <Text style={styles.editInfoSummary} numberOfLines={1}>{editEventName || 'Untitled'} · {editDate}</Text> : null}
              {gameDetailsCollapsed && isQuickStart && editEventName ? <Text style={styles.editInfoSummary} numberOfLines={1}>{editEventName} · {editDate}</Text> : null}
              {gameDetailsCollapsed ? <ChevronDown size={18} color={colors.textMuted} /> : <ChevronUp size={18} color={colors.textMuted} />}
            </View>
          </TouchableOpacity>
          {!gameDetailsCollapsed ? (
            <View style={styles.editInfoContent}>
              <View style={styles.editInputGroup}>
                <Text style={styles.editInputLabel}>Event</Text>
                <TextInput testID="edit-event-name" style={styles.editInput} value={editEventName} onChangeText={setEditEventName} placeholder="e.g. Spring Tournament, League Match" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.editInputGroup}>
                <Text style={styles.editInputLabel}>Age Group</Text>
                <TextInput testID="edit-age-group" style={styles.editInput} value={editAgeGroup} onChangeText={setEditAgeGroup} placeholder="e.g. U12" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.editInputGroup}>
                <Text style={styles.editInputLabel}>Date</Text>
                <TextInput testID="edit-date" style={styles.editInput} value={editDate} onChangeText={setEditDate} placeholder="MM/DD/YYYY" placeholderTextColor={colors.textMuted} keyboardType={Platform.OS === 'web' ? 'default' : 'numbers-and-punctuation'} />
              </View>
              <View style={[styles.editInputGroup, { zIndex: 10 }]}>
                <Text style={styles.editInputLabel}>Opponent</Text>
                <TextInput testID="edit-game-name" style={styles.editInput} value={editGameName} onChangeText={handleEditGameNameChange} onBlur={() => setTimeout(() => setShowEditOpponentSuggestions(false), 200)} placeholder="e.g. FC United" placeholderTextColor={colors.textMuted} />
                {showEditOpponentSuggestions && editOpponentSuggestions.length > 0 && (
                  <View style={styles.suggestionsDropdown}>
                    {editOpponentSuggestions.map((s) => (
                      <TouchableOpacity key={s} style={styles.suggestionItem} onPress={() => handleSelectEditOpponentSuggestion(s)} activeOpacity={0.7}>
                        <Text style={styles.suggestionText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.editInputGroup}>
                <Text style={styles.editInputLabel}>Tracking</Text>
                <View style={styles.keeperSelectionRow}>
                  {(['home', 'away', 'both'] as KeeperSelection[]).map((option) => {
                    const isActive = keeperSelection === option;
                    const label = option === 'home' ? 'Home' : option === 'away' ? 'Away' : 'Both';
                    return (
                      <TouchableOpacity key={option} testID={`edit-keeper-selection-${option}`} style={[styles.keeperSelectionOption, isActive && styles.keeperSelectionOptionActive]} onPress={() => handleKeeperSelectionChange(option)} activeOpacity={0.7}>
                        <Text style={[styles.keeperSelectionText, isActive && styles.keeperSelectionTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.subHeader}>
          <Text style={styles.subHeaderText}>{headerSubtitle}</Text>
        </View>
      )}

      {showTabs ? (
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, activeTab === 'home' && styles.tabActive]} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('home'); }} activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'away' && styles.tabActiveAway]} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('away'); }} activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === 'away' && styles.tabTextActiveAway]}>Away</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={scoreInputAccessoryId}>
          <View style={styles.keyboardToolbar}>
            <TouchableOpacity onPress={dismissKeyboard} style={styles.keyboardDoneButton} activeOpacity={0.7}>
              <Text style={styles.keyboardDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
        {(hasHome && activeTab === 'home') || (hasHome && !showTabs) ? <KeeperStatsSection label="HOME" keeper={homeKeeper} onUpdate={setHomeKeeper} accentColor={colors.cardHome} showShootout profiles={allProfiles} onCreateProfile={handleCreateProfile} ageGroup={editAgeGroup || params.ageGroup || ''} /> : null}
        {(hasAway && activeTab === 'away') || (hasAway && !showTabs) ? <KeeperStatsSection label="AWAY" keeper={awayKeeper} onUpdate={setAwayKeeper} accentColor={colors.cardAway} showShootout profiles={allProfiles} onCreateProfile={handleCreateProfile} ageGroup={editAgeGroup || params.ageGroup || ''} /> : null}

        {showTabs ? (
          <TouchableOpacity style={styles.switchButton} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(activeTab === 'home' ? 'away' : 'home'); }} activeOpacity={0.7}>
            {activeTab === 'home' ? (<><Text style={styles.switchText}>Switch to Away Keeper</Text><ChevronRight size={16} color={colors.cardAway} /></>) : (<><ChevronLeft size={16} color={colors.cardHome} /><Text style={styles.switchText}>Switch to Home Keeper</Text></>)}
          </TouchableOpacity>
        ) : null}

        <View style={styles.finalScoreSection}>
          <Text style={styles.finalScoreTitle}>Final Score</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreTeam}>
              <Text style={styles.scoreTeamLabel}>HOME</Text>
              {!isBoth && hasHome && !hasAway ? (
                <TextInput testID="home-score-input" style={styles.scoreInput} value={homeScoreOverride} onChangeText={setHomeScoreOverride} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted} maxLength={3} returnKeyType="done" onSubmitEditing={dismissKeyboard} inputAccessoryViewID={Platform.OS === 'ios' ? scoreInputAccessoryId : undefined} editable={true} selectTextOnFocus={true} />
              ) : (
                <Text style={[styles.scoreValue, { color: colors.cardHome }]}>{computedFinalScore.home}</Text>
              )}
            </View>
            <Text style={styles.scoreDash}>—</Text>
            <View style={styles.scoreTeam}>
              <Text style={styles.scoreTeamLabel}>AWAY</Text>
              {!isBoth && hasAway && !hasHome ? (
                <TextInput testID="away-score-input" style={styles.scoreInput} value={awayScoreOverride} onChangeText={setAwayScoreOverride} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted} maxLength={3} returnKeyType="done" onSubmitEditing={dismissKeyboard} inputAccessoryViewID={Platform.OS === 'ios' ? scoreInputAccessoryId : undefined} />
              ) : (
                <Text style={[styles.scoreValue, { color: colors.cardAway }]}>{computedFinalScore.away}</Text>
              )}
            </View>
          </View>
          {!isBoth && (
            <Text style={styles.scoreHint}>
              {hasHome ? 'Away score auto-calculated from goals against home keeper. Enter home score manually.' : 'Home score auto-calculated from goals against away keeper. Enter away score manually.'}
            </Text>
          )}
        </View>

        <TouchableOpacity testID="save-game-button" style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
          <Save size={20} color={colors.white} />
          <Text style={styles.saveText}>Save Game</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    subHeader: { paddingHorizontal: 20, paddingBottom: 8 },
    subHeaderText: { fontSize: fontSize.body2, color: c.textMuted, fontWeight: '500' as const },
    tabBar: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: c.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: c.border },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: c.primaryGlow, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
    tabActiveAway: { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
    tabText: { fontSize: fontSize.body, fontWeight: '600' as const, color: c.textMuted },
    tabTextActive: { color: c.primary },
    tabTextActiveAway: { color: c.cardAway },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 60 },
    switchButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginBottom: 16, backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderColor: c.border },
    switchText: { fontSize: fontSize.body2, color: c.textSecondary, fontWeight: '600' as const },
    finalScoreSection: { backgroundColor: c.surfaceLight, borderRadius: 14, padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: c.border },
    finalScoreTitle: { fontSize: fontSize.body, fontWeight: '700' as const, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, textAlign: 'center' },
    scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
    scoreTeam: { alignItems: 'center', flex: 1 },
    scoreTeamLabel: { fontSize: fontSize.sm, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    scoreValue: { fontSize: fontSize.display, fontWeight: '800' as const },
    scoreInput: { fontSize: fontSize.display, fontWeight: '800' as const, color: c.text, textAlign: 'center' as const, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, paddingVertical: 10, minWidth: 80, minHeight: 50 },
    scoreDash: { fontSize: fontSize.display2, fontWeight: '300' as const, color: c.textMuted },
    scoreHint: { fontSize: fontSize.sm, color: c.textMuted, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
    saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.primaryDark, borderRadius: 14, paddingVertical: 16, marginTop: 8 },
    saveText: { color: c.white, fontSize: fontSize.h4, fontWeight: '700' as const },
    keyboardToolbar: { flexDirection: 'row' as const, justifyContent: 'flex-end' as const, alignItems: 'center' as const, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 16, paddingVertical: 8 },
    keyboardDoneButton: { paddingHorizontal: 12, paddingVertical: 6 },
    keyboardDoneText: { fontSize: fontSize.subtitle, fontWeight: '600' as const, color: c.primary },
    editInfoSection: { marginHorizontal: 20, marginBottom: 12, backgroundColor: c.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.border },
    editInfoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    editInfoHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    editInfoSummary: { fontSize: fontSize.caption, color: c.textSecondary, fontWeight: '500' as const, maxWidth: 160 },
    editInfoTitle: { fontSize: fontSize.body2, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    editInfoContent: { marginTop: 14 },
    editInputGroup: { marginBottom: 12 },
    editInputLabel: { fontSize: fontSize.caption, color: c.textSecondary, fontWeight: '600' as const, marginBottom: 6 },
    editInput: { backgroundColor: c.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: fontSize.bodyLg, borderWidth: 1, borderColor: c.border },
    keeperSelectionRow: { flexDirection: 'row', gap: 8 },
    keeperSelectionOption: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
    keeperSelectionOptionActive: { backgroundColor: c.primaryGlow, borderColor: 'rgba(16, 185, 129, 0.4)' },
    keeperSelectionText: { fontSize: fontSize.body, fontWeight: '600' as const, color: c.textMuted },
    keeperSelectionTextActive: { color: c.primary },
    quickStartDetailHint: { fontSize: fontSize.caption, color: c.accent, fontWeight: '600' as const, fontStyle: 'italic' },
    suggestionsDropdown: { backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderColor: c.border, marginTop: 4, overflow: 'hidden' as const, maxHeight: 160 },
    suggestionItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
    suggestionText: { fontSize: fontSize.body, color: c.text, fontWeight: '500' as const },
  });
}
