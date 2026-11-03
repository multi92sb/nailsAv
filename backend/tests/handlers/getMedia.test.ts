import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  ListObjectsV2Command: jest.fn((input) => ({ input })),
  GetObjectCommand: jest.fn((input) => ({ input })),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(async (_s3, cmd) => `https://signed.example.com/${cmd.input.Key}`),
}));
jest.mock('../../src/db/repositories/mediaRepository');

const originalBucket = process.env.MEDIA_BUCKET;

const instagramItem = {
  id: 'ig-1',
  url: 'https://example.com/photo.jpg',
  tags: [],
  source: 'INSTAGRAM',
  featured: true,
  displayOrder: 0,
  createdAt: '2026-07-01T10:00:00Z',
};

/** The handler reads MEDIA_BUCKET at module load, so load it fresh per test. */
function loadHandler(bucket: string | undefined) {
  if (bucket === undefined) delete process.env.MEDIA_BUCKET;
  else process.env.MEDIA_BUCKET = bucket;

  let handler!: APIGatewayProxyHandlerV2;
  let repo!: typeof import('../../src/db/repositories/mediaRepository').MediaRepository;
  jest.isolateModules(() => {
    handler = require('../../src/handlers/getMedia').handler;
    repo = require('../../src/db/repositories/mediaRepository').MediaRepository;
  });
  (repo.list as jest.Mock).mockResolvedValue([instagramItem]);
  return handler;
}

async function invoke(handler: APIGatewayProxyHandlerV2) {
  return (await handler({} as any, {} as any, () => {})) as any;
}

describe('GetMedia Handler', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  afterEach(() => {
    process.env.MEDIA_BUCKET = originalBucket;
  });

  it('returns S3 and Instagram media together', async () => {
    const handler = loadHandler('media-bucket');
    mockSend.mockResolvedValue({
      Contents: [{ Key: 'nails-1.jpg', LastModified: new Date('2026-06-01T00:00:00Z') }],
    });

    const result = await invoke(handler);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.media.map((m: { id: string }) => m.id)).toEqual(['ig-1', 'nails-1.jpg']);
  });

  it('returns Instagram media when the bucket does not exist', async () => {
    const handler = loadHandler('missing-bucket');
    mockSend.mockRejectedValue(Object.assign(new Error('missing'), { name: 'NoSuchBucket' }));

    const result = await invoke(handler);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).media).toEqual([instagramItem]);
  });

  it('skips S3 when MEDIA_BUCKET is not configured', async () => {
    const handler = loadHandler(undefined);

    const result = await invoke(handler);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).media).toEqual([instagramItem]);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns 500 on other S3 errors', async () => {
    const handler = loadHandler('media-bucket');
    mockSend.mockRejectedValue(Object.assign(new Error('denied'), { name: 'AccessDenied' }));

    const result = await invoke(handler);

    expect(result.statusCode).toBe(500);
  });
});
