import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { SlotRepository } from '../db/repositories/slotRepository';
import { badRequest, ok, serverError } from '../utils/response';
import type { AuthorizerContext } from '../types/auth';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
});

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const parsed = schema.safeParse(event.queryStringParameters ?? {});
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { date } = parsed.data;

    const slots = await SlotRepository.getSlotsByDate(date);

    return ok({ slots });
  } catch (err) {
    console.error('getSlots error', err);
    return serverError();
  }
};

