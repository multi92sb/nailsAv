const cache = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks if a key has exceeded a request rate limit.
 * Defaults to 5 requests per minute.
 */
export function isRateLimited(key: string, limit = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const record = cache.get(key);

  if (!record || now > record.resetTime) {
    cache.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  record.count++;
  if (record.count > limit) {
    return true;
  }
  return false;
}
