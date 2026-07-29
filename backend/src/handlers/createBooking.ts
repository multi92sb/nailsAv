import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { UserRepository } from '../db/repositories/userRepository';
import { BookingRepository } from '../db/repositories/bookingRepository';
import { badRequest, conflict, created, serverError } from '../utils/response';
import { sendConfirmationEmail } from '../services/notificationService';
import type { AuthorizerContext } from '../types/auth';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be in HH:MM format'),
  slotId: z.string().min(1, 'slotId is required'),
  serviceId: z.string().min(1).max(80).optional(),
  referenceImageKey: z.string().min(1).max(500).optional(),
  styleTags: z.array(z.string().min(1).max(40)).max(12).optional(),
  notes: z.string().max(1000).optional(),
});

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { date, time, slotId, serviceId, referenceImageKey, styleTags, notes } = parsed.data;
    const { userId, email } = event.requestContext.authorizer.lambda;

    const user = await UserRepository.getById(userId);
    const phone = user?.phone ?? '';

    const bookingId = uuid();
    const now = new Date().toISOString();

    try {
      await BookingRepository.createBooking({
        bookingId,
        userId,
        email,
        phone,
        date,
        time,
        slotId,
        status: 'CONFIRMED',
        createdAt: now,
        serviceId,
        referenceImageKey,
        styleTags,
        notes,
      }, date, time, slotId);
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

    return created({ bookingId, date, time, status: 'CONFIRMED', serviceId, referenceImageKey, styleTags, notes });
  } catch (err) {
    console.error('createBooking error', err);
    return serverError();
  }
};

