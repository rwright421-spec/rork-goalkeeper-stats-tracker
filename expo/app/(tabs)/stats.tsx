// Stats screen - Comprehensive goalkeeper performance analytics
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Shield, Target, Award, ChevronDown, ChevronUp, Check, Square, Share2, FileText, FileSpreadsheet, Image, ArrowLeftRight, MoreHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { DarkTheme as Colors } from '@/constants/themes';
import { useColors } from '@/contexts/ThemeContext';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useGames } from '@/contexts/GameContext';
import { useTeams } from '@/contexts/TeamContext';
import { SavedGame } from '@/types/game';
import {
  GroupMode,
  GroupedStats,
  AggregatedStats,
  groupByCareer,
  groupByTeam,
  groupByYear,
  groupByCustom,
  groupByOpponent,
} from '@/utils/statsAggregator';
import { formatStatsAsText, formatStatsAsCSV } from '@/utils/export';

const PRIMARY_MODES: { key: GroupMode; label: string }[] = [
  { key: 'career', label: 'Career' },
  { key: 'team', label: 'Team' },
  { key: 'opponent', label: 'Opponent' },
];

const SECONDARY_MODES: { key: GroupMode; label: string }[] = [
  { key: 'year', label: 'By Year' },
  { key: 'custom', label: 'Custom' },
];

const ALL_GROUP_OPTIONS: { key: GroupMode; label: string }[] = [
  ...PRIMARY_MODES,
  ...SECONDARY_MODES,
];

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon?: React.ReactNode }) {
  return (
    <View style={statCardStyles.card}>
      <View style={[statCardStyles.iconBg, { backgroundColor: color + '18' }]}>
        {icon}
      </View>
      <Text style={[statCardStyles.value, { color }]}>{value}</Text>
      <Text style={statCardStyles.label}>{label}</Text>
    </View>
  );
}

const statCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center' as const,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  value: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  label: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    textAlign: 'center' as const,
  },
});

