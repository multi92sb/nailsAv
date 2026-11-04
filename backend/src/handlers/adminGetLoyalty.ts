import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { getLoyaltyOverview } from '../services/loyaltyService';
import { forbidden, ok, serverError } from '../utils/response';
import { requireFreshAdmin } from '../utils/adminAuth';
import type { AuthorizerContext } from '../types/auth';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!(await requireFreshAdmin(event))) return forbidden('Admin access required');

    const users = await getLoyaltyOverview();
    return ok({ users });
  } catch (err) {
    console.error('adminGetLoyalty error', err);
    return serverError();
  }
};
