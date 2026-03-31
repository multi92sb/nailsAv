import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const localEndpoint = process.env.DYNAMODB_ENDPOINT;
const useLocalDynamo = process.env.IS_OFFLINE === 'true' || Boolean(localEndpoint);

const raw = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'eu-west-1',
  // For local runs (seed/offline), allow explicit endpoint override.
  ...(useLocalDynamo && {
    endpoint: localEndpoint ?? 'http://localhost:8000',
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  }),
});

export const docClient = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLE_NAME = process.env.TABLE_NAME!;
