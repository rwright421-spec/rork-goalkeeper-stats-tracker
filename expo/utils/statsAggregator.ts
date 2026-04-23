import { SavedGame, KeeperData, DistributionStats, PenaltyStats, HalfStats, ShootoutStats, calculateSavePercentage, normalizeKeeper, resolveHalfLength, defaultHalfStats, DEFAULT_HALF_LENGTH, getPkGoalsConceded } from '@/types/game';
import { Team } from '@/types/game';

export interface AggregatedStats {
  gamesPlayed: number;
  totalSaves: number;
  totalGoalsAgainst: number;
  totalShotsFaced: number;
  savePercentage: number | null;
  cleanSheets: number;
  distribution: DistributionStats;
  penalties: PenaltyStats;
  shootout: ShootoutStats;
  avgSavesPerGame: number;
  avgGoalsAgainstPerGame: number;
  oneVsOneFaced: number;
  oneVsOneSaved: number;
  oneVsOneGoals: number;
  oneVsOneMissed: number;
  oneVsOneSaveRate: number | null;
  oneVsOneSavePercentage: number | null;
  oneVsOneOnTarget: number;
  totalEstimatedMinutes: number;
  gaa: number | null;
  pkSavePercentage: number | null;
  pkOnTarget: number;
  pkFaced: number;
  pkSaveRate: number | null;
}

function emptyDistribution(): DistributionStats {
  return { handledCrosses: 0, punts: 0, throwouts: 0, drives: 0, dropBacks: 0 };
}

function emptyPenalties(): PenaltyStats {
  return { penaltiesSaved: 0, penaltyGoals: 0, penaltiesMissed: 0, redCards: 0, yellowCards: 0 };
}

function emptyShootout(): ShootoutStats {
  return { saves: 0, goalsAgainst: 0 };
}

function addHalfDistribution(target: DistributionStats, half: HalfStats): void {
  target.handledCrosses += half.distribution.handledCrosses;
  target.punts += half.distribution.punts;
  target.throwouts += half.distribution.throwouts;
  target.drives += half.distribution.drives;
  target.dropBacks += half.distribution.dropBacks;
}

function addHalfPenalties(target: PenaltyStats, half: HalfStats): void {
  target.penaltiesSaved += half.penalties.penaltiesSaved;
  target.penaltyGoals += half.penalties.penaltyGoals;
  target.penaltiesMissed += half.penalties.penaltiesMissed;
  target.redCards += half.penalties.redCards;
  target.yellowCards += half.penalties.yellowCards;
}

function getKeeperFromGame(game: SavedGame): KeeperData | null {
  if (game.homeKeeper) return normalizeKeeper(game.homeKeeper);
  if (game.awayKeeper) return normalizeKeeper(game.awayKeeper);
  return null;
}

function halfMatchesProfile(profileId: string | undefined, profileName: string | undefined, keeperProfileId: string | null | undefined, keeperIsLinked: boolean | undefined, keeperName: string): boolean {
  if (profileId && keeperIsLinked && keeperProfileId) {
    return keeperProfileId === profileId;
  }
  const lowerProfile = (profileName ?? '').toLowerCase().trim();
  if (!lowerProfile) return true;
  return keeperName.toLowerCase().trim() === lowerProfile;
}

