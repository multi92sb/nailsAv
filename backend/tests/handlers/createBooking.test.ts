import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../src/db/client';
import { handler } from '../../src/handlers/createBooking';

const docClientMock = mockClient(docClient);

jest.mock('../../src/services/notificationService', () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue({}),
}));

describe('CreateBooking Handler', () => {
  beforeEach(() => {
    docClientMock.reset();
  });

  it('should create a booking successfully', async () => {
    docClientMock.on(GetCommand).resolves({
      Item: {
        phone: '1234567890',
      },
    });
    docClientMock.on(TransactWriteCommand).resolves({});

    const event = {
      body: JSON.stringify({
        date: '2026-06-15',
        time: '14:00',
        slotId: 'slot-uuid-123',
      }),
      requestContext: {
        authorizer: {
          lambda: {
            userId: 'user-uuid-123',
            email: 'user@example.com',
          },
        },
      },
    } as any;

    const result = await handler(event, {} as any, () => {}) as any;

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('CONFIRMED');
    expect(body.bookingId).toBeDefined();
  });

  it('should return 400 for validation errors (e.g. invalid date format)', async () => {
    const event = {
      body: JSON.stringify({
        date: 'invalid-date',
        time: '14:00',
        slotId: 'slot-uuid-123',
      }),
      requestContext: {
        authorizer: {
          lambda: {
            userId: 'user-uuid-123',
            email: 'user@example.com',
          },
        },
      },
    } as any;

    const result = await handler(event, {} as any, () => {}) as any;

    expect(result.statusCode).toBe(400);
  });

  it('should return 409 if transaction is canceled because slot is taken', async () => {
    docClientMock.on(GetCommand).resolves({
      Item: {
        phone: '1234567890',
      },
    });

    const txError = new Error('Transaction cancelled');
    txError.name = 'TransactionCanceledException';
    docClientMock.on(TransactWriteCommand).rejects(txError);

    const event = {
      body: JSON.stringify({
        date: '2026-06-15',
        time: '14:00',
        slotId: 'slot-uuid-123',
      }),
      requestContext: {
        authorizer: {
          lambda: {
            userId: 'user-uuid-123',
            email: 'user@example.com',
          },
        },
      },
    } as any;

    const result = await handler(event, {} as any, () => {}) as any;

    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('This slot is no longer available');
  });
});
