import type { ScheduledHandler } from 'aws-lambda';
import { BookingRepository } from '../db/repositories/bookingRepository';
import { sendReminderEmail } from '../services/notificationService';

export const handler: ScheduledHandler = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log(`Sending reminders for bookings on ${tomorrowStr}`);

  const bookings = await BookingRepository.scanBookingsForReminder(tomorrowStr);
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

