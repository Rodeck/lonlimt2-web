import type { Context, MiddlewareHandler } from "hono";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 10;

export function getClientIP(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
    (
      c.env as {
        incoming?: { socket?: { remoteAddress?: string } };
      }
    )?.incoming?.socket?.remoteAddress ??
    "unknown"
  );
}

/**
 * Creates a rate-limiter middleware for the registration endpoint.
 * Limits each IP to MAX_ATTEMPTS (10) per WINDOW_MS (1 hour).
 *
 * @param onLimitExceeded - Handler called when limit is exceeded; must return a Response.
 */
export function createRegistrationRateLimiter(
  onLimitExceeded: (c: Context) => Response | Promise<Response>,
): MiddlewareHandler {
  return async (c, next) => {
    const ip = getClientIP(c);
    const now = Date.now();
    const entry = store.get(ip);

    if (entry && now - entry.windowStart < WINDOW_MS) {
      if (entry.count >= MAX_ATTEMPTS) {
        return onLimitExceeded(c);
      }
      entry.count++;
    } else {
      store.set(ip, { count: 1, windowStart: now });
      // Evict expired entries to prevent unbounded memory growth
      if (store.size > 10_000) {
        for (const [k, v] of store) {
          if (now - v.windowStart >= WINDOW_MS) store.delete(k);
        }
      }
    }

    await next();
  };
}
