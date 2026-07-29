import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import type { User } from '../db/repositories/userRepository';
import { AuthSessionRepository } from '../db/repositories/authSessionRepository';
import { signToken, verifyToken } from './jwt';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const ADMIN_TOKEN_TTL_SECONDS = 30 * 60;

interface RefreshTokenPayload {
  sessionId: string;
  userId: string;
  tokenType: 'refresh';
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(user: Pick<User, 'userId' | 'email' | 'role'>): string {
  return signToken(
    { userId: user.userId, email: user.email, role: user.role, tokenType: 'access' },
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
  );
}

export function signAdminToken(user: Pick<User, 'userId' | 'email' | 'role'>): string {
  return signToken(
    { userId: user.userId, email: user.email, role: user.role, tokenType: 'admin' },
    { expiresIn: ADMIN_TOKEN_TTL_SECONDS },
  );
}

export async function createRefreshToken(userId: string): Promise<string> {
  const sessionId = uuid();
  const token = signToken(
    { sessionId, userId, tokenType: 'refresh' },
    { expiresIn: REFRESH_TOKEN_TTL_SECONDS },
  );
  const now = new Date().toISOString();
  await AuthSessionRepository.create({
    sessionId,
    userId,
    refreshTokenHash: hashToken(token),
    expiresAt: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL_SECONDS,
    createdAt: now,
    updatedAt: now,
  });
  return token;
}

export async function rotateRefreshToken(refreshToken: string): Promise<{
  sessionId: string;
  userId: string;
  refreshToken: string;
}> {
  const payload = verifyToken(refreshToken) as unknown as RefreshTokenPayload;
  if (payload.tokenType !== 'refresh' || !payload.sessionId || !payload.userId) {
    throw new Error('Invalid refresh token');
  }

  const session = await AuthSessionRepository.get(payload.sessionId);
  if (!session || session.userId !== payload.userId || session.expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error('Refresh session expired');
  }
  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    throw new Error('Refresh token reuse detected');
  }

  const nextRefreshToken = signToken(
    { sessionId: payload.sessionId, userId: payload.userId, tokenType: 'refresh' },
    { expiresIn: REFRESH_TOKEN_TTL_SECONDS },
  );
  await AuthSessionRepository.rotate(
    payload.sessionId,
    hashToken(nextRefreshToken),
    Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL_SECONDS,
  );

  return {
    sessionId: payload.sessionId,
    userId: payload.userId,
    refreshToken: nextRefreshToken,
  };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const payload = verifyToken(refreshToken) as unknown as RefreshTokenPayload;
  if (payload.sessionId) {
    await AuthSessionRepository.revoke(payload.sessionId);
  }
}

export const tokenTtl = {
  access: ACCESS_TOKEN_TTL_SECONDS,
  refresh: REFRESH_TOKEN_TTL_SECONDS,
  admin: ADMIN_TOKEN_TTL_SECONDS,
};
