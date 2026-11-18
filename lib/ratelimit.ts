import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { todayWIB } from '@/lib/coupon';

/**
 * Extracts the client IP from `x-forwarded-for` (first element) with a safe fallback.
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return '127.0.0.1';
}

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

let cachedOrderLimiter: Ratelimit | null = null;
let cachedCouponLimiter: Ratelimit | null = null;
let cachedAdminLoginLimiter: Ratelimit | null = null;
let cachedChatLimiter: Ratelimit | null = null;
let warnedMissingEnv = false;

function getUpstashLimiters() {
  const redis = getRedisClient();
  if (!redis) {
    if (!warnedMissingEnv) {
      warnedMissingEnv = true;
      console.warn(
        '[Ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN belum dikonfigurasi.'
      );
    }
    return null;
  }
  if (!cachedOrderLimiter) {
    cachedOrderLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'rl:order',
    });
  }
  if (!cachedCouponLimiter) {
    cachedCouponLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'rl:coupon',
    });
  }
  if (!cachedAdminLoginLimiter) {
    cachedAdminLoginLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: 'rl:admin_login',
    });
  }
  if (!cachedChatLimiter) {
    cachedChatLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'rl:chat',
    });
  }
  return {
    redis,
    order: cachedOrderLimiter,
    coupon: cachedCouponLimiter,
    adminLogin: cachedAdminLoginLimiter,
    chat: cachedChatLimiter,
  };
}

// Ephemeral fallback sliding window used only in non-production when Upstash env vars are not set
const devFallbackStore = new Map<string, number[]>();
const devDailyCounterStore = new Map<string, number>();
const devChatSessionStore = new Map<string, number>(); // sessionId -> expiryTimestamp
const devDuplicateMsgStore = new Map<string, { text: string; ts: number }>();

function checkDevFallbackWindow(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (devFallbackStore.get(key) || []).filter((t) => t > windowStart);
  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] || now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    devFallbackStore.set(key, timestamps);
    return { success: false, retryAfterSeconds };
  }
  timestamps.push(now);
  devFallbackStore.set(key, timestamps);
  return { success: true, retryAfterSeconds: 0 };
}

export function buildRateLimitResponse(retryAfterSeconds: number): NextResponse {
  const retry = Math.max(1, Math.ceil(retryAfterSeconds || 60));
  return NextResponse.json(
    { error: 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retry),
      },
    }
  );
}

/**
 * Rate limit for Order creation: 5 requests per minute per (IP + tableToken).
 * Fail-open if Redis throws an error.
 */
export async function checkOrderRateLimit(
  req: NextRequest,
  tableToken: string
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const identifier = `${ip}:${tableToken || 'anon'}`;

  try {
    const limiters = getUpstashLimiters();
    if (limiters) {
      const { success, reset } = await limiters.order.limit(identifier);
      if (!success) {
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return buildRateLimitResponse(retryAfter);
      }
      return null;
    }

    // When Upstash env is not configured in dev/test, enforce window via fallback
    const fb = checkDevFallbackWindow(`order:${identifier}`, 5, 60_000);
    if (!fb.success) {
      return buildRateLimitResponse(fb.retryAfterSeconds);
    }
    return null;
  } catch (err) {
    // Customer endpoint: fail-open on Redis error
    console.error('[Ratelimit] Order rate limit error (fail-open):', err);
    return null;
  }
}

/**
 * Rate limit for Coupon validation/usage: 10 requests per minute per IP.
 * Fail-open if Redis throws an error.
 */
export async function checkCouponRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const identifier = ip;

  try {
    const limiters = getUpstashLimiters();
    if (limiters) {
      const { success, reset } = await limiters.coupon.limit(identifier);
      if (!success) {
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return buildRateLimitResponse(retryAfter);
      }
      return null;
    }

    const fb = checkDevFallbackWindow(`coupon:${identifier}`, 10, 60_000);
    if (!fb.success) {
      return buildRateLimitResponse(fb.retryAfterSeconds);
    }
    return null;
  } catch (err) {
    // Customer endpoint: fail-open on Redis error
    console.error('[Ratelimit] Coupon rate limit error (fail-open):', err);
    return null;
  }
}

/**
 * Rate limit for Admin login: 5 requests per 15 minutes per (IP + username).
 * Fail-closed if Redis throws an error or is unavailable in production.
 */
