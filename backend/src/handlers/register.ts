import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { UserRepository } from '../db/repositories/userRepository';
import { signToken } from '../utils/jwt';
import { badRequest, conflict, created, serverError } from '../utils/response';
import { isRateLimited } from '../utils/rateLimiter';

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
    if (isRateLimited(`register:${ipAddress}`, 5, 60000)) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Too many registration attempts. Please try again later.' }),
      };
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

    const token = signToken({ userId, email, role });
    return created({ token, user: { userId, firstName, lastName, email, phone, role } });
  } catch (err) {
    console.error('register error', err);
    return serverError();
  }
};

