#!/usr/bin/env tsx
/**
 * Generate a random encryption key for wallet data encryption
 * 
 * Usage:
 *   npx tsx scripts/generate-encryption-key.ts
 * 
 * This generates a 32-byte (256-bit) random key encoded as base64,
 * suitable for use with AES-GCM-256 encryption.
 */

// Generate 32 random bytes
const keyBytes = new Uint8Array(32)
crypto.getRandomValues(keyBytes)

// Convert to base64
const base64Key = btoa(String.fromCharCode(...keyBytes))

console.log('\n🔐 Generated Encryption Key:\n')
console.log(base64Key)
console.log('\n📋 Add this to your .env file:\n')
console.log(`WALLET_ENCRYPTION_KEY=${base64Key}\n`)
console.log('⚠️  Keep this key secure and never commit it to git!\n')


