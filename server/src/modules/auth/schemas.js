import { z } from 'zod';
import { COUNTIES } from '../../config/constants.js';
import { normaliseKenyanPhone } from '../../utils/phone.js';

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const COMMON = new Set(['password1', 'password123', 'password12', '12345678', '123456789', 'qwerty123', 'qwertyuiop', 'abc12345', 'iloveyou1', 'welcome123', 'admin1234', 'letmein123', 'changeme1', 'passw0rd', 'p@ssw0rd', 'kenya2026', 'kenya12345']);
export const passwordRule = z.string()
  .min(8, 'Use at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number')
  .refine((v) => !COMMON.has(v.toLowerCase()), 'That password is too common. Choose something less predictable');
const password = passwordRule;
const phone = z.string().trim()
  .transform((v, ctx) => {
    const n = normaliseKenyanPhone(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'Enter a valid Kenyan number, e.g. 0712345678' });
    return n;
  });
const county = z.enum(COUNTIES, { errorMap: () => ({ message: 'Select your county' }) });
const consent = z.literal(true, { errorMap: () => ({ message: 'You must accept the privacy notice to register' }) });
const name = z.string().trim().min(2, 'Enter your full name').max(120);

export const registerInternSchema = z.object({
  fullName: name, email, phone, password, county, consent,
  gender: z.enum(['female', 'male', 'other', 'prefer_not_to_say']).optional().or(z.literal('').transform(() => undefined)),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date').optional().or(z.literal('').transform(() => undefined)),
});

export const registerCompanySchema = z.object({
  fullName: name, email, phone, password, county, consent,
  companyName: z.string().trim().min(2, 'Enter your company name').max(160),
  industry: z.string().trim().min(2, 'Select an industry').max(120),
});

export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password').max(128) });
export const emailOnlySchema = z.object({ email });
export const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid or expired link') });
export const resetSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid or expired link'), password });
