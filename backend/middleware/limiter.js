const rateLimitStore = new Map(); // ip -> { count, resetTime }

// Clean up expired entries every 5 minutes to prevent memory leaks in the Map
setInterval(() => {
  const now = Date.now();
  let keysDeleted = 0;
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
      keysDeleted++;
    }
  }
  if (keysDeleted > 0) {
    console.log(`🧹 Rate Limiter GC: Cleaned ${keysDeleted} expired IP records from memory store.`);
  }
}, 5 * 60 * 1000).unref(); // .unref() lets Node exit even if the timer is active

/**
 * Custom lightweight in-memory rate limiter middleware with testing bypass.
 * @param {number} maxRequests - Maximum requests allowed in the window.
 * @param {number} windowMs - Time window in milliseconds.
 */
function authRateLimiter(maxRequests = 10, windowMs = 60 * 1000) {
  return (req, res, next) => {
    // --- Testing and Loopback IP Whitelist ---
    const isTestOrLocal =
      process.env.NODE_ENV === 'test' ||
      process.env.BYPASS_LIMITS === 'true' ||
      req.ip === '127.0.0.1' ||
      req.ip === '::1' ||
      req.ip === '::ffff:127.0.0.1';

    if (isTestOrLocal) {
      return next();
    }

    const ip = req.ip;
    const now = Date.now();

    let record = rateLimitStore.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(ip, record);
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      const remainingSeconds = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        error: `Too many attempts. Please try again in ${remainingSeconds} seconds.`,
      });
    }

    next();
  };
}

module.exports = { authRateLimiter };
