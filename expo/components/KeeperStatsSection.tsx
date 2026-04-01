import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import StatCounter from '@/components/StatCounter';
import SavePercentageBadge from '@/components/SavePercentageBadge';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { KeeperData, DistributionStats, PenaltyStats, GoalkeeperProfile, getTotalSaves, getTotalGoalsAgainst, getOverallSavePercentage, getTotalDistribution, getTotalPenalties, getShotsFaced, getTotalShotsFaced, getShootoutShotsFaced, getTotalOneVsOneFaced, getTotalOneVsOneSaved, getOneVsOneSaveRate, getHalfLengthForAgeGroup } from '@/types/game';
import KeeperSelectorSheet, { KeeperSelectorButton, KeeperSelectionState } from '@/components/KeeperSelectorSheet';

interface KeeperStatsSectionProps {
  label: 'HOME' | 'AWAY';
  keeper: KeeperData;
  onUpdate: (keeper: KeeperData) => void;
  accentColor: string;
  showShootout?: boolean;
  profiles?: GoalkeeperProfile[];
  onCreateProfile?: (name: string, birthYear: string) => GoalkeeperProfile;
  ageGroup?: string;
}

const currentYear = new Date().getFullYear();
const YEARS: string[] = [];
for (let y = currentYear; y >= 1975; y--) { YEARS.push(String(y)); }

