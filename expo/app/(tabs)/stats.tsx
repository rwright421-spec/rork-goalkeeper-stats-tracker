import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Shield, Target, Award, ChevronDown, ChevronUp, Check, Square, Share2, FileText, FileSpreadsheet, Image, ArrowLeftRight, MoreHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '@/constants/themes';
import { useColors } from '@/contexts/ThemeContext';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useGames, FREE_GAME_LIMIT } from '@/contexts/GameContext';
import { useTeams } from '@/contexts/TeamContext';
import { usePurchases } from '@/contexts/PurchasesContext';
import { SavedGame } from '@/types/game';
import SyncStatusBanner from '@/components/SyncStatusBanner';
import { StatsScreenSkeleton } from '@/components/LoadingSkeleton';
import { fontSize } from '@/constants/typography';
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

function createStatCardStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      alignItems: 'center' as const,
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: c.border,
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
      fontSize: fontSize.h1,
      fontWeight: '800' as const,
    },
    label: {
      fontSize: fontSize.xs,
      fontWeight: '600' as const,
      color: c.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      textAlign: 'center' as const,
    },
  });
}

function StatCard({ label, value, color, icon, colors }: { label: string; value: string | number; color: string; icon?: React.ReactNode; colors: ThemeColors }) {
  const s = useMemo(() => createStatCardStyles(colors), [colors]);
  return (
    <View style={s.card}>
      <View style={[s.iconBg, { backgroundColor: color + '18' }]}>
        {icon}
      </View>
      <Text style={[s.value, { color }]}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

function createBlockStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 12,
    },
    topRow: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    row: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
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
      fontSize: fontSize.body,
      fontWeight: '500' as const,
      color: c.textSecondary,
    },
    statValue: {
      fontSize: fontSize.h3,
      fontWeight: '800' as const,
    },
    avgRow: {
      flexDirection: 'row' as const,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden' as const,
    },
    avgItem: {
      flex: 1,
      alignItems: 'center' as const,
      paddingVertical: 14,
    },
    avgDivider: {
      width: 1,
      backgroundColor: c.border,
    },
    avgValue: {
      fontSize: fontSize.h2,
      fontWeight: '700' as const,
      color: c.text,
    },
    avgLabel: {
      fontSize: fontSize.xs,
      fontWeight: '600' as const,
      color: c.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.3,
      marginTop: 4,
    },
    distSection: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    distTitle: {
      fontSize: fontSize.sm,
      fontWeight: '700' as const,
      color: c.textMuted,
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
      fontSize: fontSize.h2,
      fontWeight: '700' as const,
      color: c.text,
    },
    distLabel: {
      fontSize: fontSize.xs2,
      color: c.textMuted,
      fontWeight: '500' as const,
      marginTop: 3,
      textAlign: 'center' as const,
    },
  });
}

