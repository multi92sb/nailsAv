import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { UserRepository } from '../db/repositories/userRepository';
import type { AuthorizerContext } from '../types/auth';
import { forbidden, ok, serverError } from '../utils/response';
import { requireFreshAdmin } from '../utils/adminAuth';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!(await requireFreshAdmin(event))) return forbidden('Admin access required');

    const result = await UserRepository.scanAll();

    const users = result.map((item) => ({
      userId: item.userId,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone,
      createdAt: item.createdAt,
      role: item.role ?? 'USER',
    }));

    return ok({ users });
  } catch (err) {
    console.error('getUsers error', err);
    return serverError();
  }
};

