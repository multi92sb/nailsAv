import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

import { docClient } from '../db/client';

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@nails.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';
const cliArgs = process.argv.slice(2);
const explicitStage = cliArgs.find((arg) => !arg.startsWith('-'));
const stage = explicitStage ?? process.env.APP_STAGE ?? 'dev';
const tableName = explicitStage ? `NailBooking-${stage}` : (process.env.TABLE_NAME ?? `NailBooking-${stage}`);

async function resetAdmin(): Promise<void> {
  const existing = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: 'USER#admin',
        SK: 'PROFILE',
      },
    }),
  );

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  const createdAt = typeof existing.Item?.createdAt === 'string'
    ? existing.Item.createdAt
    : new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: 'USER#admin',
        SK: 'PROFILE',
        userId: 'admin',
        email: DEFAULT_ADMIN_EMAIL,
        password: passwordHash,
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User',
        phone: '000000000',
        entityType: 'USER',
        createdAt,
      },
    }),
  );

  console.log(`Admin credentials reset in ${tableName}`);
  console.log(`Email: ${DEFAULT_ADMIN_EMAIL}`);
  console.log(`Password: ${DEFAULT_ADMIN_PASSWORD}`);
}

resetAdmin().catch((err) => {
  console.error('Reset admin failed:', err);
  process.exit(1);
});