import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { UserRepository } from '../db/repositories/userRepository';
import { AuditRepository } from '../db/repositories/auditRepository';
import { calculateLoyalty, getLoyaltyStatus } from '../services/loyaltyService';
import { badRequest, conflict, forbidden, ok, serverError } from '../utils/response';
import { requireFreshAdmin } from '../utils/adminAuth';
import type { AuthorizerContext } from '../types/auth';

const schema = z
  .object({
    userId: z.string().min(1),
  })
  .strict();

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!(await requireFreshAdmin(event))) return forbidden('Admin access required');

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { userId } = parsed.data;
    const before = await getLoyaltyStatus(userId);
    if (before.rewardsAvailable < 1) {
      return conflict('No loyalty reward available for this client');
    }

    const user = await UserRepository.redeemLoyaltyReward(userId, before.rewardsRedeemed);
    if (!user) {
      return conflict('The loyalty reward was already redeemed');
    }

    await AuditRepository.record({
      actorUserId: event.requestContext.authorizer.lambda.userId,
      action: 'ADMIN_REDEEM_LOYALTY',
      targetId: userId,
      details: { discountPercent: before.discountPercent, redeemedCount: before.rewardsRedeemed + 1 },
      createdAt: new Date().toISOString(),
    });

    const loyalty = calculateLoyalty(before.completedVisits, user.loyaltyRedeemedCount ?? 0);
    return ok({ userId, loyalty });
  } catch (err) {
    console.error('adminRedeemLoyalty error', err);
    return serverError();
  }
};
