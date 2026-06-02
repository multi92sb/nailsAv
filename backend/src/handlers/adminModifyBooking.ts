import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { docClient, TABLE_NAME } from '../db/client';
import { bookingPK, bookingSK, slotPK, slotSK } from '../db/tableKeys';
import { badRequest, conflict, forbidden, notFound, ok, serverError } from '../utils/response';
import { isAdmin } from '../utils/adminAuth';
import { sendCancellationEmail, sendRescheduleEmail } from '../services/notificationService';
import type { AuthorizerContext } from '../types/auth';

const schema = z.object({
  userId: z.string().min(1, 'userId is required'),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  newSlot: z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
      time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be in HH:MM format'),
      slotId: z.string().min(1, 'slotId is required'),
    })
    .optional(),
});

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!isAdmin(event)) return forbidden('Admin access required');

    const bookingId = event.pathParameters?.bookingId;
    if (!bookingId) return badRequest('bookingId is required');

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { userId, status, newSlot } = parsed.data;

    // 1. Fetch current booking details
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
    if (!booking) return notFound('Booking not found');

    const now = new Date().toISOString();
    const email = booking.email as string;

    // 2. Handle cancellation
    if (status === 'CANCELLED') {
      if (booking.status === 'CANCELLED') {
        return ok({ bookingId, status: 'CANCELLED' });
      }

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

      // Send cancellation email in background
      sendCancellationEmail(email, {
        date: booking.date as string,
        time: booking.time as string,
        bookingId,
      }).catch((e) => console.error('Failed to send cancellation email', e));

      return ok({ bookingId, status: 'CANCELLED' });
    }

    // 3. Handle rescheduling (newSlot)
    if (newSlot) {
      const isSameSlot =
        newSlot.date === booking.date &&
        newSlot.time === booking.time &&
        newSlot.slotId === booking.slotId;

      if (!isSameSlot) {
        const newBookingTimeSlot = `TIME#${newSlot.time}#${newSlot.slotId}`;
        const transactItems = [];

        // If current booking is not cancelled, free the old slot first
        if (booking.status !== 'CANCELLED') {
          transactItems.push({
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
          });
        }

        // Book the new slot
        transactItems.push({
          Update: {
            TableName: TABLE_NAME,
            Key: {
              PK: slotPK(newSlot.date),
              SK: slotSK(newSlot.time, newSlot.slotId),
            },
            UpdateExpression: 'SET isAvailable = :false',
            ConditionExpression: 'isAvailable = :true',
            ExpressionAttributeValues: {
              ':true': true,
              ':false': false,
            },
          },
        });

        // Update the booking item
        transactItems.push({
          Update: {
            TableName: TABLE_NAME,
            Key: {
              PK: bookingPK(userId),
              SK: bookingSK(bookingId),
            },
            UpdateExpression:
              'SET #date = :newDate, #time = :newTime, slotId = :newSlotId, bookingDate = :newDate, bookingTimeSlot = :newBookingTimeSlot, #status = :confirmed, updatedAt = :now',
            ExpressionAttributeNames: {
              '#date': 'date',
              '#time': 'time',
              '#status': 'status',
            },
            ExpressionAttributeValues: {
              ':newDate': newSlot.date,
              ':newTime': newSlot.time,
              ':newSlotId': newSlot.slotId,
              ':newBookingTimeSlot': newBookingTimeSlot,
              ':confirmed': 'CONFIRMED',
              ':now': now,
            },
          },
        });

        try {
          await docClient.send(
            new TransactWriteCommand({
              TransactItems: transactItems,
            }),
          );
        } catch (err: unknown) {
          if (
            typeof err === 'object' &&
            err !== null &&
            'name' in err &&
            (err as { name: string }).name === 'TransactionCanceledException'
          ) {
            return conflict('The new slot is no longer available');
          }
          throw err;
        }

        // Send rescheduling email in background
        sendRescheduleEmail(email, {
          date: newSlot.date,
          time: newSlot.time,
          bookingId,
        }).catch((e) => console.error('Failed to send reschedule email', e));

        return ok({
          bookingId,
          date: newSlot.date,
          time: newSlot.time,
          status: 'CONFIRMED',
        });
      }
    }

    // 4. Handle other status updates (COMPLETED, NO_SHOW, or CONFIRMED without rescheduling)
    if (status) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: bookingPK(userId),
            SK: bookingSK(bookingId),
          },
          UpdateExpression: 'SET #status = :status, updatedAt = :now',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': status,
            ':now': now,
          },
        }),
      );

      return ok({ bookingId, status });
    }

    return ok({ bookingId, status: booking.status });
  } catch (err) {
    console.error('adminModifyBooking error', err);
    return serverError();
  }
};
