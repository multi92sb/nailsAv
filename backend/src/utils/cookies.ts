const isProduction = process.env.APP_STAGE === 'prod';

export function getCookie(
  event: { headers?: Record<string, string | undefined> },
  name: string,
): string | undefined {
  const cookieHeader = event.headers?.cookie ?? event.headers?.Cookie ?? '';
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .map((part) => {
      const separator = part.indexOf('=');
      if (separator === -1) return null;
      return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))] as const;
    })
    .find((cookie): cookie is readonly [string, string] => cookie !== null && cookie[0] === name)?.[1];
}

/**
 * Build a Set-Cookie string for API Gateway HTTP API (`cookies` array).
 *
 * serverless-offline (Hapi) incorrectly treats the whole string after `=` as the
 * cookie value, so attribute suffixes like `; HttpOnly; Path=/` cause a 500 locally.
 * Offline responses therefore emit `name=value` only; Vite rewrites Path to `/`.
 */
export function createCookie(name: string, value: string, maxAgeSeconds: number): string {
  const encoded = encodeURIComponent(value);
  if (process.env.IS_OFFLINE === 'true') {
    return `${name}=${encoded}`;
  }

  const secure = isProduction ? '; Secure' : '';
  return `${name}=${encoded}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function clearCookie(name: string): string {
  if (process.env.IS_OFFLINE === 'true') {
    return `${name}=`;
  }

  const secure = isProduction ? '; Secure' : '';
  return `${name}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
