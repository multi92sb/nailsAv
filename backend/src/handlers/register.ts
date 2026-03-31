import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { docClient, TABLE_NAME } from '../db/client';
import { userPK, userSK } from '../db/tableKeys';
import { signToken } from '../utils/jwt';
import { badRequest, conflict, created, serverError } from '../utils/response';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { firstName, lastName, email, phone, password } = parsed.data;
    const role: 'USER' = 'USER';

    // Verify email is not already taken
    const existing = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
        Limit: 1,
      }),
    );
    if (existing.Count && existing.Count > 0) return conflict('Email is already registered');

    const userId = uuid();
    const passwordHash = await bcrypt.hash(password, 12);

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: userPK(userId),
          SK: userSK(),
          userId,
          firstName,
          lastName,
          email,
          phone,
          role,
          passwordHash,
          createdAt: new Date().toISOString(),
          entityType: 'USER',
        },
      }),
    );

    const token = signToken({ userId, email, role });
    return created({ token, user: { userId, firstName, lastName, email, phone, role } });
  } catch (err) {
    console.error('register error', err);
    return serverError();
  }
};
