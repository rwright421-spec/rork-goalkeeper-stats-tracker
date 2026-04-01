import { SavedGame, KeeperData, calculateSavePercentage, getTotalSaves, getTotalGoalsAgainst, getOverallSavePercentage, getTotalDistribution, getTotalPenalties, getTotalShotsFaced, getShotsFaced } from '@/types/game';
import { AggregatedStats, GroupedStats } from '@/utils/statsAggregator';

function formatKeeperText(keeper: KeeperData, label: string): string {
  const totalSaves = getTotalSaves(keeper);
  const totalGA = getTotalGoalsAgainst(keeper);
  const totalSF = getTotalShotsFaced(keeper);
  const overallPct = getOverallSavePercentage(keeper);
  const h1Pct = calculateSavePercentage(keeper.firstHalf.saves, keeper.firstHalf.goalsAgainst);
  const h2Pct = calculateSavePercentage(keeper.secondHalf.saves, keeper.secondHalf.goalsAgainst);
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
  Saves: ${keeper.firstHalf.saves}
  Goals Against: ${keeper.firstHalf.goalsAgainst}
  Shots Faced: ${getShotsFaced(keeper.firstHalf.saves, keeper.firstHalf.goalsAgainst)}
  Save %: ${h1Pct}%

2nd Half:
  Saves: ${keeper.secondHalf.saves}
  Goals Against: ${keeper.secondHalf.goalsAgainst}
  Shots Faced: ${getShotsFaced(keeper.secondHalf.saves, keeper.secondHalf.goalsAgainst)}
  Save %: ${h2Pct}%

Totals:
  Saves: ${totalSaves}
  Goals Against: ${totalGA}
  Shots Faced: ${totalSF}
  Overall Save %: ${overallPct}%

1st Half Distribution:
  Crosses/Int: ${keeper.firstHalf.distribution.handledCrosses}  Punts: ${keeper.firstHalf.distribution.punts}  Throwouts / Rollouts: ${keeper.firstHalf.distribution.throwouts}  Drives: ${keeper.firstHalf.distribution.drives}  Drop Backs: ${keeper.firstHalf.distribution.dropBacks}

2nd Half Distribution:
  Crosses/Int: ${keeper.secondHalf.distribution.handledCrosses}  Punts: ${keeper.secondHalf.distribution.punts}  Throwouts / Rollouts: ${keeper.secondHalf.distribution.throwouts}  Drives: ${keeper.secondHalf.distribution.drives}  Drop Backs: ${keeper.secondHalf.distribution.dropBacks}

Total Distribution:
  Handled Crosses / Interceptions: ${getTotalDistribution(keeper).handledCrosses}
  Punts: ${getTotalDistribution(keeper).punts}
  Throwouts / Rollouts: ${getTotalDistribution(keeper).throwouts}
  Drives: ${getTotalDistribution(keeper).drives}
  Drop Backs: ${getTotalDistribution(keeper).dropBacks}

Penalties:
  Penalties Faced: ${totalPen.penaltiesFaced}
  Penalties Saved: ${totalPen.penaltiesSaved}
  Yellow Cards: ${totalPen.yellowCards}
  Red Cards: ${totalPen.redCards}`;

  if (keeper.shootout && (keeper.shootout.saves > 0 || keeper.shootout.goalsAgainst > 0)) {
    text += `

Shootout:
  Saves: ${keeper.shootout.saves}
  Goals Against: ${keeper.shootout.goalsAgainst}
  Shots Faced: ${keeper.shootout.saves + keeper.shootout.goalsAgainst}`;
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
  const h1Pct = calculateSavePercentage(keeper.firstHalf.saves, keeper.firstHalf.goalsAgainst);
  const h2Pct = calculateSavePercentage(keeper.secondHalf.saves, keeper.secondHalf.goalsAgainst);
  const totalSaves = getTotalSaves(keeper);
  const totalGA = getTotalGoalsAgainst(keeper);
  const totalSF = getTotalShotsFaced(keeper);
  const overallPct = getOverallSavePercentage(keeper);

  const dist = getTotalDistribution(keeper);
  const pen = getTotalPenalties(keeper);
  const escapedNotes = (keeper.notes || '').replace(/"/g, '""');
  const so = keeper.shootout ?? { saves: 0, goalsAgainst: 0 };
  return `${label},${keeper.name},${keeper.year},${keeper.teamName},${keeper.secondHalfName},${keeper.secondHalfYear},${keeper.secondHalfTeamName},${keeper.firstHalf.saves},${keeper.firstHalf.goalsAgainst},${h1Pct}%,${keeper.secondHalf.saves},${keeper.secondHalf.goalsAgainst},${h2Pct}%,${totalSaves},${totalGA},${totalSF},${overallPct}%,${dist.handledCrosses},${dist.punts},${dist.throwouts},${dist.drives},${dist.dropBacks},${pen.penaltiesFaced},${pen.penaltiesSaved},${pen.yellowCards},${pen.redCards},${so.saves},${so.goalsAgainst},${so.saves + so.goalsAgainst},"${escapedNotes}"`;
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
Save %: ${stats.savePercentage}%
Clean Sheets: ${stats.cleanSheets}
Total Saves: ${stats.totalSaves}
Goals Against: ${stats.totalGoalsAgainst}
Shots Faced: ${stats.totalShotsFaced}
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
  Penalties Faced: ${stats.penalties.penaltiesFaced}
  Penalties Saved: ${stats.penalties.penaltiesSaved}
  Yellow Cards: ${stats.penalties.yellowCards}
  Red Cards: ${stats.penalties.redCards}`;

  if (stats.shootout && (stats.shootout.saves > 0 || stats.shootout.goalsAgainst > 0)) {
    text += `

Shootout:
  Saves: ${stats.shootout.saves}
  Goals Against: ${stats.shootout.goalsAgainst}
  Shots Faced: ${stats.shootout.saves + stats.shootout.goalsAgainst}`;
  }

  return text;
}

