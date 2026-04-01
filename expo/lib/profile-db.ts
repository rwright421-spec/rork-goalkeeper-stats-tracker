import { getSupabase } from './supabase';

export interface SharedProfile {
  profile_id: string;
  owner_id: string;
  name: string;
  birth_year: string;
  created_at: string;
  updated_at: string;
  last_edited_by: string | null;
  invite_code: string | null;
}

export interface ProfileMember {
  profile_id: string;
  user_id: string;
  role: 'owner' | 'editor';
  display_name: string;
  joined_at: string;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function fetchUserProfiles(userId: string): Promise<SharedProfile[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data: memberRows, error: memErr } = await sb
      .from('profile_members')
      .select('profile_id')
      .eq('user_id', userId);

    if (memErr || !memberRows || memberRows.length === 0) {
      console.log('[ProfileDB] No memberships found for user:', userId, memErr?.message);
      return [];
    }

    const profileIds = memberRows.map((r: { profile_id: string }) => r.profile_id);
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .in('profile_id', profileIds)
      .order('updated_at', { ascending: false });

    if (error) {
      console.log('[ProfileDB] Error fetching profiles:', error.message);
      return [];
    }

    return (data ?? []) as SharedProfile[];
  } catch (e) {
    console.log('[ProfileDB] fetchUserProfiles error:', e);
    return [];
  }
}

export async function createSharedProfile(
  userId: string,
  displayName: string,
  name: string,
  birthYear: string,
): Promise<SharedProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const inviteCode = generateInviteCode();

    const { data: profile, error: profileErr } = await sb
      .from('profiles')
      .insert({
        owner_id: userId,
        name: name.trim(),
        birth_year: birthYear.trim(),
        last_edited_by: userId,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (profileErr || !profile) {
      console.log('[ProfileDB] Error creating profile:', profileErr?.message);
      return null;
    }

    const { error: memberErr } = await sb
      .from('profile_members')
      .insert({
        profile_id: profile.profile_id,
        user_id: userId,
        role: 'owner',
        display_name: displayName,
      });

    if (memberErr) {
      console.log('[ProfileDB] Error adding owner as member:', memberErr.message);
    }

    console.log('[ProfileDB] Created profile:', profile.profile_id, 'code:', inviteCode);
    return profile as SharedProfile;
  } catch (e) {
    console.log('[ProfileDB] createSharedProfile error:', e);
    return null;
  }
}

export async function updateSharedProfile(
  profileId: string,
  userId: string,
  updates: { name?: string; birth_year?: string },
): Promise<SharedProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        last_edited_by: userId,
      })
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) {
      console.log('[ProfileDB] Error updating profile:', error.message);
      return null;
    }

    console.log('[ProfileDB] Updated profile:', profileId);
    return data as SharedProfile;
  } catch (e) {
    console.log('[ProfileDB] updateSharedProfile error:', e);
    return null;
  }
}

export async function deleteSharedProfile(profileId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb
      .from('profiles')
      .delete()
      .eq('profile_id', profileId);

    if (error) {
      console.log('[ProfileDB] Error deleting profile:', error.message);
      return false;
    }

    console.log('[ProfileDB] Deleted profile:', profileId);
    return true;
  } catch (e) {
    console.log('[ProfileDB] deleteSharedProfile error:', e);
    return false;
  }
}

export async function getProfileByInviteCode(code: string): Promise<SharedProfile | null> {
  const sb = getSupabase();
  if (!sb) {
    console.log('[ProfileDB] getProfileByInviteCode: No Supabase client');
    return null;
  }

  const upperCode = code.toUpperCase().trim();
  console.log('[ProfileDB] Looking up invite code:', upperCode);

  try {
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('invite_code', upperCode)
      .maybeSingle();

    if (error) {
      console.log('[ProfileDB] Error looking up code:', error.code, error.message, error.details);
      return null;
    }

    if (!data) {
      console.log('[ProfileDB] No profile found for code:', upperCode);
      return null;
    }

    console.log('[ProfileDB] Found profile for code:', data.profile_id, data.name);
    return data as SharedProfile;
  } catch (e) {
    console.log('[ProfileDB] getProfileByInviteCode exception:', e);
    return null;
  }
}

