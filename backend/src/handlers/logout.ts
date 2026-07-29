import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { clearCookie, getCookie } from '../utils/cookies';
import { revokeRefreshToken } from '../utils/authTokens';
import { ok } from '../utils/response';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const refreshToken = getCookie(event, 'refreshToken');
  if (refreshToken) {
    await revokeRefreshToken(refreshToken).catch(() => undefined);
  }

  return ok(
    { message: 'Logged out' },
    [clearCookie('accessToken'), clearCookie('refreshToken'), clearCookie('adminAccessToken')],
  );
};
