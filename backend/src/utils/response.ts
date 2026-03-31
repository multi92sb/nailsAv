import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const ok = (body: unknown): APIGatewayProxyResultV2 => ({
  statusCode: 200,
  headers,
  body: JSON.stringify(body),
});

export const created = (body: unknown): APIGatewayProxyResultV2 => ({
  statusCode: 201,
  headers,
  body: JSON.stringify(body),
});

export const badRequest = (message: string): APIGatewayProxyResultV2 => ({
  statusCode: 400,
  headers,
  body: JSON.stringify({ error: message }),
});

export const unauthorized = (message = 'Unauthorized'): APIGatewayProxyResultV2 => ({
  statusCode: 401,
  headers,
  body: JSON.stringify({ error: message }),
});

export const forbidden = (message = 'Forbidden'): APIGatewayProxyResultV2 => ({
  statusCode: 403,
  headers,
  body: JSON.stringify({ error: message }),
});

export const conflict = (message: string): APIGatewayProxyResultV2 => ({
  statusCode: 409,
  headers,
  body: JSON.stringify({ error: message }),
});

export const serverError = (message = 'Internal server error'): APIGatewayProxyResultV2 => ({
  statusCode: 500,
  headers,
  body: JSON.stringify({ error: message }),
});
