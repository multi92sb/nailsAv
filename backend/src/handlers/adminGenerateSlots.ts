import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { docClient, TABLE_NAME } from '../db/client';
import { slotPK, slotSK } from '../db/tableKeys';
import { badRequest, forbidden, ok, serverError } from '../utils/response';
import { isAdmin } from '../utils/adminAuth';
import type { AuthorizerContext } from '../types/auth';

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format'),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/, 'times must be in HH:MM format')),
  closedDays: z.array(z.number().min(0).max(6)).optional(),
});

function getDatesInRange(startStr: string, endStr: string, closedDays: number[]): string[] {
  const dates: string[] = [];
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  const cursor = new Date(start);

  while (cursor <= end) {
    const day = cursor.getDay();
    if (!closedDays.includes(day)) {
      dates.push(cursor.toISOString().split('T')[0]);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!isAdmin(event)) return forbidden('Admin access required');

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { startDate, endDate, times, closedDays = [0] } = parsed.data;

    if (startDate > endDate) {
      return badRequest('startDate must be before or equal to endDate');
    }

    const dates = getDatesInRange(startDate, endDate, closedDays);
    let createdCount = 0;

    for (const date of dates) {
      // 1. Fetch existing slots for this date to avoid overwriting
      const existingRes = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': slotPK(date),
            ':skPrefix': 'TIME#',
          },
        }),
      );

      const existingSlots = existingRes.Items ?? [];
      const existingTimes = new Set(existingSlots.map((item) => item.time));

      // 2. Build put requests for slots that do not exist yet
      const putRequests = [];
      for (const time of times) {
        if (!existingTimes.has(time)) {
          const slotId = uuid();
          putRequests.push({
            PutRequest: {
              Item: {
                PK: slotPK(date),
                SK: slotSK(time, slotId),
                slotId,
                date,
                time,
                isAvailable: true,
                entityType: 'SLOT',
              },
            },
          });
        }
      }

      // 3. Batch write requests (DynamoDB limit is 25 items per request)
      if (putRequests.length > 0) {
        for (let i = 0; i < putRequests.length; i += 25) {
          const batch = putRequests.slice(i, i + 25);
          let requestItems: Record<string, any> = { [TABLE_NAME]: batch };

          // Loop in case of unprocessed items due to throttling/load
          while (Object.keys(requestItems).length > 0) {
            const response = await docClient.send(
              new BatchWriteCommand({
                RequestItems: requestItems,
              }),
            );
            requestItems = response.UnprocessedItems || {};
          }
        }
        createdCount += putRequests.length;
      }
    }

    return ok({ message: 'Slots generation complete', count: createdCount });
  } catch (err) {
    console.error('adminGenerateSlots error', err);
    return serverError();
  }
};
