import rateLimit from "express-rate-limit";

/**
 * Rate limiter for AI endpoints
 * Limits each IP to a certain number of requests per window
 */
export const aiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10, // 10 requests per window
  message: {
    error: "Too Many Requests",
    message:
      "You have exceeded the rate limit for AI requests. Please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
