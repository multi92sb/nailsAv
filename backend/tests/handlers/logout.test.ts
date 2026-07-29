import { handler } from '../../src/handlers/logout';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../../src/utils/authTokens', () => ({
  revokeRefreshToken: jest.fn(),
}));

const { revokeRefreshToken } = require('../../src/utils/authTokens');

function makeEvent(cookies?: string): APIGatewayProxyEventV2 {
  return {
    headers: cookies ? { cookie: cookies } : {},
  } as unknown as APIGatewayProxyEventV2;
}

describe('Logout Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('revokes the session and clears all auth cookies when refreshToken is present', async () => {
    (revokeRefreshToken as jest.Mock).mockResolvedValue(undefined);

    const result = await handler(
      makeEvent('refreshToken=some-refresh-token'),
      {} as any,
      () => {},
    ) as any;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Logged out');
    expect(revokeRefreshToken).toHaveBeenCalledWith('some-refresh-token');

    expect(result.cookies).toHaveLength(3);
    expect(result.cookies[0]).toContain('accessToken=');
    expect(result.cookies[0]).toContain('Max-Age=0');
    expect(result.cookies[1]).toContain('refreshToken=');
    expect(result.cookies[1]).toContain('Max-Age=0');
    expect(result.cookies[2]).toContain('adminAccessToken=');
    expect(result.cookies[2]).toContain('Max-Age=0');
  });

  it('returns 200 with clear-cookie headers even when no refreshToken is present', async () => {
    const result = await handler(makeEvent(), {} as any, () => {}) as any;

    expect(result.statusCode).toBe(200);
    expect(revokeRefreshToken).not.toHaveBeenCalled();
    expect(result.cookies).toHaveLength(3);
  });

  it('still returns 200 when revokeRefreshToken throws', async () => {
    (revokeRefreshToken as jest.Mock).mockRejectedValue(new Error('DB error'));

    const result = await handler(
      makeEvent('refreshToken=bad-session'),
      {} as any,
      () => {},
    ) as any;

    expect(result.statusCode).toBe(200);
    expect(result.cookies).toHaveLength(3);
  });
});