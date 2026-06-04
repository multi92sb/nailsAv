process.env.TABLE_NAME = 'NailBooking-test';
process.env.JWT_SECRET = 'test-secret';
process.env.AWS_REGION = 'eu-west-1';

import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

jest.mock('../src/db/client', () => {
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const ddbClient = new DynamoDBClient({ region: 'eu-west-1' });
  const docClient = DynamoDBDocumentClient.from(ddbClient);
  return {
    docClient,
    TABLE_NAME: 'NailBooking-test',
  };
});
