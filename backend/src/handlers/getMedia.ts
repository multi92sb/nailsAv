import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ok, serverError } from '../utils/response';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-1' });
const BUCKET = process.env.MEDIA_BUCKET!;

export const handler: APIGatewayProxyHandlerV2 = async () => {
  try {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 50 }));
    const objects = list.Contents ?? [];

    const media = await Promise.all(
      objects
        .filter((obj) => obj.Key)
        .map(async (obj) => {
          const url = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key! }),
            { expiresIn: 3600 },
          );
          return { key: obj.Key!, url };
        }),
    );

    return ok({ media });
  } catch (err) {
    console.error('getMedia error', err);
    return serverError();
  }
};
