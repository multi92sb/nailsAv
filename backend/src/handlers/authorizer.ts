import type {
  APIGatewayRequestSimpleAuthorizerHandlerV2WithContext,
} from 'aws-lambda';
import { verifyToken } from '../utils/jwt';
import type { AuthorizerContext } from '../types/auth';
import { getCookie } from '../utils/cookies';

export const handler: APIGatewayRequestSimpleAuthorizerHandlerV2WithContext<AuthorizerContext> =
  async (event) => {
    try {
      const rawPath =
        (event as unknown as { rawPath?: string }).rawPath ??
        (event as unknown as { requestContext?: { http?: { path?: string } } }).requestContext?.http?.path ??
        '';
      const needsAdminToken = rawPath.startsWith('/admin/');
      const authHeader = event.headers?.authorization ?? event.headers?.Authorization ?? '';
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      const adminToken = getCookie(event, 'adminAccessToken');
      const accessToken = getCookie(event, 'accessToken');
      // Prefer step-up admin cookie when present so handlers like GET /users
      // (outside /admin/*) can still satisfy requireFreshAdmin().
      const token = needsAdminToken
        ? (adminToken ?? bearerToken)
        : (adminToken ?? accessToken ?? bearerToken);

      if (!token) {
        return { isAuthorized: false, context: { userId: '', email: '', role: 'USER' } };
      }

      const payload = verifyToken(token);
      if (needsAdminToken && payload.tokenType !== 'admin') {
        return { isAuthorized: false, context: { userId: '', email: '', role: 'USER' } };
      }

      return {
        isAuthorized: true,
        context: {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          tokenType: payload.tokenType,
        },
      };
    } catch {
      return { isAuthorized: false, context: { userId: '', email: '', role: 'USER' } };
    }
  };