export default React.memo(function KeeperStatsSection({ label, keeper, onUpdate, accentColor, showShootout, profiles, onCreateProfile, ageGroup }: KeeperStatsSectionProps) {
  const colors = useColors();
  const [yearPickerOpen, setYearPickerOpen] = React.useState(false);
  const [secondHalfYearPickerOpen, setSecondHalfYearPickerOpen] = React.useState(false);
  const [secondHalfInfoCollapsed, setSecondHalfInfoCollapsed] = React.useState(true);
  const [notesCollapsed, setNotesCollapsed] = React.useState(true);
  const [firstHalfSelectorOpen, setFirstHalfSelectorOpen] = useState(false);
  const [secondHalfSelectorOpen, setSecondHalfSelectorOpen] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

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
    const current = keeper[half][stat];
    const newVal = Math.max(0, current + delta);
    onUpdate({ ...keeper, [half]: { ...keeper[half], [stat]: newVal } });
  }, [keeper, onUpdate]);

  const updateHalfDistribution = useCallback((half: 'firstHalf' | 'secondHalf', stat: keyof DistributionStats, delta: number) => {
    const current = keeper[half].distribution[stat];
    const newVal = Math.max(0, current + delta);
    onUpdate({ ...keeper, [half]: { ...keeper[half], distribution: { ...keeper[half].distribution, [stat]: newVal } } });
  }, [keeper, onUpdate]);

  const updateHalfPenalty = useCallback((half: 'firstHalf' | 'secondHalf', stat: keyof PenaltyStats, delta: number) => {
    const current = keeper[half].penalties[stat];
    const newVal = Math.max(0, current + delta);
    onUpdate({ ...keeper, [half]: { ...keeper[half], penalties: { ...keeper[half].penalties, [stat]: newVal } } });
  }, [keeper, onUpdate]);

  const updateHalfOneVsOne = useCallback((half: 'firstHalf' | 'secondHalf', stat: 'oneVsOneFaced' | 'oneVsOneSaved', delta: number) => {
    const current = keeper[half][stat];
    const newVal = Math.max(0, current + delta);
    if (stat === 'oneVsOneSaved' && delta > 0 && newVal > keeper[half].oneVsOneFaced) return;
    onUpdate({ ...keeper, [half]: { ...keeper[half], [stat]: newVal } });
  }, [keeper, onUpdate]);

  const totalSaves = getTotalSaves(keeper);
  const totalGA = getTotalGoalsAgainst(keeper);
  const totalShotsFaced = getTotalShotsFaced(keeper);
  const overallPct = getOverallSavePercentage(keeper);
  const totalDist = getTotalDistribution(keeper);
  const totalPen = getTotalPenalties(keeper);
  const totalOneVsOneFaced = getTotalOneVsOneFaced(keeper);
  const totalOneVsOneSaved = getTotalOneVsOneSaved(keeper);
  const oneVsOneSaveRate = getOneVsOneSaveRate(totalOneVsOneFaced, totalOneVsOneSaved);

  const renderHalfSection = useCallback((halfKey: 'firstHalf' | 'secondHalf', title: string) => {
    const half = keeper[halfKey];
    const halfShotsFaced = getShotsFaced(half.saves, half.goalsAgainst);
    return (
      <View style={styles.halfSection}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.statBlock}>
          <StatCounter label="Saves" value={half.saves} onIncrement={() => updateHalf(halfKey, 'saves', 1)} onDecrement={() => updateHalf(halfKey, 'saves', -1)} accentColor={colors.primary} />
        </View>
        <View style={styles.statBlock}>
          <StatCounter label="Goals Against" value={half.goalsAgainst} onIncrement={() => updateHalf(halfKey, 'goalsAgainst', 1)} onDecrement={() => updateHalf(halfKey, 'goalsAgainst', -1)} accentColor={colors.danger} />
        </View>
        <View style={styles.shotsFacedRow}>
          <Text style={styles.shotsFacedLabel}>Shots on Target</Text>
          <Text style={styles.shotsFacedValue}>{halfShotsFaced}</Text>
        </View>
        <View style={styles.savePercentageRow}>
          <SavePercentageBadge saves={half.saves} goalsAgainst={half.goalsAgainst} />
        </View>
        <View style={styles.halfDivider} />
        <Text style={styles.subSectionTitle}>Distribution</Text>
        <View style={styles.distributionGrid}>
          <View style={styles.distributionRow}>
            <StatCounter label="Crosses / Int." value={half.distribution.handledCrosses} onIncrement={() => updateHalfDistribution(halfKey, 'handledCrosses', 1)} onDecrement={() => updateHalfDistribution(halfKey, 'handledCrosses', -1)} />
            <StatCounter label="Punts" value={half.distribution.punts} onIncrement={() => updateHalfDistribution(halfKey, 'punts', 1)} onDecrement={() => updateHalfDistribution(halfKey, 'punts', -1)} />
          </View>
          <View style={styles.distributionRow}>
            <StatCounter label="Throwouts / Rollouts" value={half.distribution.throwouts} onIncrement={() => updateHalfDistribution(halfKey, 'throwouts', 1)} onDecrement={() => updateHalfDistribution(halfKey, 'throwouts', -1)} />
            <StatCounter label="Drives" value={half.distribution.drives} onIncrement={() => updateHalfDistribution(halfKey, 'drives', 1)} onDecrement={() => updateHalfDistribution(halfKey, 'drives', -1)} />
          </View>
          <View style={styles.distributionRow}>
            <StatCounter label="Drop Backs" value={half.distribution.dropBacks} onIncrement={() => updateHalfDistribution(halfKey, 'dropBacks', 1)} onDecrement={() => updateHalfDistribution(halfKey, 'dropBacks', -1)} />
          </View>
        </View>
        <View style={styles.halfDivider} />
        <Text style={styles.subSectionTitle}>1v1 Situations</Text>
        <Text style={styles.oneVsOneHint}>These are a subset of your saves and goals above — do not re-count them</Text>
        <View style={styles.distributionGrid}>
          <View style={styles.distributionRow}>
            <StatCounter label="1v1 Faced" value={half.oneVsOneFaced} onIncrement={() => updateHalfOneVsOne(halfKey, 'oneVsOneFaced', 1)} onDecrement={() => updateHalfOneVsOne(halfKey, 'oneVsOneFaced', -1)} accentColor="#F59E0B" />
            <StatCounter label="1v1 Saved" value={half.oneVsOneSaved} onIncrement={() => updateHalfOneVsOne(halfKey, 'oneVsOneSaved', 1)} onDecrement={() => updateHalfOneVsOne(halfKey, 'oneVsOneSaved', -1)} accentColor={colors.primary} disableIncrement={half.oneVsOneSaved >= half.oneVsOneFaced} />
          </View>
        </View>
        <View style={styles.halfDivider} />
        <Text style={styles.subSectionTitle}>Penalties</Text>
        <View style={styles.distributionGrid}>
          <View style={styles.distributionRow}>
            <StatCounter label="PK Goals Against" value={half.penalties.penaltiesFaced} onIncrement={() => updateHalfPenalty(halfKey, 'penaltiesFaced', 1)} onDecrement={() => updateHalfPenalty(halfKey, 'penaltiesFaced', -1)} />
            <StatCounter label="Penalties Saved" value={half.penalties.penaltiesSaved} onIncrement={() => updateHalfPenalty(halfKey, 'penaltiesSaved', 1)} onDecrement={() => updateHalfPenalty(halfKey, 'penaltiesSaved', -1)} accentColor={colors.primary} />
          </View>
          <View style={styles.distributionRow}>
            <StatCounter label="Yellow Card" value={half.penalties.yellowCards} onIncrement={() => updateHalfPenalty(halfKey, 'yellowCards', 1)} onDecrement={() => updateHalfPenalty(halfKey, 'yellowCards', -1)} accentColor={colors.warning} />
            <StatCounter label="Red Card" value={half.penalties.redCards} onIncrement={() => updateHalfPenalty(halfKey, 'redCards', 1)} onDecrement={() => updateHalfPenalty(halfKey, 'redCards', -1)} accentColor={colors.danger} />
          </View>
        </View>
      </View>
    );
  }, [keeper, updateHalf, updateHalfDistribution, updateHalfPenalty, updateHalfOneVsOne, styles, colors]);

  return (
    <View style={styles.container}>
      <View style={[styles.labelBar, { backgroundColor: accentColor }]}>
        <Text style={styles.labelText}>{label} KEEPER</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.inputRow}>
          {profiles ? (
            <KeeperSelectorButton
              selectionState={firstHalfSelection}
              onPress={() => setFirstHalfSelectorOpen(true)}
              label="Keeper"
            />
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput testID={`${label}-name`} style={styles.input} value={keeper.name} onChangeText={(v) => updateField('name', v)} placeholder="Keeper name" placeholderTextColor={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Year</Text>
            <TouchableOpacity testID={`${label}-year`} style={styles.yearSelector} onPress={() => setYearPickerOpen(!yearPickerOpen)} activeOpacity={0.7}>
              <Text style={[styles.yearText, !keeper.year && styles.yearPlaceholder]}>{keeper.year || 'Select'}</Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>
            {yearPickerOpen && (
              <View style={styles.yearDropdown}>
                <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                  {YEARS.map((yr) => (
                    <TouchableOpacity key={yr} style={[styles.yearOption, keeper.year === yr && styles.yearOptionActive]} onPress={() => { updateField('year', yr); setYearPickerOpen(false); }} activeOpacity={0.7}>
                      <Text style={[styles.yearOptionText, keeper.year === yr && styles.yearOptionTextActive]}>{yr}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <Text style={styles.inputLabel}>Team</Text>
            <TextInput testID={`${label}-team`} style={styles.input} value={keeper.teamName} onChangeText={(v) => updateField('teamName', v)} placeholder="Team name" placeholderTextColor={colors.textMuted} />
          </View>
        </View>
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
              {profiles ? (
                <KeeperSelectorButton
                  selectionState={secondHalfSelection}
                  onPress={() => setSecondHalfSelectorOpen(true)}
                  label="2nd Half Keeper"
                />
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput testID={`${label}-2nd-half-name`} style={styles.input} value={keeper.secondHalfName} onChangeText={(v) => onUpdate({ ...keeper, secondHalfName: v })} placeholder="Keeper name" placeholderTextColor={colors.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Year</Text>
                <TouchableOpacity testID={`${label}-2nd-half-year`} style={styles.yearSelector} onPress={() => setSecondHalfYearPickerOpen(!secondHalfYearPickerOpen)} activeOpacity={0.7}>
                  <Text style={[styles.yearText, !keeper.secondHalfYear && styles.yearPlaceholder]}>{keeper.secondHalfYear || 'Select'}</Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>
                {secondHalfYearPickerOpen && (
                  <View style={styles.yearDropdown}>
                    <ScrollView style={styles.yearScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                      {YEARS.map((yr) => (
                        <TouchableOpacity key={yr} style={[styles.yearOption, keeper.secondHalfYear === yr && styles.yearOptionActive]} onPress={() => { onUpdate({ ...keeper, secondHalfYear: yr }); setSecondHalfYearPickerOpen(false); }} activeOpacity={0.7}>
                          <Text style={[styles.yearOptionText, keeper.secondHalfYear === yr && styles.yearOptionTextActive]}>{yr}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>Team</Text>
                <TextInput testID={`${label}-2nd-half-team`} style={styles.input} value={keeper.secondHalfTeamName} onChangeText={(v) => onUpdate({ ...keeper, secondHalfTeamName: v })} placeholder="Team name" placeholderTextColor={colors.textMuted} />
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {renderHalfSection('secondHalf', '2nd Half')}

      <View style={styles.halvesPlayedSection}>
        <Text style={styles.halvesPlayedLabel}>Halves Played</Text>
        <View style={styles.halvesPlayedToggle}>
          <TouchableOpacity
            testID={`${label}-halves-1`}
            style={[styles.halvesPlayedOption, (keeper.halvesPlayed ?? 2) === 1 && styles.halvesPlayedOptionActive]}
            onPress={() => onUpdate({ ...keeper, halvesPlayed: 1 })}
            activeOpacity={0.7}
          >
            <Text style={[styles.halvesPlayedOptionText, (keeper.halvesPlayed ?? 2) === 1 && styles.halvesPlayedOptionTextActive]}>1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`${label}-halves-2`}
            style={[styles.halvesPlayedOption, (keeper.halvesPlayed ?? 2) === 2 && styles.halvesPlayedOptionActive]}
            onPress={() => onUpdate({ ...keeper, halvesPlayed: 2 })}
            activeOpacity={0.7}
          >
            <Text style={[styles.halvesPlayedOptionText, (keeper.halvesPlayed ?? 2) === 2 && styles.halvesPlayedOptionTextActive]}>2</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.halvesPlayedHint}>
          Est. {(keeper.halvesPlayed ?? 2) * getHalfLengthForAgeGroup(ageGroup ?? '')} min ({getHalfLengthForAgeGroup(ageGroup ?? '')} min/half{ageGroup ? ` for ${ageGroup}` : ''})
        </Text>
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
          <TextInput testID={`${label}-notes`} style={styles.notesInput} value={keeper.notes} onChangeText={(v) => onUpdate({ ...keeper, notes: v })} placeholder="Injuries, cards, substitutions, etc." placeholderTextColor={colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />
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
              <View style={styles.totalDistItem}><Text style={styles.totalDistValue}>{totalOneVsOneFaced}</Text><Text style={styles.totalDistLabel}>1v1 Faced</Text></View>
              <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: colors.primary }]}>{totalOneVsOneSaved}</Text><Text style={styles.totalDistLabel}>1v1 Saved</Text></View>
              <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: '#F59E0B' }]}>{oneVsOneSaveRate !== null ? `${oneVsOneSaveRate}%` : '—'}</Text><Text style={styles.totalDistLabel}>1v1 Save Rate</Text></View>
            </View>
          </>
        )}
        <View style={styles.halfDivider} />
        <Text style={styles.subSectionTitle}>Total Penalties</Text>
        <View style={styles.totalDistRow}>
          <View style={styles.totalDistItem}><Text style={styles.totalDistValue}>{totalPen.penaltiesFaced}</Text><Text style={styles.totalDistLabel}>PK Goals Against</Text></View>
          <View style={styles.totalDistItem}><Text style={styles.totalDistValue}>{totalPen.penaltiesSaved}</Text><Text style={styles.totalDistLabel}>PK Saved</Text></View>
          <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: colors.warning }]}>{totalPen.yellowCards}</Text><Text style={styles.totalDistLabel}>Yellow</Text></View>
          <View style={styles.totalDistItem}><Text style={[styles.totalDistValue, { color: colors.danger }]}>{totalPen.redCards}</Text><Text style={styles.totalDistLabel}>Red</Text></View>
        </View>
      </View>
      {profiles && (
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
    labelText: { color: c.white, fontSize: 13, fontWeight: '800' as const, letterSpacing: 1.5, textAlign: 'center' },
    infoSection: { marginBottom: 20 },
    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: 12, color: c.textSecondary, fontWeight: '600' as const, marginBottom: 6 },
    input: { backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border },
    yearSelector: { backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    yearText: { fontSize: 15, color: c.text },
    yearPlaceholder: { color: c.textMuted },
    yearDropdown: { backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderColor: c.border, marginTop: 4, overflow: 'hidden' },
    yearScroll: { maxHeight: 200 },
    yearOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
    yearOptionActive: { backgroundColor: c.primaryGlow },
    yearOptionText: { fontSize: 14, color: c.text, fontWeight: '500' as const },
    yearOptionTextActive: { color: c.primary, fontWeight: '700' as const },
    halfSection: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    sectionTitle: { fontSize: 14, fontWeight: '700' as const, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, textAlign: 'center' },
    subSectionTitle: { fontSize: 12, fontWeight: '600' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14, textAlign: 'center' },
    statBlock: { marginBottom: 14 },
    savePercentageRow: { alignItems: 'center', marginBottom: 4 },
    shotsFacedRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 10, paddingVertical: 6, backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: 8 },
    shotsFacedLabel: { fontSize: 11, fontWeight: '600' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    shotsFacedValue: { fontSize: 20, fontWeight: '800' as const, color: '#3B82F6' },
    halfDivider: { height: 1, backgroundColor: c.border, marginVertical: 14 },
    distributionGrid: { gap: 16 },
    distributionRow: { flexDirection: 'row', justifyContent: 'space-around' },
    totalSection: { backgroundColor: c.surfaceLight, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.primary, marginBottom: 12 },
    totalStatsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
    totalStatItem: { alignItems: 'center' },
    totalStatValue: { fontSize: 26, fontWeight: '800' as const },
    totalStatLabel: { fontSize: 10, fontWeight: '600' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
    totalDistRow: { flexDirection: 'row', justifyContent: 'space-around' },
    totalDistItem: { alignItems: 'center' },
    totalDistValue: { fontSize: 20, fontWeight: '700' as const, color: c.text },
    totalDistLabel: { fontSize: 9, color: c.textMuted, fontWeight: '500' as const, marginTop: 2 },
    secondHalfInfoSection: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    secondHalfInfoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    secondHalfInfoHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    secondHalfInfoTitle: { fontSize: 12, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    secondHalfInfoSummary: { fontSize: 12, color: c.textSecondary, fontWeight: '500' as const, maxWidth: 140 },
    secondHalfInfoContent: { marginTop: 14 },
    notesSection: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    notesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    notesHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    notesTitle: { fontSize: 12, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    notesSummary: { fontSize: 12, color: c.textSecondary, fontWeight: '500' as const, maxWidth: 200 },
    notesInput: { backgroundColor: c.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border, marginTop: 12, minHeight: 80 },
    shootoutHint: { fontSize: 11, color: c.textMuted, fontStyle: 'italic' as const, textAlign: 'center' as const, marginBottom: 14, paddingHorizontal: 8 },
    oneVsOneHint: { fontSize: 10, color: c.textMuted, fontStyle: 'italic' as const, textAlign: 'center' as const, marginBottom: 12, paddingHorizontal: 8 },
    halvesPlayedSection: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border, alignItems: 'center' as const },
    halvesPlayedLabel: { fontSize: 12, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 10 },
    halvesPlayedToggle: { flexDirection: 'row' as const, gap: 8, marginBottom: 8 },
    halvesPlayedOption: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
    halvesPlayedOptionActive: { backgroundColor: c.primaryGlow, borderColor: 'rgba(16, 185, 129, 0.4)' },
    halvesPlayedOptionText: { fontSize: 16, fontWeight: '700' as const, color: c.textMuted },
    halvesPlayedOptionTextActive: { color: c.primary },
    halvesPlayedHint: { fontSize: 10, color: c.textMuted, fontStyle: 'italic' as const },
  });
}
