import type { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import type { AuthorizerContext } from '../types/auth';
import { UserRepository } from '../db/repositories/userRepository';

export function isAdmin(
  event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
): boolean {
  return event.requestContext.authorizer.lambda.role === 'ADMIN';
}

export async function requireFreshAdmin(
  event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
): Promise<boolean> {
  const context = event.requestContext.authorizer.lambda;
  if (context.role !== 'ADMIN' || context.tokenType !== 'admin') return false;

  const user = await UserRepository.getById(context.userId);
  return user?.role === 'ADMIN';
}
