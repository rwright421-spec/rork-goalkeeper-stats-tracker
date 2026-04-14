// Dashboard - Home screen for goalkeeper profile management
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  ChevronRight,
  Users,
  Pencil,
  Trash2,
  ArrowLeftRight,
  ListFilter,
  Calendar,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useTeams } from '@/contexts/TeamContext';
import { useGames } from '@/contexts/GameContext';
import { Team, AGE_GROUP_OPTIONS } from '@/types/game';
import SyncStatusBanner from '@/components/SyncStatusBanner';
import { DashboardSkeleton, TeamListSkeleton } from '@/components/LoadingSkeleton';
import { fontSize } from '@/constants/typography';


const AGE_GROUPS = AGE_GROUP_OPTIONS;

const currentYear = new Date().getFullYear();
const BIRTH_YEARS: string[] = [];
for (let y = currentYear; y >= 1975; y--) {
  BIRTH_YEARS.push(String(y));
}

const HALF_LENGTH_OPTIONS = [20, 25, 30, 35, 40, 45];

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { activeProfile, isGuest, clearSelection, updateProfile } = useGoalkeepers();
  const {
    teams,
    isLoading: teamsLoading,
    createTeam,
    updateTeam,
    deleteTeam,
    selectTeam,
    showAllGames,
    clearTeamSelection,
  } = useTeams();
  const { allGames, isLoading: gamesLoading } = useGames();

  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newYear, setNewYear] = useState('U10');
  const [newTeamName, setNewTeamName] = useState('');
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editYear, setEditYear] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [editYearPickerOpen, setEditYearPickerOpen] = useState(false);
  const [newHalfLength, setNewHalfLength] = useState<number | undefined>(undefined);
  const [halfLengthPickerOpen, setHalfLengthPickerOpen] = useState(false);
  const [editHalfLength, setEditHalfLength] = useState<number | undefined>(undefined);
  const [editHalfLengthPickerOpen, setEditHalfLengthPickerOpen] = useState(false);
  const [editingProfileMode, setEditingProfileMode] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileBirthYear, setEditProfileBirthYear] = useState('');
  const [editProfileYearPickerOpen, setEditProfileYearPickerOpen] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const displayName = isGuest ? 'Guest' : (activeProfile?.name ?? 'Goalkeeper');

  const careerSavesPct = useMemo(() => {
    let saves = 0;
    let ga = 0;
    for (const game of allGames) {
      if (game.homeKeeper) {
        saves += game.homeKeeper.firstHalf.saves + game.homeKeeper.secondHalf.saves;
        ga += game.homeKeeper.firstHalf.goalsAgainst + game.homeKeeper.secondHalf.goalsAgainst;
      }
      if (game.awayKeeper) {
        saves += game.awayKeeper.firstHalf.saves + game.awayKeeper.secondHalf.saves;
        ga += game.awayKeeper.firstHalf.goalsAgainst + game.awayKeeper.secondHalf.goalsAgainst;
      }
    }
    const total = saves + ga;
    if (total === 0) return 0;
    return Math.round((saves / total) * 100);
  }, [allGames]);

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

  const handleNewGame = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/new-game');
  }, [router]);

  const handleStartEditProfile = useCallback(() => {
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

  const handleCreateTeam = useCallback(() => {
    if (!newTeamName.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createTeam(newYear, newTeamName, newHalfLength);
    setNewTeamName('');
    setNewYear('U10');
    setNewHalfLength(undefined);
    setShowCreateTeam(false);
    setYearPickerOpen(false);
    setHalfLengthPickerOpen(false);
  }, [newYear, newTeamName, newHalfLength, createTeam]);

  const handleEditTeam = useCallback((team: Team) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingTeam(team);
    setEditYear(team.year);
    setEditTeamName(team.teamName);
    setEditHalfLength(team.halfLengthMinutes);
    setEditHalfLengthPickerOpen(false);
  }, []);

  const handleSaveEditTeam = useCallback(() => {
    if (!editingTeam || !editTeamName.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateTeam(editingTeam.id, editYear, editTeamName, editHalfLength);
    setEditingTeam(null);
    setEditYearPickerOpen(false);
    setEditHalfLengthPickerOpen(false);
  }, [editingTeam, editYear, editTeamName, editHalfLength, updateTeam]);

  const handleDeleteTeam = useCallback(
    (team: Team) => {
      Alert.alert(
        'Delete Team',
        `Delete "${team.teamName} (${team.year})"? Games will still exist but won't be linked.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              deleteTeam(team.id);
            },
          },
        ],
      );
    },
    [deleteTeam],
  );

  const handleFilterByTeam = useCallback(
    (teamId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      selectTeam(teamId);
      router.push('/(tabs)/track');
    },
    [selectTeam, router],
  );

  const handleViewAllGames = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showAllGames();
    router.push('/(tabs)/track');
  }, [showAllGames, router]);

  const handleViewGame = useCallback(
    (gameId: string) => {
      router.push(`/game-detail?id=${gameId}`);
    },
    [router],
  );

  const recentGames = useMemo(() => allGames.slice(0, 3), [allGames]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <SyncStatusBanner />
        {(teamsLoading || gamesLoading) && !editingProfileMode ? (
          <DashboardSkeleton />
        ) : editingProfileMode ? (
          <View style={styles.editProfileCard}>
            <Text style={styles.fieldLabel}>Goalkeeper Name</Text>
            <TextInput
              testID="edit-profile-name"
              style={styles.teamInput}
              value={editProfileName}
              onChangeText={setEditProfileName}
              placeholder="Goalkeeper name"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="next"
            />
            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Birth Year</Text>
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
                  {BIRTH_YEARS.map((yr) => (
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
            <View style={[styles.formActions, { marginTop: 14 }]}>
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
          <View style={styles.profileHeader}>
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
                {isGuest
                  ? 'Guest Mode · Stats not saved'
                  : `${allGames.length} game${allGames.length !== 1 ? 's' : ''} recorded`}
              </Text>
              {activeProfile?.birthYear ? (
                <Text style={styles.profileBirthYear}>Born {activeProfile.birthYear}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              testID="switch-goalkeeper-btn"
              style={styles.switchBtn}
              onPress={handleSwitchGoalkeeper}
              activeOpacity={0.7}
            >
              <ArrowLeftRight size={13} color={colors.primary} />
              <Text style={styles.switchBtnText}>Switch</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isGuest && allGames.length > 0 && (
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatValue}>{allGames.length}</Text>
              <Text style={styles.quickStatLabel}>Games</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Text style={[styles.quickStatValue, { color: careerSavesPct >= 50 ? colors.primary : colors.danger }]}>
                {careerSavesPct}%
              </Text>
              <Text style={styles.quickStatLabel}>Save %</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatValue}>{teams.length}</Text>
              <Text style={styles.quickStatLabel}>Teams</Text>
            </View>
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

        {!isGuest && (
          <>
            <View style={styles.sectionHeader}>
              <Users size={14} color={colors.textMuted} />
              <Text style={styles.sectionHeaderText}>Teams</Text>
              <Text style={styles.sectionCount}>{teams.length}</Text>
            </View>

            <View style={styles.teamsList}>
              {!showCreateTeam ? (
                <TouchableOpacity
                  testID="create-team-btn"
                  style={styles.createTeamRow}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCreateTeam(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.createTeamIcon}>
                    <Plus size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.createTeamText}>Add Team</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.createTeamForm}>
                  <Text style={styles.fieldLabel}>Age Group</Text>
                  <TouchableOpacity
                    style={styles.yearSelector}
                    onPress={() => setYearPickerOpen(!yearPickerOpen)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.yearText}>{newYear}</Text>
                  </TouchableOpacity>
                  {yearPickerOpen && (
                    <View style={styles.yearDropdown}>
                      <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                        {AGE_GROUPS.map((ag) => (
                          <TouchableOpacity
                            key={ag}
                            style={[styles.yearOption, newYear === ag && styles.yearOptionActive]}
                            onPress={() => {
                              setNewYear(ag);
                              setYearPickerOpen(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.yearOptionText, newYear === ag && styles.yearOptionTextActive, ag.length > 3 && { fontSize: fontSize.caption }]}>
                              {ag}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Team Name</Text>
                  <TextInput
                    testID="new-team-name"
                    style={styles.teamInput}
                    value={newTeamName}
                    onChangeText={setNewTeamName}
                    placeholder="e.g. FC United"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleCreateTeam}
                  />
                  <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Half Length</Text>
                  <TouchableOpacity
                    style={styles.yearSelector}
                    onPress={() => setHalfLengthPickerOpen(!halfLengthPickerOpen)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.yearText}>
                      {newHalfLength ? `${newHalfLength} min` : 'Default (40 min)'}
                    </Text>
                  </TouchableOpacity>
                  {halfLengthPickerOpen && (
                    <View style={styles.yearDropdown}>
                      <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                        <TouchableOpacity
                          style={[styles.yearOption, !newHalfLength && styles.yearOptionActive]}
                          onPress={() => { setNewHalfLength(undefined); setHalfLengthPickerOpen(false); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.yearOptionText, !newHalfLength && styles.yearOptionTextActive]}>Default (40 min)</Text>
                        </TouchableOpacity>
                        {HALF_LENGTH_OPTIONS.map((hl) => (
                          <TouchableOpacity
                            key={hl}
                            style={[styles.yearOption, newHalfLength === hl && styles.yearOptionActive]}
                            onPress={() => { setNewHalfLength(hl); setHalfLengthPickerOpen(false); }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.yearOptionText, newHalfLength === hl && styles.yearOptionTextActive]}>
                              {hl} min
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  <View style={[styles.formActions, { marginTop: 10 }]}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => {
                        setShowCreateTeam(false);
                        setNewTeamName('');
                        setYearPickerOpen(false);
                        setHalfLengthPickerOpen(false);
                        setNewHalfLength(undefined);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="confirm-create-team-btn"
                      style={[styles.confirmBtn, !newTeamName.trim() && styles.confirmBtnDisabled]}
                      onPress={handleCreateTeam}
                      disabled={!newTeamName.trim()}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.confirmText}>Create</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {teamsLoading ? (
                <TeamListSkeleton count={2} />
              ) : teams.length === 0 ? (
                <View style={styles.emptyTeams}>
                  <Text style={styles.emptyTeamsText}>No teams yet</Text>
                </View>
              ) : (
                teams.map((team) => {
                  if (editingTeam?.id === team.id) {
                    return (
                      <View key={team.id} style={styles.editTeamCard}>
                        <Text style={styles.fieldLabel}>Age Group</Text>
                        <TouchableOpacity
                          style={styles.yearSelector}
                          onPress={() => setEditYearPickerOpen(!editYearPickerOpen)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.yearText}>{editYear}</Text>
                        </TouchableOpacity>
                        {editYearPickerOpen && (
                          <View style={styles.yearDropdown}>
                            <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                              {AGE_GROUPS.map((ag) => (
                                <TouchableOpacity
                                  key={ag}
                                  style={[styles.yearOption, editYear === ag && styles.yearOptionActive]}
                                  onPress={() => {
                                    setEditYear(ag);
                                    setEditYearPickerOpen(false);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text
                                    style={[styles.yearOptionText, editYear === ag && styles.yearOptionTextActive, ag.length > 3 && { fontSize: fontSize.caption }]}
                                  >
                                    {ag}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                        <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Team Name</Text>
                        <TextInput
                          style={styles.teamInput}
                          value={editTeamName}
                          onChangeText={setEditTeamName}
                          placeholder="Team name"
                          placeholderTextColor={colors.textMuted}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={handleSaveEditTeam}
                        />
                        <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Half Length</Text>
                        <TouchableOpacity
                          style={styles.yearSelector}
                          onPress={() => setEditHalfLengthPickerOpen(!editHalfLengthPickerOpen)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.yearText}>
                            {editHalfLength ? `${editHalfLength} min` : 'Default (40 min)'}
                          </Text>
                        </TouchableOpacity>
                        {editHalfLengthPickerOpen && (
                          <View style={styles.yearDropdown}>
                            <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                              <TouchableOpacity
                                style={[styles.yearOption, !editHalfLength && styles.yearOptionActive]}
                                onPress={() => { setEditHalfLength(undefined); setEditHalfLengthPickerOpen(false); }}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.yearOptionText, !editHalfLength && styles.yearOptionTextActive]}>Default (40 min)</Text>
                              </TouchableOpacity>
                              {HALF_LENGTH_OPTIONS.map((hl) => (
                                <TouchableOpacity
                                  key={hl}
                                  style={[styles.yearOption, editHalfLength === hl && styles.yearOptionActive]}
                                  onPress={() => { setEditHalfLength(hl); setEditHalfLengthPickerOpen(false); }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.yearOptionText, editHalfLength === hl && styles.yearOptionTextActive]}>
                                    {hl} min
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                        <View style={[styles.formActions, { marginTop: 10 }]}>
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => {
                              setEditingTeam(null);
                              setEditYearPickerOpen(false);
                              setEditHalfLengthPickerOpen(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.cancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.confirmBtn, !editTeamName.trim() && styles.confirmBtnDisabled]}
                            onPress={handleSaveEditTeam}
                            disabled={!editTeamName.trim()}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.confirmText}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }

                  const teamGameCount = allGames.filter((g) => g.teamId === team.id).length;

                  return (
                    <View key={team.id} style={styles.teamRow}>
                      <TouchableOpacity
                        testID={`team-row-${team.id}`}
                        style={styles.teamRowMain}
                        onPress={() => handleFilterByTeam(team.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.teamBadge}>
                          <Text style={styles.teamBadgeText}>{team.year}</Text>
                        </View>
                        <View style={styles.teamInfo}>
                          <Text style={styles.teamName}>{team.teamName}</Text>
                          <Text style={styles.teamMeta}>
                            {teamGameCount} game{teamGameCount !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <ChevronRight size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                      <View style={styles.teamActions}>
                        <TouchableOpacity
                          testID={`edit-team-${team.id}`}
                          style={styles.teamActionBtn}
                          onPress={() => handleEditTeam(team)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Pencil size={12} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          testID={`delete-team-${team.id}`}
                          style={styles.teamDeleteBtn}
                          onPress={() => handleDeleteTeam(team)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={12} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}

              {teams.length > 0 && (
                <TouchableOpacity
                  testID="view-all-games-btn"
                  style={styles.viewAllRow}
                  onPress={handleViewAllGames}
                  activeOpacity={0.7}
                >
                  <ListFilter size={14} color={colors.accent} />
                  <Text style={styles.viewAllText}>View All Games Across Teams</Text>
                  <ChevronRight size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {allGames.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Calendar size={14} color={colors.textMuted} />
              <Text style={styles.sectionHeaderText}>Recent Games</Text>
              <Text style={styles.sectionCount}>{allGames.length}</Text>
            </View>

            <View style={styles.recentGamesCard}>
              {recentGames.map((game, idx) => {
                const dateStr = game.setup.date || '';
                const saves =
                  (game.homeKeeper
                    ? game.homeKeeper.firstHalf.saves + game.homeKeeper.secondHalf.saves
                    : 0) +
                  (game.awayKeeper
                    ? game.awayKeeper.firstHalf.saves + game.awayKeeper.secondHalf.saves
                    : 0);
                const ga =
                  (game.homeKeeper
                    ? game.homeKeeper.firstHalf.goalsAgainst + game.homeKeeper.secondHalf.goalsAgainst
                    : 0) +
                  (game.awayKeeper
                    ? game.awayKeeper.firstHalf.goalsAgainst + game.awayKeeper.secondHalf.goalsAgainst
                    : 0);
                const pct = saves + ga > 0 ? Math.round((saves / (saves + ga)) * 100) : 0;

                return (
                  <TouchableOpacity
                    key={game.id}
                    testID={`recent-game-${game.id}`}
                    style={[styles.recentGameRow, idx < recentGames.length - 1 && styles.recentGameBorder]}
                    onPress={() => handleViewGame(game.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentGameInfo}>
                      <Text style={styles.recentGameName} numberOfLines={1}>
                        vs {game.setup.gameName || 'Unknown'}
                      </Text>
                      <Text style={styles.recentGameDate}>
                        {dateStr}
                        {game.setup.eventName ? ` · ${game.setup.eventName}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.recentGamePct, { backgroundColor: pct >= 50 ? colors.primaryGlow : colors.dangerGlow }]}>
                      <Text style={[styles.recentGamePctText, { color: pct >= 50 ? colors.primary : colors.danger }]}>
                        {pct}%
                      </Text>
                    </View>
                    <ChevronRight size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}

              {allGames.length > 3 && (
                <TouchableOpacity
                  testID="see-all-games-btn"
                  style={styles.seeAllGamesRow}
                  onPress={handleViewAllGames}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllGamesText}>See all {allGames.length} games</Text>
                  <ChevronRight size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {!isGuest && activeProfile && !editingProfileMode && (
          <>
            <View style={styles.sectionHeader}>
              <Pencil size={14} color={colors.textMuted} />
              <Text style={styles.sectionHeaderText}>Profile</Text>
            </View>

            <View style={styles.actionsCard}>
              <TouchableOpacity
                testID="edit-profile-btn"
                style={[styles.actionRow, { borderBottomWidth: 0 }]}
                onPress={handleStartEditProfile}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                  <Pencil size={16} color="#8B5CF6" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Edit Profile</Text>
                  <Text style={styles.actionSubtitle}>Update name or birth year</Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
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
      paddingHorizontal: 28,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
      gap: 12,
    },
    profileAvatar: {
      width: 52,
      height: 52,
      borderRadius: 15,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    profileInitial: {
      fontSize: fontSize.h1sm,
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
      flexShrink: 1,
      overflow: 'hidden',
    },
    profileName: {
      fontSize: fontSize.h2,
      fontWeight: '800' as const,
      color: c.text,
      flexShrink: 1,
      maxWidth: '100%',
    },
    profileMeta: {
      fontSize: fontSize.body2,
      color: c.textSecondary,
      fontWeight: '500' as const,
      marginTop: 2,
    },
    profileBirthYear: {
      fontSize: fontSize.caption,
      color: c.textMuted,
      fontWeight: '500' as const,
      marginTop: 1,
    },
    editProfileCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.primary,
    },
    switchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: c.primaryGlow,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    switchBtnText: {
      fontSize: fontSize.sm,
      fontWeight: '600' as const,
      color: c.primary,
    },
    quickStatsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    quickStatCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    quickStatValue: {
      fontSize: fontSize.h1sm,
      fontWeight: '800' as const,
      color: c.text,
    },
    quickStatLabel: {
      fontSize: fontSize.xs,
      fontWeight: '600' as const,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 3,
    },
    newGameButton: {
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: c.primaryDark,
      marginBottom: 24,
    },
    newGameInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 15,
    },
    newGameText: {
      color: c.white,
      fontSize: fontSize.h4,
      fontWeight: '700' as const,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    sectionHeaderText: {
      flex: 1,
      fontSize: fontSize.body2,
      fontWeight: '700' as const,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    sectionCount: {
      fontSize: fontSize.caption,
      fontWeight: '600' as const,
      color: c.textMuted,
      backgroundColor: c.surface,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      overflow: 'hidden',
    },
    teamsList: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      marginBottom: 24,
    },
    createTeamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    createTeamIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    createTeamText: {
      fontSize: fontSize.bodyLg,
      fontWeight: '600' as const,
      color: c.primary,
    },
    createTeamForm: {
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    fieldLabel: {
      fontSize: fontSize.caption,
      fontWeight: '600' as const,
      color: c.textSecondary,
      marginBottom: 6,
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
      fontSize: fontSize.bodyLg,
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
      fontSize: fontSize.body,
      color: c.text,
      fontWeight: '500' as const,
    },
    yearOptionTextActive: {
      color: c.primary,
      fontWeight: '700' as const,
    },
    teamInput: {
      backgroundColor: c.surfaceLight,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: c.text,
      fontSize: fontSize.bodyLg,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 10,
    },
    formActions: {
      flexDirection: 'row',
      gap: 8,
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
      fontSize: fontSize.body,
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
      fontSize: fontSize.body,
      fontWeight: '700' as const,
      color: c.white,
    },
    emptyTeams: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyTeamsText: {
      fontSize: fontSize.body2,
      color: c.textMuted,
    },
    teamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    teamRowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 10,
    },
    teamBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    teamBadgeText: {
      fontSize: fontSize.caption,
      fontWeight: '800' as const,
      color: c.primary,
    },
    teamInfo: {
      flex: 1,
    },
    teamName: {
      fontSize: fontSize.bodyLg,
      fontWeight: '600' as const,
      color: c.text,
    },
    teamMeta: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: 1,
    },
    teamActions: {
      flexDirection: 'row',
      gap: 4,
      paddingRight: 10,
    },
    teamActionBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: c.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamDeleteBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: c.dangerGlow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editTeamCard: {
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.surfaceLight,
    },
    viewAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 8,
    },
    viewAllText: {
      flex: 1,
      fontSize: fontSize.body,
      fontWeight: '600' as const,
      color: c.accent,
    },
    recentGamesCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      marginBottom: 24,
    },
    recentGameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 10,
    },
    recentGameBorder: {
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    recentGameInfo: {
      flex: 1,
    },
    recentGameName: {
      fontSize: fontSize.bodyLg,
      fontWeight: '600' as const,
      color: c.text,
    },
    recentGameDate: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: 2,
    },
    recentGamePct: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    recentGamePctText: {
      fontSize: fontSize.body2,
      fontWeight: '700' as const,
    },
    seeAllGamesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      gap: 6,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    seeAllGamesText: {
      fontSize: fontSize.body,
      fontWeight: '600' as const,
      color: c.primary,
    },
    actionsCard: {
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
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    actionTextContainer: {
      flex: 1,
    },
    actionTitle: {
      fontSize: fontSize.bodyLg,
      fontWeight: '600' as const,
      color: c.text,
    },
    actionSubtitle: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      fontWeight: '500' as const,
      marginTop: 1,
    },
  });
}
