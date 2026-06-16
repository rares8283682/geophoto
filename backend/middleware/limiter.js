const rateLimitStore = new Map(); // ip -> { count, resetTime }

/**
 * Custom lightweight in-memory rate limiter middleware.
 * @param {number} maxRequests - Maximum requests allowed in the window.
 * @param {number} windowMs - Time window in milliseconds.
 */
function authRateLimiter(maxRequests = 10, windowMs = 60 * 1000) {
  return (req, res, next) => {
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