export function aggregateGames(games: SavedGame[], profileName?: string, profileId?: string, teams?: Team[]): AggregatedStats {
  let totalSaves = 0;
  let totalGoalsAgainst = 0;
  let cleanSheets = 0;
  const distribution = emptyDistribution();
  const penalties = emptyPenalties();
  const shootout = emptyShootout();

  let oneVsOneSaved = 0;
  let oneVsOneGoals = 0;
  let oneVsOneMissed = 0;
  let gamesPlayed = 0;
  let totalEstimatedMinutes = 0;

  for (const game of games) {
    const keeper = getKeeperFromGame(game);
    if (!keeper) continue;

    gamesPlayed++;

    const profilePlaysFirstHalf = halfMatchesProfile(
      profileId, profileName,
      keeper.keeperProfileId, keeper.keeperIsLinked,
      keeper.name || '',
    );
    const profilePlaysSecondHalf = halfMatchesProfile(
      profileId, profileName,
      keeper.secondHalfKeeperProfileId, keeper.secondHalfKeeperIsLinked,
      keeper.secondHalfName || keeper.name || '',
    );

    const halfLength = resolveHalfLength(game.setup);
    const halvesPlayed = keeper.halvesPlayed ?? 2;
    totalEstimatedMinutes += halvesPlayed * halfLength;

    let gameSaves = 0;
    let gameGA = 0;

    const fh = keeper.firstHalf ?? defaultHalfStats;
    const sh = keeper.secondHalf ?? defaultHalfStats;

    if (profilePlaysFirstHalf) {
      gameSaves += fh.saves + fh.penalties.penaltiesSaved + (fh.oneVsOneSaved ?? 0);
      gameGA += fh.goalsAgainst + getPkGoalsConceded(fh) + (fh.oneVsOneGoals ?? 0);
      addHalfDistribution(distribution, fh);
      addHalfPenalties(penalties, fh);
      oneVsOneSaved += fh.oneVsOneSaved ?? 0;
      oneVsOneGoals += fh.oneVsOneGoals ?? 0;
      oneVsOneMissed += fh.oneVsOneMissed ?? 0;
    }

    if (profilePlaysSecondHalf) {
      gameSaves += sh.saves + sh.penalties.penaltiesSaved + (sh.oneVsOneSaved ?? 0);
      gameGA += sh.goalsAgainst + getPkGoalsConceded(sh) + (sh.oneVsOneGoals ?? 0);
      addHalfDistribution(distribution, sh);
      addHalfPenalties(penalties, sh);
      oneVsOneSaved += sh.oneVsOneSaved ?? 0;
      oneVsOneGoals += sh.oneVsOneGoals ?? 0;
      oneVsOneMissed += sh.oneVsOneMissed ?? 0;
    }

    if (keeper.shootout) {
      shootout.saves += keeper.shootout.saves;
      shootout.goalsAgainst += keeper.shootout.goalsAgainst;
    }

    totalSaves += gameSaves;
    totalGoalsAgainst += gameGA;

    if (gameGA === 0) cleanSheets++;
  }

  const pkOnTarget = penalties.penaltiesSaved + penalties.penaltyGoals;
  const pkSavePercentage = pkOnTarget > 0 ? Math.round((penalties.penaltiesSaved / pkOnTarget) * 100) : null;
  const pkFaced = pkOnTarget + penalties.penaltiesMissed;
  const pkSaveRate = pkFaced > 0 ? Math.round((penalties.penaltiesSaved / pkFaced) * 100) : null;
  const oneVsOneOnTarget = oneVsOneSaved + oneVsOneGoals;
  const oneVsOneFaced = oneVsOneOnTarget + oneVsOneMissed;
  const oneVsOneSavePercentage = oneVsOneOnTarget > 0 ? Math.round((oneVsOneSaved / oneVsOneOnTarget) * 100) : null;

  return {
    gamesPlayed,
    totalSaves,
    totalGoalsAgainst,
    totalShotsFaced: totalSaves + totalGoalsAgainst,
    savePercentage: calculateSavePercentage(totalSaves, totalGoalsAgainst),
    cleanSheets,
    distribution,
    penalties,
    shootout,
    avgSavesPerGame: gamesPlayed > 0 ? Math.round((totalSaves / gamesPlayed) * 10) / 10 : 0,
    avgGoalsAgainstPerGame: gamesPlayed > 0 ? Math.round((totalGoalsAgainst / gamesPlayed) * 10) / 10 : 0,
    oneVsOneFaced,
    oneVsOneSaved,
    oneVsOneGoals,
    oneVsOneMissed,
    oneVsOneSaveRate: oneVsOneFaced > 0 ? Math.round((oneVsOneSaved / oneVsOneFaced) * 100) : null,
    oneVsOneSavePercentage,
    oneVsOneOnTarget,
    totalEstimatedMinutes,
    gaa: totalEstimatedMinutes > 0 ? Math.round((totalGoalsAgainst / totalEstimatedMinutes) * 90 * 100) / 100 : null,
    pkSavePercentage,
    pkOnTarget,
    pkFaced,
    pkSaveRate,
  };
}

export type GroupMode = 'career' | 'team' | 'year' | 'custom' | 'opponent';

export interface GroupedStats {
  label: string;
  sublabel?: string;
  stats: AggregatedStats;
  gameIds: string[];
}

export function groupByCareer(games: SavedGame[], profileName?: string, teams?: Team[]): GroupedStats[] {
  return [{
    label: 'Career Totals',
    sublabel: `${games.length} game${games.length !== 1 ? 's' : ''}`,
    stats: aggregateGames(games, profileName, undefined, teams),
    gameIds: games.map(g => g.id),
  }];
}

