import type { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../db/client';
import { bookingPK } from '../db/tableKeys';
import { ok, serverError } from '../utils/response';
import type { AuthorizerContext } from '../types/auth';

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthorizerContext> = async (
  event,
) => {
  try {
    const { userId } = event.requestContext.authorizer.lambda;

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

    const bookings = (result.Items ?? [])
      .map((item) => ({
        bookingId: item.bookingId as string,
        date: item.date as string,
        time: item.time as string,
        status: item.status as string,
        createdAt: item.createdAt as string,
      }))
      .sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return a.time.localeCompare(b.time);
      });

    return ok({ bookings });
  } catch (err) {
    console.error('getMyBookings error', err);
    return serverError();
  }
};
