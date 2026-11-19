import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn as any,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
}
