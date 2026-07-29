import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { UserRepository } from '../db/repositories/userRepository';
import { AuditRepository } from '../db/repositories/auditRepository';
import type { AuthorizerContext } from '../types/auth';
import { badRequest, forbidden, ok, serverError } from '../utils/response';
import { requireFreshAdmin } from '../utils/adminAuth';

const schema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!(await requireFreshAdmin(event))) return forbidden('Admin access required');

    const userId = event.pathParameters?.userId;
    if (!userId) return badRequest('userId is required');

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { role } = parsed.data;

    await UserRepository.updateRole(userId, role);
    await AuditRepository.record({
      actorUserId: event.requestContext.authorizer.lambda.userId,
      action: 'SET_USER_ROLE',
      targetId: userId,
      details: { role },
      createdAt: new Date().toISOString(),
    });

    return ok({ userId, role });
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'name' in err &&
      (err as { name: string }).name === 'ConditionalCheckFailedException'
    ) {
      return badRequest('User not found');
    }

    console.error('setUserRole error', err);
    return serverError();
  }
};

