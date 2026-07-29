import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../client';
import { authSessionPK, authSessionSK } from '../tableKeys';

export interface AuthSession {
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: number;
  createdAt: string;
  updatedAt: string;
  entityType: 'AUTH_SESSION';
}

export const AuthSessionRepository = {
  async create(session: Omit<AuthSession, 'entityType'>): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...session,
          PK: authSessionPK(session.sessionId),
          SK: authSessionSK(),
          entityType: 'AUTH_SESSION',
        },
      }),
    );
  },

  async get(sessionId: string): Promise<AuthSession | undefined> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: authSessionPK(sessionId),
          SK: authSessionSK(),
        },
      }),
    );
    return result.Item as AuthSession | undefined;
  },

  async rotate(sessionId: string, refreshTokenHash: string, expiresAt: number): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: authSessionPK(sessionId),
          SK: authSessionSK(),
        },
        UpdateExpression: 'SET refreshTokenHash = :hash, expiresAt = :expiresAt, updatedAt = :now',
        ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
        ExpressionAttributeValues: {
          ':hash': refreshTokenHash,
          ':expiresAt': expiresAt,
          ':now': new Date().toISOString(),
        },
      }),
    );
  },

  async revoke(sessionId: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: authSessionPK(sessionId),
          SK: authSessionSK(),
        },
      }),
    );
  },
};
