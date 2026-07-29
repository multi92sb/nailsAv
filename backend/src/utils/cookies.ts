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

export function createCookie(name: string, value: string, maxAgeSeconds: number): string {
  const secure = isProduction ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function clearCookie(name: string): string {
  const secure = isProduction ? '; Secure' : '';
  return `${name}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
