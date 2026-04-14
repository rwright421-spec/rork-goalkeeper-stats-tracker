import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

let supabaseInstance: SupabaseClient | null = null;

// ---------------------------------------------------------------------------
// Supabase key usage:
//
// ANON KEY (EXPO_PUBLIC_SUPABASE_ANON_KEY)
//   - Used by createClient() below for the initial connection.
//   - Safe for client-side use; limited by Row Level Security (RLS) policies.
//   - Suitable for: table creation checks, public reads, unauthenticated RPCs.
//
// USER JWT (authenticated session token)
//   - Required for any query that touches user-specific data:
//       • games, goalkeeper profiles, teams, profile_members, profile_data
//   - After the user authenticates, call supabase.auth.setSession() so that
//     subsequent requests automatically include the user's JWT in the
//     Authorization header instead of the anon key.
//   - RLS policies on those tables should restrict access based on auth.uid().
// ---------------------------------------------------------------------------

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
    console.log('[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
    return null;
  }

  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log('[Supabase] Client initialized with URL:', url);
  return supabaseInstance;
}

const MIGRATION_KEY = 'gk_supabase_migrated_v3';

export async function ensureTables(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) {
    console.log('[Supabase] No client available - env vars may be missing');
    return false;
  }

  const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
  if (migrated === 'true') {
    console.log('[Supabase] Already migrated, skipping table check');
    return true;
  }

  try {
    const { error } = await sb.from('profiles').select('profile_id').limit(1);
    if (!error) {
      console.log('[Supabase] Tables exist and are accessible');
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      return true;
    }

    console.log('[Supabase] Table check result:', error.code, error.message);

    if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
      console.log('[Supabase] Tables do not exist, attempting creation...');
      const created = await tryCreateTables();
      if (created) {
        await AsyncStorage.setItem(MIGRATION_KEY, 'true');
        return true;
      }
    }

    if (error.code === 'PGRST302' || error.code === '42501') {
      console.log('[Supabase] Permission issue, tables may exist but need RLS policies. Attempting creation...');
      const created = await tryCreateTables();
      if (created) {
        await AsyncStorage.setItem(MIGRATION_KEY, 'true');
        return true;
      }
    }

    console.log('[Supabase] Could not verify tables, marking as ready anyway for operation-level error handling');
    return true;
  } catch (e) {
    console.log('[Supabase] ensureTables error:', e);
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
  last_edited_by TEXT,
  invite_code TEXT UNIQUE
);
`;

const CREATE_MEMBERS_SQL = `
CREATE TABLE IF NOT EXISTS profile_members (
  profile_id UUID REFERENCES profiles(profile_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
  display_name TEXT DEFAULT '',
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (profile_id, user_id)
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

const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code);
CREATE INDEX IF NOT EXISTS idx_profile_members_user ON profile_members(user_id);
`;

const ENABLE_RLS_SQL = `
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_members ENABLE ROW LEVEL SECURITY;
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'members_select') THEN
    CREATE POLICY members_select ON profile_members FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'members_insert') THEN
    CREATE POLICY members_insert ON profile_members FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'members_update') THEN
    CREATE POLICY members_update ON profile_members FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'members_delete') THEN
    CREATE POLICY members_delete ON profile_members FOR DELETE USING (true);
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
        console.log('[Supabase] SQL executed successfully via', endpoint);
        return true;
      }

      const text = await res.text().catch(() => '');
      console.log('[Supabase] SQL endpoint', endpoint, 'returned', res.status, text.slice(0, 200));
    } catch (e) {
      console.log('[Supabase] SQL endpoint', endpoint, 'failed:', e);
    }
  }

  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.rpc('exec_sql', { query: sql });
      if (!error) {
        console.log('[Supabase] SQL executed via Supabase RPC');
        return true;
      }
      console.log('[Supabase] RPC exec_sql failed:', error.message);
    } catch (e) {
      console.log('[Supabase] RPC attempt failed:', e);
    }
  }

  return false;
}

async function tryCreateTables(): Promise<boolean> {
  console.log('[Supabase] Attempting to create tables...');

  const fullSql = [
    CREATE_PROFILES_SQL,
    CREATE_MEMBERS_SQL,
    CREATE_PROFILE_DATA_SQL,
    CREATE_INDEXES_SQL,
    ENABLE_RLS_SQL,
    ENABLE_RLS_DATA_SQL,
    CREATE_POLICIES_SQL,
  ].join('\n');

  const fullSuccess = await executeSql(fullSql);
  if (fullSuccess) {
    console.log('[Supabase] All tables created successfully');
    return true;
  }

  console.log('[Supabase] Full SQL failed, trying individual statements...');

  const stepsInOrder = [
    { name: 'profiles table', sql: CREATE_PROFILES_SQL },
    { name: 'members table', sql: CREATE_MEMBERS_SQL },
    { name: 'profile_data table', sql: CREATE_PROFILE_DATA_SQL },
    { name: 'indexes', sql: CREATE_INDEXES_SQL },
    { name: 'RLS', sql: ENABLE_RLS_SQL },
    { name: 'RLS data', sql: ENABLE_RLS_DATA_SQL },
    { name: 'policies', sql: CREATE_POLICIES_SQL },
  ];

  let anySuccess = false;
  for (const step of stepsInOrder) {
    const ok = await executeSql(step.sql);
    console.log(`[Supabase] ${step.name}: ${ok ? 'OK' : 'FAILED'}`);
    if (ok) anySuccess = true;
  }

  if (anySuccess) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('profiles').select('profile_id').limit(1);
      if (!error) {
        console.log('[Supabase] Tables verified after individual creation');
        return true;
      }
    }
  }

  console.log('[Supabase] Table creation attempts completed. Some may have failed.');
  return false;
}

export async function resetMigrationCache(): Promise<void> {
  await AsyncStorage.removeItem(MIGRATION_KEY);
  console.log('[Supabase] Migration cache cleared');
}
