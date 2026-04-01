import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { ChevronDown, ChevronUp, Calendar, Trophy, Trash2, MoreVertical, ArrowRightLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { SavedGame, KeeperData, getOverallSavePercentage, getTotalSaves, getTotalGoalsAgainst, getTotalDistribution } from '@/types/game';

interface GameCardProps {
  game: SavedGame;
  onPress: () => void;
  onDelete: () => void;
  onMove?: () => void;
}

function KeeperSummary({ keeper, label, color, colors }: { keeper: KeeperData; label: string; color: string; colors: ThemeColors }) {
  const savePct = getOverallSavePercentage(keeper);
  const totalSaves = getTotalSaves(keeper);
  const totalGA = getTotalGoalsAgainst(keeper);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.keeperSummary}>
      <View style={[styles.keeperDot, { backgroundColor: color }]} />
      <View style={styles.keeperInfo}>
        <Text style={styles.keeperLabel}>{label}</Text>
        <Text style={styles.keeperName}>{keeper.name || 'Unnamed'}</Text>
        <Text style={styles.keeperTeam}>{keeper.teamName || '—'}</Text>
      </View>
      <View style={styles.keeperStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalSaves}</Text>
          <Text style={styles.statLabel}>SVS</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.danger }]}>{totalGA}</Text>
          <Text style={styles.statLabel}>GA</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: savePct >= 50 ? colors.primary : colors.warning }]}>{savePct}%</Text>
          <Text style={styles.statLabel}>SV%</Text>
        </View>
      </View>
    </View>
  );
}

function DistributionRow({ keeper, colors }: { keeper: KeeperData; colors: ThemeColors }) {
  const dist = getTotalDistribution(keeper);
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.distRow}>
      <View style={styles.distItem}><Text style={styles.distValue}>{dist.handledCrosses}</Text><Text style={styles.distLabel}>Crosses</Text></View>
      <View style={styles.distItem}><Text style={styles.distValue}>{dist.punts}</Text><Text style={styles.distLabel}>Punts</Text></View>
      <View style={styles.distItem}><Text style={styles.distValue}>{dist.throwouts}</Text><Text style={styles.distLabel}>Throws</Text></View>
      <View style={styles.distItem}><Text style={styles.distValue}>{dist.drives}</Text><Text style={styles.distLabel}>Drives</Text></View>
    </View>
  );
}