export async function joinProfileByCode(
  code: string,
  userId: string,
  displayName: string,
): Promise<{ profile: SharedProfile; alreadyMember: boolean } | null> {
  const profile = await getProfileByInviteCode(code);
  if (!profile) return null;

  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data: existing } = await sb
      .from('profile_members')
      .select('user_id')
      .eq('profile_id', profile.profile_id)
      .eq('user_id', userId)
      .single();

    if (existing) {
      console.log('[ProfileDB] User already a member of profile:', profile.profile_id);
      return { profile, alreadyMember: true };
    }

    const { error } = await sb
      .from('profile_members')
      .insert({
        profile_id: profile.profile_id,
        user_id: userId,
        role: 'editor',
        display_name: displayName,
      });

    if (error) {
      console.log('[ProfileDB] Error joining profile:', error.message);
      return null;
    }

    console.log('[ProfileDB] Joined profile:', profile.profile_id);
    return { profile, alreadyMember: false };
  } catch (e) {
    console.log('[ProfileDB] joinProfileByCode error:', e);
    return null;
  }
}

export async function getProfileMembers(profileId: string): Promise<ProfileMember[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('profile_members')
      .select('*')
      .eq('profile_id', profileId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.log('[ProfileDB] Error fetching members:', error.message);
      return [];
    }

    return (data ?? []) as ProfileMember[];
  } catch (e) {
    console.log('[ProfileDB] getProfileMembers error:', e);
    return [];
  }
}

export async function removeMember(profileId: string, userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb
      .from('profile_members')
      .delete()
      .eq('profile_id', profileId)
      .eq('user_id', userId);

    if (error) {
      console.log('[ProfileDB] Error removing member:', error.message);
      return false;
    }

    console.log('[ProfileDB] Removed member:', userId, 'from profile:', profileId);
    return true;
  } catch (e) {
    console.log('[ProfileDB] removeMember error:', e);
    return false;
  }
}

export async function regenerateInviteCode(profileId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const newCode = generateInviteCode();
  try {
    const { error } = await sb
      .from('profiles')
      .update({ invite_code: newCode })
      .eq('profile_id', profileId);

    if (error) {
      console.log('[ProfileDB] Error regenerating code:', error.message);
      return null;
    }

    return newCode;
  } catch (e) {
    console.log('[ProfileDB] regenerateInviteCode error:', e);
    return null;
  }
}

export async function getUserRole(profileId: string, userId: string): Promise<'owner' | 'editor' | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('profile_members')
      .select('role')
      .eq('profile_id', profileId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data.role as 'owner' | 'editor';
  } catch {
    return null;
  }
}

export async function leaveProfile(profileId: string, userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb
      .from('profile_members')
      .delete()
      .eq('profile_id', profileId)
      .eq('user_id', userId);

    if (error) {
      console.log('[ProfileDB] Error leaving profile:', error.message);
      return false;
    }

    console.log('[ProfileDB] User', userId, 'left profile:', profileId);
    return true;
  } catch (e) {
    console.log('[ProfileDB] leaveProfile error:', e);
    return false;
  }
}

export async function disableSharing(profileId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error: membersErr } = await sb
      .from('profile_members')
      .delete()
      .eq('profile_id', profileId);

    if (membersErr) {
      console.log('[ProfileDB] Error removing members:', membersErr.message);
    }

    const { error } = await sb
      .from('profiles')
      .delete()
      .eq('profile_id', profileId);

    if (error) {
      console.log('[ProfileDB] Error deleting shared profile:', error.message);
      return false;
    }

    console.log('[ProfileDB] Disabled sharing for profile:', profileId);
    return true;
  } catch (e) {
    console.log('[ProfileDB] disableSharing error:', e);
    return false;
  }
}

export async function getMemberDisplayName(userId: string): Promise<string> {
  const sb = getSupabase();
  if (!sb) return 'Unknown';

  try {
    const { data, error } = await sb
      .from('profile_members')
      .select('display_name')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (error || !data) return 'Unknown';
    return data.display_name || 'Unknown';
  } catch {
    return 'Unknown';
  }
}
