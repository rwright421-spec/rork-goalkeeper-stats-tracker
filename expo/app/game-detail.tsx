// Game Detail - Detailed view of saved game statistics
import React, { useMemo, useCallback, useState } from 'react';

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Share2, FileText, FileSpreadsheet, Calendar, Trophy, Pencil, MoreVertical, ArrowRightLeft, Clock } from 'lucide-react-native';

import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { useGames } from '@/contexts/GameContext';
import { KeeperData, SavedGame, calculateSavePercentage, getTotalSaves, getTotalGoalsAgainst, getTotalDistribution, getTotalPenalties, getTotalShotsFaced, getShotsFaced, getShootoutShotsFaced, getTotalOneVsOneFaced, getTotalOneVsOneSaved, getTotalOneVsOneGoals, getTotalOneVsOneMissed, getOneVsOneSavePercentage, resolveHalfLength, getPkSavePercentage, isLegacyPenaltyData, isLegacyOneVsOneKeeperData, getAllSavePercentage, getRunOfPlaySavePercentage, getMinutesPlayed } from '@/types/game';
import { HalfTimesEditModal } from '@/components/GameTimerWidget';
import { formatGameAsText, formatGameAsCSV } from '@/utils/export';
import MoveGameModal from '@/components/MoveGameModal';
import { fontSize } from '@/constants/typography';

