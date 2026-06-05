import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { UserRepository } from '../db/repositories/userRepository';
import { ok, serverError } from '../utils/response';
import type { AuthorizerContext } from '../types/auth';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const { userId } = event.requestContext.authorizer.lambda;

    const user = await UserRepository.getById(userId);
    if (!user) {
      return serverError('User not found');
    }

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
    console.error('getMe error', err);
    return serverError();
  }
};

