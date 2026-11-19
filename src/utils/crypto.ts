import crypto from 'crypto';

const BIOMETRIC_KEY = process.env.BIOMETRIC_ENCRYPTION_KEY || 'bio_finger_aes_key_32_bytes_len!!';

// SHA-256 hash for storing refresh tokens securely
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// AES-256-GCM encryption for biometric templates
export function encryptBiometric(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(BIOMETRIC_KEY).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// AES-256-GCM decryption for authorized internal verification
export function decryptBiometric(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted biometric format');
  }
  const [ivHex, authTagHex, encryptedText] = parts;
  const key = crypto.createHash('sha256').update(BIOMETRIC_KEY).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
