import { handler } from '../../src/handlers/createBooking';
import { UserRepository } from '../../src/db/repositories/userRepository';
import { BookingRepository } from '../../src/db/repositories/bookingRepository';

jest.mock('../../src/db/repositories/userRepository');
jest.mock('../../src/db/repositories/bookingRepository');
jest.mock('../../src/services/notificationService', () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue({}),
}));

describe('CreateBooking Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a booking successfully', async () => {
    (UserRepository.getById as jest.Mock).mockResolvedValue({
      userId: 'user-uuid-123',
      phone: '1234567890',
    });
    (BookingRepository.createBooking as jest.Mock).mockResolvedValue(undefined);

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
    expect(BookingRepository.createBooking).toHaveBeenCalled();
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
    expect(BookingRepository.createBooking).not.toHaveBeenCalled();
  });

  it('should return 409 if transaction is canceled because slot is taken', async () => {
    (UserRepository.getById as jest.Mock).mockResolvedValue({
      userId: 'user-uuid-123',
      phone: '1234567890',
    });
    
    const txError = new Error('Transaction cancelled');
    txError.name = 'TransactionCanceledException';
    (BookingRepository.createBooking as jest.Mock).mockRejectedValue(txError);

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

