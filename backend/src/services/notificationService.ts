import { SESClient, SendEmailCommand, type SendEmailCommandInput } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION ?? 'eu-west-1' });

const FROM = process.env.SES_FROM_EMAIL!;

interface BookingDetails {
  date: string;
  time: string;
  bookingId: string;
}

async function sendEmailWithRetry(
  params: SendEmailCommandInput,
  retries = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await ses.send(new SendEmailCommand(params));
      return;
    } catch (err) {
      console.error(`Email attempt ${attempt} failed:`, err);
      if (attempt === retries) {
        console.error(
          'Email permanently failed for:',
          params.Destination?.ToAddresses,
        );
        return;
      }
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
    }
  }
}

export const sendConfirmationEmail = async (
  toEmail: string,
  booking: BookingDetails,
): Promise<void> => {
  await sendEmailWithRetry({
    Source: FROM,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: 'Rezervisali ste termin' },
      Body: {
        Html: {
          Data: `
            <h2>Uspešno ste rezervisali termin</h2>
            <p><strong>Datum:</strong> ${booking.date}</p>
            <p><strong>Vreme:</strong> ${booking.time}</p>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p>Vidimo se!</p>
          `,
        },
      },
    },
  });

  if (process.env.ENABLE_SMS === 'false') {
    await sendSmsNotification(booking).catch(console.error);
  }
};

export const sendReminderEmail = async (
  toEmail: string,
  booking: BookingDetails,
): Promise<void> => {
  await sendEmailWithRetry({
    Source: FROM,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: 'Podsetnik – Vas termin je sutra' },
      Body: {
        Html: {
          Data: `
            <h2>Vidimo se sutra! 💅</h2>
            <p><strong>Datum:</strong> ${booking.date}</p>
            <p><strong>Time:</strong> ${booking.time}</p>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
          `,
        },
      },
    },
  });
};

export const sendCancellationEmail = async (
  toEmail: string,
  booking: BookingDetails,
): Promise<void> => {
  await sendEmailWithRetry({
    Source: FROM,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: 'Otkazali ste termin' },
      Body: {
        Html: {
          Data: `
            <h2>Vaš termin je otkazan 💅</h2>
            <p><strong>Datum:</strong> ${booking.date}</p>
            <p><strong>Vreme:</strong> ${booking.time}</p>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p>If you did not request this or have questions, please contact us.</p>
          `,
        },
      },
    },
  });
};

export const sendRescheduleEmail = async (
  toEmail: string,
  booking: BookingDetails,
): Promise<void> => {
  await sendEmailWithRetry({
    Source: FROM,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: 'Promenili ste termin' },
      Body: {
        Html: {
          Data: `
            <h2>Vaš termin je promenjen! 💅</h2>
            <p><strong>Novi datum:</strong> ${booking.date}</p>
            <p><strong>Novo vreme:</strong> ${booking.time}</p>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p>Vidimo se!</p>
          `,
        },
      },
    },
  });
};


async function sendSmsNotification(booking: BookingDetails): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_PHONE) return;

  const { default: twilio } = await import('twilio');
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  console.log(`SMS stub for booking ${booking.bookingId} on ${booking.date} at ${booking.time}`);
  void client;
}