export async function checkAdminLoginRateLimit(
  req: NextRequest,
  username: string
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const normalizedUser = (username || 'unknown').trim().toLowerCase().slice(0, 64);
  const identifier = `${ip}:${normalizedUser}`;

  try {
    const limiters = getUpstashLimiters();
    if (limiters) {
      const { success, reset } = await limiters.adminLogin.limit(identifier);
      if (!success) {
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return buildRateLimitResponse(retryAfter);
      }
      return null;
    }

    // In production, if Upstash is not configured at all, fail-closed for admin login
    if (process.env.NODE_ENV === 'production') {
      console.error('[Ratelimit] Upstash Redis wajib dikonfigurasi di production untuk login admin (fail-closed).');
      return buildRateLimitResponse(900);
    }

    // In development on localhost, do not lock out developer testing
    return null;
  } catch (err) {
    // Admin login: fail-closed on Redis error
    console.error('[Ratelimit] Admin login rate limit error (fail-closed):', err);
    return buildRateLimitResponse(900);
  }
}

/**
 * Rate limit for Chatbot: 10 messages per minute per IP (Task D2).
 * Fail-open if Redis throws an error.
 */
export async function checkChatRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  try {
    const limiters = getUpstashLimiters();
    if (limiters) {
      const { success, reset } = await limiters.chat.limit(ip);
      if (!success) {
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return buildRateLimitResponse(retryAfter);
      }
      return null;
    }

    const fb = checkDevFallbackWindow(`chat:${ip}`, 10, 60_000);
    if (!fb.success) {
      return buildRateLimitResponse(fb.retryAfterSeconds);
    }
    return null;
  } catch (err) {
    console.error('[Ratelimit] Chat rate limit error (fail-open):', err);
    return null;
  }
}

/**
 * Global daily chatbot limit per WIB calendar date (Task D2).
 * Default conservative limit: 150 LLM calls/day (Groq free tier: 1,000 RPD & 100,000 TPD).
 * TTL: ~26 hours (93,600 seconds). Fail-open if Redis throws an error.
 */
export async function checkAndIncrementChatDailyQuota(
  overrideLimit?: number
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const envLimit = Number(process.env.CHATBOT_DAILY_LIMIT);
  const limit =
    typeof overrideLimit === 'number' && Number.isFinite(overrideLimit) && overrideLimit >= 0
      ? overrideLimit
      : Number.isFinite(envLimit) && envLimit > 0
      ? Math.floor(envLimit)
      : 150;

  const dateKey = `chat:daily:${todayWIB()}`;
  const ttlSeconds = 26 * 3600; // 26 hours

  try {
    const limiters = getUpstashLimiters();
    if (limiters?.redis) {
      const current = await limiters.redis.incr(dateKey);
      if (current === 1) {
        await limiters.redis.expire(dateKey, ttlSeconds);
      }
      return { allowed: current <= limit, current, limit };
    }

    const prev = devDailyCounterStore.get(dateKey) || 0;
    const next = prev + 1;
    devDailyCounterStore.set(dateKey, next);
    return { allowed: next <= limit, current: next, limit };
  } catch (err) {
    console.error('[Ratelimit] Chat daily quota error (fail-open):', err);
    return { allowed: true, current: 0, limit };
  }
}

/**
 * Checks whether a chat session has completed first-message Turnstile verification (Task D6).
 */
export async function isChatSessionVerified(sessionId: string | undefined | null): Promise<boolean> {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 12) return false;
  const key = `chat:verified:${sessionId}`;

  try {
    const limiters = getUpstashLimiters();
    if (limiters?.redis) {
      const val = await limiters.redis.get(key);
      return Boolean(val);
    }
    const exp = devChatSessionStore.get(key);
    if (!exp) return false;
    if (Date.now() > exp) {
      devChatSessionStore.delete(key);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Ratelimit] Chat session check error (fail-open):', err);
    return true;
  }
}

/**
 * Marks a chat session as Turnstile-verified with a 30-minute TTL (Task D6).
 */
export async function markChatSessionVerified(sessionId: string): Promise<void> {
  if (!sessionId) return;
  const key = `chat:verified:${sessionId}`;
  const ttlSeconds = 30 * 60; // 30 minutes

  try {
    const limiters = getUpstashLimiters();
    if (limiters?.redis) {
      await limiters.redis.set(key, '1', { ex: ttlSeconds });
      return;
    }
    devChatSessionStore.set(key, Date.now() + ttlSeconds * 1000);
  } catch (err) {
    console.error('[Ratelimit] Chat session mark error:', err);
  }
}

/**
 * Quick duplicate-burst detector for identical messages sent within 4 seconds from the same IP (Task D5).
 */
export function isDuplicateChatBurst(ip: string, message: string): boolean {
  const normalized = message.trim().toLowerCase();
  const now = Date.now();
  const prev = devDuplicateMsgStore.get(ip);
  if (prev && prev.text === normalized && now - prev.ts < 4000) {
    prev.ts = now;
    return true;
  }
  devDuplicateMsgStore.set(ip, { text: normalized, ts: now });
  return false;
}
