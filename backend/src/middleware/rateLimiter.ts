import rateLimit from 'express-rate-limit';

const authRateLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many session requests, please try again later.',
  },
});

const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit exceeded for chat messages, please try again later.',
  },
});

export { authRateLimiter, chatRateLimiter };
