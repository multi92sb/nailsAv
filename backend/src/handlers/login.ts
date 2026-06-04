import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { docClient, TABLE_NAME } from '../db/client';
import { signToken } from '../utils/jwt';
import { badRequest, ok, serverError, unauthorized } from '../utils/response';
import { isRateLimited } from '../utils/rateLimiter';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const ipAddress = event.requestContext.http?.sourceIp ?? 'unknown';
    if (isRateLimited(`login:${ipAddress}`, 5, 60000)) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Too many login attempts. Please try again later.' }),
      };
    }

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { email, password } = parsed.data;

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        FilterExpression: 'entityType = :entityType AND SK = :profile',
        ExpressionAttributeValues: {
          ':email': email,
          ':entityType': 'USER',
          ':profile': 'PROFILE',
        },
      }),
    );

    const user = result.Items?.[0];

    //  fallback hash
    const passwordHash =
      user?.password ||
      user?.passwordHash ||
      '$2b$12$invalidhashfortimingprotection00000000000000000';

    const valid = await bcrypt.compare(password, passwordHash);

    if (!user || !valid) {
      return unauthorized('Invalid email or password');
    }

    const role = (user.role as 'USER' | 'ADMIN' | undefined) ?? 'USER';

    const token = signToken({
      userId: user.userId,
      email: user.email,
      role,
    });

    return ok({
      token,
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role,
      },
    });
  } catch (err) {
    console.error('login error', err);
    return serverError();
  }
};