function StatsBlock({ stats, expanded, colors }: { stats: AggregatedStats; expanded?: boolean; colors: ThemeColors }) {
  const s = useMemo(() => createBlockStyles(colors), [colors]);
  const savePctColor = stats.savePercentage === null ? colors.textMuted : stats.savePercentage >= 75 ? colors.primary : stats.savePercentage >= 50 ? colors.accent : colors.danger;

  return (
    <View style={s.container}>
      <View style={s.topRow}>
        <StatCard
          label="Games"
          value={stats.gamesPlayed}
          color="#3B82F6"
          icon={<Shield size={18} color="#3B82F6" />}
          colors={colors}
        />
        <StatCard
          label="Save %"
          value={stats.savePercentage !== null ? `${stats.savePercentage}%` : '—'}
          color={savePctColor}
          icon={<Target size={18} color={savePctColor} />}
          colors={colors}
        />
        <StatCard
          label="Clean Sheets"
          value={stats.cleanSheets}
          color="#8B5CF6"
          icon={<Award size={18} color="#8B5CF6" />}
          colors={colors}
        />
      </View>

      <View style={s.row}>
        <View style={s.statRow}>
          <View style={[s.statDot, { backgroundColor: colors.primary }]} />
          <Text style={s.statLabel}>Total Saves</Text>
          <Text style={[s.statValue, { color: colors.primary }]}>{stats.totalSaves}</Text>
        </View>
        <View style={s.statRow}>
          <View style={[s.statDot, { backgroundColor: colors.danger }]} />
          <Text style={s.statLabel}>Goals Against</Text>
          <Text style={[s.statValue, { color: colors.danger }]}>{stats.totalGoalsAgainst}</Text>
        </View>
        <View style={s.statRow}>
          <View style={[s.statDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={s.statLabel}>Shots on Target</Text>
          <Text style={[s.statValue, { color: '#3B82F6' }]}>{stats.totalShotsFaced}</Text>
        </View>
        {stats.oneVsOneSavePercentage !== null && (
          <View style={s.statRow}>
            <View style={[s.statDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={s.statLabel}>1v1 Save %</Text>
            <Text style={[s.statValue, { color: '#F59E0B' }]}>{stats.oneVsOneSavePercentage}% ({stats.oneVsOneSaved} of {stats.oneVsOneOnTarget})</Text>
          </View>
        )}
        {stats.pkSavePercentage !== null && (
          <View style={s.statRow}>
            <View style={[s.statDot, { backgroundColor: '#14B8A6' }]} />
            <Text style={s.statLabel}>PK Save %</Text>
            <Text style={[s.statValue, { color: '#14B8A6' }]}>{stats.pkSavePercentage}% ({stats.penalties.penaltiesSaved} of {stats.pkOnTarget})</Text>
          </View>
        )}
        {stats.gaa !== null && stats.gamesPlayed > 0 && (
          <View style={s.statRow}>
            <View style={[s.statDot, { backgroundColor: '#EC4899' }]} />
            <Text style={s.statLabel}>GAA</Text>
            <Text style={[s.statValue, { color: '#EC4899' }]}>{stats.gaa.toFixed(2)}</Text>
          </View>
        )}
      </View>

      <View style={s.avgRow}>
        <View style={s.avgItem}>
          <Text style={s.avgValue}>{stats.avgSavesPerGame}</Text>
          <Text style={s.avgLabel}>Avg Saves/Game</Text>
        </View>
        <View style={s.avgDivider} />
        <View style={s.avgItem}>
          <Text style={s.avgValue}>{stats.avgGoalsAgainstPerGame}</Text>
          <Text style={s.avgLabel}>Avg GA/Game</Text>
        </View>
        {stats.gaa !== null && stats.gamesPlayed > 0 && (
          <>
            <View style={s.avgDivider} />
            <View style={s.avgItem}>
              <Text style={s.avgValue}>{stats.gaa.toFixed(2)}</Text>
              <Text style={s.avgLabel}>GAA</Text>
            </View>
          </>
        )}
      </View>

      {(expanded !== false) && (
        <>
          <View style={s.distSection}>
            <Text style={s.distTitle}>Distribution</Text>
            <View style={s.distGrid}>
              <View style={s.distRow}>
                <View style={s.distItem}>
                  <Text style={s.distValue}>{stats.distribution.handledCrosses}</Text>
                  <Text style={s.distLabel}>Crosses/Int.</Text>
                </View>
                <View style={s.distItem}>
                  <Text style={s.distValue}>{stats.distribution.punts}</Text>
                  <Text style={s.distLabel}>Punts</Text>
                </View>
                <View style={s.distItem}>
                  <Text style={s.distValue}>{stats.distribution.throwouts}</Text>
                  <Text style={s.distLabel}>Throwouts / Rollouts</Text>
                </View>
              </View>
              <View style={s.distRow}>
                <View style={s.distItem}>
                  <Text style={s.distValue}>{stats.distribution.drives}</Text>
                  <Text style={s.distLabel}>Drives</Text>
                </View>
                <View style={s.distItem}>
                  <Text style={s.distValue}>{stats.distribution.dropBacks}</Text>
                  <Text style={s.distLabel}>Drop Backs</Text>
                </View>
                <View style={s.distItem} />
              </View>
            </View>
          </View>

          <View style={s.distSection}>
            <Text style={s.distTitle}>Penalties</Text>
            <View style={s.distGrid}>
              <View style={s.distRow}>
                <View style={s.distItem}>
                  <Text style={[s.distValue, { color: colors.primary }]}>{stats.penalties.penaltiesSaved}</Text>
                  <Text style={s.distLabel}>PK Saved</Text>
                </View>
                <View style={s.distItem}>
                  <Text style={[s.distValue, { color: colors.danger }]}>{stats.penalties.penaltyGoals}</Text>
                  <Text style={s.distLabel}>PK Goal</Text>
                </View>
                <View style={s.distItem}>
                  <Text style={[s.distValue, { color: colors.textMuted }]}>{stats.penalties.penaltiesMissed}</Text>
                  <Text style={s.distLabel}>PK Missed</Text>
                </View>
              </View>
              {stats.pkSavePercentage !== null && (
                <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' as const, textAlign: 'center' as const }}>
                  PK Save %: {stats.pkSavePercentage}% ({stats.penalties.penaltiesSaved} of {stats.pkOnTarget} on target)
                </Text>
              )}
              <View style={s.distRow}>
                <View style={s.distItem}>
                  <Text style={[s.distValue, { color: colors.warning }]}>{stats.penalties.yellowCards}</Text>
                  <Text style={s.distLabel}>Yellow</Text>
                </View>
                <View style={s.distItem}>
                  <Text style={[s.distValue, { color: colors.danger }]}>{stats.penalties.redCards}</Text>
                  <Text style={s.distLabel}>Red</Text>
                </View>
                <View style={s.distItem} />
              </View>
            </View>
          </View>

          {(stats.shootout.saves > 0 || stats.shootout.goalsAgainst > 0) && (
            <View style={s.distSection}>
              <Text style={s.distTitle}>Shootout</Text>
              <View style={s.distGrid}>
                <View style={s.distRow}>
                  <View style={s.distItem}>
                    <Text style={[s.distValue, { color: colors.primary }]}>{stats.shootout.saves}</Text>
                    <Text style={s.distLabel}>Saves</Text>
                  </View>
                  <View style={s.distItem}>
                    <Text style={[s.distValue, { color: colors.danger }]}>{stats.shootout.goalsAgainst}</Text>
                    <Text style={s.distLabel}>Goals Against</Text>
                  </View>
                  <View style={s.distItem}>
                    <Text style={[s.distValue, { color: '#3B82F6' }]}>{stats.shootout.saves + stats.shootout.goalsAgainst}</Text>
                    <Text style={s.distLabel}>Shots on Target</Text>
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

function createGroupStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.surfaceLight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
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
      fontSize: fontSize.subtitle,
      fontWeight: '700' as const,
      color: c.text,
    },
    sublabel: {
      fontSize: fontSize.caption,
      fontWeight: '500' as const,
      color: c.textMuted,
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
      fontSize: fontSize.body2,
      fontWeight: '700' as const,
    },
    content: {
      padding: 16,
      paddingTop: 0,
    },
    exportSection: {
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 14,
    },
    exportTitle: {
      fontSize: fontSize.sm,
      fontWeight: '700' as const,
      color: c.textMuted,
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
      backgroundColor: c.surface,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    exportButtonText: {
      fontSize: fontSize.caption,
      fontWeight: '600' as const,
      color: c.text,
    },
  });
}

function GroupSection({ group, defaultExpanded, keeperName }: { group: GroupedStats; defaultExpanded?: boolean; keeperName: string }) {
  const colors = useColors();
  const s = useMemo(() => createGroupStyles(colors), [colors]);
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
    <View style={s.container}>
      <TouchableOpacity
        style={s.header}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={s.headerLeft}>
          <Text style={s.label}>{group.label}</Text>
          {group.sublabel ? <Text style={s.sublabel}>{group.sublabel}</Text> : null}
        </View>
        <View style={s.headerRight}>
          <View style={[s.pctBadge, { backgroundColor: group.stats.savePercentage === null ? colors.surface : group.stats.savePercentage >= 50 ? colors.primaryGlow : colors.dangerGlow }]}>
            <Text style={[s.pctText, { color: group.stats.savePercentage === null ? colors.textMuted : group.stats.savePercentage >= 50 ? colors.primary : colors.danger }]}>
              {group.stats.savePercentage !== null ? `${group.stats.savePercentage}%` : '—'}
            </Text>
          </View>
          {expanded ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={s.content}>
          <StatsBlock stats={group.stats} colors={colors} />
          <View style={s.exportSection}>
            <Text style={s.exportTitle}>Export {group.label} Stats</Text>
            <View style={s.exportButtons}>
              <TouchableOpacity style={s.exportButton} onPress={handleGroupExportText} activeOpacity={0.7}>
                <FileText size={16} color={colors.primary} />
                <Text style={s.exportButtonText}>Text</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.exportButton} onPress={handleGroupExportCSV} activeOpacity={0.7}>
                <FileSpreadsheet size={16} color={colors.accent} />
                <Text style={s.exportButtonText}>CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.exportButton} onPress={handleGroupExportImage} activeOpacity={0.7}>
                <Image size={16} color="#8B5CF6" />
                <Text style={s.exportButtonText}>Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function createSelectorStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    title: {
      fontSize: fontSize.caption,
      fontWeight: '700' as const,
      color: c.textMuted,
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
      backgroundColor: c.primaryGlow,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    checkboxSelected: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: fontSize.body,
      fontWeight: '600' as const,
      color: c.text,
    },
    itemMeta: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      fontWeight: '500' as const,
      marginTop: 2,
    },
  });
}

function GameSelector({ games, selectedIds, onToggle }: { games: SavedGame[]; selectedIds: Set<string>; onToggle: (id: string) => void }) {
  const colors = useColors();
  const s = useMemo(() => createSelectorStyles(colors), [colors]);

  return (
    <View style={s.container}>
      <Text style={s.title}>Select Games</Text>
      {games.map((game) => {
        const isSelected = selectedIds.has(game.id);
        const dateStr = game.setup.date ? new Date(game.setup.date).toLocaleDateString() : '';
        return (
          <TouchableOpacity
            key={game.id}
            style={[s.item, isSelected && s.itemSelected]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggle(game.id);
            }}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
              {isSelected ? <Check size={14} color={colors.white} /> : <Square size={14} color={colors.textMuted} />}
            </View>
            <View style={s.itemInfo}>
              <Text style={s.itemName} numberOfLines={1}>{game.setup.eventName || game.setup.gameName || 'Unnamed Game'}</Text>
              <Text style={s.itemMeta}>
                {dateStr}{game.setup.gameName ? ` · ${game.setup.gameName}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function createMainStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
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
      backgroundColor: c.primaryGlow,
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
      backgroundColor: c.primaryGlow,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    switchKeeperText: {
      fontSize: fontSize.caption,
      fontWeight: '600' as const,
      color: c.primary,
    },
    profileName: {
      fontSize: fontSize.h2,
      fontWeight: '800' as const,
      color: c.text,
    },
    profileSub: {
      fontSize: fontSize.body2,
      fontWeight: '500' as const,
      color: c.textMuted,
      marginTop: 2,
    },
    modeSelectorWrap: {
      marginBottom: 20,
      gap: 6,
    },
    groupSelector: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    groupOption: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 9,
      alignItems: 'center',
    },
    groupOptionActive: {
      backgroundColor: c.primaryDark,
    },
    groupOptionText: {
      fontSize: fontSize.body2,
      fontWeight: '600' as const,
      color: c.textMuted,
    },
    groupOptionTextActive: {
      color: c.white,
      fontWeight: '700' as const,
    },
    moreViewsInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    moreViewsDropdown: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
      gap: 4,
    },
    moreViewsItem: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    moreViewsItemActive: {
      backgroundColor: c.primaryDark,
    },
    moreViewsItemText: {
      fontSize: fontSize.body2,
      fontWeight: '600' as const,
      color: c.textMuted,
    },
    moreViewsItemTextActive: {
      color: c.white,
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
      fontSize: fontSize.h3,
      fontWeight: '600' as const,
      color: c.textSecondary,
      marginTop: 8,
    },
    emptySubtitle: {
      fontSize: fontSize.body,
      color: c.textMuted,
    },
    noDataText: {
      fontSize: fontSize.body,
      color: c.textMuted,
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
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    selectAllText: {
      fontSize: fontSize.body2,
      fontWeight: '600' as const,
      color: c.primary,
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
      fontSize: fontSize.bodyLg,
      fontWeight: '700' as const,
      color: c.text,
    },
    customResultsCount: {
      fontSize: fontSize.caption,
      fontWeight: '600' as const,
      color: c.textMuted,
      backgroundColor: c.surface,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
      overflow: 'hidden' as const,
    },
    exportSection: {
      marginTop: 24,
    },
    exportTitle: {
      fontSize: fontSize.body,
      fontWeight: '700' as const,
      color: c.textSecondary,
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
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    exportButtonText: {
      flex: 1,
      fontSize: fontSize.bodyLg,
      fontWeight: '600' as const,
      color: c.text,
    },
  });
}

export default function GoalkeeperStatsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createMainStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeProfile, clearSelection } = useGoalkeepers();
  const { allGames, isLoading: gamesLoading, isAtFreeLimit } = useGames();
  const { teams, clearTeamSelection } = useTeams();
  const { isPro } = usePurchases();
  const showUpgradeBanner = !isPro && isAtFreeLimit;

  const handleSwitchGoalkeeper = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearSelection();
    clearTeamSelection();
    router.replace('/');
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

    switch (groupMode) {
      case 'career':
        return groupByCareer(allGames, keeperName, teams);
      case 'team':
        return groupByTeam(allGames, teams, keeperName);
      case 'year':
        return groupByYear(allGames, keeperName, teams);
      case 'opponent':
        return groupByOpponent(allGames, keeperName, profileId ?? undefined, teams);
      case 'custom':
        return groupByCustom(allGames, selectedGameIds, customLabel, keeperName, teams);
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 64 }]}
        showsVerticalScrollIndicator={false}
        testID="stats-scroll-view"
      >
        <SyncStatusBanner />

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
                    <MoreHorizontal size={14} color={colors.textMuted} />
                    <Text style={styles.groupOptionText}>More</Text>
                  </>
                )}
                <ChevronDown size={12} color={isSecondaryMode ? colors.white : colors.textMuted} style={moreViewsOpen ? { transform: [{ rotate: '180deg' }] } : undefined} />
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

        {showUpgradeBanner && (
          <TouchableOpacity
            testID="upgrade-banner"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.accentGlow,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.25)',
              gap: 10,
            }}
            onPress={() => router.push('/paywall')}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.body2, fontWeight: '600' as const, color: colors.text }}>
                You've reached the {FREE_GAME_LIMIT}-game limit.
              </Text>
              <Text style={{ fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 }}>
                Upgrade to Pro to keep tracking.
              </Text>
            </View>
            <Text style={{ fontSize: fontSize.body2, fontWeight: '700' as const, color: colors.accent }}>Upgrade</Text>
          </TouchableOpacity>
        )}

        {gamesLoading ? (
          <StatsScreenSkeleton />
        ) : allGames.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Shield size={48} color={colors.border} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No Games Yet</Text>
            <Text style={styles.emptySubtitle}>Play some games to see your stats here</Text>
          </View>
        ) : (
          <>
            {groupMode === 'career' && careerStats && (
              <StatsBlock stats={careerStats} colors={colors} />
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
                    <StatsBlock stats={groupedStats[0]?.stats ?? { gamesPlayed: 0, totalSaves: 0, totalGoalsAgainst: 0, totalShotsFaced: 0, savePercentage: null, cleanSheets: 0, distribution: { handledCrosses: 0, punts: 0, throwouts: 0, drives: 0, dropBacks: 0 }, penalties: { penaltiesSaved: 0, penaltyGoals: 0, penaltiesMissed: 0, redCards: 0, yellowCards: 0 }, shootout: { saves: 0, goalsAgainst: 0 }, avgSavesPerGame: 0, avgGoalsAgainstPerGame: 0, oneVsOneFaced: 0, oneVsOneSaved: 0, oneVsOneGoals: 0, oneVsOneMissed: 0, oneVsOneSaveRate: null, oneVsOneSavePercentage: null, oneVsOneOnTarget: 0, totalEstimatedMinutes: 0, gaa: null, pkSavePercentage: null, pkOnTarget: 0 }} colors={colors} />
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
