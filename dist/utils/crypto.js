"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashToken = hashToken;
exports.encryptBiometric = encryptBiometric;
exports.decryptBiometric = decryptBiometric;
const crypto_1 = __importDefault(require("crypto"));
const BIOMETRIC_KEY = process.env.BIOMETRIC_ENCRYPTION_KEY || 'bio_finger_aes_key_32_bytes_len!!';
// SHA-256 hash for storing refresh tokens securely
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
// AES-256-GCM encryption for biometric templates
function encryptBiometric(text) {
    const iv = crypto_1.default.randomBytes(12);
    const key = crypto_1.default.createHash('sha256').update(BIOMETRIC_KEY).digest();
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}
// AES-256-GCM decryption for authorized internal verification
function decryptBiometric(encryptedPayload) {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted biometric format');
    }
    const [ivHex, authTagHex, encryptedText] = parts;
    const key = crypto_1.default.createHash('sha256').update(BIOMETRIC_KEY).digest();
    const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
