import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { AuditRepository } from '../db/repositories/auditRepository';
import type { AuthorizerContext } from '../types/auth';
import { forbidden, ok, serverError } from '../utils/response';
import { requireFreshAdmin } from '../utils/adminAuth';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!(await requireFreshAdmin(event))) return forbidden('Admin access required');

    const limit = Number(event.queryStringParameters?.limit ?? 50);
    const events = await AuditRepository.list(Math.min(Math.max(limit, 1), 100));
    return ok({ events });
  } catch (err) {
    console.error('getAuditEvents error', err);
    return serverError();
  }
};
