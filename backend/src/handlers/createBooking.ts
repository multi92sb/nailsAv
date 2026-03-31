import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { docClient, TABLE_NAME } from '../db/client';
import { bookingPK, bookingSK, slotPK, slotSK, userPK, userSK } from '../db/tableKeys';
import { badRequest, conflict, created, serverError } from '../utils/response';
import { sendConfirmationEmail } from '../services/notificationService';
import type { AuthorizerContext } from '../types/auth';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be in HH:MM format'),
  slotId: z.string().min(1, 'slotId is required'),
});

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { date, time, slotId } = parsed.data;
    const { userId, email } = event.requestContext.authorizer.lambda;

    const userRes = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: userPK(userId),
          SK: userSK(),
        },
        ProjectionExpression: 'phone',
      }),
    );
    const phone = (userRes.Item?.phone as string | undefined) ?? '';

    const bookingId = uuid();
    const now = new Date().toISOString();
    const bookingTimeSlot = `TIME#${time}#${slotId}`;

    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              // Atomically mark the slot as unavailable — fails if already taken
              Update: {
                TableName: TABLE_NAME,
                Key: {
                  PK: slotPK(date),
                  SK: slotSK(time, slotId),
                },
                UpdateExpression: 'SET isAvailable = :false',
                ConditionExpression: 'isAvailable = :true',
                ExpressionAttributeValues: {
                  ':true': true,
                  ':false': false,
                },
              },
            },
            {
              Put: {
                TableName: TABLE_NAME,
                Item: {
                  PK: bookingPK(userId),
                  SK: bookingSK(bookingId),
                  bookingId,
                  userId,
                  email,  // stored so the reminder Lambda can email directly
                  phone,
                  date,
                  time,
                  slotId,
                  bookingDate: date,
                  bookingTimeSlot,
                  status: 'CONFIRMED',
                  createdAt: now,
                  entityType: 'BOOKING',
                },
              },
            },
          ],
        }),
      );
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        (err as { name: string }).name === 'TransactionCanceledException'
      ) {
        return conflict('This slot is no longer available');
      }
      throw err;
    }

    // Fire and forget — do not block the response on email delivery
    sendConfirmationEmail(email, { date, time, bookingId }).catch((e) =>
      console.error('Failed to send confirmation email', e),
    );

    return created({ bookingId, date, time, status: 'CONFIRMED' });
  } catch (err) {
    console.error('createBooking error', err);
    return serverError();
  }
};
