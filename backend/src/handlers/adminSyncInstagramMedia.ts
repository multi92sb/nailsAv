import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { MediaRepository, type GalleryItem } from '../db/repositories/mediaRepository';
import { AuditRepository } from '../db/repositories/auditRepository';
import type { AuthorizerContext } from '../types/auth';
import { badRequest, forbidden, ok, serverError } from '../utils/response';
import { requireFreshAdmin } from '../utils/adminAuth';

interface InstagramMediaResponse {
  data?: Array<{
    id: string;
    caption?: string;
    media_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
    timestamp?: string;
  }>;
  error?: { message?: string };
}

const extractTags = (caption = ''): string[] =>
  Array.from(caption.matchAll(/#([\p{L}\p{N}_-]+)/gu))
    .map((match) => match[1].toLowerCase())
    .slice(0, 12);

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    if (!(await requireFreshAdmin(event))) return forbidden('Admin access required');

    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!accessToken) return badRequest('INSTAGRAM_ACCESS_TOKEN is not configured');

    const version = process.env.INSTAGRAM_API_VERSION ?? 'v23.0';
    const userId = process.env.INSTAGRAM_USER_ID ?? 'me';
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const limit = Number(process.env.INSTAGRAM_SYNC_LIMIT ?? 24);
    const url = new URL(`https://graph.instagram.com/${version}/${userId}/media`);
    url.searchParams.set('fields', fields);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);
    const payload = (await response.json()) as InstagramMediaResponse;
    if (!response.ok) {
      return badRequest(payload.error?.message ?? 'Instagram media sync failed');
    }

    const media: GalleryItem[] = (payload.data ?? [])
      .filter((item) => item.media_url)
      .map((item, index) => ({
        id: item.id,
        url: item.media_url!,
        thumbnailUrl: item.thumbnail_url,
        caption: item.caption ?? '',
        tags: extractTags(item.caption),
        source: 'INSTAGRAM',
        permalink: item.permalink,
        featured: index < 6,
        displayOrder: index,
        createdAt: item.timestamp ?? new Date().toISOString(),
      }));

    await MediaRepository.upsertInstagramMedia(media);
    await AuditRepository.record({
      actorUserId: event.requestContext.authorizer.lambda.userId,
      action: 'SYNC_INSTAGRAM_MEDIA',
      details: { count: media.length },
      createdAt: new Date().toISOString(),
    });

    return ok({ count: media.length, media });
  } catch (err) {
    console.error('adminSyncInstagramMedia error', err);
    return serverError();
  }
};
