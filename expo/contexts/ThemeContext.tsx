import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { ThemeColors, ThemeName, themes, DarkTheme } from '@/constants/themes';

const THEME_STORAGE_KEY = '@gk_tracker_theme';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [themeName, setThemeName] = useState<ThemeName>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && (stored === 'dark' || stored === 'light' || stored === 'ocean' || stored === 'sunset')) {
          setThemeName(stored as ThemeName);
        }
      } catch (e) {
        console.error('[Theme] Error loading theme:', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, name).catch((e) => {
      console.error('[Theme] Error saving theme:', e);
    });
  }, []);

  const colors: ThemeColors = themes[themeName] ?? DarkTheme;

  return useMemo(() => ({ themeName, setTheme, colors, isLoaded }), [themeName, setTheme, colors, isLoaded]);
});

export function useColors(): ThemeColors {
  const { colors } = useTheme();
  return colors;
}
