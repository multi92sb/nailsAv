import { BookingRepository } from '../db/repositories/bookingRepository';
import { UserRepository } from '../db/repositories/userRepository';

export const LOYALTY_VISITS_REQUIRED = 5;
export const LOYALTY_DISCOUNT_PERCENT = 20;

export interface LoyaltyStatus {
  completedVisits: number;
  visitsRequired: number;
  progress: number;
  rewardsEarned: number;
  rewardsRedeemed: number;
  rewardsAvailable: number;
  discountPercent: number;
  nextRewardIn: number;
}

/** Pure calculation so the loyalty rules can be tested without DynamoDB. */
export function calculateLoyalty(completedVisits: number, rewardsRedeemed: number): LoyaltyStatus {
  const visits = Math.max(0, completedVisits);
  const redeemed = Math.max(0, rewardsRedeemed);
  const rewardsEarned = Math.floor(visits / LOYALTY_VISITS_REQUIRED);
  const rewardsAvailable = Math.max(0, rewardsEarned - redeemed);
  const progress = visits % LOYALTY_VISITS_REQUIRED;

  return {
    completedVisits: visits,
    visitsRequired: LOYALTY_VISITS_REQUIRED,
    progress,
    rewardsEarned,
    rewardsRedeemed: redeemed,
    rewardsAvailable,
    discountPercent: LOYALTY_DISCOUNT_PERCENT,
    nextRewardIn: rewardsAvailable > 0 ? 0 : LOYALTY_VISITS_REQUIRED - progress,
  };
}

export async function getLoyaltyStatus(userId: string): Promise<LoyaltyStatus> {
  const [user, bookings] = await Promise.all([
    UserRepository.getById(userId),
    BookingRepository.getBookingsByUserId(userId),
  ]);

  const completedVisits = bookings.filter((booking) => booking.status === 'COMPLETED').length;
  return calculateLoyalty(completedVisits, user?.loyaltyRedeemedCount ?? 0);
}
