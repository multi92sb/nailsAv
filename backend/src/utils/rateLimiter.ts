import { RateLimitRepository } from '../db/repositories/rateLimitRepository';

export async function isRateLimited(key: string, limit = 5, windowMs = 60000): Promise<boolean> {
  const now = Date.now();
  const record = await RateLimitRepository.get(key);

  if (!record || now > record.resetTime) {
    await RateLimitRepository.create(key, now + windowMs);
    return false;
  }

  const count = await RateLimitRepository.increment(key);
  return count > limit;
}
