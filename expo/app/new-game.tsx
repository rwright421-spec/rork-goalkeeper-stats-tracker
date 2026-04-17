// New Game - Game setup and configuration screen
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Keyboard } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ArrowRight, Home, Plane, Users, ChevronDown, Plus, Check, X, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { KeeperSelection, AgeGroup, AGE_GROUP_OPTIONS, deriveKeeperSelection } from '@/types/game';
import GameTypeModal from '@/components/GameTypeModal';
import KeyboardDoneBar, { KEYBOARD_DONE_BAR_ID } from '@/components/KeyboardDoneBar';
import { useTeams } from '@/contexts/TeamContext';
import { useOpponents } from '@/contexts/OpponentContext';
import { useGames } from '@/contexts/GameContext';
import { usePurchases } from '@/contexts/PurchasesContext';
import { fontSize } from '@/constants/typography';

const AGE_GROUPS: AgeGroup[] = AGE_GROUP_OPTIONS as AgeGroup[];

const HALF_LENGTH_OPTIONS = [20, 25, 30, 35, 40, 45];

export default function NewGameScreen() {
  const router = useRouter();
  const colors = useColors();
  const [eventName, setEventName] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('');
  const [ageGroupPickerOpen, setAgeGroupPickerOpen] = useState(false);
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
  });
  const [opponent, setOpponent] = useState('');
  const [isHome, setIsHome] = useState<boolean>(true);
  const [trackBoth, setTrackBoth] = useState<boolean>(false);
  const [gameTypeModalVisible, setGameTypeModalVisible] = useState<boolean>(false);
  const keeperSelection: KeeperSelection = deriveKeeperSelection(isHome, trackBoth);
  const { teams, activeTeamId, selectTeam, clearTeamSelection, createTeam } = useTeams();
  const { addOpponent, getSuggestions } = useOpponents();
  const { isAtFreeLimit } = useGames();
  const { isPro } = usePurchases();
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamYear, setNewTeamYear] = useState('');
  const [newTeamHalfLength, setNewTeamHalfLength] = useState<number | undefined>(undefined);
  const [newTeamHalfLengthPickerOpen, setNewTeamHalfLengthPickerOpen] = useState(false);
  const selectedTeam = teams.find(t => t.id === activeTeamId) ?? null;
  const [opponentSuggestions, setOpponentSuggestions] = useState<string[]>([]);
  const [showOpponentSuggestions, setShowOpponentSuggestions] = useState(false);

  const canProceed = eventName.trim().length > 0 && date.trim().length > 0 && opponent.trim().length > 0;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const gameTypeSummary = useMemo(() => {
    const side = isHome ? 'Home' : 'Away';
    const tracking = trackBoth ? 'Track both keepers' : 'Track my keeper only';
    return `${side} · ${tracking}`;
  }, [isHome, trackBoth]);

  const handleConfirmGameType = useCallback((nextIsHome: boolean, nextTrackBoth: boolean) => {
    setIsHome(nextIsHome);
    setTrackBoth(nextTrackBoth);
  }, []);

  const handleOpponentChange = useCallback((text: string) => {
    setOpponent(text);
    if (text.trim().length > 0) {
      const suggestions = getSuggestions(text);
      setOpponentSuggestions(suggestions);
      setShowOpponentSuggestions(suggestions.length > 0);
    } else {
      setOpponentSuggestions([]);
      setShowOpponentSuggestions(false);
    }
  }, [getSuggestions]);

  const handleSelectOpponentSuggestion = useCallback((name: string) => {
    setOpponent(name);
    setShowOpponentSuggestions(false);
    setOpponentSuggestions([]);
  }, []);

  const handleContinue = useCallback(() => {
    Keyboard.dismiss();
    if (!canProceed) return;
    if (!isPro && isAtFreeLimit) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/paywall');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addOpponent(opponent.trim());
    router.push({
      pathname: '/game-tracking',
      params: {
        eventName: eventName.trim(),
        date: date.trim(),
        gameName: opponent.trim(),
        keeperSelection,
        ageGroup,
        isHome: isHome ? '1' : '0',
      },
    });
  }, [canProceed, router, eventName, date, opponent, keeperSelection, ageGroup, addOpponent, isPro, isAtFreeLimit, isHome]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'New Game',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Game Info</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Event</Text>
          <TextInput
            testID="event-name-input"
            style={styles.input}
            value={eventName}
            onChangeText={setEventName}
            placeholder="e.g. Spring Tournament, League Match"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_DONE_BAR_ID : undefined}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Age Group</Text>
          <TouchableOpacity
            testID="age-group-selector"
            style={styles.dropdownSelector}
            onPress={() => setAgeGroupPickerOpen(!ageGroupPickerOpen)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, !ageGroup && styles.dropdownPlaceholder]}>
              {ageGroup || 'Select age group'}
            </Text>
            <ChevronDown size={16} color={colors.textMuted} />
          </TouchableOpacity>
          {ageGroupPickerOpen && (
            <View style={styles.dropdownList}>
              {AGE_GROUPS.map((ag) => (
                <TouchableOpacity
                  key={ag}
                  style={[styles.dropdownOption, ageGroup === ag && styles.dropdownOptionActive]}
                  onPress={() => {
                    setAgeGroup(ag);
                    setAgeGroupPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownOptionText, ageGroup === ag && styles.dropdownOptionTextActive, ag.length > 3 && { fontSize: fontSize.caption }]}>
                    {ag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date</Text>
          <TextInput
            testID="date-input"
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={colors.textMuted}
            keyboardType={Platform.OS === 'web' ? 'default' : 'numbers-and-punctuation'}
            returnKeyType="done"
            inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_DONE_BAR_ID : undefined}
          />
        </View>

        <View style={[styles.inputGroup, (teamPickerOpen || showCreateTeam) && { zIndex: 20, elevation: 20 }]}>
          <Text style={styles.inputLabel}>Team (optional)</Text>
          <TouchableOpacity
            testID="team-selector"
            style={styles.dropdownSelector}
            onPress={() => {
              setTeamPickerOpen(!teamPickerOpen);
              setShowCreateTeam(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, !selectedTeam && styles.dropdownPlaceholder]}>
              {selectedTeam ? `${selectedTeam.teamName} (${selectedTeam.year})` : 'No team selected'}
            </Text>
            <ChevronDown size={16} color={colors.textMuted} />
          </TouchableOpacity>
          {teamPickerOpen && (
            <View style={styles.dropdownList}>
              <TouchableOpacity
                style={[styles.dropdownOption, !activeTeamId && styles.dropdownOptionActive]}
                onPress={() => {
                  clearTeamSelection();
                  setTeamPickerOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownOptionText, !activeTeamId && styles.dropdownOptionTextActive]}>
                  No team
                </Text>
              </TouchableOpacity>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.dropdownOption, activeTeamId === team.id && styles.dropdownOptionActive]}
                  onPress={() => {
                    selectTeam(team.id);
                    setTeamPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownOptionText, activeTeamId === team.id && styles.dropdownOptionTextActive]}>
                    {team.teamName} ({team.year})
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                testID="create-new-team-option"
                style={styles.createTeamOption}
                onPress={() => {
                  setShowCreateTeam(true);
                  setTeamPickerOpen(false);
                  setNewTeamName('');
                  setNewTeamYear('');
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Plus size={16} color={colors.primary} />
                <Text style={styles.createTeamOptionText}>Create New Team</Text>
              </TouchableOpacity>
            </View>
          )}
          {showCreateTeam && (
            <View style={styles.createTeamForm}>
              <Text style={styles.createTeamTitle}>New Team</Text>
              <TextInput
                testID="new-team-name-input"
                style={styles.createTeamInput}
                value={newTeamName}
                onChangeText={(text: string) => setNewTeamName(text)}
                placeholder="Team name"
                placeholderTextColor={colors.textMuted}
                autoFocus
                editable={true}
                selectTextOnFocus={true}
                returnKeyType="done"
                inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_DONE_BAR_ID : undefined}
              />
              <TextInput
                testID="new-team-year-input"
                style={styles.createTeamInput}
                value={newTeamYear}
                onChangeText={(text: string) => setNewTeamYear(text)}
                placeholder="Year (e.g. 2026)"
                placeholderTextColor={colors.textMuted}
                keyboardType={Platform.OS === 'web' ? 'default' : 'number-pad'}
                editable={true}
                returnKeyType="done"
                inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_DONE_BAR_ID : undefined}
              />
              <TouchableOpacity
                style={styles.createTeamInput}
                onPress={() => setNewTeamHalfLengthPickerOpen(!newTeamHalfLengthPickerOpen)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: fontSize.bodyLg, color: newTeamHalfLength ? colors.text : colors.textMuted }}>
                  {newTeamHalfLength ? `Half: ${newTeamHalfLength} min` : 'Half length (default 40 min)'}
                </Text>
              </TouchableOpacity>
              {newTeamHalfLengthPickerOpen && (
                <View style={styles.dropdownList}>
                  <TouchableOpacity
                    style={[styles.dropdownOption, !newTeamHalfLength && styles.dropdownOptionActive]}
                    onPress={() => { setNewTeamHalfLength(undefined); setNewTeamHalfLengthPickerOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dropdownOptionText, !newTeamHalfLength && styles.dropdownOptionTextActive]}>Default (40 min)</Text>
                  </TouchableOpacity>
                  {HALF_LENGTH_OPTIONS.map((hl) => (
                    <TouchableOpacity
                      key={hl}
                      style={[styles.dropdownOption, newTeamHalfLength === hl && styles.dropdownOptionActive]}
                      onPress={() => { setNewTeamHalfLength(hl); setNewTeamHalfLengthPickerOpen(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dropdownOptionText, newTeamHalfLength === hl && styles.dropdownOptionTextActive]}>{hl} min</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.createTeamActions}>
                <TouchableOpacity
                  testID="cancel-create-team"
                  style={styles.createTeamCancel}
                  onPress={() => setShowCreateTeam(false)}
                  activeOpacity={0.7}
                >
                  <X size={16} color={colors.textMuted} />
                  <Text style={styles.createTeamCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="confirm-create-team"
                  style={[
                    styles.createTeamConfirm,
                    (!newTeamName.trim() || !newTeamYear.trim()) && styles.createTeamConfirmDisabled,
                  ]}
                  onPress={() => {
                    if (!newTeamName.trim() || !newTeamYear.trim()) return;
                    const newTeam = createTeam(newTeamYear.trim(), newTeamName.trim(), newTeamHalfLength);
                    selectTeam(newTeam.id);
                    setShowCreateTeam(false);
                    setNewTeamName('');
                    setNewTeamYear('');
                    setNewTeamHalfLength(undefined);
                    setNewTeamHalfLengthPickerOpen(false);
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                  disabled={!newTeamName.trim() || !newTeamYear.trim()}
                  activeOpacity={0.7}
                >
                  <Check size={16} color={colors.white} />
                  <Text style={styles.createTeamConfirmText}>Create & Select</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.inputGroup, { zIndex: 10 }]}>
          <Text style={styles.inputLabel}>Opponent</Text>
          <TextInput
            testID="game-name-input"
            style={styles.input}
            value={opponent}
            onChangeText={handleOpponentChange}
            onBlur={() => setTimeout(() => setShowOpponentSuggestions(false), 200)}
            placeholder="e.g. FC United"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_DONE_BAR_ID : undefined}
          />
          {showOpponentSuggestions && opponentSuggestions.length > 0 && (
            <View style={styles.suggestionsDropdown}>
              {opponentSuggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectOpponentSuggestion(s)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Game Type</Text>

        <TouchableOpacity
          testID="open-game-type-modal"
          style={styles.gameTypeRow}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setGameTypeModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.gameTypeIcon}>
            {trackBoth ? (
              <Users size={20} color={colors.accent} />
            ) : isHome ? (
              <Home size={20} color={colors.cardHome} />
            ) : (
              <Plane size={20} color={colors.cardAway} />
            )}
          </View>
          <View style={styles.gameTypeTextWrap}>
            <Text style={styles.gameTypeLabel}>Game Type</Text>
            <Text style={styles.gameTypeValue}>{gameTypeSummary}</Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={{ height: 24 }} />

        <TouchableOpacity
          testID="continue-button"
          style={[styles.continueButton, !canProceed && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>Continue to Tracking</Text>
          <ArrowRight size={18} color={colors.white} />
        </TouchableOpacity>
      </ScrollView>

      <KeyboardDoneBar />

      <GameTypeModal
        visible={gameTypeModalVisible}
        onClose={() => setGameTypeModalVisible(false)}
        initialIsHome={isHome}
        initialTrackBoth={trackBoth}
        onConfirm={handleConfirmGameType}
      />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 60 },
    sectionLabel: { fontSize: fontSize.body2, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: fontSize.body, color: c.textSecondary, fontWeight: '600' as const, marginBottom: 8 },
    input: { backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: c.text, fontSize: fontSize.subtitle, borderWidth: 1, borderColor: c.border },
    dropdownSelector: { backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dropdownText: { fontSize: fontSize.subtitle, color: c.text },
    dropdownPlaceholder: { color: c.textMuted },
    dropdownList: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, marginTop: 4, overflow: 'hidden' },
    dropdownOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    dropdownOptionActive: { backgroundColor: c.primaryGlow },
    dropdownOptionText: { fontSize: fontSize.bodyLg, color: c.text, fontWeight: '500' as const },
    dropdownOptionTextActive: { color: c.primary, fontWeight: '700' as const },
    gameTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: c.border },
    gameTypeIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.surfaceLight, alignItems: 'center', justifyContent: 'center' },
    gameTypeTextWrap: { flex: 1 },
    gameTypeLabel: { fontSize: fontSize.caption, color: c.textMuted, fontWeight: '600' as const, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    gameTypeValue: { fontSize: fontSize.bodyLg, color: c.text, fontWeight: '700' as const },
    selectionContainer: { gap: 10, marginBottom: 32 },
    selectionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: c.border },
    selectionCardActive: { borderColor: c.primary, backgroundColor: c.primaryGlow },
    selectionIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    selectionIconActive: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
    selectionLabel: { fontSize: fontSize.subtitle, fontWeight: '700' as const, color: c.text, flex: 1 },
    selectionLabelActive: { color: c.primaryLight },
    selectionDesc: { display: 'none' },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.borderLight, alignItems: 'center', justifyContent: 'center' },
    radioActive: { borderColor: c.primary },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.primary },
    continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.primaryDark, borderRadius: 14, paddingVertical: 16 },
    continueButtonDisabled: { opacity: 0.4 },
    continueText: { color: c.white, fontSize: fontSize.h4, fontWeight: '700' as const },
    suggestionsDropdown: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, marginTop: 4, overflow: 'hidden', maxHeight: 180 },
    suggestionItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    suggestionText: { fontSize: fontSize.bodyLg, color: c.text, fontWeight: '500' as const },
    createTeamOption: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.primaryGlow },
    createTeamOptionText: { fontSize: fontSize.bodyLg, color: c.primary, fontWeight: '600' as const },
    createTeamForm: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.primary, marginTop: 8, padding: 14, gap: 10, zIndex: 25, elevation: 25 },
    createTeamTitle: { fontSize: fontSize.body, fontWeight: '700' as const, color: c.primary, marginBottom: 2 },
    createTeamInput: { backgroundColor: c.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: fontSize.bodyLg, borderWidth: 1, borderColor: c.border },
    createTeamActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    createTeamCancel: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: c.border },
    createTeamCancelText: { fontSize: fontSize.body, color: c.textMuted, fontWeight: '600' as const },
    createTeamConfirm: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: c.primaryDark },
    createTeamConfirmDisabled: { opacity: 0.4 },
    createTeamConfirmText: { fontSize: fontSize.body, color: c.white, fontWeight: '600' as const },
  });
}
