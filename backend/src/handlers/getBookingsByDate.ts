import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { docClient, TABLE_NAME } from '../db/client';
import type { AuthorizerContext } from '../types/auth';
import { forbidden, ok, badRequest, serverError } from '../utils/response';
import { isAdmin } from '../utils/adminAuth';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
});

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!isAdmin(event)) return forbidden('Admin access required');

    const parsed = schema.safeParse(event.queryStringParameters ?? {});
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { date } = parsed.data;

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'BookingByDate',
        KeyConditionExpression: 'bookingDate = :date AND begins_with(bookingTimeSlot, :prefix)',
        ExpressionAttributeValues: {
          ':date': date,
          ':prefix': 'TIME#',
        },
      }),
    );

    const bookings = (result.Items ?? []).map((item) => ({
      bookingId: item.bookingId as string,
      userId: item.userId as string,
      email: item.email as string,
      phone: (item.phone as string | undefined) ?? '',
      date: item.date as string,
      time: item.time as string,
      slotId: item.slotId as string,
      status: item.status as string,
      createdAt: item.createdAt as string,
    }));

    return ok({ bookings });
  } catch (err) {
    console.error('getBookingsByDate error', err);
    return serverError();
  }
};

