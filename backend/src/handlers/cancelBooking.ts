import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { docClient, TABLE_NAME } from '../db/client';
import { bookingPK, bookingSK, slotPK, slotSK } from '../db/tableKeys';
import { badRequest, forbidden, notFound, ok, serverError } from '../utils/response';
import type { AuthorizerContext } from '../types/auth';

const schema = z.object({
  bookingId: z.string().min(1, 'bookingId is required'),
});

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { bookingId } = parsed.data;
    const { userId } = event.requestContext.authorizer.lambda;

    const bookingRes = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: bookingPK(userId),
          SK: bookingSK(bookingId),
        },
      }),
    );

    const booking = bookingRes.Item;
    if (!booking) {
      return notFound('Booking not found');
    }

    if (booking.userId !== userId) {
      return forbidden('This booking does not belong to you');
    }

    if (booking.status !== 'CONFIRMED') {
      return badRequest('Booking is already cancelled or not confirmed');
    }

    const today = new Date().toISOString().split('T')[0];
    if (booking.date <= today) {
      return badRequest('Cannot cancel a booking in the past or today');
    }

    const now = new Date().toISOString();

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE_NAME,
              Key: {
                PK: bookingPK(userId),
                SK: bookingSK(bookingId),
              },
              UpdateExpression: 'SET #status = :cancelled, updatedAt = :now',
              ExpressionAttributeNames: {
                '#status': 'status',
              },
              ExpressionAttributeValues: {
                ':cancelled': 'CANCELLED',
                ':now': now,
              },
            },
          },
          {
            Update: {
              TableName: TABLE_NAME,
              Key: {
                PK: slotPK(booking.date as string),
                SK: slotSK(booking.time as string, booking.slotId as string),
              },
              UpdateExpression: 'SET isAvailable = :true',
              ExpressionAttributeValues: {
                ':true': true,
              },
            },
          },
        ],
      }),
    );

    return ok({ bookingId, status: 'CANCELLED' });
  } catch (err) {
    console.error('cancelBooking error', err);
    return serverError();
  }
};
