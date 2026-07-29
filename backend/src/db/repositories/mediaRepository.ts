import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../client';
import { mediaPK, mediaSK } from '../tableKeys';

export interface GalleryItem {
  id: string;
  key?: string;
  url: string;
  caption?: string;
  tags: string[];
  source: 'S3' | 'INSTAGRAM' | 'USER_REFERENCE';
  permalink?: string;
  featured: boolean;
  displayOrder: number;
  createdAt: string;
  thumbnailUrl?: string;
}

export const MediaRepository = {
  async upsertInstagramMedia(items: GalleryItem[]): Promise<void> {
    await Promise.all(
      items.map((item) =>
        docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              ...item,
              PK: mediaPK(),
              SK: mediaSK(item.source, item.createdAt, item.id),
              entityType: 'MEDIA',
            },
          }),
        ),
      ),
    );
  },

  async list(limit = 50): Promise<GalleryItem[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': mediaPK(),
          ':prefix': 'ITEM#',
        },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return (result.Items ?? []) as GalleryItem[];
  },

  async findById(id: string): Promise<GalleryItem | undefined> {
    const items = await this.list(200);
    return items.find((item) => item.id === id);
  },

  async update(
    source: string,
    createdAt: string,
    id: string,
    data: Partial<Pick<GalleryItem, 'caption' | 'tags' | 'featured' | 'displayOrder'>>,
  ): Promise<GalleryItem> {
    const updateParts: string[] = [];
    const exprNames: Record<string, string> = {};
    const exprValues: Record<string, unknown> = {};

    if (data.caption !== undefined) {
      updateParts.push('#caption = :caption');
      exprNames['#caption'] = 'caption';
      exprValues[':caption'] = data.caption;
    }
    if (data.tags !== undefined) {
      updateParts.push('#tags = :tags');
      exprNames['#tags'] = 'tags';
      exprValues[':tags'] = data.tags;
    }
    if (data.featured !== undefined) {
      updateParts.push('#featured = :featured');
      exprNames['#featured'] = 'featured';
      exprValues[':featured'] = data.featured;
    }
    if (data.displayOrder !== undefined) {
      updateParts.push('#displayOrder = :displayOrder');
      exprNames['#displayOrder'] = 'displayOrder';
      exprValues[':displayOrder'] = data.displayOrder;
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: mediaPK(),
          SK: mediaSK(source, createdAt, id),
        },
        UpdateExpression: `SET ${updateParts.join(', ')}`,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: 'ALL_NEW',
      }),
    );
    return result.Attributes as GalleryItem;
  },
};
