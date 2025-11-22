// @ts-nocheck
// Shared encryption utilities for Edge Functions
// Uses Deno's built-in Web Crypto API for AES-GCM encryption

/**
 * Encrypts data using AES-GCM encryption
 * @param data - Data to encrypt (string or object)
 * @param encryptionKey - 32-byte encryption key (base64 encoded)
 * @returns Encrypted data as base64 string with IV prepended
 */
export async function encryptWalletData(
  data: string | object,
  encryptionKey: string
): Promise<string> {
  // Convert data to JSON string if object
  const dataString = typeof data === 'string' ? data : JSON.stringify(data)

  // Decode base64 key to Uint8Array
  const keyBytes = Uint8Array.from(atob(encryptionKey), (c) => c.charCodeAt(0))

  // Import key for AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  // Generate random IV (Initialization Vector) - 12 bytes for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt data
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    cryptoKey,
    new TextEncoder().encode(dataString)
  )

  // Combine IV and encrypted data, then encode as base64
  const combined = new Uint8Array(iv.length + encryptedData.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encryptedData), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypts data using AES-GCM decryption
 * @param encryptedData - Base64 encoded encrypted data with IV prepended
 * @param encryptionKey - 32-byte encryption key (base64 encoded)
 * @returns Decrypted data as string
 */
export async function decryptWalletData(
  encryptedData: string,
  encryptionKey: string
): Promise<string> {
  // Decode base64 to get IV and encrypted data
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

  // Extract IV (first 12 bytes) and encrypted data (rest)
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)

  // Decode base64 key to Uint8Array
  const keyBytes = Uint8Array.from(atob(encryptionKey), (c) => c.charCodeAt(0))

  // Import key for AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  // Decrypt data
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    cryptoKey,
    encrypted
  )

  // Convert decrypted data to string
  return new TextDecoder().decode(decryptedData)
}

/**
 * Generates a random 32-byte encryption key (base64 encoded)
 * Use this once to generate your encryption key, then store it securely
 * @returns Base64 encoded 32-byte key
 */
export function generateEncryptionKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...keyBytes))
}

/**
 * Gets encryption key from environment variables
 * Falls back to a default key if not set (for development only)
 * @returns Base64 encoded encryption key
 */
export function getEncryptionKey(): string {
  const key = Deno.env.get('WALLET_ENCRYPTION_KEY')
  
  if (!key) {
    console.warn('⚠️  WALLET_ENCRYPTION_KEY not set. Using default key (INSECURE - for development only)')
    // Default key for development - NEVER use in production!
    return 'dGVzdC1rZXktZm9yLWRldmVsb3BtZW50LW9ubHktbm90LXByb2R1Y3Rpb24='
  }
  
  return key
}


