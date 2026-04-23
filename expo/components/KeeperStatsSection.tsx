import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react-native';
import StatCounter from '@/components/StatCounter';
import SavePercentageBadge from '@/components/SavePercentageBadge';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { fontSize } from '@/constants/typography';
import { KeeperData, DistributionStats, PenaltyStats, HalfStats, GoalkeeperProfile, getTotalSaves, getTotalGoalsAgainst, getOverallSavePercentage, getTotalDistribution, getTotalPenalties, getShotsFaced, getTotalShotsFaced, getShootoutShotsFaced, getTotalOneVsOneFaced, getTotalOneVsOneSaved, getTotalOneVsOneGoals, getTotalOneVsOneMissed, getOneVsOneSavePercentage, getHalfLengthForAgeGroup, defaultHalfStats, AGE_GROUP_OPTIONS, deriveHalvesPlayed, getPkSavePercentage } from '@/types/game';
import KeeperSelectorSheet, { KeeperSelectorButton, KeeperSelectionState } from '@/components/KeeperSelectorSheet';
import StatInfoBubble from '@/components/StatInfoBubble';
import { getAgeBand } from '@/constants/ageBands';

interface KeeperStatsSectionProps {
  label: 'HOME' | 'AWAY';
  keeper: KeeperData;
  onUpdate: (keeper: KeeperData) => void;
  accentColor: string;
  showShootout?: boolean;
  profiles?: GoalkeeperProfile[];
  onCreateProfile?: (name: string, birthYear: string) => GoalkeeperProfile;
  ageGroup?: string;
  halfLengthMinutes?: number;
  inputAccessoryViewID?: string;
  isOpponentKeeper?: boolean;
  hideTeamAndYear?: boolean;
}

const AGE_GROUPS = AGE_GROUP_OPTIONS;

