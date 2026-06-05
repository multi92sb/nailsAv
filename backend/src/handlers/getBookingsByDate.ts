import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { BookingRepository } from '../db/repositories/bookingRepository';
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

    const result = await BookingRepository.getBookingsByDate(date);

    const bookings = result.map((item) => ({
      bookingId: item.bookingId,
      userId: item.userId,
      email: item.email,
      phone: item.phone ?? '',
      date: item.date,
      time: item.time,
      slotId: item.slotId,
      status: item.status,
      createdAt: item.createdAt,
    }));

    return ok({ bookings });
  } catch (err) {
    console.error('getBookingsByDate error', err);
    return serverError();
  }
};


