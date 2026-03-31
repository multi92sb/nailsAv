import jwt from 'jsonwebtoken';
import type { AuthorizerContext } from '../types/auth';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
};

export const signToken = (
  payload: AuthorizerContext,
  options?: { expiresIn?: string | number },
): string => jwt.sign(payload, getSecret(), { expiresIn: options?.expiresIn ?? '7d' });

export const verifyToken = (token: string): AuthorizerContext =>
  jwt.verify(token, getSecret()) as AuthorizerContext;