export function groupByTeam(games: SavedGame[], teams: Team[], profileName?: string, _unused?: unknown): GroupedStats[] {
  const teamMap = new Map<string, Team>();
  for (const t of teams) {
    teamMap.set(t.id, t);
  }

  const grouped = new Map<string, SavedGame[]>();
  const noTeamGames: SavedGame[] = [];

  for (const game of games) {
    if (game.teamId && teamMap.has(game.teamId)) {
      const existing = grouped.get(game.teamId) ?? [];
      existing.push(game);
      grouped.set(game.teamId, existing);
    } else {
      noTeamGames.push(game);
    }
  }

  const results: GroupedStats[] = [];

  for (const [teamId, teamGames] of grouped) {
    const team = teamMap.get(teamId)!;
    results.push({
      label: team.teamName,
      sublabel: `${team.year} · ${teamGames.length} game${teamGames.length !== 1 ? 's' : ''}`,
      stats: aggregateGames(teamGames, profileName, undefined, teams),
      gameIds: teamGames.map(g => g.id),
    });
  }

  if (noTeamGames.length > 0) {
    results.push({
      label: 'Unassigned',
      sublabel: `${noTeamGames.length} game${noTeamGames.length !== 1 ? 's' : ''}`,
      stats: aggregateGames(noTeamGames, profileName, undefined, teams),
      gameIds: noTeamGames.map(g => g.id),
    });
  }

  return results;
}

export function groupByYear(games: SavedGame[], profileName?: string, teams?: Team[]): GroupedStats[] {
  const grouped = new Map<string, SavedGame[]>();

  for (const game of games) {
    let year = 'Unknown';
    if (game.setup.date) {
      const parsed = new Date(game.setup.date);
      if (!isNaN(parsed.getTime())) {
        year = parsed.getFullYear().toString();
      } else {
        const parts = game.setup.date.split('/');
        const yearPart = parts.length >= 3 ? parts[parts.length - 1] : null;
        year = yearPart && /^\d{4}$/.test(yearPart) ? yearPart : 'Unknown';
      }
    }
    const existing = grouped.get(year) ?? [];
    existing.push(game);
    grouped.set(year, existing);
  }

  const results: GroupedStats[] = [];
  const sortedYears = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  for (const year of sortedYears) {
    const yearGames = grouped.get(year)!;
    results.push({
      label: year,
      sublabel: `${yearGames.length} game${yearGames.length !== 1 ? 's' : ''}`,
      stats: aggregateGames(yearGames, profileName, undefined, teams),
      gameIds: yearGames.map(g => g.id),
    });
  }

  return results;
}

export function groupByCustom(games: SavedGame[], selectedIds: Set<string>, label: string, profileName?: string, teams?: Team[]): GroupedStats[] {
  const selected = games.filter(g => selectedIds.has(g.id));
  return [{
    label,
    sublabel: `${selected.length} game${selected.length !== 1 ? 's' : ''} selected`,
    stats: aggregateGames(selected, profileName, undefined, teams),
    gameIds: selected.map(g => g.id),
  }];
}

function getGameResult(game: SavedGame): 'W' | 'D' | 'L' | null {
  if (!game.finalScore) return null;
  const { home, away } = game.finalScore;
  const keeper = game.homeKeeper ? 'home' : 'away';
  if (home === away) return 'D';
  if (keeper === 'home') return home > away ? 'W' : 'L';
  return away > home ? 'W' : 'L';
}

export function groupByOpponent(games: SavedGame[], profileName?: string, profileId?: string, teams?: Team[]): GroupedStats[] {
  const grouped = new Map<string, SavedGame[]>();

  for (const game of games) {
    const opponent = (game.setup.gameName || '').trim();
    if (!opponent) continue;
    const key = opponent.toLowerCase();
    const existing = grouped.get(key) ?? [];
    existing.push(game);
    grouped.set(key, existing);
  }

  const results: GroupedStats[] = [];

  for (const [, opponentGames] of grouped) {
    const displayName = opponentGames[0].setup.gameName || 'Unknown';
    let wins = 0;
    let draws = 0;
    let losses = 0;
    for (const g of opponentGames) {
      const result = getGameResult(g);
      if (result === 'W') wins++;
      else if (result === 'D') draws++;
      else if (result === 'L') losses++;
    }

    const mostRecent = opponentGames.reduce((latest, g) => {
      const gTime = new Date(g.createdAt).getTime();
      return gTime > latest ? gTime : latest;
    }, 0);

    const recordParts: string[] = [];
    if (wins > 0) recordParts.push(`${wins}W`);
    if (draws > 0) recordParts.push(`${draws}D`);
    if (losses > 0) recordParts.push(`${losses}L`);
    const record = recordParts.length > 0 ? recordParts.join(' ') : 'No results';

    results.push({
      label: displayName,
      sublabel: `${opponentGames.length} game${opponentGames.length !== 1 ? 's' : ''} — ${record}`,
      stats: aggregateGames(opponentGames, profileName, profileId, teams),
      gameIds: opponentGames.map(g => g.id),
      _sortKey: mostRecent,
    } as GroupedStats & { _sortKey: number });
  }

  results.sort((a, b) => ((b as any)._sortKey ?? 0) - ((a as any)._sortKey ?? 0));

  return results;
}
