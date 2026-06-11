"use client";

/**
 * Client-side vault crypto. The derived key and all plaintext live only in
 * the browser; the server stores ciphertext exclusively.
 *
 * Master password -> PBKDF2-SHA256 (600k iterations, random salt)
 *                 -> AES-256-GCM key, fresh random IV per encryption.
 *
 * There is deliberately no recovery path: losing the master password
 * means losing the vault contents.
 */

const KEY_CHECK_PLAINTEXT = "life-os-vault-check-v1";
export const PBKDF2_ITERATIONS = 600_000;
const SESSION_KEY = "vault-key-v1";

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function deriveKey(
  password: string,
  saltB64: string,
  iterations: number
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: b64decode(saltB64) as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    true, // extractable so the key can persist in sessionStorage for the tab session
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedBlob {
  iv: string; // base64, 12 bytes
  ct: string; // base64
}

export async function encrypt(
  key: CryptoKey,
  plaintext: string
): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext)
  );
  return { iv: b64encode(iv), ct: b64encode(ct) };
}

export async function decrypt(
  key: CryptoKey,
  blob: EncryptedBlob
): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(blob.iv) as BufferSource },
    key,
    b64decode(blob.ct) as BufferSource
  );
  return new TextDecoder().decode(pt);
}

export function newSalt(): string {
  return b64encode(crypto.getRandomValues(new Uint8Array(16)));
}

export async function makeKeyCheck(key: CryptoKey): Promise<string> {
  return JSON.stringify(await encrypt(key, KEY_CHECK_PLAINTEXT));
}

export async function verifyKeyCheck(
  key: CryptoKey,
  keyCheck: string
): Promise<boolean> {
  try {
    const blob = JSON.parse(keyCheck) as EncryptedBlob;
    return (await decrypt(key, blob)) === KEY_CHECK_PLAINTEXT;
  } catch {
    return false;
  }
}

// ---- per-tab session persistence (cleared when the tab closes) ----

export async function storeSessionKey(key: CryptoKey): Promise<void> {
  const raw = await crypto.subtle.exportKey("raw", key);
  sessionStorage.setItem(SESSION_KEY, b64encode(raw));
}

export async function loadSessionKey(): Promise<CryptoKey | null> {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return await crypto.subtle.importKey(
      "raw",
      b64decode(raw) as BufferSource,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  } catch {
    return null;
  }
}

export function clearSessionKey(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function generatePassword(length = 20): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+?";
  const all = upper + lower + digits + symbols;
  const rand = (max: number) => {
    // rejection sampling to avoid modulo bias
    const limit = Math.floor(256 / max) * max;
    let v: number;
    do {
      v = crypto.getRandomValues(new Uint8Array(1))[0];
    } while (v >= limit);
    return v % max;
  };
  const chars = [
    upper[rand(upper.length)],
    lower[rand(lower.length)],
    digits[rand(digits.length)],
    symbols[rand(symbols.length)],
  ];
  while (chars.length < length) chars.push(all[rand(all.length)]);
  // Fisher-Yates with crypto randomness
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
