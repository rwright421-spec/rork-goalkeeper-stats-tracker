export type KeeperSelection = 'home' | 'away' | 'both';

export type AgeGroup = 'U4' | 'U5' | 'U6' | 'U7' | 'U8' | 'U9' | 'U10' | 'U11' | 'U12' | 'U13' | 'U14' | 'U15' | 'U16' | 'U17' | 'U18' | 'U19' | 'High School' | 'College' | '';

export const AGE_GROUP_OPTIONS: string[] = [
  'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12',
  'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19',
  'High School', 'College',
];

export const AGE_GROUP_HALF_LENGTHS: Record<string, number> = {
  U4: 20, U5: 20, U6: 20, U7: 20,
  U8: 25, U9: 25, U10: 25,
  U11: 30, U12: 30,
  U13: 35, U14: 35,
  U15: 40, U16: 40,
  U17: 45, U18: 45, U19: 45,
  'High School': 40, 'College': 45,
};

export const DEFAULT_HALF_LENGTH = 40;

export function getHalfLengthForAgeGroup(ageGroup: string): number {
  return AGE_GROUP_HALF_LENGTHS[ageGroup] || DEFAULT_HALF_LENGTH;
}

export interface GoalkeeperProfile {
  id: string;
  name: string;
  birthYear: string;
  createdAt: string;
  updatedAt?: string;
  lastEditedBy?: string;
  inviteCode?: string;
  ownerId?: string;
  isShared?: boolean;
  sharedProfileId?: string;
}

export interface Team {
  id: string;
  goalkeeperProfileId: string;
  year: string;
  teamName: string;
  createdAt: string;
}

export interface DistributionStats {
  handledCrosses: number;
  punts: number;
  throwouts: number;
  drives: number;
  dropBacks: number;
}

export interface PenaltyStats {
  penaltiesFaced: number;
  penaltiesSaved: number;
  redCards: number;
  yellowCards: number;
}

export interface HalfStats {
  saves: number;
  goalsAgainst: number;
  distribution: DistributionStats;
  penalties: PenaltyStats;
  oneVsOneFaced: number;
  oneVsOneSaved: number;
}

export interface ShootoutStats {
  saves: number;
  goalsAgainst: number;
}

export interface KeeperData {
  name: string;
  year: string;
  teamName: string;
  secondHalfName: string;
  secondHalfYear: string;
  secondHalfTeamName: string;
  notes: string;
  firstHalf: HalfStats;
  secondHalf: HalfStats;
  shootout?: ShootoutStats;
  keeperProfileId?: string | null;
  keeperIsLinked?: boolean;
  secondHalfKeeperProfileId?: string | null;
  secondHalfKeeperIsLinked?: boolean;
  halvesPlayed?: number;
}

export interface FinalScore {
  home: number;
  away: number;
}

export interface GameSetup {
  eventName: string;
  date: string;
  gameName: string;
  keeperSelection: KeeperSelection;
  ageGroup?: AgeGroup;
  isHome?: boolean;
  halfLengthMinutes?: number;
}

export function resolveHalfLength(setup: Pick<GameSetup, 'halfLengthMinutes' | 'ageGroup'>): number {
  if (setup.halfLengthMinutes && setup.halfLengthMinutes > 0) return setup.halfLengthMinutes;
  return getHalfLengthForAgeGroup(setup.ageGroup ?? '');
}

export function deriveHalvesPlayed(keeper: Pick<KeeperData, 'name' | 'secondHalfName' | 'keeperProfileId' | 'secondHalfKeeperProfileId' | 'keeperIsLinked' | 'secondHalfKeeperIsLinked'>): number {
  const firstName = (keeper.name ?? '').trim().toLowerCase();
  const secondName = (keeper.secondHalfName ?? '').trim().toLowerCase();
  const firstPid = keeper.keeperProfileId ?? null;
  const secondPid = keeper.secondHalfKeeperProfileId ?? null;
  if (firstPid && secondPid) {
    return firstPid === secondPid ? 2 : 1;
  }
  if (firstPid || secondPid) {
    if (!secondName) return 2;
    return firstName === secondName ? 2 : 1;
  }
  if (!secondName || secondName === firstName) return 2;
  return 1;
}

