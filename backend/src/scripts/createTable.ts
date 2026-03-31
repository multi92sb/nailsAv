import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: "eu-west-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local",
  },
});

async function createTable() {
  try {
    await client.send(
      new CreateTableCommand({
        TableName: "NailBooking-dev",
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: "S" },
          { AttributeName: "SK", AttributeType: "S" },
          { AttributeName: "email", AttributeType: "S" },
          { AttributeName: "bookingDate", AttributeType: "S" },
          { AttributeName: "bookingTimeSlot", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "EmailIndex",
            KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
            Projection: { ProjectionType: "ALL" },
          },
          {
            IndexName: "BookingByDate",
            KeySchema: [
              { AttributeName: "bookingDate", KeyType: "HASH" },
              { AttributeName: "bookingTimeSlot", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        ],
      })
    );

    console.log("Table created");
  } catch (err: any) {
    if (err.name === "ResourceInUseException") {
      console.log("Table already exists");
    } else {
      console.error(err);
    }
  }
}

createTable();