import { BookingRepository } from '../../src/db/repositories/bookingRepository';
import { AuditRepository } from '../../src/db/repositories/auditRepository';
import { handler } from '../../src/handlers/cancelBooking';

jest.mock('../../src/db/repositories/bookingRepository');
jest.mock('../../src/db/repositories/auditRepository');

describe('CancelBooking Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (BookingRepository.cancelBooking as jest.Mock).mockResolvedValue(undefined);
    (AuditRepository.record as jest.Mock).mockResolvedValue(undefined);
  });

  it('records the cancellation time and an audit event', async () => {
    (BookingRepository.getBooking as jest.Mock).mockResolvedValue({
      bookingId: 'booking-1',
      userId: 'user-1',
      email: 'client@example.com',
      date: '2099-01-02',
      time: '09:00',
      slotId: 'slot-1',
      status: 'CONFIRMED',
    });

    const event = {
      body: JSON.stringify({ bookingId: 'booking-1' }),
      requestContext: {
        authorizer: {
          lambda: {
            userId: 'user-1',
            email: 'client@example.com',
            role: 'USER',
          },
        },
      },
    } as any;

    const result = await (handler(event, {} as any, () => {}) as Promise<any>);

    expect(result.statusCode).toBe(200);
    expect(BookingRepository.cancelBooking).toHaveBeenCalledWith(
      'user-1',
      'booking-1',
      '2099-01-02',
      '09:00',
      'slot-1',
    );
    expect(AuditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        action: 'CANCEL_BOOKING',
        targetId: 'booking-1',
      }),
    );
  });
});
