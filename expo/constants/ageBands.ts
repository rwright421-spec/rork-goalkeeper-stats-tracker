export type AgeBand = 'u10' | 'u12' | 'u15' | 'u18' | 'adult';

export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  u10: 'U8–U10',
  u12: 'U11–U12',
  u15: 'U13–U15',
  u18: 'U16–U18',
  adult: 'College / Adult',
};

const STRING_MAP: Record<string, AgeBand> = {
  U4: 'u10', U5: 'u10', U6: 'u10', U7: 'u10', U8: 'u10', U9: 'u10', U10: 'u10',
  U11: 'u12', U12: 'u12',
  U13: 'u15', U14: 'u15', U15: 'u15',
  U16: 'u18', U17: 'u18', U18: 'u18', U19: 'u18',
  'High School': 'u18',
  'College': 'adult',
};

export function getAgeBand(ageLevel: string | number | null | undefined): AgeBand {
  if (ageLevel === null || ageLevel === undefined || ageLevel === '') return 'u15';
  if (typeof ageLevel === 'number') {
    if (ageLevel <= 10) return 'u10';
    if (ageLevel <= 12) return 'u12';
    if (ageLevel <= 15) return 'u15';
    if (ageLevel <= 18) return 'u18';
    return 'adult';
  }
  const trimmed = ageLevel.trim();
  if (STRING_MAP[trimmed]) return STRING_MAP[trimmed];
  const numMatch = trimmed.match(/U?(\d{1,2})/i);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (!isNaN(n)) {
      if (n <= 10) return 'u10';
      if (n <= 12) return 'u12';
      if (n <= 15) return 'u15';
      if (n <= 18) return 'u18';
      return 'adult';
    }
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('college') || lower.includes('adult')) return 'adult';
  if (lower.includes('high school') || lower.includes('hs')) return 'u18';
  return 'u15';
}
