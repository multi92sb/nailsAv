import type { ScheduledHandler } from 'aws-lambda';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../db/client';
import { sendReminderEmail } from '../services/notificationService';

export const handler: ScheduledHandler = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log(`Sending reminders for bookings on ${tomorrowStr}`);

  // NOTE: For large tables, create a GSI on `date` and use QueryCommand instead.
  // Scan works fine for small datasets but consumes more read capacity.
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression:
        '#date = :date AND entityType = :type AND #status = :status',
      ExpressionAttributeNames: {
        '#date': 'date',
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':date': tomorrowStr,
        ':type': 'BOOKING',
        ':status': 'CONFIRMED',
      },
    }),
  );

  const bookings = result.Items ?? [];
  console.log(`Found ${bookings.length} booking(s) to remind`);

  const results = await Promise.allSettled(
    bookings.map((booking) =>
      sendReminderEmail(booking.email as string, {
        date: booking.date as string,
        time: booking.time as string,
        bookingId: booking.bookingId as string,
      }),
    ),
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`${failed.length} reminder(s) failed to send`);
  }
};
