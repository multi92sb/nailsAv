import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { BookingRepository } from '../db/repositories/bookingRepository';
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

    const booking = await BookingRepository.getBooking(userId, bookingId);
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

    await BookingRepository.cancelBooking(userId, bookingId, booking.date, booking.time, booking.slotId);

    return ok({ bookingId, status: 'CANCELLED' });
  } catch (err) {
    console.error('cancelBooking error', err);
    return serverError();
  }
};

