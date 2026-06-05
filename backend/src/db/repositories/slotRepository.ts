import { QueryCommand, DeleteCommand, BatchWriteCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../client';
import { slotPK, slotSK } from '../tableKeys';

export interface Slot {
  slotId: string;
  date: string;
  time: string;
  isAvailable: boolean;
}

export const SlotRepository = {
  async getSlotsByDate(date: string): Promise<Slot[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': slotPK(date),
          ':skPrefix': 'TIME#',
        },
      }),
    );
    return (result.Items ?? []).map((item) => ({
      slotId: item.slotId as string,
      date: item.date as string,
      time: item.time as string,
      isAvailable: item.isAvailable as boolean,
    }));
  },

  async deleteSlot(date: string, time: string, slotId: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: slotPK(date),
          SK: slotSK(time, slotId),
        },
        ConditionExpression: 'isAvailable = :true',
        ExpressionAttributeValues: {
          ':true': true,
        },
      }),
    );
  },

  async batchCreateSlots(slots: Array<{ slotId: string, date: string, time: string }>): Promise<number> {
    let createdCount = 0;
    const putRequests = slots.map((slot) => ({
      PutRequest: {
        Item: {
          PK: slotPK(slot.date),
          SK: slotSK(slot.time, slot.slotId),
          slotId: slot.slotId,
          date: slot.date,
          time: slot.time,
          isAvailable: true,
          entityType: 'SLOT',
        },
      },
    }));

    if (putRequests.length > 0) {
      for (let i = 0; i < putRequests.length; i += 25) {
        const batch = putRequests.slice(i, i + 25);
        let requestItems: Record<string, any> = { [TABLE_NAME]: batch };

        while (Object.keys(requestItems).length > 0) {
          const response = await docClient.send(
            new BatchWriteCommand({
              RequestItems: requestItems,
            }),
          );
          requestItems = response.UnprocessedItems || {};
        }
      }
      createdCount += putRequests.length;
    }
    return createdCount;
  },

  async updateSlotTime(date: string, oldTime: string, newTime: string, slotId: string): Promise<void> {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Delete: {
              TableName: TABLE_NAME,
              Key: {
                PK: slotPK(date),
                SK: slotSK(oldTime, slotId),
              },
              ConditionExpression: 'isAvailable = :true',
              ExpressionAttributeValues: {
                ':true': true,
              },
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                PK: slotPK(date),
                SK: slotSK(newTime, slotId),
                slotId,
                date,
                time: newTime,
                isAvailable: true,
                entityType: 'SLOT',
              },
              ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
            },
          },
        ],
      }),
    );
  },
};
