import { Platform, Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';
import * as secureStorage from '@/utils/secureStorage';
import { GoalkeeperProfile, Team, SavedGame } from '@/types/game';
import {
  GoalkeeperProfileSchema,
  TeamSchema,
  SavedGameSchema,
  validateAndSanitizeArray,
} from '@/utils/validation';
import { z } from 'zod';

const CURRENT_SCHEMA_VERSION = 1;

export interface ExportPayload {
  schemaVersion: number;
  exportDate: string;
  profiles: GoalkeeperProfile[];
  games: Record<string, SavedGame[]>;
  teams: Record<string, Team[]>;
}

const ExportPayloadSchema = z.object({
  schemaVersion: z.number().int().min(1),
  exportDate: z.string(),
  profiles: z.array(z.unknown()),
  games: z.record(z.string(), z.array(z.unknown())),
  teams: z.record(z.string(), z.array(z.unknown())),
});

export async function gatherExportData(): Promise<ExportPayload> {
  const profiles = await secureStorage.getItem<GoalkeeperProfile[]>('gk_tracker_profiles') ?? [];

  const games: Record<string, SavedGame[]> = {};
  const teams: Record<string, Team[]> = {};

  const guestGames = await secureStorage.getItem<SavedGame[]>('gk_tracker_games_guest');
  if (guestGames && guestGames.length > 0) {
    games['guest'] = guestGames;
  }

  const guestTeams = await secureStorage.getItem<Team[]>('gk_tracker_teams_guest');
  if (guestTeams && guestTeams.length > 0) {
    teams['guest'] = guestTeams;
  }

  for (const profile of profiles) {
    const profileGames = await secureStorage.getItem<SavedGame[]>(`gk_tracker_games_${profile.id}`);
    if (profileGames && profileGames.length > 0) {
      games[profile.id] = profileGames;
    }

    const profileTeams = await secureStorage.getItem<Team[]>(`gk_tracker_teams_${profile.id}`);
    if (profileTeams && profileTeams.length > 0) {
      teams[profile.id] = profileTeams;
    }
  }

  const payload: ExportPayload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportDate: new Date().toISOString(),
    profiles,
    games,
    teams,
  };

  return payload;
}

export interface ImportResult {
  profilesAdded: number;
  profilesSkipped: number;
  gamesAdded: number;
  gamesSkipped: number;
  teamsAdded: number;
  teamsSkipped: number;
}

export function validateImportPayload(raw: unknown): { success: true; data: ExportPayload } | { success: false; error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { success: false, error: 'Invalid file format: expected a JSON object' };
  }

  const parsed = ExportPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    Sentry.captureMessage('Import validation failed', { level: 'warning', extra: { errors: msg } });
    return { success: false, error: `Invalid export file structure: ${msg}` };
  }

  const data = parsed.data;

  const validProfiles = validateAndSanitizeArray('GoalkeeperProfile', data.profiles);
  const validGames: Record<string, SavedGame[]> = {};
  const validTeams: Record<string, Team[]> = {};

  for (const [key, gameArr] of Object.entries(data.games)) {
    if (Array.isArray(gameArr)) {
      validGames[key] = validateAndSanitizeArray('SavedGame', gameArr);
    }
  }

  for (const [key, teamArr] of Object.entries(data.teams)) {
    if (Array.isArray(teamArr)) {
      validTeams[key] = validateAndSanitizeArray('Team', teamArr);
    }
  }

  return {
    success: true,
    data: {
      schemaVersion: data.schemaVersion,
      exportDate: data.exportDate,
      profiles: validProfiles,
      games: validGames,
      teams: validTeams,
    },
  };
}

export async function mergeImportData(importData: ExportPayload): Promise<ImportResult> {
  const result: ImportResult = {
    profilesAdded: 0,
    profilesSkipped: 0,
    gamesAdded: 0,
    gamesSkipped: 0,
    teamsAdded: 0,
    teamsSkipped: 0,
  };

  const existingProfiles = await secureStorage.getItem<GoalkeeperProfile[]>('gk_tracker_profiles') ?? [];
  const existingProfileMap = new Map(existingProfiles.map(p => [p.id, p]));

  for (const profile of importData.profiles) {
    const existing = existingProfileMap.get(profile.id);
    if (existing) {
      const existingDate = new Date(existing.updatedAt ?? existing.createdAt).getTime();
      const importDate = new Date(profile.updatedAt ?? profile.createdAt).getTime();
      if (importDate > existingDate) {
        existingProfileMap.set(profile.id, profile);
        result.profilesAdded++;
      } else {
        result.profilesSkipped++;
      }
    } else {
      existingProfileMap.set(profile.id, profile);
      result.profilesAdded++;
    }
  }

  const mergedProfiles = Array.from(existingProfileMap.values());
  await secureStorage.setItem('gk_tracker_profiles', mergedProfiles);

  for (const [profileKey, importGames] of Object.entries(importData.games)) {
    const storageKey = profileKey === 'guest' ? 'gk_tracker_games_guest' : `gk_tracker_games_${profileKey}`;
    const existingGames = await secureStorage.getItem<SavedGame[]>(storageKey) ?? [];
    const gameMap = new Map(existingGames.map(g => [g.id, g]));

    for (const game of importGames) {
      const existing = gameMap.get(game.id);
      if (existing) {
        const existingDate = new Date(existing.createdAt).getTime();
        const importDate = new Date(game.createdAt).getTime();
        if (importDate > existingDate) {
          gameMap.set(game.id, game);
          result.gamesAdded++;
        } else {
          result.gamesSkipped++;
        }
      } else {
        gameMap.set(game.id, game);
        result.gamesAdded++;
      }
    }

    const mergedGames = Array.from(gameMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    await secureStorage.setItem(storageKey, mergedGames);
  }

  for (const [profileKey, importTeams] of Object.entries(importData.teams)) {
    const storageKey = profileKey === 'guest' ? 'gk_tracker_teams_guest' : `gk_tracker_teams_${profileKey}`;
    const existingTeams = await secureStorage.getItem<Team[]>(storageKey) ?? [];
    const teamMap = new Map(existingTeams.map(t => [t.id, t]));

    for (const team of importTeams) {
      const existing = teamMap.get(team.id);
      if (existing) {
        const existingDate = new Date(existing.createdAt).getTime();
        const importDate = new Date(team.createdAt).getTime();
        if (importDate > existingDate) {
          teamMap.set(team.id, team);
          result.teamsAdded++;
        } else {
          result.teamsSkipped++;
        }
      } else {
        teamMap.set(team.id, team);
        result.teamsAdded++;
      }
    }

    const mergedTeams = Array.from(teamMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    await secureStorage.setItem(storageKey, mergedTeams);
  }

  return result;
}
