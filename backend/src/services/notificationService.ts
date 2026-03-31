import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION ?? 'eu-west-1' });

const FROM = process.env.SES_FROM_EMAIL!;

interface BookingDetails {
  date: string;
  time: string;
  bookingId: string;
}

export const sendConfirmationEmail = async (
  toEmail: string,
  booking: BookingDetails,
): Promise<void> => {
  await ses.send(
    new SendEmailCommand({
      Source: FROM,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: 'Booking Confirmed – Your Nail Appointment' },
        Body: {
          Html: {
            Data: `
              <h2>Your appointment is confirmed! 💅</h2>
              <p><strong>Date:</strong> ${booking.date}</p>
              <p><strong>Time:</strong> ${booking.time}</p>
              <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
              <p>We look forward to seeing you!</p>
            `,
          },
        },
      },
    }),
  );

  if (process.env.ENABLE_SMS === 'true') {
    await sendSmsNotification(booking).catch(console.error);
  }
};

export const sendReminderEmail = async (
  toEmail: string,
  booking: BookingDetails,
): Promise<void> => {
  await ses.send(
    new SendEmailCommand({
      Source: FROM,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: 'Reminder – Your Nail Appointment is Tomorrow' },
        Body: {
          Html: {
            Data: `
              <h2>See you tomorrow! 💅</h2>
              <p><strong>Date:</strong> ${booking.date}</p>
              <p><strong>Time:</strong> ${booking.time}</p>
              <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            `,
          },
        },
      },
    }),
  );
};

async function sendSmsNotification(booking: BookingDetails): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_PHONE) return;

  // Dynamic import keeps Twilio out of the Lambda bundle when SMS is disabled
  const { default: twilio } = await import('twilio');
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  // NOTE: recipient phone number must be retrieved from the User record or passed in.
  // This stub shows the correct Twilio API usage.
  console.log(`SMS stub for booking ${booking.bookingId} on ${booking.date} at ${booking.time}`);
  void client; // suppress unused-variable warning until recipient phone is wired up
}
