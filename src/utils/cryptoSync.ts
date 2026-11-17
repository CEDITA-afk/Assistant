import type { WorkspaceData } from '../types/workspace';

export interface EncryptedVaultPayload {
  app: 'cadence-workspace';
  version: number;
  algorithm: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptWorkspaceData(
  data: WorkspaceData,
  passphrase: string
): Promise<EncryptedVaultPayload> {
  if (!passphrase || passphrase.trim().length < 6) {
    throw new Error('Passphrase must be at least 6 characters for AES-256 encryption.');
  }
  const iterations = 120000;
  const saltBuffer = new ArrayBuffer(16);
  const salt = new Uint8Array(saltBuffer);
  const ivBuffer = new ArrayBuffer(12);
  const iv = new Uint8Array(ivBuffer);
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);

  const key = await deriveAesKey(passphrase, salt, iterations);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  return {
    app: 'cadence-workspace',
    version: 1,
    algorithm: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
    updatedAt: new Date().toISOString(),
  };
}

export async function decryptWorkspaceData(
  payload: EncryptedVaultPayload,
  passphrase: string
): Promise<WorkspaceData> {
  if (!payload || payload.app !== 'cadence-workspace' || !payload.ciphertext) {
    throw new Error('Invalid encrypted vault format.');
  }
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ciphertext);
  const key = await deriveAesKey(passphrase, salt, payload.iterations || 120000);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const json = new TextDecoder().decode(decrypted);
    return JSON.parse(json) as WorkspaceData;
  } catch {
    throw new Error('Decryption failed. Verify your sync passphrase.');
  }
}
