import type { AgeBand } from './ageBands';

export type StatInfo = {
  label: string;
  definition: string;
  countingRule: string;
  typicalRange?: string | Record<AgeBand, string>;
};

export const STAT_INFO: Record<string, StatInfo> = {
  totalMinutes: {
    label: 'Total Minutes',
    definition: 'Career total minutes the keeper was on the field across all games in the current view.',
    countingRule: 'Sums per-game Minutes Played from real half timers when available, falling back to halves played × half length for games tracked before the timer was added.',
    typicalRange: {
      u10: '40–50 min per game (career sums grow quickly)',
      u12: '50–60 min per game',
      u15: '70–80 min per game',
      u18: '80–90 min per game',
      adult: '90 min per full game',
    },
  },
  minutesPlayed: {
    label: 'Minutes Played',
    definition: 'Total minutes the keeper was on the field during this game.',
    countingRule: 'Derived from halves played and the selected half length. Set half length for each age group under Game Details.',
    typicalRange: {
      u10: '40–50 min per full game',
      u12: '50–60 min per full game',
      u15: '70–80 min per full game',
      u18: '80–90 min per full game',
      adult: '90 min per full game',
    },
  },
  competitionType: {
    label: 'Competition Type',
    definition: 'The type of match — league, tournament, friendly, or showcase.',
    countingRule: 'Selected from the Event field when creating a game. Useful for filtering recruiting-relevant games later.',
    typicalRange: 'Any competition level is valid — tag what the game actually was.',
  },
  homeAway: {
    label: 'Home / Away',
    definition: 'Whether the keeper played on their home field or away.',
    countingRule: 'Selected at game setup. Affects which side the keeper is tracked on in the final score.',
    typicalRange: 'Roughly a 50/50 split across a normal club season.',
  },
  shotsOnTarget: {
    label: 'Shots on Target',
    definition: 'Total number of shots that were on-frame — either saved or scored past the keeper.',
    countingRule: 'Automatically = Saves + Goals Allowed. Shots blocked by defenders, off-target shots, and misses are NOT counted.',
    typicalRange: {
      u10: '3–6 shots on target per game',
      u12: '4–7 shots on target per game',
      u15: '4–8 shots on target per game',
      u18: '3–7 shots on target per game',
      adult: '3–6 shots on target per game',
    },
  },
  goalsAllowed: {
    label: 'Goals Allowed',
    definition: 'Goals scored against the keeper from open play, 1v1s, and penalty kicks.',
    countingRule: 'Log each goal using the Goal, 1v1 Goal, or PK Goal button as appropriate. Shootout goals are tracked separately.',
    typicalRange: {
      u10: '1.5–3 goals per game',
      u12: '1.5–2.5 goals per game',
      u15: '1–2 goals per game',
      u18: '1–2 goals per game',
      adult: '1–1.5 goals per game',
    },
  },
  saves: {
    label: 'Saves',
    definition: 'Any shot on target the keeper stopped from becoming a goal.',
    countingRule: 'Log each save using the Save, 1v1 Save, or PK Save button. Deflections that go out of bounds count as saves.',
    typicalRange: {
      u10: '2–5 saves per game',
      u12: '3–5 saves per game',
      u15: '3–6 saves per game',
      u18: '3–6 saves per game',
      adult: '3–5 saves per game',
    },
  },
  savePercentage: {
    label: 'Save %',
    definition: 'Percentage of shots on target that were saved.',
    countingRule: 'Auto-calculated: Saves ÷ (Saves + Goals Allowed) × 100. Includes 1v1s and PKs by default; see RoP Save % to exclude penalties.',
    typicalRange: {
      u10: '60–70% is solid at this level',
      u12: '65–75% is solid',
      u15: '70–78% is competitive',
      u18: '72–80% is college-recruitable',
      adult: '75–82% at competitive adult levels',
    },
  },
  cleanSheet: {
    label: 'Clean Sheet',
    definition: 'A game in which the keeper allowed zero goals.',
    countingRule: 'Awarded automatically when total Goals Allowed = 0 at game end. Shootout goals do not break a clean sheet.',
    typicalRange: 'Roughly 20–35% of games for a strong keeper in a competitive league.',
  },
  oneVsOneFaced: {
    label: '1v1 Faced',
    definition: 'A shot taken when the attacker has only the keeper to beat, from a position where a goal is expected.',
    countingRule: 'Log a 1v1 Save or 1v1 Goal for each clear breakaway. If the attacker was not in a real scoring position, count it as a regular save or goal instead.',
    typicalRange: {
      u10: '0–2 per game',
      u12: '1–2 per game',
      u15: '1–3 per game',
      u18: '1–3 per game',
      adult: '1–2 per game',
    },
  },
  oneVsOneSaved: {
    label: '1v1 Saved',
    definition: 'A save made in a clear 1v1 situation.',
    countingRule: 'Tap 1v1 Save when the keeper stops a clear breakaway chance.',
    typicalRange: 'Strong keepers save 50–65% of their 1v1s.',
  },
  oneVsOneSaveRate: {
    label: '1v1 Save Rate',
    definition: 'Percentage of 1v1 chances the keeper saved.',
    countingRule: 'Auto-calculated: 1v1 Saves ÷ 1v1 Faced × 100.',
    typicalRange: {
      u10: '40–55% is expected',
      u12: '45–60% is expected',
      u15: '50–65% is competitive',
      u18: '55–70% is college-recruitable',
      adult: '55–70% at competitive adult levels',
    },
  },
  ballInteractionsTotal: {
    label: 'Ball Interactions',
    definition: "Every keeper interaction with the ball that isn't a shot faced. Tracked as a count per game across five types: Crosses/Interceptions, Punts, Throwouts/Rollouts, Drives, and Drop Backs. The headline number is the sum of all five.",
    countingRule: "Count one per discrete touch sequence under the type that best describes the action. A shot save is not a ball interaction — that's tracked under Saves.",
  },
  crossesClaimed: {
    label: 'Crosses / Interceptions',
    definition: 'A crossed ball the keeper caught, punched, or intercepted cleanly.',
    countingRule: 'Tap + for each successful claim or interception of a cross into the box.',
  },
  punts: {
    label: 'Punts',
    definition: 'A long kick from the keeper\'s hands to clear or restart play.',
    countingRule: 'Tap + for each punt attempted, regardless of outcome.',
  },
  throwouts: {
    label: 'Throwouts / Rollouts',
    definition: 'A throw or roll-out distribution from the keeper to a teammate.',
    countingRule: 'Tap + for each throw or roll-out distribution.',
  },
  drives: {
    label: 'Drives',
    definition: 'A driven kick from the ground or out of the keeper\'s hands.',
    countingRule: 'Tap + for each drive attempted, regardless of outcome.',
  },
  dropBacks: {
    label: 'Drop Backs',
    definition: 'A back-pass or drop-back received and played by the keeper.',
    countingRule: 'Tap + each time the keeper plays a back-pass from a teammate.',
  },
  crossesPunched: {
    label: 'Crosses Punched',
    definition: 'A cross cleared with the fists when catching was not safe.',
    countingRule: 'Log punched clearances separately from clean catches to reflect decision-making.',
    typicalRange: '0–2 punches per game is typical; heavy crossing games may see more.',
  },
  crossesDropped: {
    label: 'Crosses Dropped',
    definition: 'A cross the keeper attempted to claim but did not control.',
    countingRule: 'Log any dropped ball on a cross, whether or not it led to a shot.',
    typicalRange: '0–1 per game at competitive levels; anything higher is a focus area.',
  },
  cornersFaced: {
    label: 'Corners Faced',
    definition: 'Total corner kicks defended by the keeper\'s team.',
    countingRule: 'Log each corner once it is taken against the keeper\'s team.',
    typicalRange: '3–7 corners per game is typical.',
  },
  cornersSaved: {
    label: 'Corners Saved',
    definition: 'Corners that did not lead to a goal.',
    countingRule: 'A corner counts as saved if no goal resulted within the corner\'s sequence.',
    typicalRange: 'Strong teams concede a goal on fewer than 10% of corners faced.',
  },
  freeKicksFaced: {
    label: 'Free Kicks Faced',
    definition: 'Direct free kicks where the keeper is expected to defend the goal.',
    countingRule: 'Log only direct free kicks in shooting range. Indirect and cleared free kicks are not counted.',
    typicalRange: '1–3 shooting-range free kicks per game.',
  },
  freeKicksSaved: {
    label: 'Free Kicks Saved',
    definition: 'Direct free kicks the keeper stopped from becoming a goal.',
    countingRule: 'Counts as a Save as well. Track here for the breakout metric.',
    typicalRange: 'Most free kicks in range should be saved; 70–85% is typical.',
  },
  errorsLeadingToShots: {
    label: 'Errors Leading to Shots',
    definition: 'A keeper mistake (misplay, poor distribution, miscommunication) that directly led to a shot on goal.',
    countingRule: 'Honest self-scouting metric — log the event even if a teammate eventually cleared.',
    typicalRange: '0–1 per game; anything higher is a coaching point.',
  },
  errorsLeadingToGoals: {
    label: 'Errors Leading to Goals',
    definition: 'A keeper mistake that directly led to a goal being conceded.',
    countingRule: 'Log only when the error was the proximate cause of the goal.',
    typicalRange: '0 is the target; college recruiters watch this closely.',
  },
  penaltiesFaced: {
    label: 'PKs Faced',
    definition: 'In-game penalty kicks awarded against the keeper\'s team (not shootout PKs).',
    countingRule: 'Log each regular-time PK using PK Save or PK Goal. If the game went to a shootout and you want those PKs included, enable "Include penalty shootout in stats" on the save screen.',
    typicalRange: '0–1 PKs per game is typical across a season.',
  },
  penaltiesSaved: {
    label: 'PKs Saved',
    definition: 'Penalty kicks the keeper stopped.',
    countingRule: 'Tap PK Save for each saved PK.',
    typicalRange: '15–25% of PKs faced is typical at competitive levels.',
  },
  pkSaveRate: {
    label: 'PK Save Rate',
    definition: 'Percentage of penalty kicks the keeper saved.',
    countingRule: 'Auto-calculated: PK Saves ÷ PK Faced × 100.',
    typicalRange: {
      u10: '20–35% is solid',
      u12: '20–35% is solid',
      u15: '20–30% is competitive',
      u18: '20–30% is college-recruitable',
      adult: '20–30% at competitive adult levels',
    },
  },
  gaa: {
    label: 'Goals Against Average (GAA)',
    definition: 'Average goals conceded per 90 minutes played.',
    countingRule: 'Auto-calculated: Total Goals Allowed ÷ Total Minutes Played × 90.',
    typicalRange: {
      u10: '2.0–3.0 GAA is typical',
      u12: '1.5–2.5 GAA is typical',
      u15: '1.0–2.0 GAA is competitive',
      u18: '0.8–1.5 GAA is college-recruitable',
      adult: '0.8–1.3 GAA at competitive adult levels',
    },
  },
  cleanSheetPercent: {
    label: 'Clean Sheet %',
    definition: 'Percentage of games finished with zero goals allowed.',
    countingRule: 'Auto-calculated: Clean Sheets ÷ Games Played × 100.',
    typicalRange: '20–35% is strong at most competitive levels.',
  },
  crossesClaimedPercent: {
    label: 'Crosses Claimed %',
    definition: 'Percentage of crosses the keeper successfully dealt with.',
    countingRule: 'Auto-calculated across claimed, punched, and dropped crosses.',
    typicalRange: '70–85% is competitive; recruiters value keepers above 80%.',
  },
  ropSavePercentage: {
    label: 'Run-of-Play Save %',
    definition: 'Save percentage excluding penalty kicks — reflects open-play shot-stopping only.',
    countingRule: 'Auto-calculated: (Saves − PK Saves) ÷ (Shots on Target − PKs on Target) × 100.',
    typicalRange: {
      u10: '65–75%',
      u12: '70–78%',
      u15: '72–80%',
      u18: '75–82%',
      adult: '78–85%',
    },
  },
};
