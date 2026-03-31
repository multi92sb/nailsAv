import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { docClient, TABLE_NAME } from '../db/client';
import { slotPK } from '../db/tableKeys';
import { badRequest, ok, serverError } from '../utils/response';
import type { AuthorizerContext } from '../types/auth';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
});

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const parsed = schema.safeParse(event.queryStringParameters ?? {});
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { date } = parsed.data;

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': slotPK(date),
          ':skPrefix': 'TIME#',
        },
      }),
    );

    const slots = (result.Items ?? []).map((item) => ({
      slotId: item.slotId as string,
      date: item.date as string,
      time: item.time as string,
      isAvailable: item.isAvailable as boolean,
    }));

    return ok({ slots });
  } catch (err) {
    console.error('getSlots error', err);
    return serverError();
  }
};
