import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { BookingRepository } from '../db/repositories/bookingRepository';
import { AuditRepository } from '../db/repositories/auditRepository';
import { badRequest, conflict, forbidden, notFound, ok, serverError } from '../utils/response';
import { requireFreshAdmin } from '../utils/adminAuth';
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
    if (!(await requireFreshAdmin(event))) return forbidden('Admin access required');

    const bookingId = event.pathParameters?.bookingId;
    if (!bookingId) return badRequest('bookingId is required');

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { userId, status, newSlot } = parsed.data;

    // 1. Fetch current booking details
    const booking = await BookingRepository.getBooking(userId, bookingId);
    if (!booking) return notFound('Booking not found');

    const email = booking.email as string;

    // 2. Handle cancellation
    if (status === 'CANCELLED') {
      if (booking.status === 'CANCELLED') {
        return ok({ bookingId, status: 'CANCELLED' });
      }

      await BookingRepository.cancelBooking(userId, bookingId, booking.date, booking.time, booking.slotId);
      await AuditRepository.record({
        actorUserId: event.requestContext.authorizer.lambda.userId,
        action: 'ADMIN_CANCEL_BOOKING',
        targetId: bookingId,
        details: { userId },
        createdAt: new Date().toISOString(),
      });

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
        try {
          await BookingRepository.rescheduleBooking(userId, bookingId, {
            date: booking.date,
            time: booking.time,
            slotId: booking.slotId,
            status: booking.status,
          }, newSlot);
          await AuditRepository.record({
            actorUserId: event.requestContext.authorizer.lambda.userId,
            action: 'ADMIN_RESCHEDULE_BOOKING',
            targetId: bookingId,
            details: { userId, newSlot },
            createdAt: new Date().toISOString(),
          });
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
        }).catch((e) => console.error('Failed to reschedule email', e));

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
      await BookingRepository.updateBookingStatus(userId, bookingId, status);
      await AuditRepository.record({
        actorUserId: event.requestContext.authorizer.lambda.userId,
        action: 'ADMIN_UPDATE_BOOKING_STATUS',
        targetId: bookingId,
        details: { userId, status },
        createdAt: new Date().toISOString(),
      });

      return ok({ bookingId, status });
    }

    return ok({ bookingId, status: booking.status });
  } catch (err) {
    console.error('adminModifyBooking error', err);
    return serverError();
  }
};

