import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { UserRepository } from '../db/repositories/userRepository';
import { ok, serverError } from '../utils/response';
import type { AuthorizerContext } from '../types/auth';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const { userId, tokenType } = event.requestContext.authorizer.lambda;

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
      // Lets the frontend restore the admin step-up after a page reload
      adminVerified: tokenType === 'admin' && user.role === 'ADMIN',
    });
  } catch (err) {
    console.error('getMe error', err);
    return serverError();
  }
};