export function formatStatsAsCSV(keeperName: string, groupMode: string, groups: GroupedStats[]): string {
  let csv = `Keeper,View\n"${keeperName}","${groupMode}"\n\n`;
  csv += `Group,Sublabel,Games,Save%,Clean Sheets,Total Saves,Goals Against,Shots Faced,Avg Saves/Game,Avg GA/Game,Crosses/Int,Punts,Throwouts / Rollouts,Drives,Drop Backs,PK Faced,PK Saved,Yellow Cards,Red Cards,SO Saves,SO GA,SO Shots\n`;

  for (const group of groups) {
    const s = group.stats;
    const so = s.shootout ?? { saves: 0, goalsAgainst: 0 };
    csv += `"${group.label}","${group.sublabel || ''}",${s.gamesPlayed},${s.savePercentage}%,${s.cleanSheets},${s.totalSaves},${s.totalGoalsAgainst},${s.totalShotsFaced},${s.avgSavesPerGame},${s.avgGoalsAgainstPerGame},${s.distribution.handledCrosses},${s.distribution.punts},${s.distribution.throwouts},${s.distribution.drives},${s.distribution.dropBacks},${s.penalties.penaltiesFaced},${s.penalties.penaltiesSaved},${s.penalties.yellowCards},${s.penalties.redCards},${so.saves},${so.goalsAgainst},${so.saves + so.goalsAgainst}\n`;
  }

  return csv;
}

export function formatGameAsCSV(game: SavedGame): string {
  let csv = `Competition,Date,Opponent,Keeper Type\n`;
  csv += `"${game.setup.eventName}","${game.setup.date}","${game.setup.gameName}","${game.setup.keeperSelection}"\n\n`;
  csv += `Side,Name,Year,Team,2H Name,2H Year,2H Team,H1 Saves,H1 GA,H1 Save%,H2 Saves,H2 GA,H2 Save%,Total Saves,Total GA,Shots Faced,Overall Save%,Crosses/Int,Punts,Throwouts / Rollouts,Drives,Drop Backs,PK Faced,PK Saved,Yellow Cards,Red Cards,SO Saves,SO GA,SO Shots,Notes\n`;

  if (game.homeKeeper) {
    csv += formatKeeperCSVRows(game.homeKeeper, 'Home') + '\n';
  }
  if (game.awayKeeper) {
    csv += formatKeeperCSVRows(game.awayKeeper, 'Away') + '\n';
  }

  return csv;
}
