import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRepository } from '../db/repositories/userRepository';
import { badRequest, ok, serverError, tooManyRequests, unauthorized } from '../utils/response';
import { isRateLimited } from '../utils/rateLimiter';
import { createCookie } from '../utils/cookies';
import { createRefreshToken, signAccessToken, tokenTtl } from '../utils/authTokens';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const ipAddress = event.requestContext.http?.sourceIp ?? 'unknown';
    if (await isRateLimited(`login:${ipAddress}`, 5, 60000)) {
      return tooManyRequests('Too many login attempts. Please try again later.');
    }

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { email, password } = parsed.data;

    const user = await UserRepository.getByEmail(email);

    //  fallback hash
    const passwordHash =
      user?.password ||
      '$2b$12$invalidhashfortimingprotection00000000000000000';

    const valid = await bcrypt.compare(password, passwordHash);

    if (!user || !valid) {
      return unauthorized('Invalid email or password');
    }

    const role = user.role ?? 'USER';

    const token = signAccessToken({
      userId: user.userId,
      email: user.email,
      role,
    });
    const refreshToken = await createRefreshToken(user.userId);

    return ok(
      {
        user: {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role,
        },
      },
      [
        createCookie('accessToken', token, tokenTtl.access),
        createCookie('refreshToken', refreshToken, tokenTtl.refresh),
      ],
    );
  } catch (err) {
    console.error('login error', err);
    return serverError();
  }
};

