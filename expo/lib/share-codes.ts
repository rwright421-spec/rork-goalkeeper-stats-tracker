import { Platform } from 'react-native';

export interface SharePayload {
  name: string;
  birthYear: string;
  sourceId: string;
}

const PREFIX = 'GK';

function toBase64(str: string): string {
  if (Platform.OS === 'web') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const a = bytes[i++] ?? 0;
    const b = bytes[i++] ?? 0;
    const c = bytes[i++] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    result += chars[(triple >> 18) & 0x3f];
    result += chars[(triple >> 12) & 0x3f];
    result += (i - 2 < bytes.length + 1) ? chars[(triple >> 6) & 0x3f] : '=';
    result += (i - 1 < bytes.length + 1) ? chars[triple & 0x3f] : '=';
  }
  return result;
}

function fromBase64(encoded: string): string {
  if (Platform.OS === 'web') {
    return decodeURIComponent(escape(atob(encoded)));
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const clean = encoded.replace(/[^A-Za-z0-9+/]/g, '');
  for (let i = 0; i < clean.length; i += 4) {
    const a = chars.indexOf(clean[i]);
    const b = chars.indexOf(clean[i + 1]);
    const c = chars.indexOf(clean[i + 2]);
    const d = chars.indexOf(clean[i + 3]);
    const triple = (a << 18) | (b << 12) | ((c >= 0 ? c : 0) << 6) | (d >= 0 ? d : 0);
    result += String.fromCharCode((triple >> 16) & 0xff);
    if (c >= 0) result += String.fromCharCode((triple >> 8) & 0xff);
    if (d >= 0) result += String.fromCharCode(triple & 0xff);
  }
  return result;
}

function makeUrlSafe(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafe(safe: string): string {
  let b64 = safe.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return b64;
}

export function encodeShareCode(payload: SharePayload): string {
  const compact = `${payload.name}|${payload.birthYear}|${payload.sourceId}`;
  const encoded = makeUrlSafe(toBase64(compact));
  return `${PREFIX}-${encoded}`;
}

export function decodeShareCode(code: string): SharePayload | null {
  try {
    const trimmed = code.trim();
    
    if (!trimmed.startsWith(`${PREFIX}-`)) {
      console.log('[ShareCodes] Invalid prefix, expected GK-');
      return null;
    }

    const encoded = trimmed.slice(PREFIX.length + 1);
    const b64 = fromUrlSafe(encoded);
    const decoded = fromBase64(b64);
    const parts = decoded.split('|');

    if (parts.length < 2) {
      console.log('[ShareCodes] Invalid payload parts:', parts.length);
      return null;
    }

    const name = parts[0] ?? '';
    const birthYear = parts[1] ?? '';
    const sourceId = parts[2] ?? '';

    if (!name) {
      console.log('[ShareCodes] Empty name in payload');
      return null;
    }

    console.log('[ShareCodes] Decoded:', { name, birthYear, sourceId });
    return { name, birthYear, sourceId };
  } catch (e) {
    console.log('[ShareCodes] Decode error:', e);
    return null;
  }
}

export function isValidShareCode(code: string): boolean {
  return code.trim().startsWith(`${PREFIX}-`) && code.trim().length > 4;
}
