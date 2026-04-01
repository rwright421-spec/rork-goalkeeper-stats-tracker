export interface ThemeColors {
  background: string;
  surface: string;
  surfaceLight: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryGlow: string;
  accent: string;
  accentGlow: string;
  danger: string;
  dangerGlow: string;
  warning: string;
  white: string;
  cardHome: string;
  cardAway: string;
}

export type ThemeName = 'dark' | 'light' | 'ocean' | 'sunset';

export const DarkTheme: ThemeColors = {
  background: '#0D1117',
  surface: '#161B22',
  surfaceLight: '#1C2333',
  border: '#30363D',
  borderLight: '#444C56',
  text: '#F0F6FC',
  textSecondary: '#C9D1D9',
  textMuted: '#8B949E',
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#34D399',
  primaryGlow: 'rgba(16, 185, 129, 0.12)',
  accent: '#F59E0B',
  accentGlow: 'rgba(245, 158, 11, 0.12)',
  danger: '#F85149',
  dangerGlow: 'rgba(248, 81, 73, 0.12)',
  warning: '#D29922',
  white: '#FFFFFF',
  cardHome: '#10B981',
  cardAway: '#3B82F6',
};

export const LightTheme: ThemeColors = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceLight: '#F0F1F3',
  border: '#DEE2E6',
  borderLight: '#CED4DA',
  text: '#1A1D21',
  textSecondary: '#495057',
  textMuted: '#868E96',
  primary: '#0D9668',
  primaryDark: '#087F5B',
  primaryLight: '#20C997',
  primaryGlow: 'rgba(13, 150, 104, 0.10)',
  accent: '#E67700',
  accentGlow: 'rgba(230, 119, 0, 0.10)',
  danger: '#E03131',
  dangerGlow: 'rgba(224, 49, 49, 0.10)',
  warning: '#D29922',
  white: '#FFFFFF',
  cardHome: '#0D9668',
  cardAway: '#3B82F6',
};

export const OceanTheme: ThemeColors = {
  background: '#0B1929',
  surface: '#112240',
  surfaceLight: '#1A3358',
  border: '#234876',
  borderLight: '#2D5F9A',
  text: '#E6F1FF',
  textSecondary: '#A8C7E8',
  textMuted: '#6B8DB5',
  primary: '#64FFDA',
  primaryDark: '#14B8A6',
  primaryLight: '#99FFE8',
  primaryGlow: 'rgba(100, 255, 218, 0.10)',
  accent: '#FFC86B',
  accentGlow: 'rgba(255, 200, 107, 0.10)',
  danger: '#FF6B6B',
  dangerGlow: 'rgba(255, 107, 107, 0.10)',
  warning: '#FFD93D',
  white: '#FFFFFF',
  cardHome: '#64FFDA',
  cardAway: '#82B1FF',
};

export const SunsetTheme: ThemeColors = {
  background: '#1A1208',
  surface: '#2A1F10',
  surfaceLight: '#3A2C18',
  border: '#524022',
  borderLight: '#6B5530',
  text: '#FFF4E6',
  textSecondary: '#DFC9A5',
  textMuted: '#A08C6E',
  primary: '#FF8C42',
  primaryDark: '#E06B1A',
  primaryLight: '#FFB07A',
  primaryGlow: 'rgba(255, 140, 66, 0.12)',
  accent: '#FFD166',
  accentGlow: 'rgba(255, 209, 102, 0.12)',
  danger: '#EF476F',
  dangerGlow: 'rgba(239, 71, 111, 0.12)',
  warning: '#FFD166',
  white: '#FFFFFF',
  cardHome: '#FF8C42',
  cardAway: '#06D6A0',
};

export const themes: Record<ThemeName, ThemeColors> = {
  dark: DarkTheme,
  light: LightTheme,
  ocean: OceanTheme,
  sunset: SunsetTheme,
};

export interface ThemeOption {
  key: ThemeName;
  label: string;
  preview: string[];
}

export const themeOptions: ThemeOption[] = [
  { key: 'dark', label: 'Dark', preview: ['#0D1117', '#161B22', '#10B981', '#F0F6FC'] },
  { key: 'light', label: 'Light', preview: ['#F8F9FA', '#FFFFFF', '#0D9668', '#1A1D21'] },
  { key: 'ocean', label: 'Ocean', preview: ['#0B1929', '#112240', '#64FFDA', '#E6F1FF'] },
  { key: 'sunset', label: 'Sunset', preview: ['#1A1208', '#2A1F10', '#FF8C42', '#FFF4E6'] },
];
