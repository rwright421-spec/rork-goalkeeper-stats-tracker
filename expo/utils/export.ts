import { SavedGame, KeeperData, calculateSavePercentage, getTotalSaves, getTotalGoalsAgainst, getOverallSavePercentage, getTotalDistribution, getTotalPenalties, getTotalShotsFaced, getShotsFaced, defaultHalfStats, getTotalOneVsOneSaved, getTotalOneVsOneGoals, getTotalOneVsOneMissed, getOneVsOneSavePercentage } from '@/types/game';
import { AggregatedStats, GroupedStats } from '@/utils/statsAggregator';

function formatKeeperText(keeper: KeeperData, label: string): string {
  const totalSaves = getTotalSaves(keeper);
  const totalGA = getTotalGoalsAgainst(keeper);
  const totalSF = getTotalShotsFaced(keeper);
  const overallPct = getOverallSavePercentage(keeper);
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  const h1Pct = calculateSavePercentage(fh.saves, fh.goalsAgainst);
  const h2Pct = calculateSavePercentage(sh.saves, sh.goalsAgainst);
  const has2ndHalfKeeper = keeper.secondHalfName !== keeper.name || keeper.secondHalfYear !== keeper.year || keeper.secondHalfTeamName !== keeper.teamName;
  const totalPen = getTotalPenalties(keeper);

  let text = `
--- ${label} KEEPER ---
Name: ${keeper.name}
Year: ${keeper.year}
Team: ${keeper.teamName}`;

  if (has2ndHalfKeeper) {
    text += `

2nd Half Keeper:
  Name: ${keeper.secondHalfName}
  Year: ${keeper.secondHalfYear}
  Team: ${keeper.secondHalfTeamName}`;
  }

  text += `

1st Half:
  Saves: ${fh.saves}
  Goals Against: ${fh.goalsAgainst}
  Shots on Target: ${getShotsFaced(fh.saves, fh.goalsAgainst)}
  Save %: ${h1Pct !== null ? `${h1Pct}%` : '—'}

2nd Half:
  Saves: ${sh.saves}
  Goals Against: ${sh.goalsAgainst}
  Shots on Target: ${getShotsFaced(sh.saves, sh.goalsAgainst)}
  Save %: ${h2Pct !== null ? `${h2Pct}%` : '—'}

Totals:
  Saves: ${totalSaves}
  Goals Against: ${totalGA}
  Shots on Target: ${totalSF}
  Overall Save %: ${overallPct !== null ? `${overallPct}%` : '—'}

1st Half Distribution:
  Crosses/Int: ${fh.distribution.handledCrosses}  Punts: ${fh.distribution.punts}  Throwouts / Rollouts: ${fh.distribution.throwouts}  Drives: ${fh.distribution.drives}  Drop Backs: ${fh.distribution.dropBacks}

2nd Half Distribution:
  Crosses/Int: ${sh.distribution.handledCrosses}  Punts: ${sh.distribution.punts}  Throwouts / Rollouts: ${sh.distribution.throwouts}  Drives: ${sh.distribution.drives}  Drop Backs: ${sh.distribution.dropBacks}

Total Distribution:
  Handled Crosses / Interceptions: ${getTotalDistribution(keeper).handledCrosses}
  Punts: ${getTotalDistribution(keeper).punts}
  Throwouts / Rollouts: ${getTotalDistribution(keeper).throwouts}
  Drives: ${getTotalDistribution(keeper).drives}
  Drop Backs: ${getTotalDistribution(keeper).dropBacks}

Penalties:
  PK Saved: ${totalPen.penaltiesSaved}
  PK Goal: ${totalPen.penaltyGoals}
  PK Missed: ${totalPen.penaltiesMissed}
  Yellow Cards: ${totalPen.yellowCards}
  Red Cards: ${totalPen.redCards}

1v1 Situations:
  1v1 Saved: ${getTotalOneVsOneSaved(keeper)}
  1v1 Goal: ${getTotalOneVsOneGoals(keeper)}
  1v1 Missed: ${getTotalOneVsOneMissed(keeper)}
  1v1 Save %: ${getOneVsOneSavePercentage(keeper) !== null ? `${getOneVsOneSavePercentage(keeper)}%` : '—'}`;

  if (keeper.shootout && (keeper.shootout.saves > 0 || keeper.shootout.goalsAgainst > 0)) {
    text += `

Shootout:
  Saves: ${keeper.shootout.saves}
  Goals Against: ${keeper.shootout.goalsAgainst}
  Shots on Target: ${keeper.shootout.saves + keeper.shootout.goalsAgainst}`;
  }

  if (keeper.notes) {
    text += `

Notes: ${keeper.notes}`;
  }

  return text;
}

