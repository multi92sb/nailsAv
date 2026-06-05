import { GetCommand, QueryCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../client';
import { userPK, userSK } from '../tableKeys';

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'USER' | 'ADMIN';
  password?: string;
  createdAt: string;
  updatedAt?: string;
}

export const UserRepository = {
  async getById(userId: string): Promise<User | undefined> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: userPK(userId),
          SK: userSK(),
        },
      }),
    );
    return result.Item as User | undefined;
  },

  async getByEmail(email: string): Promise<User | undefined> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        FilterExpression: 'entityType = :entityType AND SK = :profile',
        ExpressionAttributeValues: {
          ':email': email,
          ':entityType': 'USER',
          ':profile': 'PROFILE',
        },
      }),
    );
    const items = result.Items ?? [];
    return items[0] as User | undefined;
  },

  async create(user: User): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...user,
          PK: userPK(user.userId),
          SK: userSK(),
          entityType: 'USER',
        },
      }),
    );
  },

  async update(
    userId: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>,
  ): Promise<User> {
    const updateParts: string[] = [];
    const exprNames: Record<string, string> = {};
    const exprValues: Record<string, unknown> = {};

    if (data.firstName !== undefined) {
      updateParts.push('#firstName = :firstName');
      exprNames['#firstName'] = 'firstName';
      exprValues[':firstName'] = data.firstName;
    }
    if (data.lastName !== undefined) {
      updateParts.push('#lastName = :lastName');
      exprNames['#lastName'] = 'lastName';
      exprValues[':lastName'] = data.lastName;
    }
    if (data.phone !== undefined) {
      updateParts.push('#phone = :phone');
      exprNames['#phone'] = 'phone';
      exprValues[':phone'] = data.phone;
    }

    updateParts.push('#updatedAt = :updatedAt');
    exprNames['#updatedAt'] = 'updatedAt';
    exprValues[':updatedAt'] = new Date().toISOString();

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: userPK(userId),
          SK: userSK(),
        },
        UpdateExpression: `SET ${updateParts.join(', ')}`,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: 'ALL_NEW',
      }),
    );

    return result.Attributes as User;
  },

  async updateRole(userId: string, role: 'USER' | 'ADMIN'): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: userPK(userId),
          SK: userSK(),
        },
        UpdateExpression: 'SET #role = :role, updatedAt = :now',
        ExpressionAttributeNames: {
          '#role': 'role',
        },
        ExpressionAttributeValues: {
          ':role': role,
          ':now': new Date().toISOString(),
        },
        ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
      }),
    );
  },

  async scanAll(): Promise<User[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': 'USER',
        },
      }),
    );
    return (result.Items ?? []) as User[];
  },
};
