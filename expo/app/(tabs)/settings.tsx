import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, Platform, ActivityIndicator } from 'react-native';
import { Check, Palette, Users, Trash2, MessageSquare, ExternalLink, Upload, Download, Database, RefreshCw, Eye, AlertTriangle, Info, ChevronDown, ChevronUp, Copy } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as Clipboard from 'expo-clipboard';
import { useTheme, useColors } from '@/contexts/ThemeContext';
import { ThemeName, themeOptions, ThemeColors } from '@/constants/themes';
import { useOpponents } from '@/contexts/OpponentContext';
import SyncStatusBanner from '@/components/SyncStatusBanner';
import { gatherExportData, validateImportPayload, mergeImportData } from '@/utils/dataTransfer';
import { useGoalkeepers } from '@/contexts/GoalkeeperContext';
import { useGames } from '@/contexts/GameContext';
import { useTeams } from '@/contexts/TeamContext';
import { fontSize } from '@/constants/typography';

export default function SettingsScreen() {
  const { themeName, setTheme } = useTheme();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { opponents, removeOpponent } = useOpponents();
  const { refreshProfiles, profiles, resetAll: resetGoalkeepers } = useGoalkeepers();
  const { forceSync: forceSyncGames, allGames } = useGames();
  const { forceSync: forceSyncTeams, teams } = useTeams();
  const { resetAll: resetOpponents } = useOpponents();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [buildInfoExpanded, setBuildInfoExpanded] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const router = useRouter();

  const buildInfo = useMemo(() => {
    const version = Constants.expoConfig?.version ?? 'unknown';
    const buildNumber = Platform.OS === 'ios'
      ? (Constants.expoConfig?.ios?.buildNumber ?? 'unknown')
      : Platform.OS === 'android'
        ? String(Constants.expoConfig?.android?.versionCode ?? 'unknown')
        : 'n/a';
    const rtv = Updates.runtimeVersion ?? 'unknown';
    const chan = Updates.channel ?? 'unknown';
    const updId = Updates.updateId ?? null;
    const created = Updates.createdAt ?? null;
    const extra = (Constants.expoConfig?.extra ?? {}) as { commitSha?: string };
    const commitSha = extra.commitSha ?? 'not set';
    return {
      version,
      buildNumber,
      runtimeVersion: rtv,
      channel: chan,
      updateId: updId ? updId : 'Embedded (no OTA applied)',
      createdAt: created ? created.toLocaleString() : 'Embedded',
      commitSha,
    };
  }, []);

  const handleCopyBuildInfo = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = [
      `Version: ${buildInfo.version}`,
      `Build: ${buildInfo.buildNumber}`,
      `Runtime Version: ${buildInfo.runtimeVersion}`,
      `Channel: ${buildInfo.channel}`,
      `Update ID: ${buildInfo.updateId}`,
      `Update Created: ${buildInfo.createdAt}`,
      `Commit SHA: ${buildInfo.commitSha}`,
    ].join('\n');
    try {
      await Clipboard.setStringAsync(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    } catch (e) {
      console.error('[Settings] Copy build info error:', e);
    }
  }, [buildInfo]);

  const handleThemeSelect = useCallback((key: ThemeName) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTheme(key);

  }, [setTheme]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleDeleteAllData = useCallback(() => {
    Alert.alert(
      'Delete All My Data',
      'This will permanently delete all your goalkeeper profiles, games, and statistics. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            try {
              const sb = (await import('@/lib/supabase')).getSupabase();
              if (sb) {
                const profileIds = profiles
                  .filter(p => p.sharedProfileId)
                  .map(p => p.sharedProfileId as string);

                if (profileIds.length > 0) {
                  await sb.from('profile_data').delete().in('profile_id', profileIds);
                  await sb.from('profiles').delete().in('profile_id', profileIds);
                }
              }

              const allSecureKeys: string[] = [
                'gk_tracker_profiles',
                'gk_tracker_opponents',
                'gk_tracker_games_guest',
                'gk_tracker_teams_guest',
                'gk_device_user_id',
                'gk_device_display_name',
              ];
              for (const p of profiles) {
                allSecureKeys.push(`gk_tracker_games_${p.id}`);
                allSecureKeys.push(`gk_tracker_teams_${p.id}`);
              }
              const secureStore = await import('@/utils/secureStorage');
              for (const key of allSecureKeys) {
                await secureStore.removeItem(key);
              }

              await AsyncStorage.clear();

              resetGoalkeepers();
              resetOpponents();

              console.log('[Settings] User deleted all data, profiles:', profiles.length);

              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace('/onboarding');
            } catch (e) {
              console.error('[Settings] Delete error:', e);
              Alert.alert('Deletion Failed', 'Something went wrong while deleting your data. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [profiles, resetGoalkeepers, resetOpponents, router]);

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

  const handleSyncNow = useCallback(async () => {
    setIsSyncingNow(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await Promise.all([
        forceSyncGames(),
        forceSyncTeams(),
      ]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sync Complete', 'All data has been synced successfully.');

    } catch (e) {

      console.error('[Settings] Sync error:', e);
      Alert.alert('Sync Failed', 'Something went wrong during sync. Please try again.');
    } finally {
      setIsSyncingNow(false);
    }
  }, [forceSyncGames, forceSyncTeams]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const payload = await gatherExportData();
      const jsonString = JSON.stringify(payload, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gk-stats-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Export Complete', 'Your data has been downloaded.');
      } else {
        const { File, Paths } = await import('expo-file-system');
        const fileName = `gk-stats-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const file = new File(Paths.cache, fileName);
        file.write(jsonString);

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Export GK Stats Data',
          });
        } else {
          Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
        }
      }

    } catch (e) {

      console.error('[Settings] Export error:', e);
      Alert.alert('Export Failed', 'Something went wrong while exporting your data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);


      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {

        setIsImporting(false);
        return;
      }

      const asset = result.assets[0];


      let jsonString: string;

      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        jsonString = await response.text();
      } else {
        const { File: FSFile } = await import('expo-file-system');
        const file = new FSFile(asset.uri);
        jsonString = file.textSync();
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonString);
      } catch {
        Alert.alert('Invalid File', 'The selected file is not valid JSON.');
        setIsImporting(false);
        return;
      }

      const validation = validateImportPayload(parsed);
      if (!validation.success) {
        Alert.alert('Invalid Backup File', validation.error);
        setIsImporting(false);
        return;
      }

      const importData = validation.data;
      const profileCount = importData.profiles.length;
      const gameCount = Object.values(importData.games).reduce((sum, arr) => sum + arr.length, 0);
      const teamCount = Object.values(importData.teams).reduce((sum, arr) => sum + arr.length, 0);

      Alert.alert(
        'Import Data',
        `This backup contains:\n\n${profileCount} profile(s)\n${gameCount} game(s)\n${teamCount} team(s)\n\nExisting records will not be overwritten unless the imported version is newer. Continue?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsImporting(false) },
          {
            text: 'Import',
            onPress: async () => {
              try {
                const mergeResult = await mergeImportData(importData);
                refreshProfiles();
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Import Complete',
                  `Profiles: ${mergeResult.profilesAdded} added, ${mergeResult.profilesSkipped} unchanged\nGames: ${mergeResult.gamesAdded} added, ${mergeResult.gamesSkipped} unchanged\nTeams: ${mergeResult.teamsAdded} added, ${mergeResult.teamsSkipped} unchanged`
                );

              } catch (e) {

                console.error('[Settings] Import merge error:', e);
                Alert.alert('Import Failed', 'Something went wrong while importing your data.');
              } finally {
                setIsImporting(false);
              }
            },
          },
        ]
      );
    } catch (e) {

      console.error('[Settings] Import read error:', e);
      Alert.alert('Import Failed', 'Something went wrong while reading the file.');
      setIsImporting(false);
    }
  }, [refreshProfiles]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 64 }]}
        showsVerticalScrollIndicator={false}
      >
        <SyncStatusBanner />

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

        <TouchableOpacity
          testID="theme-preview-btn"
          style={styles.themePreviewButton}
          activeOpacity={0.7}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/theme-preview');
          }}
        >
          <Eye size={16} color={colors.primary} />
          <Text style={styles.themePreviewButtonText}>Theme Preview</Text>
        </TouchableOpacity>

        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Database size={16} color={colors.textMuted} />
          <Text style={styles.sectionHeaderText}>Data Management</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Back up your data or restore from a previous export.</Text>

        <TouchableOpacity
          testID="sync-now-btn"
          style={[styles.dataButton, styles.syncButton]}
          activeOpacity={0.7}
          onPress={handleSyncNow}
          disabled={isSyncingNow}
        >
          {isSyncingNow ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <RefreshCw size={18} color={colors.primary} />
          )}
          <Text style={[styles.dataButtonText, { color: colors.primary }]}>
            {isSyncingNow ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dataButtonRow}>
          <TouchableOpacity
            testID="export-data-btn"
            style={[styles.dataButton, styles.exportButton]}
            activeOpacity={0.7}
            onPress={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Upload size={18} color={colors.primary} />
            )}
            <Text style={[styles.dataButtonText, { color: colors.primary }]}>
              {isExporting ? 'Exporting...' : 'Export All Data'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="import-data-btn"
            style={[styles.dataButton, styles.importButton]}
            activeOpacity={0.7}
            onPress={handleImport}
            disabled={isImporting}
          >
            {isImporting ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Download size={18} color={colors.text} />
            )}
            <Text style={[styles.dataButtonText, { color: colors.text }]}>
              {isImporting ? 'Importing...' : 'Import Data'}
            </Text>
          </TouchableOpacity>
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

        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <MessageSquare size={16} color={colors.textMuted} />
          <Text style={styles.sectionHeaderText}>Beta Feedback</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Enjoying the app? Found a bug? We'd love to hear from you.</Text>

        <TouchableOpacity
          testID="send-feedback-btn"
          style={styles.feedbackButton}
          activeOpacity={0.7}
          onPress={() => {
            const appVersion = Constants.expoConfig?.version ?? 'unknown';
            const mailUrl = `mailto:gkstatsapp@gmail.com?subject=${encodeURIComponent('GK Stats App Feedback')}&body=${encodeURIComponent(`App Version: ${appVersion}`)}`;
            Linking.openURL(mailUrl).catch(() => {
              Alert.alert('Unable to Open Mail', 'Please send feedback to gkstatsapp@gmail.com');
            });
          }}
        >
          <MessageSquare size={18} color={colors.primary} />
          <Text style={styles.feedbackButtonText}>Send Feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="privacy-policy-link"
          style={styles.privacyLink}
          activeOpacity={0.7}
          onPress={() => {
            void Linking.openURL('https://smiling-gorgonzola-c76.notion.site/Privacy-Policy-a70ef03840ca4301b83bb7a302c070fa');
          }}
        >
          <ExternalLink size={13} color={colors.textMuted} />
          <Text style={styles.privacyLinkText}>Privacy Policy</Text>
        </TouchableOpacity>

        <View style={[styles.sectionHeader, { marginTop: 36 }]}>
          <AlertTriangle size={16} color={colors.danger} />
          <Text style={[styles.sectionHeaderText, { color: colors.danger }]}>Danger Zone</Text>
        </View>

        <TouchableOpacity
          testID="delete-all-data-btn"
          style={styles.deleteAllButton}
          activeOpacity={0.7}
          onPress={handleDeleteAllData}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Trash2 size={18} color="#fff" />
          )}
          <Text style={styles.deleteAllButtonText}>
            {isDeleting ? 'Deleting...' : 'Delete All My Data'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.versionText} testID="app-version-text">
          {`Version ${Constants.expoConfig?.version ?? 'unknown'}${Platform.OS === 'ios' && Constants.expoConfig?.ios?.buildNumber ? ` · Build ${Constants.expoConfig.ios.buildNumber}` : ''}${Platform.OS === 'android' && Constants.expoConfig?.android?.versionCode != null ? ` · Build ${Constants.expoConfig.android.versionCode}` : ''}`}
        </Text>

        <TouchableOpacity
          testID="build-info-toggle"
          style={styles.buildInfoHeader}
          activeOpacity={0.7}
          onPress={() => {
            void Haptics.selectionAsync();
            setBuildInfoExpanded(v => !v);
          }}
        >
          <Info size={14} color={colors.textMuted} />
          <Text style={styles.buildInfoHeaderText}>Build Info</Text>
          {buildInfoExpanded ? (
            <ChevronUp size={14} color={colors.textMuted} />
          ) : (
            <ChevronDown size={14} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        {buildInfoExpanded && (
          <View style={styles.buildInfoCard} testID="build-info-card">
            <BuildInfoRow label="Version" value={buildInfo.version} styles={styles} />
            <BuildInfoRow label="Build" value={buildInfo.buildNumber} styles={styles} />
            <BuildInfoRow label="Runtime" value={buildInfo.runtimeVersion} styles={styles} />
            <BuildInfoRow label="Channel" value={buildInfo.channel} styles={styles} />
            <BuildInfoRow label="Update ID" value={buildInfo.updateId} styles={styles} />
            <BuildInfoRow label="Update Created" value={buildInfo.createdAt} styles={styles} />
            <BuildInfoRow label="Commit SHA" value={buildInfo.commitSha} styles={styles} />

            <TouchableOpacity
              testID="copy-build-info-btn"
              style={styles.copyBuildInfoButton}
              activeOpacity={0.7}
              onPress={handleCopyBuildInfo}
            >
              <Copy size={14} color={colors.primary} />
              <Text style={styles.copyBuildInfoText}>
                {copyFeedback ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
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
    sectionHeaderText: { fontSize: fontSize.body2, fontWeight: '700' as const, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
    opponentCount: { fontSize: fontSize.caption, fontWeight: '600' as const, color: c.textMuted, backgroundColor: c.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
    sectionSubtitle: { fontSize: fontSize.body2, color: c.textMuted, lineHeight: 18, marginTop: -8, marginBottom: 14 },
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
    themeLabel: { fontSize: fontSize.bodyLg, fontWeight: '600' as const, color: c.textSecondary },
    themeLabelActive: { color: c.primary, fontWeight: '700' as const },
    checkBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.primary },
    syncButton: { backgroundColor: c.primaryGlow, borderColor: c.primary, marginBottom: 10 },
    dataButtonRow: { gap: 10 },
    dataButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 1 },
    exportButton: { backgroundColor: c.primaryGlow, borderColor: c.primary },
    importButton: { backgroundColor: c.surface, borderColor: c.border },
    dataButtonText: { fontSize: fontSize.bodyLg, fontWeight: '600' as const },
    opponentEmptyState: { backgroundColor: c.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: c.border },
    opponentEmptyText: { fontSize: fontSize.body, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
    opponentList: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden' as const },
    opponentRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    opponentName: { fontSize: fontSize.bodyLg, fontWeight: '500' as const, color: c.text, flex: 1, marginRight: 12 },
    opponentDeleteBtn: { padding: 6 },
    feedbackButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingVertical: 14, paddingHorizontal: 20 },
    feedbackButtonText: { fontSize: fontSize.bodyLg, fontWeight: '600' as const, color: c.text },
    privacyLink: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, marginTop: 16 },
    privacyLinkText: { fontSize: fontSize.body2, color: c.textMuted, textDecorationLine: 'underline' as const },
    themePreviewButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, backgroundColor: c.primaryGlow, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginTop: 12, alignSelf: 'flex-start' as const, borderWidth: 1, borderColor: c.primary },
    themePreviewButtonText: { fontSize: fontSize.body2, fontWeight: '600' as const, color: c.primary },
    deleteAllButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, backgroundColor: c.danger, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
    deleteAllButtonText: { fontSize: fontSize.bodyLg, fontWeight: '700' as const, color: '#fff' },
    versionText: { fontSize: fontSize.caption, color: c.textMuted, textAlign: 'center' as const, marginTop: 24, opacity: 0.7 },
    buildInfoHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, marginTop: 16, paddingVertical: 8 },
    buildInfoHeaderText: { fontSize: fontSize.caption, fontWeight: '600' as const, color: c.textMuted, textTransform: 'uppercase' as const, letterSpacing: 1 },
    buildInfoCard: { backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderColor: c.border, padding: 12, marginTop: 4 },
    buildInfoRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, paddingVertical: 5, gap: 12 },
    buildInfoLabel: { fontSize: fontSize.caption, color: c.textMuted, fontWeight: '500' as const, flexShrink: 0 },
    buildInfoValue: { fontSize: fontSize.caption, color: c.textSecondary, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), flex: 1, textAlign: 'right' as const },
    copyBuildInfoButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, marginTop: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: c.primaryGlow, borderWidth: 1, borderColor: c.primary },
    copyBuildInfoText: { fontSize: fontSize.caption, fontWeight: '600' as const, color: c.primary },
  });
}

function BuildInfoRow({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.buildInfoRow}>
      <Text style={styles.buildInfoLabel}>{label}</Text>
      <Text style={styles.buildInfoValue} selectable numberOfLines={2}>{value}</Text>
    </View>
  );
}