export default React.memo(function KeeperStatsSection({ label, keeper, onUpdate, accentColor, showShootout, profiles, onCreateProfile, ageGroup, halfLengthMinutes, inputAccessoryViewID, isOpponentKeeper = false, hideTeamAndYear = false }: KeeperStatsSectionProps) {
  const accessoryProps = Platform.OS === 'ios' && inputAccessoryViewID ? { inputAccessoryViewID } : {};
  const colors = useColors();
  const [yearPickerOpen, setYearPickerOpen] = React.useState(false);
  const [secondHalfYearPickerOpen, setSecondHalfYearPickerOpen] = React.useState(false);
  const [secondHalfInfoCollapsed, setSecondHalfInfoCollapsed] = React.useState(true);
  const [notesCollapsed, setNotesCollapsed] = React.useState(true);
  const [firstHalfSelectorOpen, setFirstHalfSelectorOpen] = useState(false);
  const [secondHalfSelectorOpen, setSecondHalfSelectorOpen] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ageBand = useMemo(() => getAgeBand(keeper.year || ageGroup || ''), [keeper.year, ageGroup]);

  const firstHalfSelection = useMemo((): KeeperSelectionState => {
    if (keeper.keeperIsLinked && keeper.keeperProfileId) {
      const profile = profiles?.find(p => p.id === keeper.keeperProfileId);
      return { mode: profile ? 'profile' : 'new', profileId: keeper.keeperProfileId, profileName: keeper.name, isLinked: true };
    }
    return { mode: 'manual', profileId: null, profileName: keeper.name, isLinked: false };
  }, [keeper.keeperIsLinked, keeper.keeperProfileId, keeper.name, profiles]);

  const secondHalfSelection = useMemo((): KeeperSelectionState => {
    if (keeper.secondHalfKeeperIsLinked && keeper.secondHalfKeeperProfileId) {
      const profile = profiles?.find(p => p.id === keeper.secondHalfKeeperProfileId);
      return { mode: profile ? 'profile' : 'new', profileId: keeper.secondHalfKeeperProfileId, profileName: keeper.secondHalfName, isLinked: true };
    }
    return { mode: 'manual', profileId: null, profileName: keeper.secondHalfName, isLinked: false };
  }, [keeper.secondHalfKeeperIsLinked, keeper.secondHalfKeeperProfileId, keeper.secondHalfName, profiles]);

  const handleFirstHalfSelectProfile = useCallback((profile: GoalkeeperProfile) => {
    const updated = { ...keeper, name: profile.name, keeperProfileId: profile.id, keeperIsLinked: true };
    if (keeper.secondHalfName === keeper.name) {
      updated.secondHalfName = profile.name;
      updated.secondHalfKeeperProfileId = profile.id;
      updated.secondHalfKeeperIsLinked = true;
    }
    onUpdate(updated);
  }, [keeper, onUpdate]);

  const handleFirstHalfCreateProfile = useCallback((name: string, birthYear: string) => {
    if (!onCreateProfile) return;
    const newProfile = onCreateProfile(name, birthYear);
    const updated = { ...keeper, name: newProfile.name, keeperProfileId: newProfile.id, keeperIsLinked: true };
    if (keeper.secondHalfName === keeper.name) {
      updated.secondHalfName = newProfile.name;
      updated.secondHalfKeeperProfileId = newProfile.id;
      updated.secondHalfKeeperIsLinked = true;
    }
    onUpdate(updated);
  }, [keeper, onUpdate, onCreateProfile]);

  const handleFirstHalfManualEntry = useCallback((name: string) => {
    const updated = { ...keeper, name, keeperProfileId: null, keeperIsLinked: false };
    if (keeper.secondHalfName === keeper.name) {
      updated.secondHalfName = name;
      updated.secondHalfKeeperProfileId = null;
      updated.secondHalfKeeperIsLinked = false;
    }
    onUpdate(updated);
  }, [keeper, onUpdate]);

  const handleSecondHalfSelectProfile = useCallback((profile: GoalkeeperProfile) => {
    onUpdate({ ...keeper, secondHalfName: profile.name, secondHalfKeeperProfileId: profile.id, secondHalfKeeperIsLinked: true });
  }, [keeper, onUpdate]);

  const handleSecondHalfCreateProfile = useCallback((name: string, birthYear: string) => {
    if (!onCreateProfile) return;
    const newProfile = onCreateProfile(name, birthYear);
    onUpdate({ ...keeper, secondHalfName: newProfile.name, secondHalfKeeperProfileId: newProfile.id, secondHalfKeeperIsLinked: true });
  }, [keeper, onUpdate, onCreateProfile]);

  const handleSecondHalfManualEntry = useCallback((name: string) => {
    onUpdate({ ...keeper, secondHalfName: name, secondHalfKeeperProfileId: null, secondHalfKeeperIsLinked: false });
  }, [keeper, onUpdate]);

  const updateField = useCallback((field: keyof KeeperData, value: string) => {
    const updated = { ...keeper, [field]: value };
    if (field === 'name' && keeper.secondHalfName === keeper.name) updated.secondHalfName = value;
    if (field === 'year' && keeper.secondHalfYear === keeper.year) updated.secondHalfYear = value;
    if (field === 'teamName' && keeper.secondHalfTeamName === keeper.teamName) updated.secondHalfTeamName = value;
    onUpdate(updated);
  }, [keeper, onUpdate]);

  const updateHalf = useCallback((half: 'firstHalf' | 'secondHalf', stat: 'saves' | 'goalsAgainst', delta: number) => {
    const h = keeper[half] ?? defaultHalfStats;
    const current = h[stat];
    const newVal = Math.max(0, current + delta);
    onUpdate({ ...keeper, [half]: { ...h, [stat]: newVal } });
  }, [keeper, onUpdate]);

  const updateHalfDistribution = useCallback((half: 'firstHalf' | 'secondHalf', stat: keyof DistributionStats, delta: number) => {
    const h = keeper[half] ?? defaultHalfStats;
    const current = h.distribution[stat];
    const newVal = Math.max(0, current + delta);
    onUpdate({ ...keeper, [half]: { ...h, distribution: { ...h.distribution, [stat]: newVal } } });
  }, [keeper, onUpdate]);

  const updateHalfPenalty = useCallback((half: 'firstHalf' | 'secondHalf', stat: keyof PenaltyStats, delta: number) => {
    const h = keeper[half] ?? defaultHalfStats;
    const current = h.penalties[stat];
    const newVal = Math.max(0, current + delta);
    onUpdate({ ...keeper, [half]: { ...h, penalties: { ...h.penalties, [stat]: newVal } } });
  }, [keeper, onUpdate]);

  const updateHalfOneVsOne = useCallback((half: 'firstHalf' | 'secondHalf', stat: 'oneVsOneSaved' | 'oneVsOneGoals' | 'oneVsOneMissed', delta: number) => {
    const h = (keeper[half] ?? defaultHalfStats) as HalfStats;
    const current = h[stat] ?? 0;
    const newVal = Math.max(0, current + delta);
    onUpdate({ ...keeper, [half]: { ...h, [stat]: newVal } });
  }, [keeper, onUpdate]);

  type IncidentKind = 'save' | 'goal' | 'oneVsOneSave' | 'oneVsOneGoal' | 'pkSave' | 'pkGoal';

  const getIncidentCount = useCallback((half: HalfStats, kind: IncidentKind): number => {
    switch (kind) {
      case 'save': return half.saves;
      case 'goal': return half.goalsAgainst;
      case 'oneVsOneSave': return half.oneVsOneSaved;
      case 'oneVsOneGoal': return half.oneVsOneGoals;
      case 'pkSave': return half.penalties.penaltiesSaved;
      case 'pkGoal': return half.penalties.penaltyGoals;
    }
  }, []);

  const logIncident = useCallback((halfKey: 'firstHalf' | 'secondHalf', kind: IncidentKind, delta: 1 | -1) => {
    const h = (keeper[halfKey] ?? defaultHalfStats) as HalfStats;
    const current = getIncidentCount(h, kind);
    if (delta === -1 && current === 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    void Haptics.impactAsync(delta === 1 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    const next = Math.max(0, current + delta);
    let updatedHalf: HalfStats = h;
    switch (kind) {
      case 'save':
        updatedHalf = { ...h, saves: next };
        break;
      case 'goal':
        updatedHalf = { ...h, goalsAgainst: next };
        break;
      case 'oneVsOneSave':
        updatedHalf = { ...h, oneVsOneSaved: next };
        break;
      case 'oneVsOneGoal':
        updatedHalf = { ...h, oneVsOneGoals: next };
        break;
      case 'pkSave':
        updatedHalf = { ...h, penalties: { ...h.penalties, penaltiesSaved: next } };
        break;
      case 'pkGoal':
        updatedHalf = { ...h, penalties: { ...h.penalties, penaltyGoals: next } };
        break;
    }
    onUpdate({ ...keeper, [halfKey]: updatedHalf });
  }, [keeper, onUpdate, getIncidentCount]);

  const totalSaves = getTotalSaves(keeper);
  const totalGA = getTotalGoalsAgainst(keeper);
  const totalShotsFaced = getTotalShotsFaced(keeper);
  const overallPct = getOverallSavePercentage(keeper);
  const totalDist = getTotalDistribution(keeper);
  const totalPen = getTotalPenalties(keeper);
  const totalOneVsOneFaced = getTotalOneVsOneFaced(keeper);
  const totalOneVsOneSaved = getTotalOneVsOneSaved(keeper);
  const totalOneVsOneGoals = getTotalOneVsOneGoals(keeper);
  const totalOneVsOneMissed = getTotalOneVsOneMissed(keeper);
  const oneVsOneSavePct = getOneVsOneSavePercentage(keeper);

  const renderIncidentButton = useCallback((
    halfKey: 'firstHalf' | 'secondHalf',
    kind: IncidentKind,
    label: string,
    count: number,
    tier: 'primary' | 'secondary' | 'tertiary',
    tone: 'save' | 'goal',
  ) => {
    const tierStyle = tier === 'primary' ? styles.incidentBtnPrimary : tier === 'secondary' ? styles.incidentBtnSecondary : styles.incidentBtnTertiary;
    const labelStyle = tier === 'primary' ? styles.incidentLabelPrimary : styles.incidentLabelSecondary;
    const countStyle = tier === 'primary' ? styles.incidentCountPrimary : styles.incidentCountSecondary;
    const toneColor = tone === 'save' ? colors.primary : colors.danger;
    const toneBg = tone === 'save' ? colors.primaryGlow : colors.dangerGlow;
    return (
      <View style={[styles.incidentBtn, tierStyle, { borderColor: toneColor + '55', backgroundColor: toneBg }]}>
        <TouchableOpacity
          testID={`${halfKey}-${kind}-increment`}
          onPress={() => logIncident(halfKey, kind, 1)}
          activeOpacity={0.7}
          style={styles.incidentBody}
        >
          <Text style={[labelStyle, { color: toneColor }]} numberOfLines={1}>{label}</Text>
          <Text style={[countStyle, { color: toneColor }]}>{count}</Text>
        </TouchableOpacity>
        <View style={styles.incidentActionsRow}>
          <TouchableOpacity
            testID={`${halfKey}-${kind}-decrement`}
            onPress={() => logIncident(halfKey, kind, -1)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.incidentIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Minus size={tier === 'primary' ? 16 : 14} color={count === 0 ? colors.textMuted : colors.danger} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            testID={`${halfKey}-${kind}-increment-plus`}
            onPress={() => logIncident(halfKey, kind, 1)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.incidentIconBtn, { backgroundColor: toneColor, borderColor: toneColor }]}
          >
            <Plus size={tier === 'primary' ? 16 : 14} color={colors.white} strokeWidth={2.8} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [logIncident, colors, styles]);

  const renderHalfSection = useCallback((halfKey: 'firstHalf' | 'secondHalf', title: string) => {
    const half = keeper[halfKey] ?? defaultHalfStats;
    const halfShotsFaced = getShotsFaced(half.saves, half.goalsAgainst);
    const halfOneVsOneFaced = half.oneVsOneSaved + half.oneVsOneGoals + half.oneVsOneMissed;
    const halfOneVsOneOnTarget = half.oneVsOneSaved + half.oneVsOneGoals;
    const halfOneVsOnePct = halfOneVsOneOnTarget > 0 ? Math.round((half.oneVsOneSaved / halfOneVsOneOnTarget) * 100) : null;
    const halfPkFaced = half.penalties.penaltiesSaved + half.penalties.penaltyGoals + half.penalties.penaltiesMissed;
    const halfPkOnTarget = half.penalties.penaltiesSaved + half.penalties.penaltyGoals;
    const halfPkPct = halfPkOnTarget > 0 ? Math.round((half.penalties.penaltiesSaved / halfPkOnTarget) * 100) : null;
    return (
      <View style={styles.halfSection}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.logShotTitleRow}>
          <Text style={styles.logShotTitle}>Log a Shot</Text>
          <StatInfoBubble statKey="shotsOnTarget" ageBand={ageBand} />
        </View>
        <View style={styles.incidentGrid}>
          <View style={styles.incidentRow}>
            {renderIncidentButton(halfKey, 'save', 'Save', half.saves, 'primary', 'save')}
            {renderIncidentButton(halfKey, 'goal', 'Goal', half.goalsAgainst, 'primary', 'goal')}
          </View>
          <View style={styles.incidentRow}>
            {renderIncidentButton(halfKey, 'oneVsOneSave', '1v1 Save', half.oneVsOneSaved, 'secondary', 'save')}
            {renderIncidentButton(halfKey, 'oneVsOneGoal', '1v1 Goal', half.oneVsOneGoals, 'secondary', 'goal')}
          </View>
          <View style={styles.incidentRow}>
            {renderIncidentButton(halfKey, 'pkSave', 'PK Save', half.penalties.penaltiesSaved, 'tertiary', 'save')}
            {renderIncidentButton(halfKey, 'pkGoal', 'PK Goal', half.penalties.penaltyGoals, 'tertiary', 'goal')}
          </View>
        </View>
        <View style={styles.shotsFacedRow}>
          <Text style={styles.shotsFacedLabel}>Shots on Target</Text>
          <Text style={styles.shotsFacedValue}>{halfShotsFaced + halfOneVsOneOnTarget + halfPkOnTarget}</Text>
          <StatInfoBubble statKey="shotsOnTarget" ageBand={ageBand} />
        </View>
        <View style={styles.savePercentageRow}>
          <SavePercentageBadge
            saves={half.saves + half.oneVsOneSaved + half.penalties.penaltiesSaved}
            goalsAgainst={half.goalsAgainst + half.oneVsOneGoals + half.penalties.penaltyGoals}
          />
          <StatInfoBubble statKey="savePercentage" ageBand={ageBand} />
        </View>
        <View style={styles.halfDivider} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.subSectionTitleInline}>Distribution</Text>
          <StatInfoBubble statKey="distributionAccuracy" ageBand={ageBand} />
        </View>
        <View style={styles.distributionGrid}>
          <View style={styles.distributionGridRow}>
            <View style={styles.distributionCell}>
              <StatCounter label="Crosses / Int." value={half.distribution.handledCrosses} onIncrement={() => updateHalfDistribution(halfKey, 'handledCrosses', 1)} onDecrement={() => updateHalfDistribution(halfKey, 'handledCrosses', -1)} labelMinHeight={34} alignLabelTop />
            </View>
            <View style={styles.distributionCell}>
              <StatCounter label="Punts" value={half.distribution.punts} onIncrement={() => updateHalfDistribution(halfKey, 'punts', 1)} onDecrement={() => updateHalfDistribution(halfKey, 'punts', -1)} labelMinHeight={34} alignLabelTop />
            </View>
          </View>
          <View style={styles.distributionGridRow}>
            <View style={styles.distributionCell}>
              <StatCounter label="Throwouts / Rollouts" value={half.distribution.throwouts} onIncrement={() => updateHalfDistribution(halfKey, 'throwouts', 1)} onDecrement={() => updateHalfDistribution(halfKey, 'throwouts', -1)} labelMinHeight={34} alignLabelTop />
            </View>
            <View style={styles.distributionCell}>
              <StatCounter label="Drives" value={half.distribution.drives} onIncrement={() => updateHalfDistribution(halfKey, 'drives', 1)} onDecrement={() => updateHalfDistribution(halfKey, 'drives', -1)} labelMinHeight={34} alignLabelTop />
            </View>
          </View>
          <View style={styles.distributionGridRow}>
            <View style={styles.distributionCell}>
              <StatCounter label="Drop Backs" value={half.distribution.dropBacks} onIncrement={() => updateHalfDistribution(halfKey, 'dropBacks', 1)} onDecrement={() => updateHalfDistribution(halfKey, 'dropBacks', -1)} labelMinHeight={34} alignLabelTop />
            </View>
            <View style={styles.distributionCellEmpty} />
          </View>
        </View>
        <View style={styles.halfDivider} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.subSectionTitleInline}>1v1 Situations</Text>
          <StatInfoBubble statKey="oneVsOneFaced" ageBand={ageBand} />
        </View>
        <Text style={styles.summaryLine} testID={`${halfKey}-1v1-summary`}>
          {halfOneVsOneFaced === 0
            ? 'No 1v1 chances logged yet'
            : `Faced: ${halfOneVsOneFaced} · Saved: ${half.oneVsOneSaved} · Save rate: ${halfOneVsOnePct === null ? '—' : `${halfOneVsOnePct}%`}`}
        </Text>
        <View style={styles.halfDivider} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.subSectionTitleInline}>Penalties</Text>
          <StatInfoBubble statKey="penaltiesFaced" ageBand={ageBand} />
        </View>
        <Text style={styles.summaryLine} testID={`${halfKey}-pk-summary`}>
          {halfPkFaced === 0
            ? 'No PKs logged yet'
            : `Faced: ${halfPkFaced} · Saved: ${half.penalties.penaltiesSaved} · Save rate: ${halfPkPct === null ? '—' : `${halfPkPct}%`}`}
        </Text>
        <View style={styles.distributionRow}>
          <StatCounter label="Yellow Card" value={half.penalties.yellowCards} onIncrement={() => updateHalfPenalty(halfKey, 'yellowCards', 1)} onDecrement={() => updateHalfPenalty(halfKey, 'yellowCards', -1)} accentColor={colors.warning} />
          <StatCounter label="Red Card" value={half.penalties.redCards} onIncrement={() => updateHalfPenalty(halfKey, 'redCards', 1)} onDecrement={() => updateHalfPenalty(halfKey, 'redCards', -1)} accentColor={colors.danger} />
        </View>
      </View>
    );
  }, [keeper, updateHalfDistribution, updateHalfPenalty, styles, colors, renderIncidentButton, ageBand]);

  return (
    <View style={styles.container}>
      <View style={[styles.labelBar, { backgroundColor: accentColor }]}>
        <Text style={styles.labelText}>{label} KEEPER</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.inputRow}>
          {isOpponentKeeper ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Keeper</Text>
              <TextInput testID={`${label}-name`} style={styles.input} value={keeper.name} onChangeText={(v) => updateField('name', v)} placeholder="Opposing keeper name (optional)" placeholderTextColor={colors.textMuted} returnKeyType="done" {...accessoryProps} />
            </View>
          ) : profiles ? (
            <KeeperSelectorButton
              selectionState={firstHalfSelection}
              onPress={() => setFirstHalfSelectorOpen(true)}
              label="Keeper"
            />
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput testID={`${label}-name`} style={styles.input} value={keeper.name} onChangeText={(v) => updateField('name', v)} placeholder="Keeper name" placeholderTextColor={colors.textMuted} returnKeyType="done" {...accessoryProps} />
            </View>
          )}
        </View>
        {!hideTeamAndYear ? (
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Age Group</Text>
              <TouchableOpacity testID={`${label}-year`} style={styles.yearSelector} onPress={() => setYearPickerOpen(!yearPickerOpen)} activeOpacity={0.7}>
                <Text style={[styles.yearText, !keeper.year && styles.yearPlaceholder]}>{keeper.year || 'Select'}</Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>
              {yearPickerOpen && (
                <View style={styles.yearDropdown}>
                  <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                    {AGE_GROUPS.map((ag) => (
                      <TouchableOpacity key={ag} style={[styles.yearOption, keeper.year === ag && styles.yearOptionActive]} onPress={() => { updateField('year', ag); setYearPickerOpen(false); }} activeOpacity={0.7}>
                        <Text style={[styles.yearOptionText, keeper.year === ag && styles.yearOptionTextActive, ag.length > 3 && { fontSize: fontSize.caption }]}>{ag}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>Team</Text>
              <TextInput testID={`${label}-team`} style={styles.input} value={keeper.teamName} onChangeText={(v) => updateField('teamName', v)} placeholder="Team name" placeholderTextColor={colors.textMuted} returnKeyType="done" {...accessoryProps} />
            </View>
          </View>
        ) : null}
      </View>

      {renderHalfSection('firstHalf', '1st Half')}

      <View style={styles.secondHalfInfoSection}>
        <TouchableOpacity style={styles.secondHalfInfoHeader} onPress={() => setSecondHalfInfoCollapsed(!secondHalfInfoCollapsed)} activeOpacity={0.7}>
          <Text style={styles.secondHalfInfoTitle}>2nd Half Keeper Info</Text>
          <View style={styles.secondHalfInfoHeaderRight}>
            {secondHalfInfoCollapsed ? <Text style={styles.secondHalfInfoSummary} numberOfLines={1}>{keeper.secondHalfName || keeper.name || 'Same as 1st half'}</Text> : null}
            {secondHalfInfoCollapsed ? <ChevronDown size={16} color={colors.textMuted} /> : <ChevronUp size={16} color={colors.textMuted} />}
          </View>
        </TouchableOpacity>
        {!secondHalfInfoCollapsed ? (
          <View style={styles.secondHalfInfoContent}>
            <View style={styles.inputRow}>
              {isOpponentKeeper ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>2nd Half Keeper</Text>
                  <TextInput testID={`${label}-2nd-half-name`} style={styles.input} value={keeper.secondHalfName} onChangeText={(v) => onUpdate({ ...keeper, secondHalfName: v, secondHalfKeeperProfileId: null, secondHalfKeeperIsLinked: false })} placeholder="Opposing keeper name (optional)" placeholderTextColor={colors.textMuted} returnKeyType="done" {...accessoryProps} />
                </View>
              ) : profiles ? (
                <KeeperSelectorButton
                  selectionState={secondHalfSelection}
                  onPress={() => setSecondHalfSelectorOpen(true)}
                  label="2nd Half Keeper"
                />
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput testID={`${label}-2nd-half-name`} style={styles.input} value={keeper.secondHalfName} onChangeText={(v) => onUpdate({ ...keeper, secondHalfName: v })} placeholder="Keeper name" placeholderTextColor={colors.textMuted} returnKeyType="done" {...accessoryProps} />
                </View>
              )}
            </View>
            {!hideTeamAndYear ? (
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Age Group</Text>
                  <TouchableOpacity testID={`${label}-2nd-half-year`} style={styles.yearSelector} onPress={() => setSecondHalfYearPickerOpen(!secondHalfYearPickerOpen)} activeOpacity={0.7}>
                    <Text style={[styles.yearText, !keeper.secondHalfYear && styles.yearPlaceholder]}>{keeper.secondHalfYear || 'Select'}</Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  {secondHalfYearPickerOpen && (
                    <View style={styles.yearDropdown}>
                      <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                        {AGE_GROUPS.map((ag) => (
                          <TouchableOpacity key={ag} style={[styles.yearOption, keeper.secondHalfYear === ag && styles.yearOptionActive]} onPress={() => { onUpdate({ ...keeper, secondHalfYear: ag }); setSecondHalfYearPickerOpen(false); }} activeOpacity={0.7}>
                            <Text style={[styles.yearOptionText, keeper.secondHalfYear === ag && styles.yearOptionTextActive, ag.length > 3 && { fontSize: fontSize.caption }]}>{ag}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <View style={[styles.inputGroup, { flex: 2 }]}>
                  <Text style={styles.inputLabel}>Team</Text>
                  <TextInput testID={`${label}-2nd-half-team`} style={styles.input} value={keeper.secondHalfTeamName} onChangeText={(v) => onUpdate({ ...keeper, secondHalfTeamName: v })} placeholder="Team name" placeholderTextColor={colors.textMuted} returnKeyType="done" {...accessoryProps} />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {renderHalfSection('secondHalf', '2nd Half')}

      <View style={styles.halvesPlayedSection}>
        <Text style={styles.halvesPlayedLabel}>Halves Played</Text>
        {(() => {
          const hasOverride = typeof halfLengthMinutes === 'number' && halfLengthMinutes > 0;
          const resolvedLength = hasOverride ? (halfLengthMinutes as number) : getHalfLengthForAgeGroup(ageGroup ?? '');
          const halves = deriveHalvesPlayed(keeper);
          return (
            <>
              <Text style={styles.halvesPlayedValue}>{halves}</Text>
              <Text style={styles.halvesPlayedHint}>
                Est. {halves * resolvedLength} min ({resolvedLength} min/half{!hasOverride && ageGroup ? ` for ${ageGroup}` : ''})
              </Text>
              <Text style={styles.halvesPlayedSubHint}>
                {halves === 2 ? 'Same keeper both halves' : 'Different 2nd half keeper'}
              </Text>
            </>
          );
        })()}
      </View>

      {showShootout && (
        <View style={styles.halfSection}>
          <Text style={styles.sectionTitle}>Shootout</Text>
          <Text style={styles.shootoutHint}>Goals against count toward the score only — shootout stats are not included in goalkeeper performance.</Text>
          <View style={styles.statBlock}>
            <StatCounter label="Saves" value={keeper.shootout?.saves ?? 0}
              onIncrement={() => { const current = keeper.shootout ?? { saves: 0, goalsAgainst: 0 }; onUpdate({ ...keeper, shootout: { ...current, saves: current.saves + 1 } }); }}
              onDecrement={() => { const current = keeper.shootout ?? { saves: 0, goalsAgainst: 0 }; onUpdate({ ...keeper, shootout: { ...current, saves: Math.max(0, current.saves - 1) } }); }}
              accentColor={colors.primary} />
          </View>
          <View style={styles.statBlock}>
            <StatCounter label="Goals Against" value={keeper.shootout?.goalsAgainst ?? 0}
              onIncrement={() => { const current = keeper.shootout ?? { saves: 0, goalsAgainst: 0 }; onUpdate({ ...keeper, shootout: { ...current, goalsAgainst: current.goalsAgainst + 1 } }); }}
              onDecrement={() => { const current = keeper.shootout ?? { saves: 0, goalsAgainst: 0 }; onUpdate({ ...keeper, shootout: { ...current, goalsAgainst: Math.max(0, current.goalsAgainst - 1) } }); }}
              accentColor={colors.danger} />
          </View>
          <View style={styles.shotsFacedRow}>
            <Text style={styles.shotsFacedLabel}>Shots on Target</Text>
            <Text style={styles.shotsFacedValue}>{getShootoutShotsFaced(keeper.shootout ?? { saves: 0, goalsAgainst: 0 })}</Text>
          </View>
          <View style={styles.savePercentageRow}>
            <SavePercentageBadge saves={keeper.shootout?.saves ?? 0} goalsAgainst={keeper.shootout?.goalsAgainst ?? 0} />
          </View>
        </View>
      )}

      <View style={styles.notesSection}>
        <TouchableOpacity style={styles.notesHeader} onPress={() => setNotesCollapsed(!notesCollapsed)} activeOpacity={0.7}>
          <Text style={styles.notesTitle}>Notes</Text>
          <View style={styles.notesHeaderRight}>
            {notesCollapsed && keeper.notes ? <Text style={styles.notesSummary} numberOfLines={1}>{keeper.notes}</Text> : null}
            {notesCollapsed ? <ChevronDown size={16} color={colors.textMuted} /> : <ChevronUp size={16} color={colors.textMuted} />}
          </View>
        </TouchableOpacity>
        {!notesCollapsed ? (
          <TextInput testID={`${label}-notes`} style={styles.notesInput} value={keeper.notes} onChangeText={(v) => onUpdate({ ...keeper, notes: v })} placeholder="Injuries, cards, substitutions, etc." placeholderTextColor={colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" {...accessoryProps} />
        ) : null}
      </View>

      <View style={styles.totalSection}>
        <Text style={styles.sectionTitle}>Total Summary</Text>
        <View style={styles.totalStatsRow}>
          <View style={styles.totalStatItem}><Text style={[styles.totalStatValue, { color: colors.primary }]}>{totalSaves}</Text><Text style={styles.totalStatLabel}>Saves</Text></View>
          <View style={styles.totalStatItem}><Text style={[styles.totalStatValue, { color: colors.danger }]}>{totalGA}</Text><Text style={styles.totalStatLabel}>Goals Against</Text></View>
          <View style={styles.totalStatItem}><Text style={[styles.totalStatValue, { color: colors.accent }]}>{totalShotsFaced}</Text><Text style={styles.totalStatLabel}>Shots on Target</Text></View>
          <View style={styles.totalStatItem}><Text style={[styles.totalStatValue, { color: overallPct >= 50 ? colors.primary : colors.warning }]}>{overallPct}%</Text><Text style={styles.totalStatLabel}>Save %</Text></View>
        </View>
        <View style={styles.halfDivider} />
        <Text style={styles.subSectionTitle}>Total Distribution</Text>
        <View style={styles.totalDistRow}>
          <View style={styles.totalDistItem}><Text style={styles.totalDistValue}>{totalDist.handledCrosses}</Text><Text style={styles.totalDistLabel}>Crosses/Int.</Text></View>
          <View style={styles.totalDistItem}><Text style={styles.totalDistValue}>{totalDist.punts}</Text><Text style={styles.totalDistLabel}>Punts</Text></View>
          <View style={styles.totalDistItem}><Text style={styles.totalDistValue}>{totalDist.throwouts}</Text><Text style={styles.totalDistLabel}>Throwouts / Rollouts</Text></View>
          <View style={styles.totalDistItem}><Text style={styles.totalDistValue}>{totalDist.drives}</Text><Text style={styles.totalDistLabel}>Drives</Text></View>
          <View style={styles.totalDistItem}><Text style={styles.totalDistValue}>{totalDist.dropBacks}</Text><Text style={styles.totalDistLabel}>Drop Backs</Text></View>
        </View>
        {totalOneVsOneFaced > 0 && (
          <>
            <View style={styles.halfDivider} />
            <Text style={styles.subSectionTitle}>1v1 Situations</Text>
            <View style={styles.totalDistRow}>
              <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: colors.primary }]}>{totalOneVsOneSaved}</Text><Text style={styles.totalDistLabel}>1v1 Saved</Text></View>
              <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: colors.danger }]}>{totalOneVsOneGoals}</Text><Text style={styles.totalDistLabel}>1v1 Goal</Text></View>
              <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: colors.textMuted }]}>{totalOneVsOneMissed}</Text><Text style={styles.totalDistLabel}>1v1 Missed</Text></View>
            </View>
            {oneVsOneSavePct !== null && (
              <Text style={styles.pkSavePctLine}>1v1 Save %: {oneVsOneSavePct}% ({totalOneVsOneSaved} of {totalOneVsOneSaved + totalOneVsOneGoals} on target)</Text>
            )}
          </>
        )}
        <View style={styles.halfDivider} />
        <Text style={styles.subSectionTitle}>Total Penalties</Text>
        <View style={styles.totalDistRow}>
          <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: colors.primary }]}>{totalPen.penaltiesSaved}</Text><Text style={styles.totalDistLabel}>PK Saved</Text></View>
          <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: colors.danger }]}>{totalPen.penaltyGoals}</Text><Text style={styles.totalDistLabel}>PK Goal</Text></View>
          <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: colors.textMuted }]}>{totalPen.penaltiesMissed}</Text><Text style={styles.totalDistLabel}>PK Missed</Text></View>
          <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: colors.warning }]}>{totalPen.yellowCards}</Text><Text style={styles.totalDistLabel}>Yellow</Text></View>
          <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: colors.danger }]}>{totalPen.redCards}</Text><Text style={styles.totalDistLabel}>Red</Text></View>
        </View>
        {(() => {
          const pkPct = getPkSavePercentage(keeper);
          if (pkPct === null) return null;
          const onTarget = totalPen.penaltiesSaved + totalPen.penaltyGoals;
          return (
            <Text style={styles.pkSavePctLine}>PK Save %: {pkPct}% ({totalPen.penaltiesSaved} of {onTarget} on target)</Text>
          );
        })()}
      </View>
      {profiles && !isOpponentKeeper && (
        <>
          <KeeperSelectorSheet
            visible={firstHalfSelectorOpen}
            onClose={() => setFirstHalfSelectorOpen(false)}
            profiles={profiles}
            currentSelection={firstHalfSelection}
            onSelectProfile={handleFirstHalfSelectProfile}
            onCreateProfile={handleFirstHalfCreateProfile}
            onManualEntry={handleFirstHalfManualEntry}
            halfLabel="1st Half"
          />
          <KeeperSelectorSheet
            visible={secondHalfSelectorOpen}
            onClose={() => setSecondHalfSelectorOpen(false)}
            profiles={profiles}
            currentSelection={secondHalfSelection}
            onSelectProfile={handleSecondHalfSelectProfile}
            onCreateProfile={handleSecondHalfCreateProfile}
            onManualEntry={handleSecondHalfManualEntry}
            halfLabel="2nd Half"
          />
        </>
      )}
    </View>
  );
});

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { marginBottom: 16 },
    labelBar: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginBottom: 16 },
    labelText: { color: c.white, fontSize: fontSize.body2, fontWeight: '800' as const, letterSpacing: 1.5, textAlign: 'center' },
    infoSection: { marginBottom: 20 },
    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: fontSize.caption, color: c.textSecondary, fontWeight: '600' as const, marginBottom: 6 },
    input: { backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: fontSize.bodyLg, borderWidth: 1, borderColor: c.border },
    yearSelector: { backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    yearText: { fontSize: fontSize.bodyLg, color: c.text },
    yearPlaceholder: { color: c.textMuted },
    yearDropdown: { backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderColor: c.border, marginTop: 4, overflow: 'hidden' },
    yearScroll: { maxHeight: 200 },
    yearOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
    yearOptionActive: { backgroundColor: c.primaryGlow },
    yearOptionText: { fontSize: fontSize.body, color: c.text, fontWeight: '500' as const },
    yearOptionTextActive: { color: c.primary, fontWeight: '700' as const },
    halfSection: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    sectionTitle: { fontSize: fontSize.body, fontWeight: '700' as const, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, textAlign: 'center' },
    subSectionTitle: { fontSize: fontSize.caption, fontWeight: '600' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14, textAlign: 'center' },
    statBlock: { marginBottom: 14 },
    savePercentageRow: { alignItems: 'center', marginBottom: 4 },
    shotsFacedRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 10, paddingVertical: 6, backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: 8 },
    shotsFacedLabel: { fontSize: fontSize.sm, fontWeight: '600' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    shotsFacedValue: { fontSize: fontSize.h2, fontWeight: '800' as const, color: '#3B82F6' },
    halfDivider: { height: 1, backgroundColor: c.border, marginVertical: 14 },
    distributionGrid: { gap: 16 },
    distributionRow: { flexDirection: 'row', justifyContent: 'space-around' },
    distributionGridRow: { flexDirection: 'row' as const, gap: 12, alignItems: 'flex-start' as const },
    distributionCell: { flex: 1, minWidth: 0 },
    distributionCellEmpty: { flex: 1 },
    tripleCounterRow: { flexDirection: 'row' as const, gap: 8, alignItems: 'flex-start' as const },
    tripleCounterCell: { flex: 1, minWidth: 0 },
    totalSection: { backgroundColor: c.surfaceLight, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.primary, marginBottom: 12 },
    totalStatsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
    totalStatItem: { alignItems: 'center' },
    totalStatValue: { fontSize: fontSize.display3, fontWeight: '800' as const },
    totalStatLabel: { fontSize: fontSize.xs, fontWeight: '600' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
    totalDistRow: { flexDirection: 'row', justifyContent: 'space-around' },
    totalDistItem: { alignItems: 'center' },
    totalDistValue: { fontSize: fontSize.h2, fontWeight: '700' as const, color: c.text },
    totalDistLabel: { fontSize: fontSize.xs2, color: c.textMuted, fontWeight: '500' as const, marginTop: 2 },
    secondHalfInfoSection: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    secondHalfInfoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    secondHalfInfoHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    secondHalfInfoTitle: { fontSize: fontSize.caption, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    secondHalfInfoSummary: { fontSize: fontSize.caption, color: c.textSecondary, fontWeight: '500' as const, maxWidth: 140 },
    secondHalfInfoContent: { marginTop: 14 },
    notesSection: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    notesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    notesHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    notesTitle: { fontSize: fontSize.caption, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    notesSummary: { fontSize: fontSize.caption, color: c.textSecondary, fontWeight: '500' as const, maxWidth: 200 },
    notesInput: { backgroundColor: c.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: fontSize.bodyLg, borderWidth: 1, borderColor: c.border, marginTop: 12, minHeight: 80 },
    shootoutHint: { fontSize: fontSize.sm, color: c.textMuted, fontStyle: 'italic' as const, textAlign: 'center' as const, marginBottom: 14, paddingHorizontal: 8 },
    oneVsOneHint: { fontSize: fontSize.xs, color: c.textMuted, fontStyle: 'italic' as const, textAlign: 'center' as const, marginBottom: 12, paddingHorizontal: 8 },
    halvesPlayedSection: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border, alignItems: 'center' as const },
    halvesPlayedLabel: { fontSize: fontSize.caption, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 6 },
    halvesPlayedValue: { fontSize: fontSize.display3, fontWeight: '800' as const, color: c.primary, marginBottom: 4 },
    halvesPlayedHint: { fontSize: fontSize.xs, color: c.textMuted, fontStyle: 'italic' as const },
    halvesPlayedSubHint: { fontSize: fontSize.xs, color: c.textMuted, marginTop: 2 },
    pkSavePctLine: { fontSize: fontSize.sm, color: c.textSecondary, fontWeight: '600' as const, textAlign: 'center' as const, marginTop: 4 },
    sectionHeaderRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, marginBottom: 14 },
    subSectionTitleInline: { fontSize: fontSize.caption, fontWeight: '600' as const, color: c.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.8, textAlign: 'center' as const },
    logShotTitle: { fontSize: fontSize.caption, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase' as const, letterSpacing: 1, textAlign: 'center' as const },
    logShotTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, marginBottom: 10 },
    incidentGrid: { gap: 10, marginBottom: 14 },
    incidentRow: { flexDirection: 'row' as const, gap: 10 },
    incidentBtn: { flex: 1, borderRadius: 12, borderWidth: 1, overflow: 'hidden' as const },
    incidentBtnPrimary: { paddingVertical: 14, paddingHorizontal: 14 },
    incidentBtnSecondary: { paddingVertical: 10, paddingHorizontal: 12, opacity: 0.95 },
    incidentBtnTertiary: { paddingVertical: 10, paddingHorizontal: 12, opacity: 0.95 },
    incidentBody: { alignItems: 'center' as const, marginBottom: 8 },
    incidentLabelPrimary: { fontSize: fontSize.body, fontWeight: '800' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },
    incidentLabelSecondary: { fontSize: fontSize.sm, fontWeight: '700' as const, letterSpacing: 0.4, textTransform: 'uppercase' as const },
    incidentCountPrimary: { fontSize: fontSize.display3, fontWeight: '800' as const, marginTop: 2 },
    incidentCountSecondary: { fontSize: fontSize.h2, fontWeight: '800' as const, marginTop: 2 },
    incidentActionsRow: { flexDirection: 'row' as const, justifyContent: 'center' as const, alignItems: 'center' as const, gap: 14 },
    incidentIconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1 },
    summaryLine: { fontSize: fontSize.body, color: c.textSecondary, fontWeight: '600' as const, textAlign: 'center' as const, marginBottom: 12, paddingHorizontal: 8 },
  });
}
