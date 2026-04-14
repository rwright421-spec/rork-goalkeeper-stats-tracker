import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';

function ShimmerBlock({ width, height, borderRadius = 8, style }: { width: number | string; height: number; borderRadius?: number; style?: object }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const colors = useColors();

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function GameCardSkeleton() {
  const colors = useColors();
  const s = skeletonStyles(colors);

  return (
    <View style={s.card} testID="game-card-skeleton">
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <ShimmerBlock width={80} height={12} borderRadius={4} />
          <ShimmerBlock width={180} height={16} borderRadius={5} style={{ marginTop: 8 }} />
          <ShimmerBlock width={120} height={13} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
        <ShimmerBlock width={20} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

export function ProfileCardSkeleton() {
  const colors = useColors();
  const s = skeletonStyles(colors);

  return (
    <View style={s.profileCard} testID="profile-card-skeleton">
      <ShimmerBlock width={52} height={52} borderRadius={15} />
      <View style={s.profileInfo}>
        <ShimmerBlock width={140} height={18} borderRadius={5} />
        <ShimmerBlock width={100} height={13} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <ShimmerBlock width={64} height={28} borderRadius={8} />
    </View>
  );
}

export function QuickStatsSkeleton() {
  const colors = useColors();
  const s = skeletonStyles(colors);

  return (
    <View style={s.quickStatsRow} testID="quick-stats-skeleton">
      {[0, 1, 2].map((i) => (
        <View key={i} style={s.quickStatCard}>
          <ShimmerBlock width={40} height={24} borderRadius={6} />
          <ShimmerBlock width={32} height={10} borderRadius={3} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

export function StatBlockSkeleton() {
  const colors = useColors();
  const s = skeletonStyles(colors);

  return (
    <View style={s.statBlockWrap} testID="stat-block-skeleton">
      <View style={s.quickStatsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={s.statTopCard}>
            <ShimmerBlock width={36} height={36} borderRadius={10} />
            <ShimmerBlock width={36} height={22} borderRadius={5} style={{ marginTop: 8 }} />
            <ShimmerBlock width={48} height={10} borderRadius={3} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
      <View style={s.statDetailCard}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={s.statDetailRow}>
            <ShimmerBlock width={8} height={8} borderRadius={4} />
            <ShimmerBlock width={120} height={14} borderRadius={4} style={{ marginLeft: 10 }} />
            <View style={{ flex: 1 }} />
            <ShimmerBlock width={32} height={18} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function TeamListSkeleton({ count = 2 }: { count?: number }) {
  const colors = useColors();
  const s = skeletonStyles(colors);

  return (
    <View style={s.teamList} testID="team-list-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[s.teamRow, i < count - 1 && s.teamRowBorder]}>
          <ShimmerBlock width={38} height={38} borderRadius={10} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <ShimmerBlock width={120} height={15} borderRadius={4} />
            <ShimmerBlock width={60} height={11} borderRadius={3} style={{ marginTop: 4 }} />
          </View>
          <ShimmerBlock width={16} height={16} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View testID="dashboard-skeleton">
      <ProfileCardSkeleton />
      <QuickStatsSkeleton />
      <TeamListSkeleton />
    </View>
  );
}

export function GameListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View testID="game-list-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function StatsScreenSkeleton() {
  return (
    <View testID="stats-screen-skeleton">
      <StatBlockSkeleton />
    </View>
  );
}

function skeletonStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      borderLeftWidth: 3,
      borderLeftColor: c.border,
      marginBottom: 12,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    cardHeaderLeft: {
      flex: 1,
    },
    profileCard: {
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
    profileInfo: {
      flex: 1,
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
    statBlockWrap: {
      gap: 12,
    },
    statTopCard: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    statDetailCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      gap: 12,
    },
    statDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    teamList: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      marginBottom: 24,
    },
    teamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    teamRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
  });
}
