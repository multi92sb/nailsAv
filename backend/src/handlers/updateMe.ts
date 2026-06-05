import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { UserRepository } from '../db/repositories/userRepository';
import { badRequest, ok, serverError } from '../utils/response';
import type { AuthorizerContext } from '../types/auth';

const schema = z
  .object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().min(5).max(20).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const body = parsed.data;
    const { userId } = event.requestContext.authorizer.lambda;

    const user = await UserRepository.update(userId, body);

    return ok({
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('updateMe error', err);
    return serverError();
  }
};

