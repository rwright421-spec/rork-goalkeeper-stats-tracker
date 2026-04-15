import * as SecureStore from 'expo-secure-store';

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    await SecureStore.setItemAsync(key, serialized);
  } catch (e) {
    console.error('[SecureStorage] Error:', e);
    throw e;
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('[SecureStorage] Error:', e);
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.error('[SecureStorage] Error:', e);
  }
}

export async function getRawString(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.error('[SecureStorage] Error:', e);
    return null;
  }
}

export async function setRawString(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    console.error('[SecureStorage] Error:', e);
    throw e;
  }
}