function StatsBlock({ stats, expanded }: { stats: AggregatedStats; expanded?: boolean }) {
  const savePctColor = stats.savePercentage >= 75 ? Colors.primary : stats.savePercentage >= 50 ? Colors.accent : Colors.danger;

  return (
    <View style={blockStyles.container}>
      <View style={blockStyles.topRow}>
        <StatCard
          label="Games"
          value={stats.gamesPlayed}
          color="#3B82F6"
          icon={<Shield size={18} color="#3B82F6" />}
        />
        <StatCard
          label="Save %"
          value={`${stats.savePercentage}%`}
          color={savePctColor}
          icon={<Target size={18} color={savePctColor} />}
        />
        <StatCard
          label="Clean Sheets"
          value={stats.cleanSheets}
          color="#8B5CF6"
          icon={<Award size={18} color="#8B5CF6" />}
        />
      </View>

      <View style={blockStyles.row}>
        <View style={blockStyles.statRow}>
          <View style={[blockStyles.statDot, { backgroundColor: Colors.primary }]} />
          <Text style={blockStyles.statLabel}>Total Saves</Text>
          <Text style={[blockStyles.statValue, { color: Colors.primary }]}>{stats.totalSaves}</Text>
        </View>
        <View style={blockStyles.statRow}>
          <View style={[blockStyles.statDot, { backgroundColor: Colors.danger }]} />
          <Text style={blockStyles.statLabel}>Goals Against</Text>
          <Text style={[blockStyles.statValue, { color: Colors.danger }]}>{stats.totalGoalsAgainst}</Text>
        </View>
        <View style={blockStyles.statRow}>
          <View style={[blockStyles.statDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={blockStyles.statLabel}>Shots on Target</Text>
          <Text style={[blockStyles.statValue, { color: '#3B82F6' }]}>{stats.totalShotsFaced}</Text>
        </View>
        {stats.oneVsOneFaced > 0 && (
          <View style={blockStyles.statRow}>
            <View style={[blockStyles.statDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={blockStyles.statLabel}>1v1 Save Rate</Text>
            <Text style={[blockStyles.statValue, { color: '#F59E0B' }]}>{stats.oneVsOneSaveRate !== null ? `${stats.oneVsOneSaveRate}%` : '—'}</Text>
          </View>
        )}
        {stats.gaa !== null && stats.gamesPlayed > 0 && (
          <View style={blockStyles.statRow}>
            <View style={[blockStyles.statDot, { backgroundColor: '#EC4899' }]} />
            <Text style={blockStyles.statLabel}>GAA</Text>
            <Text style={[blockStyles.statValue, { color: '#EC4899' }]}>{stats.gaa.toFixed(2)}</Text>
          </View>
        )}
      </View>

      <View style={blockStyles.avgRow}>
        <View style={blockStyles.avgItem}>
          <Text style={blockStyles.avgValue}>{stats.avgSavesPerGame}</Text>
          <Text style={blockStyles.avgLabel}>Avg Saves/Game</Text>
        </View>
        <View style={blockStyles.avgDivider} />
        <View style={blockStyles.avgItem}>
          <Text style={blockStyles.avgValue}>{stats.avgGoalsAgainstPerGame}</Text>
          <Text style={blockStyles.avgLabel}>Avg GA/Game</Text>
        </View>
        {stats.gaa !== null && stats.gamesPlayed > 0 && (
          <>
            <View style={blockStyles.avgDivider} />
            <View style={blockStyles.avgItem}>
              <Text style={blockStyles.avgValue}>{stats.gaa.toFixed(2)}</Text>
              <Text style={blockStyles.avgLabel}>GAA</Text>
            </View>
          </>
        )}
      </View>

      {(expanded !== false) && (
        <>
          <View style={blockStyles.distSection}>
            <Text style={blockStyles.distTitle}>Distribution</Text>
            <View style={blockStyles.distGrid}>
              <View style={blockStyles.distRow}>
                <View style={blockStyles.distItem}>
                  <Text style={blockStyles.distValue}>{stats.distribution.handledCrosses}</Text>
                  <Text style={blockStyles.distLabel}>Crosses/Int.</Text>
                </View>
                <View style={blockStyles.distItem}>
                  <Text style={blockStyles.distValue}>{stats.distribution.punts}</Text>
                  <Text style={blockStyles.distLabel}>Punts</Text>
                </View>
                <View style={blockStyles.distItem}>
                  <Text style={blockStyles.distValue}>{stats.distribution.throwouts}</Text>
                  <Text style={blockStyles.distLabel}>Throwouts / Rollouts</Text>
                </View>
              </View>
              <View style={blockStyles.distRow}>
                <View style={blockStyles.distItem}>
                  <Text style={blockStyles.distValue}>{stats.distribution.drives}</Text>
                  <Text style={blockStyles.distLabel}>Drives</Text>
                </View>
                <View style={blockStyles.distItem}>
                  <Text style={blockStyles.distValue}>{stats.distribution.dropBacks}</Text>
                  <Text style={blockStyles.distLabel}>Drop Backs</Text>
                </View>
                <View style={blockStyles.distItem} />
              </View>
            </View>
          </View>

          <View style={blockStyles.distSection}>
            <Text style={blockStyles.distTitle}>Penalties</Text>
            <View style={blockStyles.distGrid}>
              <View style={blockStyles.distRow}>
                <View style={blockStyles.distItem}>
                  <Text style={blockStyles.distValue}>{stats.penalties.penaltiesFaced}</Text>
                  <Text style={blockStyles.distLabel}>PK Goals Against</Text>
                </View>
                <View style={blockStyles.distItem}>
                  <Text style={blockStyles.distValue}>{stats.penalties.penaltiesSaved}</Text>
                  <Text style={blockStyles.distLabel}>PK Saved</Text>
                </View>
                <View style={blockStyles.distItem} />
              </View>
              <View style={blockStyles.distRow}>
                <View style={blockStyles.distItem}>
                  <Text style={[blockStyles.distValue, { color: Colors.warning }]}>{stats.penalties.yellowCards}</Text>
                  <Text style={blockStyles.distLabel}>Yellow</Text>
                </View>
                <View style={blockStyles.distItem}>
                  <Text style={[blockStyles.distValue, { color: Colors.danger }]}>{stats.penalties.redCards}</Text>
                  <Text style={blockStyles.distLabel}>Red</Text>
                </View>
                <View style={blockStyles.distItem} />
              </View>
            </View>
          </View>

          {(stats.shootout.saves > 0 || stats.shootout.goalsAgainst > 0) && (
            <View style={blockStyles.distSection}>
              <Text style={blockStyles.distTitle}>Shootout</Text>
              <View style={blockStyles.distGrid}>
                <View style={blockStyles.distRow}>
                  <View style={blockStyles.distItem}>
                    <Text style={[blockStyles.distValue, { color: Colors.primary }]}>{stats.shootout.saves}</Text>
                    <Text style={blockStyles.distLabel}>Saves</Text>
                  </View>
                  <View style={blockStyles.distItem}>
                    <Text style={[blockStyles.distValue, { color: Colors.danger }]}>{stats.shootout.goalsAgainst}</Text>
                    <Text style={blockStyles.distLabel}>Goals Against</Text>
                  </View>
                  <View style={blockStyles.distItem}>
                    <Text style={[blockStyles.distValue, { color: '#3B82F6' }]}>{stats.shootout.saves + stats.shootout.goalsAgainst}</Text>
                    <Text style={blockStyles.distLabel}>Shots on Target</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const blockStyles = StyleSheet.create({
  container: {
    gap: 12,
  },
  topRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  statRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  avgRow: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden' as const,
  },
  avgItem: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 14,
  },
  avgDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  avgValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  avgLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  distSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  distTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    textAlign: 'center' as const,
    marginBottom: 14,
  },
  distGrid: {
    gap: 14,
  },
  distRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
  },
  distItem: {
    flex: 1,
    alignItems: 'center' as const,
  },
  distValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  distLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginTop: 3,
    textAlign: 'center' as const,
  },
});

function GroupSection({ group, defaultExpanded, keeperName }: { group: GroupedStats; defaultExpanded?: boolean; keeperName: string }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  const handleToggle = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(prev => !prev);
  }, []);

  const handleGroupExportText = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = formatStatsAsText(keeperName, group.label, [group]);
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        Alert.alert('Copied', 'Stats copied to clipboard.');
      } catch {
        Alert.alert('Stats', text);
      }
    } else {
      await Share.share({ message: text, title: `${group.label} Stats` });
    }
  }, [keeperName, group]);

  const handleGroupExportCSV = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const csv = formatStatsAsCSV(keeperName, group.label, [group]);
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(csv);
        Alert.alert('Copied', 'CSV data copied to clipboard.');
      } catch {
        Alert.alert('CSV', csv);
      }
    } else {
      await Share.share({ message: csv, title: `${group.label} Stats CSV` });
    }
  }, [keeperName, group]);

  const handleGroupExportImage = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = formatStatsAsText(keeperName, group.label, [group]);
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        Alert.alert('Copied', 'Stats copied to clipboard.');
      } catch {
        Alert.alert('Stats', text);
      }
    } else {
      await Share.share({ message: text, title: `${group.label} Stats` });
    }
  }, [keeperName, group]);

  return (
    <View style={groupStyles.container}>
      <TouchableOpacity
        style={groupStyles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={groupStyles.headerLeft}>
          <Text style={groupStyles.label}>{group.label}</Text>
          {group.sublabel ? <Text style={groupStyles.sublabel}>{group.sublabel}</Text> : null}
        </View>
        <View style={groupStyles.headerRight}>
          <View style={[groupStyles.pctBadge, { backgroundColor: group.stats.savePercentage >= 50 ? Colors.primaryGlow : Colors.dangerGlow }]}>
            <Text style={[groupStyles.pctText, { color: group.stats.savePercentage >= 50 ? Colors.primary : Colors.danger }]}>
              {group.stats.savePercentage}%
            </Text>
          </View>
          {expanded ? <ChevronUp size={18} color={Colors.textMuted} /> : <ChevronDown size={18} color={Colors.textMuted} />}
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={groupStyles.content}>
          <StatsBlock stats={group.stats} />
          <View style={groupStyles.exportSection}>
            <Text style={groupStyles.exportTitle}>Export {group.label} Stats</Text>
            <View style={groupStyles.exportButtons}>
              <TouchableOpacity style={groupStyles.exportButton} onPress={handleGroupExportText} activeOpacity={0.7}>
                <FileText size={16} color={Colors.primary} />
                <Text style={groupStyles.exportButtonText}>Text</Text>
              </TouchableOpacity>
              <TouchableOpacity style={groupStyles.exportButton} onPress={handleGroupExportCSV} activeOpacity={0.7}>
                <FileSpreadsheet size={16} color={Colors.accent} />
                <Text style={groupStyles.exportButtonText}>CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={groupStyles.exportButton} onPress={handleGroupExportImage} activeOpacity={0.7}>
                <Image size={16} color="#8B5CF6" />
                <Text style={groupStyles.exportButtonText}>Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}

const groupStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden' as const,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sublabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pctText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  exportSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
  },
  exportTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  exportButtons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exportButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  offscreenContainer: {
    position: 'absolute' as const,
    left: -9999,
    top: -9999,
    opacity: 0,
  },
});

