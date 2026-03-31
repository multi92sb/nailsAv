import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { docClient, TABLE_NAME } from '../db/client';
import { userPK, userSK } from '../db/tableKeys';
import type { AuthorizerContext } from '../types/auth';
import { badRequest, forbidden, ok, serverError } from '../utils/response';
import { isAdmin } from '../utils/adminAuth';

const schema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!isAdmin(event)) return forbidden('Admin access required');

    const userId = event.pathParameters?.userId;
    if (!userId) return badRequest('userId is required');

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { role } = parsed.data;

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: userPK(userId),
          SK: userSK(),
        },
        UpdateExpression: 'SET #role = :role',
        ExpressionAttributeNames: {
          '#role': 'role',
        },
        ExpressionAttributeValues: {
          ':role': role,
        },
        ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
      }),
    );

    return ok({ userId, role });
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'name' in err &&
      (err as { name: string }).name === 'ConditionalCheckFailedException'
    ) {
      return badRequest('User not found');
    }

    console.error('setUserRole error', err);
    return serverError();
  }
};
