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

// NOTE: PenaltyStats tracks REGULAR (in-game) penalty kicks only.
// Shootout PKs are tracked separately in ShootoutStats and are intentionally
// excluded from save %, shots on target, and game score calculations.
export interface PenaltyStats {
  penaltiesSaved: number;
  penaltyGoals: number;
  penaltiesMissed: number;
  redCards: number;
  yellowCards: number;
}

export interface HalfStats {
  saves: number;
  goalsAgainst: number;
  distribution: DistributionStats;
  penalties: PenaltyStats;
  oneVsOneSaved: number;
  oneVsOneGoals: number;
  oneVsOneMissed: number;
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
  return { penaltiesSaved: 0, penaltyGoals: 0, penaltiesMissed: 0, redCards: 0, yellowCards: 0 };
}

function createEmptyHalf(): HalfStats {
  return { saves: 0, goalsAgainst: 0, distribution: createEmptyDistribution(), penalties: createEmptyPenalties(), oneVsOneSaved: 0, oneVsOneGoals: 0, oneVsOneMissed: 0 };
}

export const defaultHalfStats: HalfStats = Object.freeze({
  saves: 0,
  goalsAgainst: 0,
  distribution: Object.freeze({ handledCrosses: 0, punts: 0, throwouts: 0, drives: 0, dropBacks: 0 }),
  penalties: Object.freeze({ penaltiesSaved: 0, penaltyGoals: 0, penaltiesMissed: 0, redCards: 0, yellowCards: 0 }),
  oneVsOneSaved: 0,
  oneVsOneGoals: 0,
  oneVsOneMissed: 0,
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

function safePenalties(pen?: Partial<PenaltyStats> & { penaltiesFaced?: number }): PenaltyStats {
  const saved = pen?.penaltiesSaved ?? 0;
  const hasNewFields = pen !== undefined && (pen.penaltyGoals !== undefined || pen.penaltiesMissed !== undefined);
  let goals: number;
  let missed: number;
  if (hasNewFields) {
    goals = pen?.penaltyGoals ?? 0;
    missed = pen?.penaltiesMissed ?? 0;
  } else {
    const legacyFaced = pen?.penaltiesFaced ?? 0;
    goals = Math.max(0, legacyFaced - saved);
    missed = 0;
  }
  return {
    penaltiesSaved: saved,
    penaltyGoals: goals,
    penaltiesMissed: missed,
    redCards: pen?.redCards ?? 0,
    yellowCards: pen?.yellowCards ?? 0,
  };
}

export function isLegacyPenaltyData(pen?: Partial<PenaltyStats> & { penaltiesFaced?: number }): boolean {
  if (!pen) return false;
  const hasNewFields = pen.penaltyGoals !== undefined || pen.penaltiesMissed !== undefined;
  const hasLegacyFaced = pen.penaltiesFaced !== undefined && pen.penaltiesFaced > 0;
  return !hasNewFields && hasLegacyFaced;
}

export function safeShootout(shootout?: Partial<ShootoutStats>): ShootoutStats {
  return {
    saves: shootout?.saves ?? 0,
    goalsAgainst: shootout?.goalsAgainst ?? 0,
  };
}

export function isLegacyOneVsOneHalfInput(half?: Partial<HalfStats> & { oneVsOneFaced?: number }): boolean {
  if (!half) return false;
  const hasMissed = (half as HalfStats).oneVsOneMissed !== undefined;
  const hasGoals = (half as HalfStats).oneVsOneGoals !== undefined;
  if (hasMissed || hasGoals) return false;
  const legacyFaced = (half as { oneVsOneFaced?: number }).oneVsOneFaced ?? 0;
  const legacySaved = half.oneVsOneSaved ?? 0;
  return legacyFaced > 0 || legacySaved > 0;
}

export function isLegacyOneVsOneKeeperData(keeper?: Partial<KeeperData>): boolean {
  if (!keeper) return false;
  return isLegacyOneVsOneHalfInput(keeper.firstHalf as any) || isLegacyOneVsOneHalfInput(keeper.secondHalf as any);
}

export function normalizeHalf(half?: Partial<HalfStats> & { oneVsOneFaced?: number }): HalfStats {
  const rawSaves = half?.saves ?? 0;
  const rawGoals = half?.goalsAgainst ?? 0;
  const hasNewOneVsOne = (half as HalfStats)?.oneVsOneMissed !== undefined || (half as HalfStats)?.oneVsOneGoals !== undefined;
  let oneVsOneSaved = half?.oneVsOneSaved ?? 0;
  let oneVsOneGoals = 0;
  let oneVsOneMissed = 0;
  let saves = rawSaves;
  let goalsAgainst = rawGoals;
  if (hasNewOneVsOne) {
    oneVsOneSaved = (half as HalfStats).oneVsOneSaved ?? 0;
    oneVsOneGoals = (half as HalfStats).oneVsOneGoals ?? 0;
    oneVsOneMissed = (half as HalfStats).oneVsOneMissed ?? 0;
  } else {
    const legacyFaced = (half as { oneVsOneFaced?: number } | undefined)?.oneVsOneFaced ?? 0;
    const legacySaved = half?.oneVsOneSaved ?? 0;
    const legacyGoals = Math.max(0, legacyFaced - legacySaved);
    oneVsOneSaved = legacySaved;
    oneVsOneGoals = legacyGoals;
    oneVsOneMissed = 0;
    saves = Math.max(0, rawSaves - legacySaved);
    goalsAgainst = Math.max(0, rawGoals - legacyGoals);
  }
  return {
    saves: Math.max(0, saves),
    goalsAgainst: Math.max(0, goalsAgainst),
    distribution: safeDistribution(half?.distribution),
    penalties: safePenalties((half as HalfStats)?.penalties),
    oneVsOneSaved: Math.max(0, oneVsOneSaved),
    oneVsOneGoals: Math.max(0, oneVsOneGoals),
    oneVsOneMissed: Math.max(0, oneVsOneMissed),
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
  return half.penalties.penaltyGoals ?? 0;
}

export function getTotalPenaltiesFaced(keeper: KeeperData): number {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return (
    fh.penalties.penaltiesSaved + fh.penalties.penaltyGoals + fh.penalties.penaltiesMissed +
    sh.penalties.penaltiesSaved + sh.penalties.penaltyGoals + sh.penalties.penaltiesMissed
  );
}

export function getPkSavePercentage(keeper: KeeperData): number | null {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  const saved = fh.penalties.penaltiesSaved + sh.penalties.penaltiesSaved;
  const goals = fh.penalties.penaltyGoals + sh.penalties.penaltyGoals;
  const onTarget = saved + goals;
  if (onTarget === 0) return null;
  return Math.round((saved / onTarget) * 100);
}

export function getTotalSaves(keeper: KeeperData): number {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return (
    fh.saves + sh.saves +
    fh.penalties.penaltiesSaved + sh.penalties.penaltiesSaved +
    fh.oneVsOneSaved + sh.oneVsOneSaved
  );
}

export function getTotalGoalsAgainst(keeper: KeeperData): number {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return (
    fh.goalsAgainst + sh.goalsAgainst +
    getPkGoalsConceded(fh) + getPkGoalsConceded(sh) +
    fh.oneVsOneGoals + sh.oneVsOneGoals
  );
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
    penaltiesSaved: fh.penalties.penaltiesSaved + sh.penalties.penaltiesSaved,
    penaltyGoals: fh.penalties.penaltyGoals + sh.penalties.penaltyGoals,
    penaltiesMissed: fh.penalties.penaltiesMissed + sh.penalties.penaltiesMissed,
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
  return (
    fh.oneVsOneSaved + fh.oneVsOneGoals + fh.oneVsOneMissed +
    sh.oneVsOneSaved + sh.oneVsOneGoals + sh.oneVsOneMissed
  );
}

export function getTotalOneVsOneSaved(keeper: KeeperData): number {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return fh.oneVsOneSaved + sh.oneVsOneSaved;
}

export function getTotalOneVsOneGoals(keeper: KeeperData): number {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return fh.oneVsOneGoals + sh.oneVsOneGoals;
}

export function getTotalOneVsOneMissed(keeper: KeeperData): number {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return fh.oneVsOneMissed + sh.oneVsOneMissed;
}

export function getOneVsOneSavePercentage(keeper: KeeperData): number | null {
  const saved = getTotalOneVsOneSaved(keeper);
  const goals = getTotalOneVsOneGoals(keeper);
  const onTarget = saved + goals;
  if (onTarget === 0) return null;
  return Math.round((saved / onTarget) * 100);
}

export function getTotalPenaltiesSaved(keeper: KeeperData): number {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  return fh.penalties.penaltiesSaved + sh.penalties.penaltiesSaved;
}

export function getAllSavePercentage(keeper: KeeperData): number | null {
  const shots = getTotalShotsFaced(keeper);
  if (shots === 0) return null;
  return Math.round((getTotalSaves(keeper) / shots) * 100);
}

export function getRunOfPlaySavePercentage(keeper: KeeperData): number | null {
  const totalShots = getTotalShotsFaced(keeper);
  const pkOnTarget = getTotalPenaltiesSaved(keeper) + (
    (keeper.firstHalf ?? defaultHalfStats).penalties.penaltyGoals +
    (keeper.secondHalf ?? defaultHalfStats).penalties.penaltyGoals
  );
  const shots = totalShots - pkOnTarget;
  if (shots <= 0) return null;
  const saves = getTotalSaves(keeper) - getTotalPenaltiesSaved(keeper);
  return Math.round((saves / shots) * 100);
}

// Deprecated: kept for any residual call sites. Prefer getOneVsOneSavePercentage.
export function getOneVsOneSaveRate(faced: number, saved: number): number | null {
  if (faced === 0) return null;
  return Math.round((saved / faced) * 100);
}
