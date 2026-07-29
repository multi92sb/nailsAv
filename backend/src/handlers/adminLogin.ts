import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRepository } from '../db/repositories/userRepository';
import { badRequest, forbidden, ok, serverError, tooManyRequests, unauthorized } from '../utils/response';
import { createCookie } from '../utils/cookies';
import { signAdminToken, tokenTtl } from '../utils/authTokens';
import { AuditRepository } from '../db/repositories/auditRepository';
import { isRateLimited } from '../utils/rateLimiter';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const ipAddress = event.requestContext.http?.sourceIp ?? 'unknown';
    if (await isRateLimited(`admin-login:${ipAddress}`, 5, 60000)) {
      return tooManyRequests('Too many admin login attempts. Please try again later.');
    }

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { email, password } = parsed.data;

    const user = await UserRepository.getByEmail(email);
    // Use constant-time comparison: always run bcrypt.compare to avoid timing attacks
    const passwordHash =
      user?.password ||
      '$2b$12$invalidhashfortimingprotection00000000000000000';
    const valid = await bcrypt.compare(password, passwordHash);

    if (!user || !valid) return unauthorized('Invalid email or password');

    const role = user.role ?? 'USER';
    if (role !== 'ADMIN') return forbidden('Admin access required');

    const token = signAdminToken({ userId: user.userId, email: user.email, role });
    await AuditRepository.record({
      actorUserId: user.userId,
      action: 'ADMIN_LOGIN',
      targetId: user.userId,
      details: { email: user.email },
      createdAt: new Date().toISOString(),
    });

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
      [createCookie('adminAccessToken', token, tokenTtl.admin)],
    );
  } catch (err) {
    console.error('adminLogin error', err);
    return serverError();
  }
};


