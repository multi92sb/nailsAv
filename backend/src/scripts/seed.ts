/**
 * Seed script — creates admin + time slots for the next 30 days (Mon–Sat).
 * Run: npm run seed
 * Ensure TABLE_NAME and local DynamoDB are running.
 */

import 'dotenv/config';
import { BatchWriteCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

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
    if (day !== 0) { // skip Sundays
      dates.push(cursor.toISOString().split('T')[0]);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

/**
 * Create admin if not exists
 */
async function seedAdmin(password: string) {
  const existing = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: 'USER#admin',
        SK: 'PROFILE',
      },
    })
  );

  if (existing.Item) {
    console.log('Admin already exists');
    return;
  }

  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const passwordHash = await bcrypt.hash(password, 10);

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: 'USER#admin',
        SK: 'PROFILE',
        userId: 'admin',
        email,
        password: passwordHash,
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User',
        phone: '000000000',
        entityType: 'USER',
        createdAt: new Date().toISOString(),
      },
    })
  );

  console.log('Admin created');
}

/**
 * Main seed
 */
async function seed(): Promise<void> {
  // No default password: validate this before touching the database, even if an admin already exists.
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('Set ADMIN_PASSWORD (and optionally ADMIN_EMAIL) to seed the admin user.');
  }

  // 0. The seeded admin password is published in the README, so never seed a deployed stage.
  if (/-(stage|prod)$/.test(TABLE_NAME) && !process.env.ALLOW_SEED_DEPLOYED) {
    throw new Error(
      `Refusing to seed deployed table "${TABLE_NAME}". ` +
        'Use "npm run admin:reset" with a strong ADMIN_PASSWORD instead.',
    );
  }

  // 1. Admin
  await seedAdmin(password);

  // 2. Slots
  const dates = getWorkingDates(30);

  console.log(
    `Seeding ${dates.length} days × ${TIMES.length} slots = ${
      dates.length * TIMES.length
    } total slots`
  );
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

    // DynamoDB max 25 items
    for (let i = 0; i < putRequests.length; i += 25) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: putRequests.slice(i, i + 25),
          },
        })
      );
    }

    console.log(`${date} – ${TIMES.length} slots`);
  }

  console.log('\nSeeding complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});