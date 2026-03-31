import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../db/client';
import type { AuthorizerContext } from '../types/auth';
import { forbidden, ok, serverError } from '../utils/response';
import { isAdmin } from '../utils/adminAuth';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!isAdmin(event)) return forbidden('Admin access required');

    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': 'USER',
        },
        ProjectionExpression: 'userId, firstName, lastName, email, phone, createdAt, #role',
        ExpressionAttributeNames: {
          '#role': 'role',
        },
      }),
    );

    const users = (result.Items ?? []).map((item) => ({
      userId: item.userId,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone,
      createdAt: item.createdAt,
      role: (item.role as 'USER' | 'ADMIN' | undefined) ?? 'USER',
    }));

    return ok({ users });
  } catch (err) {
    console.error('getUsers error', err);
    return serverError();
  }
};
