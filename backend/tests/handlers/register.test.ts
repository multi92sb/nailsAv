import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../src/db/client';
import { handler } from '../../src/handlers/register';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

const docClientMock = mockClient(docClient);

describe('Register Handler', () => {
  beforeEach(() => {
    docClientMock.reset();
  });

  it('should register a new user successfully', async () => {
    docClientMock.on(QueryCommand).resolves({
      Items: [],
      Count: 0,
    });
    docClientMock.on(PutCommand).resolves({});

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
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe('jane@example.com');
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
  });

  it('should return 409 if email is already registered', async () => {
    docClientMock.on(QueryCommand).resolves({
      Items: [{ email: 'jane@example.com' }],
      Count: 1,
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
  });
});
