import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Check, Palette, Users, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, useColors } from '@/contexts/ThemeContext';
import { ThemeName, themeOptions, ThemeColors } from '@/constants/themes';
import { useOpponents } from '@/contexts/OpponentContext';

export default function SettingsScreen() {
  const { themeName, setTheme } = useTheme();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { opponents, removeOpponent } = useOpponents();

  const handleThemeSelect = useCallback((key: ThemeName) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTheme(key);
    console.log('[Settings] Theme changed to:', key);
  }, [setTheme]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleRemoveOpponent = useCallback((name: string) => {
    Alert.alert(
      'Remove Opponent',
      `Remove "${name}" from the autocomplete list? This won't affect any saved games.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeOpponent(name);
          },
        },
      ]
    );
  }, [removeOpponent]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Palette size={16} color={colors.textMuted} />
          <Text style={styles.sectionHeaderText}>Appearance</Text>
        </View>

        <View style={styles.themeGrid}>
          {themeOptions.map((option) => {
            const isActive = themeName === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                testID={`theme-${option.key}`}
                style={[
                  styles.themeCard,
                  isActive && styles.themeCardActive,
                ]}
                onPress={() => handleThemeSelect(option.key)}
                activeOpacity={0.7}
              >
                <View style={styles.themePreview}>
                  <View style={[styles.previewBg, { backgroundColor: option.preview[0] }]}>
                    <View style={[styles.previewSurface, { backgroundColor: option.preview[1] }]}>
                      <View style={[styles.previewAccentDot, { backgroundColor: option.preview[2] }]} />
                      <View style={[styles.previewTextLine, { backgroundColor: option.preview[3] }]} />
                      <View style={[styles.previewTextLineShort, { backgroundColor: option.preview[3], opacity: 0.4 }]} />
                    </View>
                  </View>
                </View>
                <View style={styles.themeInfo}>
                  <Text style={[styles.themeLabel, isActive && styles.themeLabelActive]}>
                    {option.label}
                  </Text>
                  {isActive && (
                    <View style={styles.checkBadge}>
                      <Check size={14} color={colors.primary} strokeWidth={3} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Users size={16} color={colors.textMuted} />
          <Text style={styles.sectionHeaderText}>Saved Opponents</Text>
          {opponents.length > 0 && (
            <Text style={styles.opponentCount}>{opponents.length}</Text>
          )}
        </View>
        <Text style={styles.sectionSubtitle}>Opponents are saved automatically when you create a game. Edit or remove them here.</Text>

        {opponents.length === 0 ? (
          <View style={styles.opponentEmptyState}>
            <Text style={styles.opponentEmptyText}>No opponents saved yet. Opponents are automatically saved when you create games.</Text>
          </View>
        ) : (
          <View style={styles.opponentList}>
            {opponents.map((name) => (
              <View key={name} style={styles.opponentRow}>
                <Text style={styles.opponentName} numberOfLines={1}>{name}</Text>
                <TouchableOpacity
                  testID={`delete-opponent-${name}`}
                  style={styles.opponentDeleteBtn}
                  onPress={() => handleRemoveOpponent(name)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 60 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    sectionHeaderText: { fontSize: 13, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
    opponentCount: { fontSize: 12, fontWeight: '600' as const, color: c.textMuted, backgroundColor: c.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
    sectionSubtitle: { fontSize: 13, color: c.textMuted, lineHeight: 18, marginTop: -8, marginBottom: 14 },
    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    themeCard: { width: '47%' as unknown as number, flexGrow: 1, backgroundColor: c.surface, borderRadius: 14, borderWidth: 2, borderColor: c.border, overflow: 'hidden' },
    themeCardActive: { borderColor: c.primary, borderWidth: 2 },
    themePreview: { padding: 10, paddingBottom: 8 },
    previewBg: { borderRadius: 8, padding: 8, height: 72 },
    previewSurface: { flex: 1, borderRadius: 6, padding: 8, justifyContent: 'center', gap: 5 },
    previewAccentDot: { width: 16, height: 16, borderRadius: 8 },
    previewTextLine: { height: 5, borderRadius: 2.5, width: '70%' },
    previewTextLineShort: { height: 4, borderRadius: 2, width: '45%' },
    themeInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border },
    themeLabel: { fontSize: 15, fontWeight: '600' as const, color: c.textSecondary },
    themeLabelActive: { color: c.primary, fontWeight: '700' as const },
    checkBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.primary },
    opponentEmptyState: { backgroundColor: c.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: c.border },
    opponentEmptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
    opponentList: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden' as const },
    opponentRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    opponentName: { fontSize: 15, fontWeight: '500' as const, color: c.text, flex: 1, marginRight: 12 },
    opponentDeleteBtn: { padding: 6 },
  });
}
