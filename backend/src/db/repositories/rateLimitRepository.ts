import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../client';
import { rateLimitPK, rateLimitSK } from '../tableKeys';

export interface RateLimitRecord {
  key: string;
  count: number;
  resetTime: number;
  expiresAt: number;
}

export const RateLimitRepository = {
  async get(key: string): Promise<RateLimitRecord | undefined> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: rateLimitPK(key),
          SK: rateLimitSK(),
        },
      }),
    );
    return result.Item as RateLimitRecord | undefined;
  },

  async create(key: string, resetTime: number): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: rateLimitPK(key),
          SK: rateLimitSK(),
          key,
          count: 1,
          resetTime,
          expiresAt: Math.ceil(resetTime / 1000),
          entityType: 'RATE_LIMIT',
        },
      }),
    );
  },

  async increment(key: string): Promise<number> {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: rateLimitPK(key),
          SK: rateLimitSK(),
        },
        UpdateExpression: 'ADD #count :one',
        ExpressionAttributeNames: {
          '#count': 'count',
        },
        ExpressionAttributeValues: {
          ':one': 1,
        },
        ReturnValues: 'UPDATED_NEW',
      }),
    );
    return (result.Attributes?.count as number | undefined) ?? 1;
  },
};
