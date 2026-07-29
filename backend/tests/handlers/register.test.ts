import { handler } from '../../src/handlers/register';
import { UserRepository } from '../../src/db/repositories/userRepository';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../../src/db/repositories/userRepository');
jest.mock('../../src/utils/rateLimiter', () => ({
  isRateLimited: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../src/utils/authTokens', () => ({
  signAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  createRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
  tokenTtl: { access: 900, refresh: 2592000, admin: 1800 },
}));

describe('Register Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    (UserRepository.getByEmail as jest.Mock).mockResolvedValue(undefined);
    (UserRepository.create as jest.Mock).mockResolvedValue(undefined);

    const event = {
      body: JSON.stringify({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '1234567890',
        password: 'securePassword123',
      }),
      requestContext: {
        http: {
          sourceIp: '127.0.0.1',
        },
      },
    } as unknown as APIGatewayProxyEventV2;

    const result = await handler(event, {} as any, () => {}) as any;

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.user.email).toBe('jane@example.com');
    expect(body.user.role).toBe('USER');
    expect(result.cookies).toHaveLength(2);
    expect(result.cookies[0]).toContain('accessToken=');
    expect(result.cookies[1]).toContain('refreshToken=');
    expect(UserRepository.create).toHaveBeenCalled();
  });

  it('should return 400 for validation errors', async () => {
    const event = {
      body: JSON.stringify({
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
        phone: '123',
        password: '123',
      }),
      requestContext: {
        http: {
          sourceIp: '127.0.0.1',
        },
      },
    } as unknown as APIGatewayProxyEventV2;

    const result = await handler(event, {} as any, () => {}) as any;

    expect(result.statusCode).toBe(400);
    expect(UserRepository.create).not.toHaveBeenCalled();
  });

  it('should return 409 if email is already registered', async () => {
    (UserRepository.getByEmail as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      email: 'jane@example.com',
    });

    const event = {
      body: JSON.stringify({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '1234567890',
        password: 'securePassword123',
      }),
      requestContext: {
        http: {
          sourceIp: '127.0.0.1',
        },
      },
    } as unknown as APIGatewayProxyEventV2;

    const result = await handler(event, {} as any, () => {}) as any;

    expect(result.statusCode).toBe(409);
    expect(UserRepository.create).not.toHaveBeenCalled();
  });
});