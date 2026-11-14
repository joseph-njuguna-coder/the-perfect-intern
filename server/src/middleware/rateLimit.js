import rateLimit from 'express-rate-limit';

// Integration tests make many requests from one IP; set TEST_RATE_LIMITS=1 to exercise the limiters under test.
export const limitsOff = () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMITS;

const make = (windowMs, limit, message) => rateLimit({
  skip: limitsOff, windowMs, limit, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message } },
});

export const apiLimiter = make(15 * 60 * 1000, 600, 'Too many requests. Please slow down.');
export const loginLimiter = make(15 * 60 * 1000, 10, 'Too many sign-in attempts. Try again in 15 minutes.');
export const emailLimiter = make(60 * 60 * 1000, 10, 'Too many requests. Try again later.');
export const contactLimiter = make(60 * 60 * 1000, 5, 'Too many messages. Try again later.');
