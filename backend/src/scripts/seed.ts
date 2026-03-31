/**
 * Seed script — creates time slots for the next 30 days (Mon–Sat).
 * Run: npm run seed
 * Ensure TABLE_NAME and valid AWS credentials are set in environment (or .env).
 */
import 'dotenv/config';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { docClient, TABLE_NAME } from '../db/client';
import { slotPK, slotSK } from '../db/tableKeys';

const TIMES = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
];

function getWorkingDates(count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1); // start from tomorrow
  while (dates.length < count) {
    const day = cursor.getDay();
    if (day !== 0) { // skip Sundays (0 = Sunday)
      dates.push(cursor.toISOString().split('T')[0]);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function seed(): Promise<void> {
  const dates = getWorkingDates(30);
  console.log(`Seeding ${dates.length} days × ${TIMES.length} slots = ${dates.length * TIMES.length} total slots`);
  console.log(`Table: ${TABLE_NAME}\n`);

  for (const date of dates) {
    const putRequests = TIMES.map((time) => {
      const slotId = uuid();
      return {
        PutRequest: {
          Item: {
            PK: slotPK(date),
            SK: slotSK(time, slotId),
            slotId,
            date,
            time,
            isAvailable: true,
            entityType: 'SLOT',
          },
        },
      };
    });

    // DynamoDB BatchWrite accepts max 25 items per call
    for (let i = 0; i < putRequests.length; i += 25) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: { [TABLE_NAME]: putRequests.slice(i, i + 25) },
        }),
      );
    }
    console.log(`  ✓ ${date} – ${TIMES.length} slots`);
  }

  console.log('\nSeeding complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
