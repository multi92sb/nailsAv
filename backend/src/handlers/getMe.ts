import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../db/client';
import { userPK, userSK } from '../db/tableKeys';
import { ok, serverError } from '../utils/response';
import type { AuthorizerContext } from '../types/auth';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const { userId } = event.requestContext.authorizer.lambda;

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: userPK(userId),
          SK: userSK(),
        },
      }),
    );

    const user = result.Item;
    if (!user) {
      return serverError('User not found');
    }

    return ok({
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('getMe error', err);
    return serverError();
  }
};
