import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { docClient, TABLE_NAME } from '../client';
import { auditPK, auditSK } from '../tableKeys';

export interface AuditEvent {
  auditId: string;
  actorUserId: string;
  action: string;
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export const AuditRepository = {
  async record(event: Omit<AuditEvent, 'auditId'>): Promise<void> {
    const auditId = uuid();
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...event,
          auditId,
          PK: auditPK(),
          SK: auditSK(event.createdAt, auditId),
          entityType: 'AUDIT_EVENT',
        },
      }),
    );
  },

  async list(limit = 50): Promise<AuditEvent[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': auditPK(),
          ':prefix': 'EVENT#',
        },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return (result.Items ?? []) as AuditEvent[];
  },
};
