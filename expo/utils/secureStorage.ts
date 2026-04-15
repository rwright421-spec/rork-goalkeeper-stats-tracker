import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_KEYS = new Set([
  'gk_device_user_id',
  'gk_device_display_name',
]);

function isSecureKey(key: string): boolean {
  return SECURE_KEYS.has(key);
}

async function migrateFromSecureStore(key: string): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(key);
    if (value !== null) {
      console.log(`[Storage] Migrating key "${key}" from SecureStore to AsyncStorage`);
      await AsyncStorage.setItem(key, value);
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (_deleteErr) {
        console.log(`[Storage] Could not delete migrated key "${key}" from SecureStore`);
      }
      return value;
    }
  } catch (e) {
    console.log(`[Storage] No SecureStore data found for key "${key}":`, e);
  }
  return null;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    if (isSecureKey(key)) {
      await SecureStore.setItemAsync(key, serialized);
    } else {
      await AsyncStorage.setItem(key, serialized);
    }
  } catch (e) {
    console.error('[Storage] setItem error for key:', key, e);
    if (isSecureKey(key)) {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
        console.log('[Storage] Fallback to AsyncStorage succeeded for key:', key);
        return;
      } catch (fallbackErr) {
        console.error('[Storage] Fallback also failed:', fallbackErr);
      }
    }
    throw e;
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    if (isSecureKey(key)) {
      const raw = await SecureStore.getItemAsync(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    }

    let raw = await AsyncStorage.getItem(key);

    if (raw === null) {
      const migrated = await migrateFromSecureStore(key);
      if (migrated !== null) {
        raw = migrated;
      }
    }

    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('[Storage] getItem error for key:', key, e);
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (isSecureKey(key)) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
    try {
      if (!isSecureKey(key)) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (_) {
    }
  } catch (e) {
    console.error('[Storage] removeItem error for key:', key, e);
  }
}

export async function getRawString(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.error('[Storage] getRawString error:', e);
    return null;
  }
}

export async function setRawString(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    console.error('[Storage] setRawString error:', e);
    throw e;
  }
}
