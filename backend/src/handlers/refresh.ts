import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { UserRepository } from '../db/repositories/userRepository';
import { createCookie, getCookie } from '../utils/cookies';
import { rotateRefreshToken, signAccessToken, tokenTtl } from '../utils/authTokens';
import { ok, unauthorized } from '../utils/response';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const currentRefreshToken = getCookie(event, 'refreshToken');
    if (!currentRefreshToken) return unauthorized('Refresh token is required');

    const rotated = await rotateRefreshToken(currentRefreshToken);
    const user = await UserRepository.getById(rotated.userId);
    if (!user) return unauthorized('User not found');

    const accessToken = signAccessToken({
      userId: user.userId,
      email: user.email,
      role: user.role ?? 'USER',
    });

    return ok(
      {
        user: {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role ?? 'USER',
        },
      },
      [
        createCookie('accessToken', accessToken, tokenTtl.access),
        createCookie('refreshToken', rotated.refreshToken, tokenTtl.refresh),
      ],
    );
  } catch {
    return unauthorized('Session expired');
  }
};
