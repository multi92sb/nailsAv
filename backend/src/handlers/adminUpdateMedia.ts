import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { MediaRepository } from '../db/repositories/mediaRepository';
import { AuditRepository } from '../db/repositories/auditRepository';
import type { AuthorizerContext } from '../types/auth';
import { badRequest, forbidden, notFound, ok, serverError } from '../utils/response';
import { requireFreshAdmin } from '../utils/adminAuth';

const schema = z
  .object({
    caption: z.string().max(500).optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
    featured: z.boolean().optional(),
    displayOrder: z.number().int().min(0).max(10000).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!(await requireFreshAdmin(event))) return forbidden('Admin access required');

    const mediaId = event.pathParameters?.id;
    if (!mediaId) return badRequest('media id is required');

    const parsed = schema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const existing = await MediaRepository.findById(mediaId);
    if (!existing) return notFound('Media item not found');

    const media = await MediaRepository.update(
      existing.source,
      existing.createdAt,
      existing.id,
      parsed.data,
    );
    await AuditRepository.record({
      actorUserId: event.requestContext.authorizer.lambda.userId,
      action: 'UPDATE_MEDIA',
      targetId: mediaId,
      details: parsed.data,
      createdAt: new Date().toISOString(),
    });

    return ok({ media });
  } catch (err) {
    console.error('adminUpdateMedia error', err);
    return serverError();
  }
};
