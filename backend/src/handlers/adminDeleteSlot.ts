import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { SlotRepository } from '../db/repositories/slotRepository';
import { badRequest, forbidden, ok, serverError } from '../utils/response';
import { requireFreshAdmin } from '../utils/adminAuth';
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
    if (!(await requireFreshAdmin(event))) return forbidden('Admin access required');

    const parsed = schema.safeParse(event.queryStringParameters ?? {});
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { date, time, slotId } = parsed.data;

    try {
      await SlotRepository.deleteSlot(date, time, slotId);

      return ok({ message: 'Slot deleted successfully' });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        (err as { name: string }).name === 'ConditionalCheckFailedException'
      ) {
        return badRequest('Slot is either booked and cannot be deleted, or does not exist');
      }
      throw err;
    }
  } catch (err) {
    console.error('adminDeleteSlot error', err);
    return serverError();
  }
};

