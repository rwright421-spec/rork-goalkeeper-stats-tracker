import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { RefreshCw, Check, WifiOff } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useSyncStatus } from '@/contexts/SyncStatusContext';
import { ThemeColors } from '@/constants/themes';
import { fontSize } from '@/constants/typography';

export default React.memo(function SyncStatusBanner() {
  const colors = useColors();
  const { syncStatus, showSuccess, manualRetry } = useSyncStatus();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinRef = useRef<Animated.CompositeAnimation | null>(null);

  const showBanner = syncStatus === 'error' || syncStatus === 'offline';
  const showSuccessBanner = showSuccess;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showBanner ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showBanner, slideAnim]);

  useEffect(() => {
    if (showSuccessBanner) {
      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(successAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [showSuccessBanner, successAnim]);

  useEffect(() => {
    if (syncStatus === 'syncing') {
      spinAnim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinRef.current = loop;
      loop.start();
    } else {
      spinRef.current?.stop();
      spinRef.current = null;
    }
  }, [syncStatus, spinAnim]);

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleRetry = useCallback(() => {
    void manualRetry();
  }, [manualRetry]);

  if (!showBanner && !showSuccessBanner && syncStatus !== 'syncing') {
    return null;
  }

  return (
    <View>
      {syncStatus === 'syncing' && (
        <View style={[bannerStyles.container, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
          <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
            <RefreshCw size={14} color={colors.textMuted} />
          </Animated.View>
          <Text style={[bannerStyles.text, { color: colors.textMuted }]}>Syncing...</Text>
        </View>
      )}

      {showBanner && (
        <Animated.View
          style={[
            bannerStyles.container,
            {
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              borderColor: 'rgba(245, 158, 11, 0.25)',
              opacity: slideAnim,
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0],
                }),
              }],
            },
          ]}
        >
          {syncStatus === 'offline' ? (
            <WifiOff size={14} color="#F59E0B" />
          ) : (
            <RefreshCw size={14} color="#F59E0B" />
          )}
          <Text style={[bannerStyles.text, { color: '#F59E0B', flex: 1 }]}>
            {syncStatus === 'offline' ? 'You are offline' : 'Sync failed'}
          </Text>
          <TouchableOpacity
            testID="sync-retry-btn"
            onPress={handleRetry}
            style={[bannerStyles.retryBtn, { backgroundColor: 'rgba(245, 158, 11, 0.18)' }]}
            activeOpacity={0.7}
          >
            <Text style={[bannerStyles.retryText, { color: '#F59E0B' }]}>Tap to retry</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {showSuccessBanner && (
        <Animated.View
          style={[
            bannerStyles.container,
            {
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderColor: 'rgba(16, 185, 129, 0.25)',
              opacity: successAnim,
              transform: [{
                translateY: successAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              }],
            },
          ]}
        >
          <Check size={14} color={colors.primary} />
          <Text style={[bannerStyles.text, { color: colors.primary }]}>Synced</Text>
        </Animated.View>
      )}
    </View>
  );
});

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  text: {
    fontSize: fontSize.body2,
    fontWeight: '600' as const,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  retryText: {
    fontSize: fontSize.caption,
    fontWeight: '700' as const,
  },
});
