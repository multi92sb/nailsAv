import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { docClient, TABLE_NAME } from '../db/client';
import { slotPK, slotSK } from '../db/tableKeys';
import { badRequest, forbidden, ok, serverError, conflict } from '../utils/response';
import { isAdmin } from '../utils/adminAuth';
import type { AuthorizerContext } from '../types/auth';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  oldTime: z.string().regex(/^\d{2}:\d{2}$/, 'oldTime must be in HH:MM format'),
  newTime: z.string().regex(/^\d{2}:\d{2}$/, 'newTime must be in HH:MM format'),
  slotId: z.string().min(1, 'slotId is required'),
});

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!isAdmin(event)) return forbidden('Admin access required');

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { date, oldTime, newTime, slotId } = parsed.data;

    if (oldTime === newTime) {
      return ok({ message: 'Time is already set to this value' });
    }

    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Delete: {
                TableName: TABLE_NAME,
                Key: {
                  PK: slotPK(date),
                  SK: slotSK(oldTime, slotId),
                },
                ConditionExpression: 'isAvailable = :true',
                ExpressionAttributeValues: {
                  ':true': true,
                },
              },
            },
            {
              Put: {
                TableName: TABLE_NAME,
                Item: {
                  PK: slotPK(date),
                  SK: slotSK(newTime, slotId),
                  slotId,
                  date,
                  time: newTime,
                  isAvailable: true,
                  entityType: 'SLOT',
                },
                ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
              },
            },
          ],
        }),
      );

      return ok({ message: 'Slot time updated successfully', newTime });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        (err as { name: string }).name === 'TransactionCanceledException'
      ) {
        return conflict(
          'Slot update failed. Either the slot is already booked, does not exist, or a slot at the new time already exists.',
        );
      }
      throw err;
    }
  } catch (err) {
    console.error('adminUpdateSlot error', err);
    return serverError();
  }
};