function GameSelector({ games, selectedIds, onToggle }: { games: SavedGame[]; selectedIds: Set<string>; onToggle: (id: string) => void }) {
  return (
    <View style={selectorStyles.container}>
      <Text style={selectorStyles.title}>Select Games</Text>
      {games.map((game) => {
        const isSelected = selectedIds.has(game.id);
        const dateStr = game.setup.date ? new Date(game.setup.date).toLocaleDateString() : '';
        return (
          <TouchableOpacity
            key={game.id}
            style={[selectorStyles.item, isSelected && selectorStyles.itemSelected]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggle(game.id);
            }}
            activeOpacity={0.7}
          >
            <View style={[selectorStyles.checkbox, isSelected && selectorStyles.checkboxSelected]}>
              {isSelected ? <Check size={14} color={Colors.white} /> : <Square size={14} color={Colors.textMuted} />}
            </View>
            <View style={selectorStyles.itemInfo}>
              <Text style={selectorStyles.itemName} numberOfLines={1}>{game.setup.eventName || game.setup.gameName || 'Unnamed Game'}</Text>
              <Text style={selectorStyles.itemMeta}>
                {dateStr}{game.setup.gameName ? ` · ${game.setup.gameName}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const selectorStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  itemSelected: {
    backgroundColor: Colors.primaryGlow,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  itemMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginTop: 2,
  },
});

export default function GoalkeeperStatsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeProfile, clearSelection } = useGoalkeepers();
  const { allGames } = useGames();
  const { teams, clearTeamSelection } = useTeams();

  const handleSwitchGoalkeeper = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearSelection();
    clearTeamSelection();
    if (Platform.OS === 'web') {
      router.replace('/');
    } else {
      router.dismissAll();
    }
  }, [clearSelection, clearTeamSelection, router]);
  const [groupMode, setGroupMode] = useState<GroupMode>('career');
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [moreViewsOpen, setMoreViewsOpen] = useState<boolean>(false);
  const customLabel = 'Selected Games';

  const isSecondaryMode = SECONDARY_MODES.some(m => m.key === groupMode);
  const activeSecondaryLabel = SECONDARY_MODES.find(m => m.key === groupMode)?.label;

  const handleGroupChange = useCallback((mode: GroupMode) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGroupMode(mode);
    setMoreViewsOpen(false);
    if (mode !== 'custom') {
      setSelectedGameIds(new Set());
    }
  }, []);

  const handleToggleMoreViews = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMoreViewsOpen(prev => !prev);
  }, []);

  const handleToggleGame = useCallback((gameId: string) => {
    setSelectedGameIds(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedGameIds.size === allGames.length) {
      setSelectedGameIds(new Set());
    } else {
      setSelectedGameIds(new Set(allGames.map(g => g.id)));
    }
  }, [allGames, selectedGameIds.size]);

  const keeperName = activeProfile?.name ?? 'Goalkeeper';

  const profileId = activeProfile?.id;

  const groupedStats = useMemo((): GroupedStats[] => {
    console.log('[GoalkeeperStats] Computing grouped stats, mode:', groupMode, 'games:', allGames.length);
    switch (groupMode) {
      case 'career':
        return groupByCareer(allGames, keeperName);
      case 'team':
        return groupByTeam(allGames, teams, keeperName);
      case 'year':
        return groupByYear(allGames, keeperName);
      case 'opponent':
        return groupByOpponent(allGames, keeperName, profileId ?? undefined);
      case 'custom':
        return groupByCustom(allGames, selectedGameIds, customLabel, keeperName);
      default:
        return [];
    }
  }, [groupMode, allGames, teams, selectedGameIds, customLabel, keeperName, profileId]);

  const careerStats = useMemo(() => {
    if (groupMode === 'career' && groupedStats.length > 0) return groupedStats[0].stats;
    return null;
  }, [groupMode, groupedStats]);

  const modeLabel = ALL_GROUP_OPTIONS.find(o => o.key === groupMode)?.label ?? groupMode;

  const handleExportText = useCallback(async () => {
    if (groupedStats.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = formatStatsAsText(keeperName, modeLabel, groupedStats);
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        Alert.alert('Copied', 'Stats copied to clipboard.');
      } catch {
        Alert.alert('Stats', text);
      }
    } else {
      await Share.share({ message: text, title: 'Goalkeeper Stats Summary' });
    }
  }, [groupedStats, keeperName, modeLabel]);

  const handleExportCSV = useCallback(async () => {
    if (groupedStats.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const csv = formatStatsAsCSV(keeperName, modeLabel, groupedStats);
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(csv);
        Alert.alert('Copied', 'CSV data copied to clipboard.');
      } catch {
        Alert.alert('CSV', csv);
      }
    } else {
      await Share.share({ message: csv, title: 'Goalkeeper Stats CSV' });
    }
  }, [groupedStats, keeperName, modeLabel]);

  const handleExportImage = useCallback(async () => {
    if (groupedStats.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = formatStatsAsText(keeperName, modeLabel, groupedStats);
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        Alert.alert('Copied', 'Stats copied to clipboard.');
      } catch {
        Alert.alert('Stats', text);
      }
    } else {
      await Share.share({ message: text, title: 'Goalkeeper Stats Summary' });
    }
  }, [groupedStats, keeperName, modeLabel]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        testID="stats-scroll-view"
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileIconBg}>
            <TrendingUp size={22} color={colors.primary} />
          </View>
          <View style={styles.profileHeaderText}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{activeProfile?.name ?? 'Goalkeeper'}</Text>
              <TouchableOpacity
                testID="switch-goalkeeper-stats-btn"
                style={styles.switchKeeperBtn}
                onPress={handleSwitchGoalkeeper}
                activeOpacity={0.7}
              >
                <ArrowLeftRight size={13} color={colors.primary} />
                <Text style={styles.switchKeeperText}>Switch Goalkeeper</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.profileSub}>
              {activeProfile?.birthYear ? `Born ${activeProfile.birthYear} · ` : ''}{allGames.length} game{allGames.length !== 1 ? 's' : ''} recorded
            </Text>
          </View>
        </View>

        <View style={styles.modeSelectorWrap}>
          <View style={styles.groupSelector}>
            {PRIMARY_MODES.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                testID={`group-${opt.key}`}
                style={[styles.groupOption, groupMode === opt.key && !isSecondaryMode && styles.groupOptionActive]}
                onPress={() => handleGroupChange(opt.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.groupOptionText, groupMode === opt.key && !isSecondaryMode && styles.groupOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              testID="more-views-btn"
              style={[styles.groupOption, isSecondaryMode && styles.groupOptionActive]}
              onPress={handleToggleMoreViews}
              activeOpacity={0.7}
            >
              <View style={styles.moreViewsInner}>
                {isSecondaryMode ? (
                  <Text style={[styles.groupOptionText, styles.groupOptionTextActive]}>
                    {activeSecondaryLabel}
                  </Text>
                ) : (
                  <>
                    <MoreHorizontal size={14} color={Colors.textMuted} />
                    <Text style={styles.groupOptionText}>More</Text>
                  </>
                )}
                <ChevronDown size={12} color={isSecondaryMode ? Colors.white : Colors.textMuted} style={moreViewsOpen ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </View>
            </TouchableOpacity>
          </View>

          {moreViewsOpen && (
            <View style={styles.moreViewsDropdown}>
              {SECONDARY_MODES.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  testID={`group-${opt.key}`}
                  style={[styles.moreViewsItem, groupMode === opt.key && styles.moreViewsItemActive]}
                  onPress={() => handleGroupChange(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.moreViewsItemText, groupMode === opt.key && styles.moreViewsItemTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {allGames.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Shield size={48} color={colors.border} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No Games Yet</Text>
            <Text style={styles.emptySubtitle}>Play some games to see your stats here</Text>
          </View>
        ) : (
          <>
            {groupMode === 'career' && careerStats && (
              <StatsBlock stats={careerStats} />
            )}

            {groupMode === 'team' && (
              <View style={styles.groupList}>
                {groupedStats.length === 0 ? (
                  <Text style={styles.noDataText}>No team data available</Text>
                ) : (
                  groupedStats.map((group, idx) => (
                    <GroupSection key={group.label + idx} group={group} defaultExpanded={groupedStats.length === 1} keeperName={keeperName} />
                  ))
                )}
              </View>
            )}

            {groupMode === 'year' && (
              <View style={styles.groupList}>
                {groupedStats.length === 0 ? (
                  <Text style={styles.noDataText}>No year data available</Text>
                ) : (
                  groupedStats.map((group, idx) => (
                    <GroupSection key={group.label + idx} group={group} defaultExpanded={groupedStats.length === 1} keeperName={keeperName} />
                  ))
                )}
              </View>
            )}

            {groupMode === 'opponent' && (
              <View style={styles.groupList}>
                {groupedStats.length === 0 ? (
                  <Text style={styles.noDataText}>No opponent data available</Text>
                ) : (
                  groupedStats.map((group, idx) => (
                    <GroupSection key={group.label + idx} group={group} defaultExpanded={groupedStats.length === 1} keeperName={keeperName} />
                  ))
                )}
              </View>
            )}

            {groupMode === 'custom' && (
              <View style={styles.customSection}>
                <GameSelector
                  games={allGames}
                  selectedIds={selectedGameIds}
                  onToggle={handleToggleGame}
                />
                <TouchableOpacity
                  style={styles.selectAllBtn}
                  onPress={handleSelectAll}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectAllText}>
                    {selectedGameIds.size === allGames.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
                {selectedGameIds.size > 0 && (
                  <View style={styles.customResults}>
                    <View style={styles.customResultsHeader}>
                      <Text style={styles.customResultsTitle}>Selected Stats</Text>
                      <Text style={styles.customResultsCount}>{selectedGameIds.size} game{selectedGameIds.size !== 1 ? 's' : ''}</Text>
                    </View>
                    <StatsBlock stats={groupedStats[0]?.stats ?? { gamesPlayed: 0, totalSaves: 0, totalGoalsAgainst: 0, totalShotsFaced: 0, savePercentage: 0, cleanSheets: 0, distribution: { handledCrosses: 0, punts: 0, throwouts: 0, drives: 0, dropBacks: 0 }, penalties: { penaltiesFaced: 0, penaltiesSaved: 0, redCards: 0, yellowCards: 0 }, shootout: { saves: 0, goalsAgainst: 0 }, avgSavesPerGame: 0, avgGoalsAgainstPerGame: 0, oneVsOneFaced: 0, oneVsOneSaved: 0, oneVsOneSaveRate: null, totalEstimatedMinutes: 0, gaa: null }} />
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {allGames.length > 0 && groupedStats.length > 0 && (groupMode === 'career' || groupMode === 'custom' || groupMode === 'opponent') && (
          <View style={styles.exportSection}>
            <Text style={styles.exportTitle}>Export Stats</Text>
            <View style={styles.exportButtons}>
              <TouchableOpacity style={styles.exportButton} onPress={handleExportText} activeOpacity={0.7} testID="export-stats-text">
                <FileText size={18} color={colors.primary} />
                <Text style={styles.exportButtonText}>Share as Text</Text>
                <Share2 size={14} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV} activeOpacity={0.7} testID="export-stats-csv">
                <FileSpreadsheet size={18} color={colors.accent} />
                <Text style={styles.exportButtonText}>Share as CSV</Text>
                <Share2 size={14} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={handleExportImage}
                activeOpacity={0.7}
                testID="export-stats-image"
              >
                <Image size={18} color="#8B5CF6" />
                <Text style={styles.exportButtonText}>Share as Image</Text>
                <Share2 size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  profileIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  profileHeaderText: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  switchKeeperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  switchKeeperText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  profileSub: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modeSelectorWrap: {
    marginBottom: 20,
    gap: 6,
  },
  groupSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  groupOptionActive: {
    backgroundColor: Colors.primaryDark,
  },
  groupOptionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  groupOptionTextActive: {
    color: Colors.white,
    fontWeight: '700' as const,
  },
  moreViewsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moreViewsDropdown: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  moreViewsItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  moreViewsItemActive: {
    backgroundColor: Colors.primaryDark,
  },
  moreViewsItemText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  moreViewsItemTextActive: {
    color: Colors.white,
    fontWeight: '700' as const,
  },
  groupList: {
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  noDataText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 30,
  },
  customSection: {
    gap: 12,
  },
  selectAllBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  customResults: {
    gap: 12,
  },
  customResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  customResultsTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  customResultsCount: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden' as const,
  },
  exportSection: {
    marginTop: 24,
  },
  exportTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 12,
  },
  exportButtons: {
    gap: 10,
  },
  exportButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exportButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  offscreenContainer: {
    position: 'absolute' as const,
    left: -9999,
    top: -9999,
    opacity: 0,
  },
});
