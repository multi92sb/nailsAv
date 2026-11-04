import { UserRepository } from '../../src/db/repositories/userRepository';
import { getLoyaltyStatus } from '../../src/services/loyaltyService';
import { AuditRepository } from '../../src/db/repositories/auditRepository';
import { requireFreshAdmin } from '../../src/utils/adminAuth';
import { handler } from '../../src/handlers/adminRedeemLoyalty';

jest.mock('../../src/db/repositories/userRepository');
jest.mock('../../src/services/loyaltyService', () => ({
  ...jest.requireActual('../../src/services/loyaltyService'),
  getLoyaltyStatus: jest.fn(),
}));
jest.mock('../../src/db/repositories/auditRepository');
jest.mock('../../src/utils/adminAuth');

const event = (body: unknown) =>
  ({
    body: JSON.stringify(body),
    requestContext: {
      authorizer: {
        lambda: {
          userId: 'admin-1',
          email: 'admin@example.com',
          role: 'ADMIN',
          tokenType: 'admin',
        },
      },
    },
  }) as any;

describe('AdminRedeemLoyalty Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireFreshAdmin as jest.Mock).mockResolvedValue(true);
    (AuditRepository.record as jest.Mock).mockResolvedValue(undefined);
  });

  it('rejects a client without an available reward', async () => {
    (getLoyaltyStatus as jest.Mock).mockResolvedValue({
      completedVisits: 4,
      rewardsRedeemed: 0,
      rewardsAvailable: 0,
      discountPercent: 20,
    });

    const result = await (handler(event({ userId: 'user-1' }), {} as any, () => {}) as Promise<any>);

    expect(result.statusCode).toBe(409);
    expect(UserRepository.redeemLoyaltyReward).not.toHaveBeenCalled();
  });

  it('marks an available reward as redeemed', async () => {
    (getLoyaltyStatus as jest.Mock).mockResolvedValue({
      completedVisits: 5,
      rewardsRedeemed: 0,
      rewardsAvailable: 1,
      discountPercent: 20,
    });
    (UserRepository.redeemLoyaltyReward as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      loyaltyRedeemedCount: 1,
    });

    const result = await (handler(event({ userId: 'user-1' }), {} as any, () => {}) as Promise<any>);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(UserRepository.redeemLoyaltyReward).toHaveBeenCalledWith('user-1', 0);
    expect(body.loyalty.rewardsAvailable).toBe(0);
    expect(AuditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ADMIN_REDEEM_LOYALTY', targetId: 'user-1' }),
    );
  });

  it('requires fresh admin access', async () => {
    (requireFreshAdmin as jest.Mock).mockResolvedValue(false);

    const result = await (handler(event({ userId: 'user-1' }), {} as any, () => {}) as Promise<any>);

    expect(result.statusCode).toBe(403);
  });
});