export function formatGameAsText(game: SavedGame): string {
  let text = `GOALKEEPER PERFORMANCE REPORT
============================
Competition: ${game.setup.eventName}
Date: ${game.setup.date}
Opponent: ${game.setup.gameName}
Tracking: ${game.setup.keeperSelection === 'both' ? 'Home & Away' : game.setup.keeperSelection === 'home' ? 'Home Only' : 'Away Only'}`;

  text += '\n';

  if (game.homeKeeper) {
    text += formatKeeperText(game.homeKeeper, 'HOME');
  }
  if (game.awayKeeper) {
    text += '\n' + formatKeeperText(game.awayKeeper, 'AWAY');
  }

  if (game.finalScore) {
    text += `\n\nFinal Score: HOME ${game.finalScore.home} — AWAY ${game.finalScore.away}`;
  }

  return text;
}

function formatKeeperCSVRows(keeper: KeeperData, label: string): string {
  const fh = keeper.firstHalf ?? defaultHalfStats;
  const sh = keeper.secondHalf ?? defaultHalfStats;
  const h1Pct = calculateSavePercentage(fh.saves, fh.goalsAgainst);
  const h2Pct = calculateSavePercentage(sh.saves, sh.goalsAgainst);
  const totalSaves = getTotalSaves(keeper);
  const totalGA = getTotalGoalsAgainst(keeper);
  const totalSF = getTotalShotsFaced(keeper);
  const overallPct = getOverallSavePercentage(keeper);

  const dist = getTotalDistribution(keeper);
  const pen = getTotalPenalties(keeper);
  const escapedNotes = (keeper.notes || '').replace(/"/g, '""');
  const so = keeper.shootout ?? { saves: 0, goalsAgainst: 0 };
  const oSaved = getTotalOneVsOneSaved(keeper);
  const oGoals = getTotalOneVsOneGoals(keeper);
  const oMissed = getTotalOneVsOneMissed(keeper);
  const oPct = getOneVsOneSavePercentage(keeper);
  return `${label},${keeper.name},${keeper.year},${keeper.teamName},${keeper.secondHalfName},${keeper.secondHalfYear},${keeper.secondHalfTeamName},${fh.saves},${fh.goalsAgainst},${h1Pct !== null ? `${h1Pct}%` : '—'},${sh.saves},${sh.goalsAgainst},${h2Pct !== null ? `${h2Pct}%` : '—'},${totalSaves},${totalGA},${totalSF},${overallPct !== null ? `${overallPct}%` : '—'},${dist.handledCrosses},${dist.punts},${dist.throwouts},${dist.drives},${dist.dropBacks},${pen.penaltiesSaved},${pen.penaltyGoals},${pen.penaltiesMissed},${pen.yellowCards},${pen.redCards},${oSaved},${oGoals},${oMissed},${oPct !== null ? `${oPct}%` : '—'},${so.saves},${so.goalsAgainst},${so.saves + so.goalsAgainst},"${escapedNotes}"`;
}

export function formatStatsAsText(keeperName: string, groupMode: string, groups: GroupedStats[]): string {
  let text = `GOALKEEPER STATS SUMMARY\n============================\nKeeper: ${keeperName}\nView: ${groupMode}\n`;

  for (const group of groups) {
    text += `\n--- ${group.label} ---`;
    if (group.sublabel) text += `\n${group.sublabel}`;
    text += formatAggregatedText(group.stats);
  }

  return text;
}

function formatAggregatedText(stats: AggregatedStats): string {
  let text = `
Games Played: ${stats.gamesPlayed}
Save %: ${stats.savePercentage !== null ? `${stats.savePercentage}%` : '—'}
Clean Sheets: ${stats.cleanSheets}
Total Saves: ${stats.totalSaves}
Goals Against: ${stats.totalGoalsAgainst}
Shots on Target: ${stats.totalShotsFaced}
Avg Saves/Game: ${stats.avgSavesPerGame}
Avg GA/Game: ${stats.avgGoalsAgainstPerGame}`;

  text += `

Distribution:
  Crosses/Int: ${stats.distribution.handledCrosses}
  Punts: ${stats.distribution.punts}
  Throwouts / Rollouts: ${stats.distribution.throwouts}
  Drives: ${stats.distribution.drives}
  Drop Backs: ${stats.distribution.dropBacks}

Penalties:
  PK Saved: ${stats.penalties.penaltiesSaved}
  PK Goal: ${stats.penalties.penaltyGoals}
  PK Missed: ${stats.penalties.penaltiesMissed}
  Yellow Cards: ${stats.penalties.yellowCards}
  Red Cards: ${stats.penalties.redCards}

1v1 Situations:
  1v1 Saved: ${stats.oneVsOneSaved}
  1v1 Goal: ${stats.oneVsOneGoals}
  1v1 Missed: ${stats.oneVsOneMissed}
  1v1 Save %: ${stats.oneVsOneSavePercentage !== null ? `${stats.oneVsOneSavePercentage}%` : '—'}`;

  if (stats.shootout && (stats.shootout.saves > 0 || stats.shootout.goalsAgainst > 0)) {
    text += `

Shootout:
  Saves: ${stats.shootout.saves}
  Goals Against: ${stats.shootout.goalsAgainst}
  Shots on Target: ${stats.shootout.saves + stats.shootout.goalsAgainst}`;
  }

  return text;
}

export function formatStatsAsCSV(keeperName: string, groupMode: string, groups: GroupedStats[]): string {
  let csv = `Keeper,View\n"${keeperName}","${groupMode}"\n\n`;
  csv += `Group,Sublabel,Games,Save%,Clean Sheets,Total Saves,Goals Against,Shots on Target,Avg Saves/Game,Avg GA/Game,Crosses/Int,Punts,Throwouts / Rollouts,Drives,Drop Backs,PK Saved,PK Goal,PK Missed,Yellow Cards,Red Cards,1v1 Saved,1v1 Goal,1v1 Missed,1v1 Save%,SO Saves,SO GA,SO Shots\n`;

  for (const group of groups) {
    const s = group.stats;
    const so = s.shootout ?? { saves: 0, goalsAgainst: 0 };
    csv += `"${group.label}","${group.sublabel || ''}",${s.gamesPlayed},${s.savePercentage !== null ? `${s.savePercentage}%` : '—'},${s.cleanSheets},${s.totalSaves},${s.totalGoalsAgainst},${s.totalShotsFaced},${s.avgSavesPerGame},${s.avgGoalsAgainstPerGame},${s.distribution.handledCrosses},${s.distribution.punts},${s.distribution.throwouts},${s.distribution.drives},${s.distribution.dropBacks},${s.penalties.penaltiesSaved},${s.penalties.penaltyGoals},${s.penalties.penaltiesMissed},${s.penalties.yellowCards},${s.penalties.redCards},${s.oneVsOneSaved},${s.oneVsOneGoals},${s.oneVsOneMissed},${s.oneVsOneSavePercentage !== null ? `${s.oneVsOneSavePercentage}%` : '—'},${so.saves},${so.goalsAgainst},${so.saves + so.goalsAgainst}\n`;
  }

  return csv;
}

export function formatGameAsCSV(game: SavedGame): string {
  let csv = `Competition,Date,Opponent,Keeper Type\n`;
  csv += `"${game.setup.eventName}","${game.setup.date}","${game.setup.gameName}","${game.setup.keeperSelection}"\n\n`;
  csv += `Side,Name,Year,Team,2H Name,2H Year,2H Team,H1 Saves,H1 GA,H1 Save%,H2 Saves,H2 GA,H2 Save%,Total Saves,Total GA,Shots on Target,Overall Save%,Crosses/Int,Punts,Throwouts / Rollouts,Drives,Drop Backs,PK Saved,PK Goal,PK Missed,Yellow Cards,Red Cards,1v1 Saved,1v1 Goal,1v1 Missed,1v1 Save%,SO Saves,SO GA,SO Shots,Notes\n`;

  if (game.homeKeeper) {
    csv += formatKeeperCSVRows(game.homeKeeper, 'Home') + '\n';
  }
  if (game.awayKeeper) {
    csv += formatKeeperCSVRows(game.awayKeeper, 'Away') + '\n';
  }

  return csv;
}
