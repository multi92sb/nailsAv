import { GetCommand, QueryCommand, TransactWriteCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../client';
import { bookingPK, bookingSK, slotPK, slotSK } from '../tableKeys';

export interface Booking {
  bookingId: string;
  userId: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  slotId: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  createdAt: string;
  updatedAt?: string;
  bookingDate?: string;
  bookingTimeSlot?: string;
}

export const BookingRepository = {
  async getBooking(userId: string, bookingId: string): Promise<Booking | undefined> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: bookingPK(userId),
          SK: bookingSK(bookingId),
        },
      }),
    );
    return result.Item as Booking | undefined;
  },

  async getBookingsByDate(date: string): Promise<Booking[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'BookingByDate',
        KeyConditionExpression: 'bookingDate = :date AND begins_with(bookingTimeSlot, :prefix)',
        ExpressionAttributeValues: {
          ':date': date,
          ':prefix': 'TIME#',
        },
      }),
    );
    return (result.Items ?? []) as Booking[];
  },

  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': bookingPK(userId),
          ':skPrefix': 'BOOKING#',
        },
      }),
    );
    return (result.Items ?? []) as Booking[];
  },

  async createBooking(
    booking: Omit<Booking, 'bookingDate' | 'bookingTimeSlot'>,
    date: string,
    time: string,
    slotId: string,
  ): Promise<void> {
    const bookingTimeSlot = `TIME#${time}#${slotId}`;
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE_NAME,
              Key: {
                PK: slotPK(date),
                SK: slotSK(time, slotId),
              },
              UpdateExpression: 'SET isAvailable = :false',
              ConditionExpression: 'isAvailable = :true',
              ExpressionAttributeValues: {
                ':true': true,
                ':false': false,
              },
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                ...booking,
                PK: bookingPK(booking.userId),
                SK: bookingSK(booking.bookingId),
                bookingDate: date,
                bookingTimeSlot,
                entityType: 'BOOKING',
              },
            },
          },
        ],
      }),
    );
  },

  async cancelBooking(
    userId: string,
    bookingId: string,
    date: string,
    time: string,
    slotId: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE_NAME,
              Key: {
                PK: bookingPK(userId),
                SK: bookingSK(bookingId),
              },
              UpdateExpression: 'SET #status = :cancelled, updatedAt = :now',
              ExpressionAttributeNames: {
                '#status': 'status',
              },
              ExpressionAttributeValues: {
                ':cancelled': 'CANCELLED',
                ':now': now,
              },
            },
          },
          {
            Update: {
              TableName: TABLE_NAME,
              Key: {
                PK: slotPK(date),
                SK: slotSK(time, slotId),
              },
              UpdateExpression: 'SET isAvailable = :true',
              ExpressionAttributeValues: {
                ':true': true,
              },
            },
          },
        ],
      }),
    );
  },

  async rescheduleBooking(
    userId: string,
    bookingId: string,
    oldBooking: { date: string; time: string; slotId: string; status: string },
    newSlot: { date: string; time: string; slotId: string },
  ): Promise<void> {
    const now = new Date().toISOString();
    const newBookingTimeSlot = `TIME#${newSlot.time}#${newSlot.slotId}`;
    const transactItems = [];

    // If current booking is not cancelled, free the old slot first
    if (oldBooking.status !== 'CANCELLED') {
      transactItems.push({
        Update: {
          TableName: TABLE_NAME,
          Key: {
            PK: slotPK(oldBooking.date),
            SK: slotSK(oldBooking.time, oldBooking.slotId),
          },
          UpdateExpression: 'SET isAvailable = :true',
          ExpressionAttributeValues: {
            ':true': true,
          },
        },
      });
    }

    // Book the new slot
    transactItems.push({
      Update: {
        TableName: TABLE_NAME,
        Key: {
          PK: slotPK(newSlot.date),
          SK: slotSK(newSlot.time, newSlot.slotId),
        },
        UpdateExpression: 'SET isAvailable = :false',
        ConditionExpression: 'isAvailable = :true',
        ExpressionAttributeValues: {
          ':true': true,
          ':false': false,
        },
      },
    });

    // Update the booking item
    transactItems.push({
      Update: {
        TableName: TABLE_NAME,
        Key: {
          PK: bookingPK(userId),
          SK: bookingSK(bookingId),
        },
        UpdateExpression:
          'SET #date = :newDate, #time = :newTime, slotId = :newSlotId, bookingDate = :newDate, bookingTimeSlot = :newBookingTimeSlot, #status = :confirmed, updatedAt = :now',
        ExpressionAttributeNames: {
          '#date': 'date',
          '#time': 'time',
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':newDate': newSlot.date,
          ':newTime': newSlot.time,
          ':newSlotId': newSlot.slotId,
          ':newBookingTimeSlot': newBookingTimeSlot,
          ':confirmed': 'CONFIRMED',
          ':now': now,
        },
      },
    });

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      }),
    );
  },

  async updateBookingStatus(userId: string, bookingId: string, status: string): Promise<void> {
    const now = new Date().toISOString();
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: bookingPK(userId),
          SK: bookingSK(bookingId),
        },
        UpdateExpression: 'SET #status = :status, updatedAt = :now',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':now': now,
        },
      }),
    );
  },

  async scanBookingsForReminder(dateStr: string): Promise<Booking[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: '#date = :date AND entityType = :type AND #status = :status',
        ExpressionAttributeNames: {
          '#date': 'date',
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':date': dateStr,
          ':type': 'BOOKING',
          ':status': 'CONFIRMED',
        },
      }),
    );
    return (result.Items ?? []) as Booking[];
  },
};
