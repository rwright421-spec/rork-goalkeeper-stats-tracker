export type KeeperSelection = 'home' | 'away' | 'both';

export type AgeGroup = 'U8' | 'U9' | 'U10' | 'U11' | 'U12' | 'U13' | 'U14' | 'U15' | 'U16' | 'U17' | 'U18' | 'U19' | '';

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
}

export interface SavedGame {
  id: string;
  teamId?: string;
  setup: GameSetup;
  homeKeeper?: KeeperData;
  awayKeeper?: KeeperData;
  finalScore?: FinalScore;
  createdAt: string;
}

function createEmptyDistribution(): DistributionStats {
  return { handledCrosses: 0, punts: 0, throwouts: 0, drives: 0, dropBacks: 0 };
}

function createEmptyPenalties(): PenaltyStats {
  return { penaltiesFaced: 0, penaltiesSaved: 0, redCards: 0, yellowCards: 0 };
}

function createEmptyHalf(): HalfStats {
  return { saves: 0, goalsAgainst: 0, distribution: createEmptyDistribution(), penalties: createEmptyPenalties() };
}

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
  };
}

export function calculateSavePercentage(saves: number, goalsAgainst: number): number {
  const total = saves + goalsAgainst;
  if (total === 0) return 0;
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
  };
}

export function getShotsFaced(saves: number, goalsAgainst: number): number {
  return saves + goalsAgainst;
}

export function getTotalSaves(keeper: KeeperData): number {
  return keeper.firstHalf.saves + keeper.secondHalf.saves + keeper.firstHalf.penalties.penaltiesSaved + keeper.secondHalf.penalties.penaltiesSaved;
}

export function getTotalGoalsAgainst(keeper: KeeperData): number {
  return keeper.firstHalf.goalsAgainst + keeper.secondHalf.goalsAgainst + keeper.firstHalf.penalties.penaltiesFaced + keeper.secondHalf.penalties.penaltiesFaced;
}

export function getTotalShotsFaced(keeper: KeeperData): number {
  return getTotalSaves(keeper) + getTotalGoalsAgainst(keeper);
}

export function getOverallSavePercentage(keeper: KeeperData): number {
  return calculateSavePercentage(getTotalSaves(keeper), getTotalGoalsAgainst(keeper));
}

export function getTotalDistribution(keeper: KeeperData): DistributionStats {
  return {
    handledCrosses: keeper.firstHalf.distribution.handledCrosses + keeper.secondHalf.distribution.handledCrosses,
    punts: keeper.firstHalf.distribution.punts + keeper.secondHalf.distribution.punts,
    throwouts: keeper.firstHalf.distribution.throwouts + keeper.secondHalf.distribution.throwouts,
    drives: keeper.firstHalf.distribution.drives + keeper.secondHalf.distribution.drives,
    dropBacks: keeper.firstHalf.distribution.dropBacks + keeper.secondHalf.distribution.dropBacks,
  };
}

export function getTotalPenalties(keeper: KeeperData): PenaltyStats {
  return {
    penaltiesFaced: keeper.firstHalf.penalties.penaltiesFaced + keeper.secondHalf.penalties.penaltiesFaced,
    penaltiesSaved: keeper.firstHalf.penalties.penaltiesSaved + keeper.secondHalf.penalties.penaltiesSaved,
    redCards: keeper.firstHalf.penalties.redCards + keeper.secondHalf.penalties.redCards,
    yellowCards: keeper.firstHalf.penalties.yellowCards + keeper.secondHalf.penalties.yellowCards,
  };
}

export function getShootoutShotsFaced(shootout: ShootoutStats): number {
  return shootout.saves + shootout.goalsAgainst;
}
