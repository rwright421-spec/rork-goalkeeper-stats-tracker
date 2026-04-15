import { z } from 'zod';
import type {
  GoalkeeperProfile,
  Team,
  SavedGame,
  HalfStats,
  DistributionStats,
  PenaltyStats,
  KeeperData,
  ShootoutStats,
  FinalScore,
  GameSetup,
} from '@/types/game';

const stat = z.number().int().min(0).max(999).default(0);

const DistributionStatsSchema: z.ZodType<DistributionStats> = z.object({
  handledCrosses: stat,
  punts: stat,
  throwouts: stat,
  drives: stat,
  dropBacks: stat,
});

const PenaltyStatsSchema: z.ZodType<PenaltyStats> = z.object({
  penaltiesFaced: stat,
  penaltiesSaved: stat,
  redCards: stat,
  yellowCards: stat,
});

const HalfStatsSchema: z.ZodType<HalfStats> = z.object({
  saves: stat,
  goalsAgainst: stat,
  distribution: DistributionStatsSchema.default({
    handledCrosses: 0,
    punts: 0,
    throwouts: 0,
    drives: 0,
    dropBacks: 0,
  }),
  penalties: PenaltyStatsSchema.default({
    penaltiesFaced: 0,
    penaltiesSaved: 0,
    redCards: 0,
    yellowCards: 0,
  }),
  oneVsOneFaced: stat,
  oneVsOneSaved: stat,
});

const ShootoutStatsSchema: z.ZodType<ShootoutStats> = z.object({
  saves: stat,
  goalsAgainst: stat,
});

const KeeperDataSchema: z.ZodType<KeeperData> = z.object({
  name: z.string().max(50).default(''),
  year: z.string().default(''),
  teamName: z.string().max(50).default(''),
  secondHalfName: z.string().max(50).default(''),
  secondHalfYear: z.string().default(''),
  secondHalfTeamName: z.string().max(50).default(''),
  notes: z.string().default(''),
  firstHalf: HalfStatsSchema.default({
    saves: 0,
    goalsAgainst: 0,
    distribution: { handledCrosses: 0, punts: 0, throwouts: 0, drives: 0, dropBacks: 0 },
    penalties: { penaltiesFaced: 0, penaltiesSaved: 0, redCards: 0, yellowCards: 0 },
    oneVsOneFaced: 0,
    oneVsOneSaved: 0,
  }),
  secondHalf: HalfStatsSchema.default({
    saves: 0,
    goalsAgainst: 0,
    distribution: { handledCrosses: 0, punts: 0, throwouts: 0, drives: 0, dropBacks: 0 },
    penalties: { penaltiesFaced: 0, penaltiesSaved: 0, redCards: 0, yellowCards: 0 },
    oneVsOneFaced: 0,
    oneVsOneSaved: 0,
  }),
  shootout: ShootoutStatsSchema.optional(),
  keeperProfileId: z.string().nullable().optional().default(null),
  keeperIsLinked: z.boolean().optional().default(false),
  secondHalfKeeperProfileId: z.string().nullable().optional().default(null),
  secondHalfKeeperIsLinked: z.boolean().optional().default(false),
  halvesPlayed: z.number().int().min(1).max(4).optional().default(2),
});

const FinalScoreSchema: z.ZodType<FinalScore> = z.object({
  home: stat,
  away: stat,
});

const GameSetupSchema: z.ZodType<GameSetup> = z.object({
  eventName: z.string().default(''),
  date: z.string().default(''),
  gameName: z.string().default(''),
  keeperSelection: z.enum(['home', 'away', 'both']).default('home'),
  ageGroup: z.enum(['U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', '']).optional().default(''),
});

export const GoalkeeperProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(50).default('Unknown'),
  birthYear: z.string().default(''),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().optional(),
  lastEditedBy: z.string().optional(),
  inviteCode: z.string().optional(),
  ownerId: z.string().optional(),
  isShared: z.boolean().optional(),
  sharedProfileId: z.string().optional(),
});

export const TeamSchema = z.object({
  id: z.string().min(1),
  goalkeeperProfileId: z.string().default('guest'),
  year: z.string().default(''),
  teamName: z.string().max(50).default('Unknown Team'),
  halfLengthMinutes: z.number().int().min(10).max(60).optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
});

export const SavedGameSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().optional(),
  setup: GameSetupSchema.default({
    eventName: '',
    date: '',
    gameName: '',
    keeperSelection: 'home',
    ageGroup: '',
  }),
  homeKeeper: KeeperDataSchema.optional(),
  awayKeeper: KeeperDataSchema.optional(),
  finalScore: FinalScoreSchema.optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
});

type SchemaType = 'GoalkeeperProfile' | 'Team' | 'SavedGame';

const schemaMap: Record<SchemaType, z.ZodType> = {
  GoalkeeperProfile: GoalkeeperProfileSchema,
  Team: TeamSchema,
  SavedGame: SavedGameSchema,
};

type SchemaOutput<T extends SchemaType> =
  T extends 'GoalkeeperProfile' ? GoalkeeperProfile :
  T extends 'Team' ? Team :
  T extends 'SavedGame' ? SavedGame :
  never;

function describeShape(data: unknown): string {
  if (data === null) return 'null';
  if (data === undefined) return 'undefined';
  if (Array.isArray(data)) return `Array(${data.length})`;
  if (typeof data === 'object') {
    try {
      return `Object(${Object.keys(data as Record<string, unknown>).join(',')})`;
    } catch {
      return 'Object(unknown)';
    }
  }
  return typeof data;
}

export function validateAndSanitize<T extends SchemaType>(
  schemaType: T,
  data: unknown,
): { success: true; data: SchemaOutput<T> } | { success: false; error: string } {
  const schema = schemaMap[schemaType];
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as SchemaOutput<T> };
  }

  const errorDetails = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
  const shape = describeShape(data);

  if (__DEV__) {
    console.warn(`[Validation DEV] ${schemaType} validation failed:\n  Shape: ${shape}\n  Errors: ${errorDetails}`);
  }

  console.warn(`[Validation] ${schemaType} failed: ${errorDetails}`);

  return { success: false, error: errorDetails };
}

export function validateAndSanitizeArray<T extends SchemaType>(
  schemaType: T,
  data: unknown[],
): SchemaOutput<T>[] {
  const validated: SchemaOutput<T>[] = [];
  let skippedCount = 0;
  for (const item of data) {
    const result = validateAndSanitize(schemaType, item);
    if (result.success) {
      validated.push(result.data);
    } else {
      skippedCount++;
    }
  }

  if (skippedCount > 0) {
    if (__DEV__) {
      console.warn(`[Validation DEV] ${skippedCount} ${schemaType} items failed validation and were dropped`);
    }
    console.warn(`[Validation] ${skippedCount} ${schemaType} items failed array validation (${validated.length}/${data.length} valid)`);
  }

  return validated;
}
