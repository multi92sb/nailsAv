import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Credentials': 'true',
};

const json = (
  statusCode: number,
  body: unknown,
  cookies?: string[],
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers,
  cookies,
  body: JSON.stringify(body),
});

export const ok = (body: unknown, cookies?: string[]): APIGatewayProxyResultV2 => ({
  statusCode: 200,
  headers,
  cookies,
  body: JSON.stringify(body),
});

export const created = (body: unknown, cookies?: string[]): APIGatewayProxyResultV2 =>
  json(201, body, cookies);

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

export const notFound = (message = 'Not found'): APIGatewayProxyResultV2 => ({
  statusCode: 404,
  headers,
  body: JSON.stringify({ error: message }),
});

export const conflict = (message: string): APIGatewayProxyResultV2 => ({
  statusCode: 409,
  headers,
  body: JSON.stringify({ error: message }),
});

export const tooManyRequests = (message: string): APIGatewayProxyResultV2 => ({
  statusCode: 429,
  headers,
  body: JSON.stringify({ error: message }),
});

export const serverError = (message = 'Internal server error'): APIGatewayProxyResultV2 => ({
  statusCode: 500,
  headers,
  body: JSON.stringify({ error: message }),
});
