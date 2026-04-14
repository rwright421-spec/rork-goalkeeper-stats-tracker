import * as SecureStore from 'expo-secure-store';

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    await SecureStore.setItemAsync(key, serialized);
    console.log('[secureStorage] Saved key:', key, '- size:', serialized.length);
  } catch (e) {
    console.log('[secureStorage] Error saving key:', key, e);
    throw e;
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.log('[secureStorage] Error reading key:', key, e);
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
    console.log('[secureStorage] Removed key:', key);
  } catch (e) {
    console.log('[secureStorage] Error removing key:', key, e);
  }
}

export async function getRawString(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.log('[secureStorage] Error reading raw key:', key, e);
    return null;
  }
}

export async function setRawString(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    console.log('[secureStorage] Error saving raw key:', key, e);
    throw e;
  }
}
