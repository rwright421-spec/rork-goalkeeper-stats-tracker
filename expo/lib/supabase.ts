import * as Sentry from '@sentry/react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (__DEV__ && !url) {
    throw new Error(
      '[Supabase] EXPO_PUBLIC_SUPABASE_URL is undefined. ' +
      'Check your .env / environment variables configuration.'
    );
  }

  if (!url || !key) {
    if (__DEV__) { console.log('[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY'); }
    return null;
  }

  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseInstance;
}

const MIGRATION_KEY = 'gk_supabase_migrated_v3';

export async function ensureTables(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) {
    return false;
  }

  const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
  if (migrated === 'true') {
    return true;
  }

  try {
    const { error } = await sb.from('profiles').select('profile_id').limit(1);
    if (!error) {
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      return true;
    }

    if (__DEV__) { console.log('[Supabase] Table check result:', error.code, error.message); }

    if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
      const created = await tryCreateTables();
      if (created) {
        await AsyncStorage.setItem(MIGRATION_KEY, 'true');
        return true;
      }
    }

    if (error.code === 'PGRST302' || error.code === '42501') {
      const created = await tryCreateTables();
      if (created) {
        await AsyncStorage.setItem(MIGRATION_KEY, 'true');
        return true;
      }
    }

    return true;
  } catch (e) {
    Sentry.captureException(e);
    return true;
  }
}

const CREATE_PROFILES_SQL = `
CREATE TABLE IF NOT EXISTS profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  birth_year TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_edited_by TEXT
);
`;

const CREATE_PROFILE_DATA_SQL = `
CREATE TABLE IF NOT EXISTS profile_data (
  profile_id UUID REFERENCES profiles(profile_id) ON DELETE CASCADE,
  data_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (profile_id, data_key)
);
`;

const CREATE_INDEXES_SQL = ``;

const ENABLE_RLS_SQL = `
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
`;

const ENABLE_RLS_DATA_SQL = `
ALTER TABLE profile_data ENABLE ROW LEVEL SECURITY;
`;

const CREATE_POLICIES_SQL = `
DO $ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_select') THEN
    CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_insert') THEN
    CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update') THEN
    CREATE POLICY profiles_update ON profiles FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_delete') THEN
    CREATE POLICY profiles_delete ON profiles FOR DELETE USING (true);
  END IF;
END $;

DO $ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_data_select') THEN
    CREATE POLICY profile_data_select ON profile_data FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_data_insert') THEN
    CREATE POLICY profile_data_insert ON profile_data FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_data_update') THEN
    CREATE POLICY profile_data_update ON profile_data FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_data_delete') THEN
    CREATE POLICY profile_data_delete ON profile_data FOR DELETE USING (true);
  END IF;
END $;
`;

async function executeSql(sql: string): Promise<boolean> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;

  const endpoints = [
    `${url}/sql`,
    `${url}/rest/v1/rpc/exec_sql`,
  ];

  for (const endpoint of endpoints) {
    try {
      const isRpc = endpoint.includes('/rpc/');
      const body = isRpc ? JSON.stringify({ query: sql }) : sql;
      const contentType = isRpc ? 'application/json' : 'text/plain';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': contentType,
        },
        body,
      });

      if (res.ok) {
        return true;
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.rpc('exec_sql', { query: sql });
      if (!error) {
        return true;
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  return false;
}

async function tryCreateTables(): Promise<boolean> {
  const fullSql = [
    CREATE_PROFILES_SQL,
    CREATE_PROFILE_DATA_SQL,
    CREATE_INDEXES_SQL,
    ENABLE_RLS_SQL,
    ENABLE_RLS_DATA_SQL,
    CREATE_POLICIES_SQL,
  ].join('\n');

  const fullSuccess = await executeSql(fullSql);
  if (fullSuccess) {
    return true;
  }

  const stepsInOrder = [
    { name: 'profiles table', sql: CREATE_PROFILES_SQL },
    { name: 'profile_data table', sql: CREATE_PROFILE_DATA_SQL },
    { name: 'indexes', sql: CREATE_INDEXES_SQL },
    { name: 'RLS', sql: ENABLE_RLS_SQL },
    { name: 'RLS data', sql: ENABLE_RLS_DATA_SQL },
    { name: 'policies', sql: CREATE_POLICIES_SQL },
  ];

  let anySuccess = false;
  for (const step of stepsInOrder) {
    const ok = await executeSql(step.sql);
    if (ok) anySuccess = true;
  }

  if (anySuccess) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('profiles').select('profile_id').limit(1);
      if (!error) {
        return true;
      }
    }
  }

  return false;
}

export async function resetMigrationCache(): Promise<void> {
  await AsyncStorage.removeItem(MIGRATION_KEY);
}
