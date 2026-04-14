// Team Select - Team management and selection screen
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Plus, Shield, ChevronRight, Pencil, Trash2, Users, ListFilter } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useTeams } from '@/contexts/TeamContext';
import { Team } from '@/types/game';

const currentYear = new Date().getFullYear();
const YEARS: string[] = [];
for (let y = currentYear; y >= 1975; y--) { YEARS.push(String(y)); }

const HALF_LENGTH_OPTIONS = [20, 25, 30, 35, 40, 45];

export default function TeamSelectScreen() {
  console.log("[TeamSelect] Screen rendered");
  const router = useRouter();
  const colors = useColors();
  const { activeProfile } = useGoalkeepers();
  const { teams, isLoading, createTeam, updateTeam, deleteTeam, selectTeam, showAllGames } = useTeams();
  const [showCreate, setShowCreate] = useState(false);
  const [newYear, setNewYear] = useState(String(currentYear));
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

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleCreate = useCallback(() => {
    if (!newTeamName.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const team = createTeam(newYear, newTeamName, newHalfLength);
    setNewTeamName(''); setNewYear(String(currentYear)); setShowCreate(false); setNewHalfLength(undefined); setHalfLengthPickerOpen(false);
    selectTeam(team.id); router.push('/track');
  }, [newYear, newTeamName, newHalfLength, createTeam, selectTeam, router]);

  const handleSelectTeam = useCallback((teamId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectTeam(teamId); router.push('/track');
  }, [selectTeam, router]);

  const handleViewAllGames = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAllGames(); router.push('/track');
  }, [showAllGames, router]);

  const handleEditTeam = useCallback((team: Team) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingTeam(team); setEditYear(team.year); setEditTeamName(team.teamName); setEditHalfLength(team.halfLengthMinutes); setEditHalfLengthPickerOpen(false);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingTeam || !editTeamName.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateTeam(editingTeam.id, editYear, editTeamName, editHalfLength); setEditingTeam(null); setEditHalfLengthPickerOpen(false);
  }, [editingTeam, editYear, editTeamName, editHalfLength, updateTeam]);

  const handleCancelEdit = useCallback(() => { setEditingTeam(null); setEditYearPickerOpen(false); setEditHalfLengthPickerOpen(false); }, []);

  const handleDeleteTeam = useCallback((team: Team) => {
    Alert.alert('Delete Team', `Are you sure you want to delete "${team.teamName} (${team.year})"? Games under this team will still exist but won't be linked to a team.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); deleteTeam(team.id); } },
    ]);
  }, [deleteTeam]);

  const renderTeam = useCallback(({ item }: { item: Team }) => {
    if (editingTeam?.id === item.id) {
      return (
        <View style={styles.editCard}>
          <Text style={styles.fieldLabel}>Year</Text>
          <TouchableOpacity style={styles.yearSelector} onPress={() => setEditYearPickerOpen(!editYearPickerOpen)} activeOpacity={0.7}>
            <Text style={styles.yearText}>{editYear}</Text>
          </TouchableOpacity>
          {editYearPickerOpen && (
            <View style={styles.yearDropdown}>
              <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                {YEARS.map((yr) => (
                  <TouchableOpacity key={yr} style={[styles.yearOption, editYear === yr && styles.yearOptionActive]} onPress={() => { setEditYear(yr); setEditYearPickerOpen(false); }} activeOpacity={0.7}>
                    <Text style={[styles.yearOptionText, editYear === yr && styles.yearOptionTextActive]}>{yr}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Team Name</Text>
          <TextInput style={styles.input} value={editTeamName} onChangeText={setEditTeamName} placeholder="Team name" placeholderTextColor={colors.textMuted} autoFocus returnKeyType="done" onSubmitEditing={handleSaveEdit} />
          <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Half Length</Text>
          <TouchableOpacity style={styles.yearSelector} onPress={() => setEditHalfLengthPickerOpen(!editHalfLengthPickerOpen)} activeOpacity={0.7}>
            <Text style={styles.yearText}>{editHalfLength ? `${editHalfLength} min` : 'Default (40 min)'}</Text>
          </TouchableOpacity>
          {editHalfLengthPickerOpen && (
            <View style={styles.yearDropdown}>
              <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                <TouchableOpacity style={[styles.yearOption, !editHalfLength && styles.yearOptionActive]} onPress={() => { setEditHalfLength(undefined); setEditHalfLengthPickerOpen(false); }} activeOpacity={0.7}>
                  <Text style={[styles.yearOptionText, !editHalfLength && styles.yearOptionTextActive]}>Default (40 min)</Text>
                </TouchableOpacity>
                {HALF_LENGTH_OPTIONS.map((hl) => (
                  <TouchableOpacity key={hl} style={[styles.yearOption, editHalfLength === hl && styles.yearOptionActive]} onPress={() => { setEditHalfLength(hl); setEditHalfLengthPickerOpen(false); }} activeOpacity={0.7}>
                    <Text style={[styles.yearOptionText, editHalfLength === hl && styles.yearOptionTextActive]}>{hl} min</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={[styles.formActions, { marginTop: 8 }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit} activeOpacity={0.7}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, !editTeamName.trim() && styles.confirmBtnDisabled]} onPress={handleSaveEdit} disabled={!editTeamName.trim()} activeOpacity={0.8}><Text style={styles.confirmText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <TouchableOpacity style={styles.teamCard} onPress={() => handleSelectTeam(item.id)} activeOpacity={0.7}>
        <View style={styles.teamBadge}><Text style={styles.teamBadgeText}>{item.year}</Text></View>
        <View style={styles.teamInfo}><Text style={styles.teamName}>{item.teamName}</Text><Text style={styles.teamMeta}>{item.year} Season</Text></View>
        <TouchableOpacity style={styles.teamEditBtn} onPress={() => handleEditTeam(item)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Pencil size={14} color={colors.primary} /></TouchableOpacity>
        <TouchableOpacity style={styles.teamDeleteBtn} onPress={() => handleDeleteTeam(item)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Trash2 size={14} color={colors.danger} /></TouchableOpacity>
        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }, [handleSelectTeam, handleEditTeam, handleDeleteTeam, handleSaveEdit, handleCancelEdit, editingTeam, editYear, editTeamName, editYearPickerOpen, styles, colors]);

  const keyExtractor = useCallback((item: Team) => item.id, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `${activeProfile?.name ?? 'Goalkeeper'} - Teams`, headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '700' as const } }} />
      <View style={styles.headerSection}>
        <View style={styles.profileBadge}><Shield size={18} color={colors.primary} /><Text style={styles.profileName}>{activeProfile?.name ?? 'Goalkeeper'}</Text></View>
        <Text style={styles.sectionInstruction}>Select a team or create a new one</Text>
      </View>
      <View style={styles.actionsSection}>
        {!showCreate ? (
          <TouchableOpacity testID="create-team-btn" style={styles.createButton} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCreate(true); }} activeOpacity={0.8}>
            <View style={styles.createIconContainer}><Plus size={20} color={colors.primary} /></View>
            <Text style={styles.createButtonText}>Create a Team</Text><ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.createForm}>
            <Text style={styles.fieldLabel}>Year</Text>
            <TouchableOpacity style={styles.yearSelector} onPress={() => setYearPickerOpen(!yearPickerOpen)} activeOpacity={0.7}><Text style={styles.yearText}>{newYear}</Text></TouchableOpacity>
            {yearPickerOpen && (
              <View style={styles.yearDropdown}>
                <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                  {YEARS.map((yr) => (<TouchableOpacity key={yr} style={[styles.yearOption, newYear === yr && styles.yearOptionActive]} onPress={() => { setNewYear(yr); setYearPickerOpen(false); }} activeOpacity={0.7}><Text style={[styles.yearOptionText, newYear === yr && styles.yearOptionTextActive]}>{yr}</Text></TouchableOpacity>))}
                </ScrollView>
              </View>
            )}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Team Name</Text>
            <TextInput testID="new-team-name" style={styles.input} value={newTeamName} onChangeText={setNewTeamName} placeholder="e.g. FC United" placeholderTextColor={colors.textMuted} autoFocus returnKeyType="done" onSubmitEditing={handleCreate} />
            <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Half Length</Text>
            <TouchableOpacity style={styles.yearSelector} onPress={() => setHalfLengthPickerOpen(!halfLengthPickerOpen)} activeOpacity={0.7}>
              <Text style={styles.yearText}>{newHalfLength ? `${newHalfLength} min` : 'Default (40 min)'}</Text>
            </TouchableOpacity>
            {halfLengthPickerOpen && (
              <View style={styles.yearDropdown}>
                <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                  <TouchableOpacity style={[styles.yearOption, !newHalfLength && styles.yearOptionActive]} onPress={() => { setNewHalfLength(undefined); setHalfLengthPickerOpen(false); }} activeOpacity={0.7}>
                    <Text style={[styles.yearOptionText, !newHalfLength && styles.yearOptionTextActive]}>Default (40 min)</Text>
                  </TouchableOpacity>
                  {HALF_LENGTH_OPTIONS.map((hl) => (
                    <TouchableOpacity key={hl} style={[styles.yearOption, newHalfLength === hl && styles.yearOptionActive]} onPress={() => { setNewHalfLength(hl); setHalfLengthPickerOpen(false); }} activeOpacity={0.7}>
                      <Text style={[styles.yearOptionText, newHalfLength === hl && styles.yearOptionTextActive]}>{hl} min</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={[styles.formActions, { marginTop: 8 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreate(false); setNewTeamName(''); setYearPickerOpen(false); setHalfLengthPickerOpen(false); setNewHalfLength(undefined); }} activeOpacity={0.7}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity testID="confirm-create-team-btn" style={[styles.confirmBtn, !newTeamName.trim() && styles.confirmBtnDisabled]} onPress={handleCreate} disabled={!newTeamName.trim()} activeOpacity={0.8}><Text style={styles.confirmText}>Create</Text></TouchableOpacity>
            </View>
          </View>
        )}
        <TouchableOpacity testID="view-all-games-btn" style={styles.allGamesButton} onPress={handleViewAllGames} activeOpacity={0.8}>
          <View style={[styles.createIconContainer, styles.allGamesIcon]}><ListFilter size={20} color={colors.accent} /></View>
          <View style={styles.allGamesTextContainer}><Text style={styles.allGamesText}>View All Games</Text><Text style={styles.allGamesSubtext}>Across all teams</Text></View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

      </View>
      <View style={styles.teamsHeader}><Users size={16} color={colors.textMuted} /><Text style={styles.teamsTitle}>Teams</Text><Text style={styles.teamsCount}>{teams.length}</Text></View>
      {isLoading ? (
        <View style={styles.emptyContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : teams.length === 0 ? (
        <View style={styles.emptyContainer}><Users size={40} color={colors.border} strokeWidth={1.5} /><Text style={styles.emptyTitle}>No Teams Yet</Text><Text style={styles.emptySubtitle}>Create a team to organize games</Text></View>
      ) : (
        <FlatList data={teams} renderItem={renderTeam} keyExtractor={keyExtractor} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    headerSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
    profileBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primaryGlow, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)', marginBottom: 10 },
    profileName: { fontSize: 14, fontWeight: '700' as const, color: c.primaryLight },
    sectionInstruction: { fontSize: 14, color: c.textSecondary, fontWeight: '500' as const },
    actionsSection: { paddingHorizontal: 20, marginBottom: 24, gap: 10 },
    createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: c.primary },
    createIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.primaryGlow, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    createButtonText: { flex: 1, fontSize: 16, fontWeight: '700' as const, color: c.text },
    createForm: { backgroundColor: c.surface, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: c.primary },
    fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: c.textSecondary, marginBottom: 8 },
    input: { backgroundColor: c.surfaceLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 16, borderWidth: 1, borderColor: c.border, marginBottom: 12 },
    yearSelector: { backgroundColor: c.surfaceLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.border },
    yearText: { fontSize: 16, color: c.text, fontWeight: '500' as const },
    yearDropdown: { backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderColor: c.border, marginTop: 4, overflow: 'hidden' },
    yearScroll: { maxHeight: 200 },
    yearOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
    yearOptionActive: { backgroundColor: c.primaryGlow },
    yearOptionText: { fontSize: 14, color: c.text, fontWeight: '500' as const },
    yearOptionTextActive: { color: c.primary, fontWeight: '700' as const },
    formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.surfaceLight, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    cancelText: { fontSize: 14, fontWeight: '600' as const, color: c.textSecondary },
    confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.primaryDark, alignItems: 'center' },
    confirmBtnDisabled: { opacity: 0.4 },
    confirmText: { fontSize: 14, fontWeight: '700' as const, color: c.white },
    allGamesButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.border },
    allGamesIcon: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },

    allGamesTextContainer: { flex: 1 },
    allGamesText: { fontSize: 16, fontWeight: '700' as const, color: c.text },
    allGamesSubtext: { fontSize: 12, color: c.textMuted, fontWeight: '500' as const, marginTop: 1 },
    teamsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
    teamsTitle: { flex: 1, fontSize: 15, fontWeight: '700' as const, color: c.textSecondary },
    teamsCount: { fontSize: 13, fontWeight: '600' as const, color: c.textMuted, backgroundColor: c.surface, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    teamCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    teamBadge: { width: 42, height: 42, borderRadius: 10, backgroundColor: c.primaryGlow, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
    teamBadgeText: { fontSize: 13, fontWeight: '800' as const, color: c.primary },
    teamInfo: { flex: 1 },
    teamName: { fontSize: 16, fontWeight: '600' as const, color: c.text },
    teamMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    teamEditBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: c.primaryGlow, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
    teamDeleteBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: c.dangerGlow, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 1, borderColor: 'rgba(248, 81, 73, 0.2)' },
    editCard: { backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: c.primary },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: '600' as const, color: c.textSecondary, marginTop: 8 },
    emptySubtitle: { fontSize: 13, color: c.textMuted },
  });
}