export default React.memo(function GameCard({ game, onPress, onDelete, onMove }: GameCardProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const toggleExpand = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = expanded ? 0 : 1;
    Animated.timing(heightAnim, { toValue, duration: 250, useNativeDriver: false }).start();
    setExpanded(!expanded);
  }, [expanded, heightAnim]);

  const maxHeight = heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 600] });

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={toggleExpand} activeOpacity={0.7}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.dateRow}><Calendar size={13} color={colors.textMuted} /><Text style={styles.dateText}>{game.setup.date}</Text></View>
          <Text style={styles.eventName}>{game.setup.eventName}</Text>
          <View style={styles.gameRow}><Trophy size={12} color={colors.primary} /><Text style={styles.gameName}>{game.setup.gameName}</Text></View>
        </View>
        <View style={styles.cardHeaderRight}>
          <TouchableOpacity
            testID="game-card-menu"
            onPress={(e) => { e.stopPropagation?.(); setMenuOpen(!menuOpen); }}
            style={styles.menuBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={18} color={colors.textMuted} />
          </TouchableOpacity>
          {expanded ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
        </View>
      </TouchableOpacity>

      {menuOpen && (
        <View style={styles.menuDropdown}>
          {onMove && (
            <TouchableOpacity
              testID="game-card-move"
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); onMove(); }}
              activeOpacity={0.7}
            >
              <ArrowRightLeft size={15} color={colors.primary} />
              <Text style={styles.menuItemText}>Move to Another Goalkeeper</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID="game-card-delete-menu"
            style={styles.menuItem}
            onPress={() => { setMenuOpen(false); onDelete(); }}
            activeOpacity={0.7}
          >
            <Trash2 size={15} color={colors.danger} />
            <Text style={[styles.menuItemText, { color: colors.danger }]}>Delete Game</Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.View style={[styles.expandedContent, { maxHeight, overflow: 'hidden' }]}>
        <View style={styles.expandedInner}>
          {game.homeKeeper ? (
            <View style={styles.keeperBlock}>
              <KeeperSummary keeper={game.homeKeeper} label="HOME" color={colors.cardHome} colors={colors} />
              <View style={styles.halfRow}>
                <View style={styles.halfBlock}><Text style={styles.halfTitle}>1H</Text><Text style={styles.halfStat}>{game.homeKeeper.firstHalf.saves}sv / {game.homeKeeper.firstHalf.goalsAgainst}ga</Text></View>
                <View style={styles.halfBlock}><Text style={styles.halfTitle}>2H</Text><Text style={styles.halfStat}>{game.homeKeeper.secondHalf.saves}sv / {game.homeKeeper.secondHalf.goalsAgainst}ga</Text></View>
              </View>
              <DistributionRow keeper={game.homeKeeper} colors={colors} />
            </View>
          ) : null}

          {game.awayKeeper ? (
            <View style={styles.keeperBlock}>
              <KeeperSummary keeper={game.awayKeeper} label="AWAY" color={colors.cardAway} colors={colors} />
              <View style={styles.halfRow}>
                <View style={styles.halfBlock}><Text style={styles.halfTitle}>1H</Text><Text style={styles.halfStat}>{game.awayKeeper.firstHalf.saves}sv / {game.awayKeeper.firstHalf.goalsAgainst}ga</Text></View>
                <View style={styles.halfBlock}><Text style={styles.halfTitle}>2H</Text><Text style={styles.halfStat}>{game.awayKeeper.secondHalf.saves}sv / {game.awayKeeper.secondHalf.goalsAgainst}ga</Text></View>
              </View>
              <DistributionRow keeper={game.awayKeeper} colors={colors} />
            </View>
          ) : null}

          {game.finalScore ? (
            <View style={styles.scoreSection}>
              <Text style={styles.scoreSectionTitle}>Final Score</Text>
              <View style={styles.scoreRow}>
                <View style={styles.scoreTeam}><Text style={styles.scoreLabel}>HOME</Text><Text style={[styles.scoreValue, { color: colors.cardHome }]}>{game.finalScore.home}</Text></View>
                <Text style={styles.scoreDash}>—</Text>
                <View style={styles.scoreTeam}><Text style={styles.scoreLabel}>AWAY</Text><Text style={[styles.scoreValue, { color: colors.cardAway }]}>{game.finalScore.away}</Text></View>
              </View>
            </View>
          ) : null}

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.viewButton} onPress={onPress} activeOpacity={0.7}><Text style={styles.viewButtonText}>View Full Details</Text></TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete} activeOpacity={0.7}><Trash2 size={16} color={colors.danger} /></TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
});

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, borderLeftWidth: 3, borderLeftColor: c.primary, marginBottom: 12, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    cardHeaderLeft: { flex: 1 },
    cardHeaderRight: { paddingLeft: 12 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    dateText: { fontSize: 12, color: c.textMuted, fontWeight: '500' as const },
    eventName: { fontSize: 16, fontWeight: '700' as const, color: c.text, marginBottom: 4 },
    gameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    gameName: { fontSize: 13, color: c.textSecondary, fontWeight: '500' as const },
    expandedContent: {},
    expandedInner: { paddingHorizontal: 16, paddingBottom: 16 },
    keeperBlock: { marginBottom: 12 },
    keeperSummary: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    keeperDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    keeperInfo: { flex: 1 },
    keeperLabel: { fontSize: 10, fontWeight: '700' as const, color: c.textMuted, letterSpacing: 1 },
    keeperName: { fontSize: 14, fontWeight: '600' as const, color: c.text },
    keeperTeam: { fontSize: 12, color: c.textSecondary },
    keeperStats: { flexDirection: 'row', gap: 16 },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 16, fontWeight: '700' as const, color: c.text },
    statLabel: { fontSize: 9, color: c.textMuted, fontWeight: '600' as const, letterSpacing: 0.5 },
    halfRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    halfBlock: { flex: 1, backgroundColor: c.surfaceLight, borderRadius: 8, padding: 8, alignItems: 'center' },
    halfTitle: { fontSize: 10, fontWeight: '700' as const, color: c.textMuted, letterSpacing: 0.5, marginBottom: 2 },
    halfStat: { fontSize: 13, color: c.text, fontWeight: '600' as const },
    distRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: c.surfaceLight, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4 },
    distItem: { alignItems: 'center' },
    distValue: { fontSize: 14, fontWeight: '700' as const, color: c.text },
    distLabel: { fontSize: 9, color: c.textMuted, fontWeight: '500' as const },
    scoreSection: { backgroundColor: c.surfaceLight, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    scoreSectionTitle: { fontSize: 10, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
    scoreTeam: { alignItems: 'center', flex: 1 },
    scoreLabel: { fontSize: 9, fontWeight: '700' as const, color: c.textMuted, letterSpacing: 0.5, marginBottom: 2 },
    scoreValue: { fontSize: 24, fontWeight: '800' as const },
    scoreDash: { fontSize: 18, fontWeight: '300' as const, color: c.textMuted },
    menuBtn: { padding: 4, marginRight: 6 },
    menuDropdown: { backgroundColor: c.surfaceLight, marginHorizontal: 12, marginBottom: 4, borderRadius: 10, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    menuItemText: { fontSize: 14, fontWeight: '600' as const, color: c.text },
    cardActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    viewButton: { flex: 1, backgroundColor: c.primaryGlow, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
    viewButtonText: { color: c.primary, fontWeight: '700' as const, fontSize: 13 },
    deleteButton: { backgroundColor: c.dangerGlow, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(248, 81, 73, 0.3)' },
  });
}
