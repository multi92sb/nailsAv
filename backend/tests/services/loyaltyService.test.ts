import { calculateLoyalty } from '../../src/services/loyaltyService';

describe('calculateLoyalty', () => {
  it('starts with an empty progress bar', () => {
    expect(calculateLoyalty(0, 0)).toMatchObject({
      completedVisits: 0,
      progress: 0,
      rewardsEarned: 0,
      rewardsAvailable: 0,
      nextRewardIn: 5,
    });
  });

  it('counts progress toward the first reward', () => {
    expect(calculateLoyalty(4, 0)).toMatchObject({
      progress: 4,
      rewardsEarned: 0,
      rewardsAvailable: 0,
      nextRewardIn: 1,
    });
  });

  it('makes a reward available after five completed visits', () => {
    expect(calculateLoyalty(5, 0)).toMatchObject({
      progress: 0,
      rewardsEarned: 1,
      rewardsAvailable: 1,
      discountPercent: 20,
      nextRewardIn: 0,
    });
  });

  it('keeps later progress while an earned reward is unused', () => {
    expect(calculateLoyalty(7, 0)).toMatchObject({
      progress: 2,
      rewardsEarned: 1,
      rewardsAvailable: 1,
      nextRewardIn: 0,
    });
  });

  it('consumes a redeemed reward and exposes the next milestone', () => {
    expect(calculateLoyalty(5, 1)).toMatchObject({
      rewardsEarned: 1,
      rewardsRedeemed: 1,
      rewardsAvailable: 0,
      nextRewardIn: 5,
    });
    expect(calculateLoyalty(10, 1)).toMatchObject({
      rewardsEarned: 2,
      rewardsAvailable: 1,
    });
  });
});
