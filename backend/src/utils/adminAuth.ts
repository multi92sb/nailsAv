import type { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import type { AuthorizerContext } from '../types/auth';

export function isAdmin(
  event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
): boolean {
  return event.requestContext.authorizer.lambda.role === 'ADMIN';
}
