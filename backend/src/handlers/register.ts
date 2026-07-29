import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { UserRepository } from '../db/repositories/userRepository';
import { badRequest, conflict, created, serverError, tooManyRequests } from '../utils/response';
import { isRateLimited } from '../utils/rateLimiter';
import { createCookie } from '../utils/cookies';
import { createRefreshToken, signAccessToken, tokenTtl } from '../utils/authTokens';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const ipAddress = event.requestContext.http?.sourceIp ?? 'unknown';
    if (await isRateLimited(`register:${ipAddress}`, 5, 60000)) {
      return tooManyRequests('Too many registration attempts. Please try again later.');
    }

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { firstName, lastName, email, phone, password } = parsed.data;
    const role: 'USER' = 'USER';

    // Verify email is not already taken
    const existing = await UserRepository.getByEmail(email);
    if (existing) return conflict('Email is already registered');

    const userId = uuid();
    const passwordHash = await bcrypt.hash(password, 12);

    await UserRepository.create({
      userId,
      firstName,
      lastName,
      email,
      phone,
      role,
      password: passwordHash,
      createdAt: new Date().toISOString(),
    });

    const token = signAccessToken({ userId, email, role });
    const refreshToken = await createRefreshToken(userId);
    return created(
      { user: { userId, firstName, lastName, email, phone, role } },
      [
        createCookie('accessToken', token, tokenTtl.access),
        createCookie('refreshToken', refreshToken, tokenTtl.refresh),
      ],
    );
  } catch (err) {
    console.error('register error', err);
    return serverError();
  }
};

