import { handler } from '../../src/handlers/adminSyncInstagramMedia';
import { MediaRepository } from '../../src/db/repositories/mediaRepository';
import { AuditRepository } from '../../src/db/repositories/auditRepository';
import { requireFreshAdmin } from '../../src/utils/adminAuth';
import type { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import type { AuthorizerContext } from '../../src/types/auth';

jest.mock('../../src/db/repositories/mediaRepository');
jest.mock('../../src/db/repositories/auditRepository');
jest.mock('../../src/utils/adminAuth');

const originalToken = process.env.INSTAGRAM_ACCESS_TOKEN;

function makeEvent(): APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext> {
  return {
    requestContext: {
      authorizer: {
        lambda: { userId: 'admin-1', email: 'admin@nails.com', role: 'ADMIN', tokenType: 'admin' },
      },
      http: { sourceIp: '127.0.0.1' },
    },
  } as unknown as APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>;
}

const instagramPayload = {
  data: [
    {
      id: 'ig-1',
      caption: 'Beautiful nails #nailart #manicure',
      media_type: 'IMAGE',
      media_url: 'https://example.com/photo.jpg',
      thumbnail_url: 'https://example.com/thumb.jpg',
      permalink: 'https://instagram.com/p/abc123',
      timestamp: '2026-07-01T10:00:00Z',
    },
    {
      id: 'ig-2',
      caption: 'No tags here',
      media_type: 'IMAGE',
      media_url: 'https://example.com/photo2.jpg',
      permalink: 'https://instagram.com/p/def456',
      timestamp: '2026-07-02T10:00:00Z',
    },
    {
      id: 'ig-3',
      caption: 'No media URL',
      media_type: 'CAROUSEL_ALBUM',
      permalink: 'https://instagram.com/p/nope',
    },
  ],
};

describe('AdminSyncInstagramMedia Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INSTAGRAM_ACCESS_TOKEN = 'test-ig-token';
  });

  afterEach(() => {
    process.env.INSTAGRAM_ACCESS_TOKEN = originalToken;
  });

  it('returns 403 when requireFreshAdmin fails', async () => {
    (requireFreshAdmin as jest.Mock).mockResolvedValue(false);

    const result = await handler(makeEvent(), {} as any, () => {}) as any;

    expect(result.statusCode).toBe(403);
    expect(MediaRepository.upsertInstagramMedia).not.toHaveBeenCalled();
  });

  it('returns 400 when INSTAGRAM_ACCESS_TOKEN is not configured', async () => {
    (requireFreshAdmin as jest.Mock).mockResolvedValue(true);
    delete process.env.INSTAGRAM_ACCESS_TOKEN;

    const result = await handler(makeEvent(), {} as any, () => {}) as any;

    expect(result.statusCode).toBe(400);
    expect(MediaRepository.upsertInstagramMedia).not.toHaveBeenCalled();
  });

  it('syncs media, upserts to DB, records audit event, and returns 200', async () => {
    (requireFreshAdmin as jest.Mock).mockResolvedValue(true);
    (MediaRepository.upsertInstagramMedia as jest.Mock).mockResolvedValue(undefined);
    (AuditRepository.record as jest.Mock).mockResolvedValue(undefined);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => instagramPayload,
    } as unknown as Response);

    const result = await handler(makeEvent(), {} as any, () => {}) as any;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.count).toBe(2); // ig-3 filtered out (no media_url)
    expect(body.media).toHaveLength(2);

    // First item should have extracted tags
    expect(body.media[0].tags).toEqual(['nailart', 'manicure']);
    expect(body.media[0].source).toBe('INSTAGRAM');
    expect(body.media[0].featured).toBe(true); // index 0 < 6

    // Second item has no tags
    expect(body.media[1].tags).toEqual([]);

    expect(MediaRepository.upsertInstagramMedia).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ig-1', source: 'INSTAGRAM' }),
        expect.objectContaining({ id: 'ig-2', source: 'INSTAGRAM' }),
      ]),
    );
    expect(AuditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-1',
        action: 'SYNC_INSTAGRAM_MEDIA',
        details: { count: 2 },
      }),
    );
  });

  it('returns 400 when Instagram API responds with an error', async () => {
    (requireFreshAdmin as jest.Mock).mockResolvedValue(true);

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Invalid access token' } }),
    } as unknown as Response);

    const result = await handler(makeEvent(), {} as any, () => {}) as any;

    expect(result.statusCode).toBe(400);
    expect(MediaRepository.upsertInstagramMedia).not.toHaveBeenCalled();
  });
});