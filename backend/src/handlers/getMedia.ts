import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MediaRepository, type GalleryItem } from '../db/repositories/mediaRepository';
import { ok, serverError } from '../utils/response';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-1' });
const BUCKET = process.env.MEDIA_BUCKET!;

export const handler: APIGatewayProxyHandlerV2 = async () => {
  try {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 50 }));
    const objects = list.Contents ?? [];

    const s3Media = await Promise.all(
      objects
        .filter((obj) => obj.Key)
        .map(async (obj) => {
          const url = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key! }),
            { expiresIn: 3600 },
          );
          return {
            id: obj.Key!,
            key: obj.Key!,
            url,
            caption: '',
            tags: [],
            source: 'S3',
            featured: false,
            displayOrder: 0,
            createdAt: obj.LastModified?.toISOString() ?? new Date(0).toISOString(),
          } satisfies GalleryItem;
        }),
    );
    const instagramMedia = await MediaRepository.list(50);
    const media = [...instagramMedia, ...s3Media].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      return b.createdAt.localeCompare(a.createdAt);
    });

    return ok({ media });
  } catch (err) {
    console.error('getMedia error', err);
    return serverError();
  }
};
