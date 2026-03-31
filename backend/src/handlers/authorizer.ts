import type {
  APIGatewayRequestSimpleAuthorizerHandlerV2WithContext,
} from 'aws-lambda';
import { verifyToken } from '../utils/jwt';
import type { AuthorizerContext } from '../types/auth';

export const handler: APIGatewayRequestSimpleAuthorizerHandlerV2WithContext<AuthorizerContext> =
  async (event) => {
    try {
      const authHeader = event.headers?.authorization ?? event.headers?.Authorization ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

      if (!token) {
        return { isAuthorized: false, context: { userId: '', email: '', role: 'USER' } };
      }

      const payload = verifyToken(token);

      return {
        isAuthorized: true,
        context: {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
        },
      };
    } catch {
      return { isAuthorized: false, context: { userId: '', email: '', role: 'USER' } };
    }
  };