export function deriveKeeperSelection(isHome: boolean, trackBoth: boolean): KeeperSelection {
  if (trackBoth) return 'both';
  return isHome ? 'home' : 'away';
}

export function normalizeGameSetup(setup: Partial<GameSetup> | undefined): GameSetup {
  return {
    eventName: setup?.eventName ?? '',
    date: setup?.date ?? '',
    gameName: setup?.gameName ?? '',
    keeperSelection: (setup?.keeperSelection ?? 'home') as KeeperSelection,
    ageGroup: setup?.ageGroup,
    isHome: setup?.isHome ?? true,
    halfLengthMinutes: setup?.halfLengthMinutes,
  };
}

export interface SavedGame {
  id: string;
  teamId?: string;
  setup: GameSetup;
  homeKeeper?: KeeperData;
  awayKeeper?: KeeperData;
  finalScore?: FinalScore;
  createdAt: string;
  pendingSync?: boolean;
}

function createEmptyDistribution(): DistributionStats {
  return { handledCrosses: 0, punts: 0, throwouts: 0, drives: 0, dropBacks: 0 };
}

function createEmptyPenalties(): PenaltyStats {
  return { penaltiesFaced: 0, penaltiesSaved: 0, redCards: 0, yellowCards: 0 };
}

function createEmptyHalf(): HalfStats {
  return { saves: 0, goalsAgainst: 0, distribution: createEmptyDistribution(), penalties: createEmptyPenalties(), oneVsOneFaced: 0, oneVsOneSaved: 0 };
}

export const defaultHalfStats: HalfStats = Object.freeze({
  saves: 0,
  goalsAgainst: 0,
  distribution: Object.freeze({ handledCrosses: 0, punts: 0, throwouts: 0, drives: 0, dropBacks: 0 }),
  penalties: Object.freeze({ penaltiesFaced: 0, penaltiesSaved: 0, redCards: 0, yellowCards: 0 }),
  oneVsOneFaced: 0,
  oneVsOneSaved: 0,
}) as HalfStats;

export function createEmptyKeeperData(): KeeperData {
  return {
    name: '',
    year: '',
    teamName: '',
    secondHalfName: '',
    secondHalfYear: '',
    secondHalfTeamName: '',
    notes: '',
    firstHalf: createEmptyHalf(),
    secondHalf: createEmptyHalf(),
    halvesPlayed: 2,
  };
}

export function calculateSavePercentage(saves: number, goalsAgainst: number): number | null {
  const total = saves + goalsAgainst;
  if (total === 0) return null;
  return Math.round((saves / total) * 100);
}

function safeDistribution(dist?: Partial<DistributionStats>): DistributionStats {
  return {
    handledCrosses: dist?.handledCrosses ?? 0,
    punts: dist?.punts ?? 0,
    throwouts: dist?.throwouts ?? 0,
    drives: dist?.drives ?? 0,
    dropBacks: dist?.dropBacks ?? 0,
  };
}

function safePenalties(pen?: Partial<PenaltyStats>): PenaltyStats {
  return {
    penaltiesFaced: pen?.penaltiesFaced ?? 0,
    penaltiesSaved: pen?.penaltiesSaved ?? 0,
    redCards: pen?.redCards ?? 0,
    yellowCards: pen?.yellowCards ?? 0,
  };
}

export function safeShootout(shootout?: Partial<ShootoutStats>): ShootoutStats {
  return {
    saves: shootout?.saves ?? 0,
    goalsAgainst: shootout?.goalsAgainst ?? 0,
  };
}

export function normalizeHalf(half?: Partial<HalfStats>): HalfStats {
  return {
    saves: half?.saves ?? 0,
    goalsAgainst: half?.goalsAgainst ?? 0,
    distribution: safeDistribution(half?.distribution),
    penalties: safePenalties((half as HalfStats)?.penalties),
    oneVsOneFaced: half?.oneVsOneFaced ?? 0,
    oneVsOneSaved: half?.oneVsOneSaved ?? 0,
  };
}

