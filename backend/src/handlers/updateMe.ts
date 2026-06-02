import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { docClient, TABLE_NAME } from '../db/client';
import { userPK, userSK } from '../db/tableKeys';
import { badRequest, ok, serverError } from '../utils/response';
import type { AuthorizerContext } from '../types/auth';

const schema = z
  .object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().min(5).max(20).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const body = parsed.data;
    const { userId } = event.requestContext.authorizer.lambda;

    const updateParts: string[] = [];
    const exprNames: Record<string, string> = {};
    const exprValues: Record<string, unknown> = {};

    if (body.firstName !== undefined) {
      updateParts.push('#firstName = :firstName');
      exprNames['#firstName'] = 'firstName';
      exprValues[':firstName'] = body.firstName;
    }
    if (body.lastName !== undefined) {
      updateParts.push('#lastName = :lastName');
      exprNames['#lastName'] = 'lastName';
      exprValues[':lastName'] = body.lastName;
    }
    if (body.phone !== undefined) {
      updateParts.push('#phone = :phone');
      exprNames['#phone'] = 'phone';
      exprValues[':phone'] = body.phone;
    }

    updateParts.push('#updatedAt = :updatedAt');
    exprNames['#updatedAt'] = 'updatedAt';
    exprValues[':updatedAt'] = new Date().toISOString();

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: userPK(userId),
          SK: userSK(),
        },
        UpdateExpression: `SET ${updateParts.join(', ')}`,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: 'ALL_NEW',
      }),
    );

    const user = result.Attributes!;
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
    console.error('updateMe error', err);
    return serverError();
  }
};
