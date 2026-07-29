import { handler } from '../../src/handlers/refresh';
import { UserRepository } from '../../src/db/repositories/userRepository';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../../src/db/repositories/userRepository');
jest.mock('../../src/utils/authTokens', () => ({
  rotateRefreshToken: jest.fn(),
  signAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  tokenTtl: { access: 900, refresh: 2592000, admin: 1800 },
}));

const { rotateRefreshToken } = require('../../src/utils/authTokens');

const sampleUser = {
  userId: 'user-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '123',
  role: 'USER' as const,
  password: 'hash',
  createdAt: '2026-01-01T00:00:00Z',
};

function makeEvent(cookies?: string): APIGatewayProxyEventV2 {
  return {
    headers: cookies ? { cookie: cookies } : {},
  } as unknown as APIGatewayProxyEventV2;
}

describe('Refresh Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no refreshToken cookie is present', async () => {
    const result = await handler(makeEvent(), {} as any, () => {}) as any;

    expect(result.statusCode).toBe(401);
    expect(rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('returns 200 with user and new cookies on successful rotation', async () => {
    (rotateRefreshToken as jest.Mock).mockResolvedValue({
      sessionId: 'sess-1',
      userId: 'user-1',
      refreshToken: 'new-refresh-token',
    });
    (UserRepository.getById as jest.Mock).mockResolvedValue(sampleUser);

    const result = await handler(
      makeEvent('refreshToken=old-refresh-token'),
      {} as any,
      () => {},
    ) as any;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.user.email).toBe('jane@example.com');
    expect(body.user.role).toBe('USER');
    expect(result.cookies).toHaveLength(2);
    expect(result.cookies[0]).toContain('accessToken=');
    expect(result.cookies[1]).toContain('refreshToken=new-refresh-token');
  });

  it('returns 401 when rotateRefreshToken throws (expired/invalid token)', async () => {
    (rotateRefreshToken as jest.Mock).mockRejectedValue(new Error('Invalid refresh token'));

    const result = await handler(
      makeEvent('refreshToken=expired-token'),
      {} as any,
      () => {},
    ) as any;

    expect(result.statusCode).toBe(401);
  });

  it('returns 401 when user is not found after rotation', async () => {
    (rotateRefreshToken as jest.Mock).mockResolvedValue({
      sessionId: 'sess-1',
      userId: 'ghost',
      refreshToken: 'new-refresh-token',
    });
    (UserRepository.getById as jest.Mock).mockResolvedValue(undefined);

    const result = await handler(
      makeEvent('refreshToken=valid-token'),
      {} as any,
      () => {},
    ) as any;

    expect(result.statusCode).toBe(401);
  });
});