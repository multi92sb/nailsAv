import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { getLoyaltyStatus } from '../services/loyaltyService';
import { ok, serverError } from '../utils/response';
import type { AuthorizerContext } from '../types/auth';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const { userId } = event.requestContext.authorizer.lambda;
    const loyalty = await getLoyaltyStatus(userId);
    return ok({ loyalty });
  } catch (err) {
    console.error('getLoyalty error', err);
    return serverError();
  }
};
