import { UserRepository } from '../../src/db/repositories/userRepository';
import { BookingRepository } from '../../src/db/repositories/bookingRepository';
import { getLoyaltyOverview } from '../../src/services/loyaltyService';

jest.mock('../../src/db/repositories/userRepository');
jest.mock('../../src/db/repositories/bookingRepository');

describe('getLoyaltyOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('groups completed bookings by client and ranks available rewards first', async () => {
    (UserRepository.scanAll as jest.Mock).mockResolvedValue([
      { userId: 'u1', firstName: 'Ana', lastName: 'Marković', email: 'ana@example.com', role: 'USER' },
      { userId: 'u2', firstName: 'Mina', lastName: 'Petrović', email: 'mina@example.com', role: 'USER' },
      { userId: 'admin', firstName: 'Admin', lastName: 'User', email: 'admin@example.com', role: 'ADMIN' },
    ]);
    (BookingRepository.scanCompletedBookings as jest.Mock).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ bookingId: `b${i}`, userId: 'u1', status: 'COMPLETED' }))
        .concat([{ bookingId: 'b5', userId: 'u2', status: 'COMPLETED' }]),
    );

    const rows = await getLoyaltyOverview();

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      userId: 'u1',
      completedVisits: 5,
      rewardsAvailable: 1,
      discountPercent: 20,
    });
    expect(rows[1]).toMatchObject({
      userId: 'u2',
      completedVisits: 1,
      progress: 1,
      rewardsAvailable: 0,
    });
  });
});
