import { SlotRepository } from '../../src/db/repositories/slotRepository';
import { handler } from '../../src/handlers/adminUpdateSlot';

jest.mock('../../src/db/repositories/slotRepository');

describe('AdminUpdateSlot Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(SlotRepository.updateSlotTime).not.toHaveBeenCalled();
  });

  it('should successfully update slot time', async () => {
    (SlotRepository.updateSlotTime as jest.Mock).mockResolvedValue(undefined);

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
    expect(SlotRepository.updateSlotTime).toHaveBeenCalledWith(
      '2026-06-15',
      '09:00',
      '09:30',
      'slot-uuid-1'
    );
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
    expect(SlotRepository.updateSlotTime).not.toHaveBeenCalled();
  });

  it('should return 409 if transaction is canceled (slot booked or duplicate new time)', async () => {
    const txError = new Error('Transaction cancelled');
    txError.name = 'TransactionCanceledException';
    (SlotRepository.updateSlotTime as jest.Mock).mockRejectedValue(txError);

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

