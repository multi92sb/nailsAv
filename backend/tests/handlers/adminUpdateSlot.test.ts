import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../src/db/client';
import { handler } from '../../src/handlers/adminUpdateSlot';

const docClientMock = mockClient(docClient);

describe('AdminUpdateSlot Handler', () => {
  beforeEach(() => {
    docClientMock.reset();
  });

  it('should deny access if user is not an admin', async () => {
    const event = {
      body: JSON.stringify({
        date: '2026-06-15',
        oldTime: '09:00',
        newTime: '09:30',
        slotId: 'slot-uuid-1',
      }),
      requestContext: {
        authorizer: {
          lambda: {
            userId: 'user-1',
            email: 'user@example.com',
            role: 'USER',
          },
        },
      },
    } as any;

    const result = await (handler(event, {} as any, () => {}) as Promise<any>);
    expect(result.statusCode).toBe(403);
  });

  it('should successfully update slot time', async () => {
    docClientMock.on(TransactWriteCommand).resolves({});

    const event = {
      body: JSON.stringify({
        date: '2026-06-15',
        oldTime: '09:00',
        newTime: '09:30',
        slotId: 'slot-uuid-1',
      }),
      requestContext: {
        authorizer: {
          lambda: {
            userId: 'admin-1',
            email: 'admin@example.com',
            role: 'ADMIN',
          },
        },
      },
    } as any;

    const result = await (handler(event, {} as any, () => {}) as Promise<any>);
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.newTime).toBe('09:30');
  });

  it('should return 400 for validation errors', async () => {
    const event = {
      body: JSON.stringify({
        date: 'invalid-date',
        oldTime: '09:00',
        newTime: '09:30',
        slotId: '',
      }),
      requestContext: {
        authorizer: {
          lambda: {
            userId: 'admin-1',
            email: 'admin@example.com',
            role: 'ADMIN',
          },
        },
      },
    } as any;

    const result = await (handler(event, {} as any, () => {}) as Promise<any>);
    expect(result.statusCode).toBe(400);
  });

  it('should return 409 if transaction is canceled (slot booked or duplicate new time)', async () => {
    const txError = new Error('Transaction cancelled');
    txError.name = 'TransactionCanceledException';
    docClientMock.on(TransactWriteCommand).rejects(txError);

    const event = {
      body: JSON.stringify({
        date: '2026-06-15',
        oldTime: '09:00',
        newTime: '09:30',
        slotId: 'slot-uuid-1',
      }),
      requestContext: {
        authorizer: {
          lambda: {
            userId: 'admin-1',
            email: 'admin@example.com',
            role: 'ADMIN',
          },
        },
      },
    } as any;

    const result = await (handler(event, {} as any, () => {}) as Promise<any>);
    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('Slot update failed');
  });
});
