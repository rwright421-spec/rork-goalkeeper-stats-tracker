export const fontSize = {
  xs2: 9,
  xs: 10,
  sm: 11,
  caption: 12,
  body2: 13,
  body: 14,
  bodyLg: 15,
  subtitle: 16,
  h4: 17,
  h3: 18,
  h2: 20,
  h1sm: 22,
  h1: 24,
  display3: 26,
  display2: 28,
  display1: 32,
  display: 36,
  hero: 44,
} as const;

export type FontSizeKey = keyof typeof fontSize;

export const MAX_FONT_SIZE_MULTIPLIER = 1.5;