function KeeperDetailBlock({ keeper, label, color, colors, game }: { keeper: KeeperData; label: string; color: string; colors: ThemeColors; game: SavedGame }) {
  const totalSaves = getTotalSaves(keeper);
  const totalGA = getTotalGoalsAgainst(keeper);
  const totalSF = getTotalShotsFaced(keeper);
  const allPct = getAllSavePercentage(keeper);
  const ropPct = getRunOfPlaySavePercentage(keeper);
  const h1Pct = calculateSavePercentage(keeper.firstHalf.saves, keeper.firstHalf.goalsAgainst);
  const h2Pct = calculateSavePercentage(keeper.secondHalf.saves, keeper.secondHalf.goalsAgainst);
  const totalPen = getTotalPenalties(keeper);

  const styles = useMemo(() => createDetailStyles(colors), [colors]);

  return (
    <View style={styles.keeperBlock}>
      <View style={[styles.keeperHeader, { backgroundColor: color }]}>
        <Text style={styles.keeperHeaderText}>{label} KEEPER</Text>
      </View>

      <View style={styles.keeperInfoRow}>
        <View style={styles.keeperInfoItem}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{keeper.name || '—'}</Text>
        </View>
        <View style={styles.keeperInfoItem}>
          <Text style={styles.infoLabel}>Year</Text>
          <Text style={styles.infoValue}>{keeper.year || '—'}</Text>
        </View>
        <View style={styles.keeperInfoItem}>
          <Text style={styles.infoLabel}>Team</Text>
          <Text style={styles.infoValue}>{keeper.teamName || '—'}</Text>
        </View>
      </View>

      {(keeper.secondHalfName !== keeper.name || keeper.secondHalfYear !== keeper.year || keeper.secondHalfTeamName !== keeper.teamName) ? (
        <View style={styles.secondHalfKeeperBlock}>
          <Text style={styles.secondHalfKeeperTitle}>2nd Half Keeper</Text>
          <View style={styles.keeperInfoRow}>
            <View style={styles.keeperInfoItem}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{keeper.secondHalfName || '—'}</Text>
            </View>
            <View style={styles.keeperInfoItem}>
              <Text style={styles.infoLabel}>Year</Text>
              <Text style={styles.infoValue}>{keeper.secondHalfYear || '—'}</Text>
            </View>
            <View style={styles.keeperInfoItem}>
              <Text style={styles.infoLabel}>Team</Text>
              <Text style={styles.infoValue}>{keeper.secondHalfTeamName || '—'}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.overallRow}>
        <View style={styles.overallStat}>
          <Text style={[styles.overallValue, { color: colors.primary }]}>{totalSaves}</Text>
          <Text style={styles.overallLabel}>Total Saves</Text>
        </View>
        <View style={styles.overallStat}>
          <Text style={[styles.overallValue, { color: colors.danger }]}>{totalGA}</Text>
          <Text style={styles.overallLabel}>Goals Against</Text>
        </View>
        <View style={styles.overallStat}>
          <Text style={[styles.overallValue, { color: '#3B82F6' }]}>{totalSF}</Text>
          <Text style={styles.overallLabel}>Shots on Target</Text>
        </View>
      </View>

      <View style={styles.overallRow}>
        <View style={styles.overallStat}>
          <Text style={[styles.overallValue, { color: allPct === null ? colors.textMuted : allPct >= 50 ? colors.primary : colors.warning }]}>{allPct !== null ? `${allPct}%` : '—'}</Text>
          <Text style={styles.overallLabel}>All Save %</Text>
        </View>
        <View style={[styles.overallStat, styles.overallStatSecondary]}>
          <Text style={[styles.overallValue, { color: ropPct === null ? colors.textMuted : ropPct >= 50 ? colors.primary : colors.warning }]}>{ropPct !== null ? `${ropPct}%` : '—'}</Text>
          <Text style={styles.overallLabel}>RoP Save %</Text>
        </View>
      </View>
      <Text style={styles.ropExplainer}>RoP excludes penalties — shows save % from open play.</Text>

      {getTotalOneVsOneFaced(keeper) > 0 && (
        <View style={styles.distSection}>
          <Text style={styles.distTitle}>1v1 Situations</Text>
          <View style={styles.distGrid}>
            <View style={styles.distItem}><Text style={[styles.distValue, { color: colors.primary }]}>{getTotalOneVsOneSaved(keeper)}</Text><Text style={styles.distLabel}>1v1 Saved</Text></View>
            <View style={styles.distItem}><Text style={[styles.distValue, { color: colors.danger }]}>{getTotalOneVsOneGoals(keeper)}</Text><Text style={styles.distLabel}>1v1 Goal</Text></View>
            <View style={styles.distItem}><Text style={[styles.distValue, { color: colors.textMuted }]}>{getTotalOneVsOneMissed(keeper)}</Text><Text style={styles.distLabel}>1v1 Missed</Text></View>
          </View>
          {(() => {
            const pct = getOneVsOneSavePercentage(keeper);
            if (pct === null) return null;
            const saved = getTotalOneVsOneSaved(keeper);
            const goals = getTotalOneVsOneGoals(keeper);
            return (
              <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' as const, textAlign: 'center' as const, marginTop: 10 }}>
                1v1 Save %: {pct}% ({saved} of {saved + goals} on target)
              </Text>
            );
          })()}
          {isLegacyOneVsOneKeeperData(keeper) && (
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' as const, textAlign: 'center' as const, marginTop: 10 }}>
              1v1 data was recorded before the Missed outcome was added. Edit to re-classify if any 1v1s went wide or over.
            </Text>
          )}
        </View>
      )}

      {(() => {
        const halvesPlayed = keeper.halvesPlayed ?? 2;
        const halfLength = resolveHalfLength(game.setup);
        const estMinutes = halvesPlayed * halfLength;
        const ga = totalGA;
        if (estMinutes > 0) {
          const gaa = Math.round((ga / estMinutes) * 90 * 100) / 100;
          return (
            <View style={[styles.distSection, { marginTop: 14 }]}>
              <Text style={styles.distTitle}>Goals Against Average</Text>
              <View style={styles.distGrid}>
                <View style={styles.distItem}><Text style={[styles.distValue, { color: estMinutes === 0 ? colors.textMuted : '#EC4899' }]}>{estMinutes > 0 ? gaa.toFixed(2) : '—'}</Text><Text style={styles.distLabel}>GAA</Text></View>
                <View style={styles.distItem}><Text style={styles.distValue}>{estMinutes}</Text><Text style={styles.distLabel}>Est. Minutes</Text></View>
                <View style={styles.distItem}><Text style={styles.distValue}>{halvesPlayed}</Text><Text style={styles.distLabel}>Halves Played</Text></View>
              </View>
              <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' as const, textAlign: 'center' as const, marginTop: 10 }}>Half length: {halfLength} min</Text>
            </View>
          );
        }
        return null;
      })()}

      <View style={styles.halvesRow}>
        <View style={styles.halfCard}>
          <Text style={styles.halfCardTitle}>1st Half</Text>
          <Text style={styles.halfStat}>Saves: {keeper.firstHalf.saves}</Text>
          <Text style={styles.halfStat}>GA: {keeper.firstHalf.goalsAgainst}</Text>
          <Text style={styles.halfStat}>Shots on Target: {getShotsFaced(keeper.firstHalf.saves, keeper.firstHalf.goalsAgainst)}</Text>
          <Text style={[styles.halfPct, { color: h1Pct === null ? colors.textMuted : h1Pct >= 50 ? colors.primary : colors.warning }]}>SV%: {h1Pct !== null ? `${h1Pct}%` : '—'}</Text>
          <View style={styles.halfDistRow}>
            <Text style={styles.halfDistItem}>Cr: {keeper.firstHalf.distribution.handledCrosses}</Text>
            <Text style={styles.halfDistItem}>Pu: {keeper.firstHalf.distribution.punts}</Text>
            <Text style={styles.halfDistItem}>Th: {keeper.firstHalf.distribution.throwouts}</Text>
            <Text style={styles.halfDistItem}>Dr: {keeper.firstHalf.distribution.drives}</Text>
            <Text style={styles.halfDistItem}>DB: {keeper.firstHalf.distribution.dropBacks}</Text>
          </View>
        </View>
        <View style={styles.halfCard}>
          <Text style={styles.halfCardTitle}>2nd Half</Text>
          <Text style={styles.halfStat}>Saves: {keeper.secondHalf.saves}</Text>
          <Text style={styles.halfStat}>GA: {keeper.secondHalf.goalsAgainst}</Text>
          <Text style={styles.halfStat}>Shots on Target: {getShotsFaced(keeper.secondHalf.saves, keeper.secondHalf.goalsAgainst)}</Text>
          <Text style={[styles.halfPct, { color: h2Pct === null ? colors.textMuted : h2Pct >= 50 ? colors.primary : colors.warning }]}>SV%: {h2Pct !== null ? `${h2Pct}%` : '—'}</Text>
          <View style={styles.halfDistRow}>
            <Text style={styles.halfDistItem}>Cr: {keeper.secondHalf.distribution.handledCrosses}</Text>
            <Text style={styles.halfDistItem}>Pu: {keeper.secondHalf.distribution.punts}</Text>
            <Text style={styles.halfDistItem}>Th: {keeper.secondHalf.distribution.throwouts}</Text>
            <Text style={styles.halfDistItem}>Dr: {keeper.secondHalf.distribution.drives}</Text>
            <Text style={styles.halfDistItem}>DB: {keeper.secondHalf.distribution.dropBacks}</Text>
          </View>
        </View>
      </View>

      <View style={styles.distSection}>
        <Text style={styles.distTitle}>Total Distribution</Text>
        <View style={styles.distGrid}>
          <View style={styles.distItem}><Text style={styles.distValue}>{getTotalDistribution(keeper).handledCrosses}</Text><Text style={styles.distLabel}>Crosses / Int.</Text></View>
          <View style={styles.distItem}><Text style={styles.distValue}>{getTotalDistribution(keeper).punts}</Text><Text style={styles.distLabel}>Punts</Text></View>
          <View style={styles.distItem}><Text style={styles.distValue}>{getTotalDistribution(keeper).throwouts}</Text><Text style={styles.distLabel}>Throwouts / Rollouts</Text></View>
          <View style={styles.distItem}><Text style={styles.distValue}>{getTotalDistribution(keeper).drives}</Text><Text style={styles.distLabel}>Drives</Text></View>
          <View style={styles.distItem}><Text style={styles.distValue}>{getTotalDistribution(keeper).dropBacks}</Text><Text style={styles.distLabel}>Drop Backs</Text></View>
        </View>
      </View>

      <View style={[styles.distSection, { marginTop: 14 }]}>
        <Text style={styles.distTitle}>Penalties</Text>
        <View style={styles.distGrid}>
          <View style={styles.distItem}><Text style={[styles.distValue, { color: colors.primary }]}>{totalPen.penaltiesSaved}</Text><Text style={styles.distLabel}>PK Saved</Text></View>
          <View style={styles.distItem}><Text style={[styles.distValue, { color: colors.danger }]}>{totalPen.penaltyGoals}</Text><Text style={styles.distLabel}>PK Goal</Text></View>
          <View style={styles.distItem}><Text style={[styles.distValue, { color: colors.textMuted }]}>{totalPen.penaltiesMissed}</Text><Text style={styles.distLabel}>PK Missed</Text></View>
          <View style={styles.distItem}><Text style={[styles.distValue, { color: colors.warning }]}>{totalPen.yellowCards}</Text><Text style={styles.distLabel}>Yellow</Text></View>
          <View style={styles.distItem}><Text style={[styles.distValue, { color: colors.danger }]}>{totalPen.redCards}</Text><Text style={styles.distLabel}>Red</Text></View>
        </View>
        {(() => {
          const pkPct = getPkSavePercentage(keeper);
          if (pkPct === null) return null;
          const onTarget = totalPen.penaltiesSaved + totalPen.penaltyGoals;
          return (
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' as const, textAlign: 'center' as const, marginTop: 10 }}>
              PK Save %: {pkPct}% ({totalPen.penaltiesSaved} of {onTarget} on target)
            </Text>
          );
        })()}
        {(isLegacyPenaltyData(keeper.firstHalf?.penalties as any) || isLegacyPenaltyData(keeper.secondHalf?.penalties as any)) && (
          <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' as const, textAlign: 'center' as const, marginTop: 10 }}>
            Penalty data was recorded before the Missed/Goal distinction was added. Edit if needed.
          </Text>
        )}
      </View>

      {keeper.shootout && (keeper.shootout.saves > 0 || keeper.shootout.goalsAgainst > 0) ? (
        <View style={[styles.distSection, { marginTop: 14 }]}>
          <Text style={styles.distTitle}>Shootout</Text>
          <View style={styles.distGrid}>
            <View style={styles.distItem}><Text style={[styles.distValue, { color: colors.primary }]}>{keeper.shootout.saves}</Text><Text style={styles.distLabel}>Saves</Text></View>
            <View style={styles.distItem}><Text style={[styles.distValue, { color: colors.danger }]}>{keeper.shootout.goalsAgainst}</Text><Text style={styles.distLabel}>Goals Against</Text></View>
            <View style={styles.distItem}><Text style={[styles.distValue, { color: '#3B82F6' }]}>{getShootoutShotsFaced(keeper.shootout)}</Text><Text style={styles.distLabel}>Shots on Target</Text></View>
          </View>
        </View>
      ) : null}

      {keeper.notes ? (
        <View style={styles.notesBlock}>
          <Text style={styles.notesBlockTitle}>Notes</Text>
          <Text style={styles.notesBlockText}>{keeper.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { getGame } = useGames();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const game = useMemo(() => getGame(id || ''), [getGame, id]);
  const styles = useMemo(() => createDetailStyles(colors), [colors]);
  const { updateGame } = useGames();
  const [editTimesVisible, setEditTimesVisible] = useState<boolean>(false);

  const handleShareText = useCallback(async () => {
    if (!game) return;
    const text = formatGameAsText(game);
    if (Platform.OS === 'web') {
      try { await navigator.clipboard.writeText(text); Alert.alert('Copied', 'Game stats copied to clipboard.'); } catch { Alert.alert('Export', text); }
    } else { await Share.share({ message: text, title: 'Goalkeeper Stats' }); }
  }, [game]);

  const handleEdit = useCallback(() => {
    if (!game) return;
    router.push({ pathname: '/game-tracking', params: { gameId: game.id, eventName: game.setup.eventName, date: game.setup.date, gameName: game.setup.gameName, keeperSelection: game.setup.keeperSelection } });
  }, [game, router]);

  const goBackSafely = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleMoveComplete = useCallback(() => {
    setShowMoveModal(false);
    goBackSafely();
  }, [goBackSafely]);

  const handleShareCSV = useCallback(async () => {
    if (!game) return;
    const csv = formatGameAsCSV(game);
    if (Platform.OS === 'web') {
      try { await navigator.clipboard.writeText(csv); Alert.alert('Copied', 'CSV data copied to clipboard.'); } catch { Alert.alert('Export', csv); }
    } else { await Share.share({ message: csv, title: 'Goalkeeper Stats CSV' }); }
  }, [game]);

  const handleShareImage = useCallback(async () => {
    if (!game) return;
    const text = formatGameAsText(game);
    if (Platform.OS === 'web') {
      try { await navigator.clipboard.writeText(text); Alert.alert('Copied', 'Stats copied to clipboard.'); } catch { Alert.alert('Export', text); }
    } else { await Share.share({ message: text, title: 'Goalkeeper Stats' }); }
  }, [game]);

  if (!game) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: 'Game Detail', headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Text style={styles.emptyText}>Game not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'Game Detail',
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' as const, letterSpacing: -0.3 },
        headerRight: () => (
          <TouchableOpacity
            testID="game-detail-menu"
            onPress={() => setShowMenu(prev => !prev)}
            style={{ padding: 6 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreVertical size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ),
      }} />
      {showMenu && (
        <>
          <Pressable
            testID="game-detail-menu-overlay"
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowMenu(false)}
          />
          <View style={styles.headerMenu}>
            <TouchableOpacity
              testID="game-detail-move-btn"
              style={styles.headerMenuItem}
              onPress={() => { setShowMenu(false); setShowMoveModal(true); }}
              activeOpacity={0.7}
            >
              <ArrowRightLeft size={16} color={colors.primary} />
              <Text style={styles.headerMenuText}>Move to Another Goalkeeper</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.gameInfoCard}>
          <View style={styles.gameInfoRow}><Calendar size={14} color={colors.textMuted} /><Text style={styles.gameInfoText}>{game.setup.date}</Text></View>
          <Text style={styles.gameInfoEvent}>{game.setup.eventName}</Text>
          <View style={styles.gameInfoRow}><Trophy size={14} color={colors.primary} /><Text style={styles.gameInfoGame}>vs {game.setup.gameName}</Text></View>
          {(() => {
            const k = game.homeKeeper ?? game.awayKeeper;
            if (!k) return null;
            const mp = getMinutesPlayed(game, k);
            const breakdown = (mp.firstMinutes !== undefined && mp.secondMinutes !== undefined)
              ? `${mp.minutes} min (1st: ${mp.firstMinutes} · 2nd: ${mp.secondMinutes})`
              : mp.estimated
                ? `${mp.minutes} min (estimated)`
                : `${mp.minutes} min`;
            return (
              <TouchableOpacity
                testID="minutes-played-row"
                style={styles.minutesRow}
                onPress={() => setEditTimesVisible(true)}
                activeOpacity={0.7}
              >
                <Clock size={14} color={colors.textMuted} />
                <Text style={styles.minutesLabel}>Minutes Played</Text>
                <Text style={styles.minutesValue}>{breakdown}</Text>
                <Pencil size={12} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })()}
        </View>

        {game.homeKeeper ? <KeeperDetailBlock keeper={game.homeKeeper} label="HOME" color={colors.cardHome} colors={colors} game={game} /> : null}
        {game.awayKeeper ? <KeeperDetailBlock keeper={game.awayKeeper} label="AWAY" color={colors.cardAway} colors={colors} game={game} /> : null}

        {game.finalScore ? (
          <View style={styles.finalScoreCard}>
            <Text style={styles.finalScoreTitle}>Final Score</Text>
            <View style={styles.finalScoreRow}>
              <View style={styles.finalScoreTeam}><Text style={styles.finalScoreLabel}>HOME</Text><Text style={[styles.finalScoreValue, { color: colors.cardHome }]}>{game.finalScore.home}</Text></View>
              <Text style={styles.finalScoreDash}>—</Text>
              <View style={styles.finalScoreTeam}><Text style={styles.finalScoreLabel}>AWAY</Text><Text style={[styles.finalScoreValue, { color: colors.cardAway }]}>{game.finalScore.away}</Text></View>
            </View>
          </View>
        ) : null}

        <TouchableOpacity testID="edit-game-button" style={styles.editButton} onPress={handleEdit} activeOpacity={0.8}>
          <Pencil size={18} color={colors.white} /><Text style={styles.editButtonText}>Edit Game</Text>
        </TouchableOpacity>

        <View style={styles.exportSection}>
          <Text style={styles.exportTitle}>Export Stats</Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity style={styles.exportButton} onPress={handleShareText} activeOpacity={0.7}><FileText size={18} color={colors.primary} /><Text style={styles.exportButtonText}>Share as Text</Text><Share2 size={14} color={colors.textMuted} /></TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={handleShareCSV} activeOpacity={0.7}><FileSpreadsheet size={18} color={colors.accent} /><Text style={styles.exportButtonText}>Share as CSV</Text><Share2 size={14} color={colors.textMuted} /></TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={handleShareImage} activeOpacity={0.7}>
              <Share2 size={18} color="#8B5CF6" />
              <Text style={styles.exportButtonText}>Share as Text (Alt)</Text><Share2 size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <MoveGameModal
        visible={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        game={game}
        onMoveComplete={handleMoveComplete}
      />

      <HalfTimesEditModal
        visible={editTimesVisible}
        firstHalfSeconds={game.firstHalfSeconds ?? 0}
        secondHalfSeconds={game.secondHalfSeconds ?? 0}
        onCancel={() => setEditTimesVisible(false)}
        onSave={(f, s) => {
          updateGame({ ...game, firstHalfSeconds: f, secondHalfSeconds: s });
          setEditTimesVisible(false);
        }}
      />
    </View>
  );
}

function createDetailStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: c.textSecondary, fontSize: fontSize.subtitle },
    scrollContent: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 60 },
    gameInfoCard: { backgroundColor: c.surface, borderRadius: 14, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: c.border },
    gameInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    gameInfoText: { fontSize: fontSize.body2, color: c.textMuted, fontWeight: '500' as const },
    gameInfoEvent: { fontSize: fontSize.h2, fontWeight: '800' as const, color: c.text, marginVertical: 6 },
    gameInfoGame: { fontSize: fontSize.body, color: c.textSecondary, fontWeight: '600' as const },
    keeperBlock: { marginBottom: 20 },
    keeperHeader: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginBottom: 14 },
    keeperHeaderText: { color: c.white, fontSize: fontSize.body2, fontWeight: '800' as const, letterSpacing: 1.5, textAlign: 'center' },
    keeperInfoRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    keeperInfoItem: { flex: 1, backgroundColor: c.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: c.border },
    infoLabel: { fontSize: fontSize.xs, fontWeight: '600' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    infoValue: { fontSize: fontSize.bodyLg, fontWeight: '600' as const, color: c.text },
    overallRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    overallStat: { flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    overallStatSecondary: { backgroundColor: c.surfaceLight, borderStyle: 'dashed' as const },
    ropExplainer: { fontSize: fontSize.xs, color: c.textMuted, fontStyle: 'italic' as const, textAlign: 'center' as const, marginTop: -6, marginBottom: 14 },
    overallValue: { fontSize: fontSize.h1, fontWeight: '800' as const },
    overallLabel: { fontSize: fontSize.xs, fontWeight: '600' as const, color: c.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    halvesRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    halfCard: { flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border },
    halfCardTitle: { fontSize: fontSize.caption, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' },
    halfStat: { fontSize: fontSize.body, color: c.text, fontWeight: '500' as const, marginBottom: 3 },
    halfPct: { fontSize: fontSize.bodyLg, fontWeight: '700' as const, marginTop: 4 },
    distSection: { backgroundColor: c.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.border },
    distTitle: { fontSize: fontSize.caption, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, textAlign: 'center' },
    distGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    distItem: { alignItems: 'center' },
    distValue: { fontSize: fontSize.h2, fontWeight: '700' as const, color: c.text },
    distLabel: { fontSize: fontSize.xs, color: c.textMuted, fontWeight: '500' as const, marginTop: 2 },
    halfDistRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.border },
    halfDistItem: { fontSize: fontSize.sm, color: c.textMuted, fontWeight: '500' as const },
    secondHalfKeeperBlock: { marginBottom: 14 },
    secondHalfKeeperTitle: { fontSize: fontSize.sm, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    notesBlock: { backgroundColor: c.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.border, marginTop: 14 },
    notesBlockTitle: { fontSize: fontSize.caption, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    notesBlockText: { fontSize: fontSize.body, color: c.text, fontWeight: '500' as const, lineHeight: 20 },
    finalScoreCard: { backgroundColor: c.surfaceLight, borderRadius: 14, padding: 20, marginBottom: 20, borderWidth: 1.5, borderColor: c.border },
    finalScoreTitle: { fontSize: fontSize.body, fontWeight: '700' as const, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, textAlign: 'center' },
    finalScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
    finalScoreTeam: { alignItems: 'center', flex: 1 },
    finalScoreLabel: { fontSize: fontSize.sm, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    finalScoreValue: { fontSize: fontSize.display, fontWeight: '800' as const },
    finalScoreDash: { fontSize: fontSize.display2, fontWeight: '300' as const, color: c.textMuted },
    exportSection: { marginTop: 8 },
    exportTitle: { fontSize: fontSize.body, fontWeight: '700' as const, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    exportButtons: { gap: 10 },
    exportButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.border },
    exportButtonText: { flex: 1, fontSize: fontSize.bodyLg, fontWeight: '600' as const, color: c.text },
    editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.primaryDark, borderRadius: 14, paddingVertical: 16, marginBottom: 20 },
    editButtonText: { color: c.white, fontSize: fontSize.h4, fontWeight: '700' as const },
    minutesRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    minutesLabel: { fontSize: fontSize.body2, color: c.textSecondary, fontWeight: '600' as const },
    minutesValue: { flex: 1, textAlign: 'right' as const, fontSize: fontSize.body2, color: c.text, fontWeight: '700' as const },
    headerMenu: { position: 'absolute' as const, top: 0, right: 12, zIndex: 100, backgroundColor: c.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: c.border, overflow: 'hidden', minWidth: 240 },
    headerMenuItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    headerMenuText: { fontSize: fontSize.body, fontWeight: '600' as const, color: c.text },
    offscreenContainer: { position: 'absolute' as const, left: -9999, top: -9999, opacity: 0 },
  });
}