export function normalizeKeeper(keeper?: Partial<KeeperData>): KeeperData {
  return {
    name: keeper?.name ?? '',
    year: keeper?.year ?? '',
    teamName: keeper?.teamName ?? '',
    secondHalfName: keeper?.secondHalfName ?? keeper?.name ?? '',
    secondHalfYear: keeper?.secondHalfYear ?? keeper?.year ?? '',
    secondHalfTeamName: keeper?.secondHalfTeamName ?? keeper?.teamName ?? '',
    notes: keeper?.notes ?? '',
    firstHalf: normalizeHalf(keeper?.firstHalf),
    secondHalf: normalizeHalf(keeper?.secondHalf),
    shootout: keeper?.shootout ? safeShootout(keeper.shootout) : undefined,
    keeperProfileId: keeper?.keeperProfileId ?? null,
    keeperIsLinked: keeper?.keeperIsLinked ?? false,
    secondHalfKeeperProfileId: keeper?.secondHalfKeeperProfileId ?? null,
    secondHalfKeeperIsLinked: keeper?.secondHalfKeeperIsLinked ?? false,
    halvesPlayed: keeper?.halvesPlayed ?? 2,
  };
}

export function getShotsFaced(saves: number, goalsAgainst: number): number {
  return saves + goalsAgainst;
}

export function getPkGoalsConceded(half: HalfStats): number {
  return Math.max(0, (half.penalties.penaltiesFaced ?? 0) - (half.penalties.penaltiesSaved ?? 0));
}

export function getTotalSaves(keeper: KeeperData): number {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return fh.saves + sh.saves + fh.penalties.penaltiesSaved + sh.penalties.penaltiesSaved;
}

export function getTotalGoalsAgainst(keeper: KeeperData): number {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return fh.goalsAgainst + sh.goalsAgainst + getPkGoalsConceded(fh) + getPkGoalsConceded(sh);
}

export function getTotalShotsFaced(keeper: KeeperData): number {
  return getTotalSaves(keeper) + getTotalGoalsAgainst(keeper);
}

export function getOverallSavePercentage(keeper: KeeperData): number | null {
  return calculateSavePercentage(getTotalSaves(keeper), getTotalGoalsAgainst(keeper));
}

export function getTotalDistribution(keeper: KeeperData): DistributionStats {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return {
    handledCrosses: fh.distribution.handledCrosses + sh.distribution.handledCrosses,
    punts: fh.distribution.punts + sh.distribution.punts,
    throwouts: fh.distribution.throwouts + sh.distribution.throwouts,
    drives: fh.distribution.drives + sh.distribution.drives,
    dropBacks: fh.distribution.dropBacks + sh.distribution.dropBacks,
  };
}

export function getTotalPenalties(keeper: KeeperData): PenaltyStats {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return {
    penaltiesFaced: fh.penalties.penaltiesFaced + sh.penalties.penaltiesFaced,
    penaltiesSaved: fh.penalties.penaltiesSaved + sh.penalties.penaltiesSaved,
    redCards: fh.penalties.redCards + sh.penalties.redCards,
    yellowCards: fh.penalties.yellowCards + sh.penalties.yellowCards,
  };
}

export function getShootoutShotsFaced(shootout: ShootoutStats): number {
  return shootout.saves + shootout.goalsAgainst;
}

export function getTotalOneVsOneFaced(keeper: KeeperData): number {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return fh.oneVsOneFaced + sh.oneVsOneFaced;
}

export function getTotalOneVsOneSaved(keeper: KeeperData): number {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return fh.oneVsOneSaved + sh.oneVsOneSaved;
}

export function getOneVsOneSaveRate(faced: number, saved: number): number | null {
  if (faced === 0) return null;
  return Math.round((saved / faced) * 100);
}
