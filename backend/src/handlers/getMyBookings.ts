import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { BookingRepository } from '../db/repositories/bookingRepository';
import { ok, serverError } from '../utils/response';
import type { AuthorizerContext } from '../types/auth';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const { userId } = event.requestContext.authorizer.lambda;

    const result = await BookingRepository.getBookingsByUserId(userId);

    const bookings = result
      .map((item) => ({
        bookingId: item.bookingId,
        date: item.date,
        time: item.time,
        status: item.status,
        createdAt: item.createdAt,
      }))
      .sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return a.time.localeCompare(b.time);
      });

    return ok({ bookings });
  } catch (err) {
    console.error('getMyBookings error', err);
    return serverError();
  }
};

