import { db } from '../../config/db.js';
import { liveInternships } from '../public/queries.js';
import { completion } from '../intern/completion.js';
import { notify } from '../notifications/service.js';
import { sendEmail } from '../email/mailer.js';
import { notificationEmail } from '../email/templates.js';

export async function getSetting(key, fallback) {
  const row = await db('admin_settings').where({ key }).first();
  return row ? row.value : fallback;
}

/**
 * Single source of truth for "may this intern apply to this internship?".
 * Order follows the product spec: availability, duplicate, profile completion, CV, then paid access.
 */
export async function eligibility(user, internshipId) {
  const internship = await liveInternships().where('i.id', internshipId)
    .first('i.id', 'i.title', 'c.id as companyId', 'c.user_id as companyUserId', 'c.company_name as companyName');
  if (!internship) return { ok: false, code: 'NOT_AVAILABLE', status: 404, message: 'This internship is no longer open for applications.' };

  const existing = await db('applications').where({ internship_id: internshipId, intern_id: user.id }).first();
  if (existing) return { ok: false, code: 'ALREADY_APPLIED', status: 409, message: 'You have already applied to this internship.', reference: existing.reference, applicationStatus: existing.status };

  const profile = await db('intern_profiles').where({ user_id: user.id }).first();
  const { pct, missing } = completion(profile);
  const min = Number(await getSetting('min_profile_completion', '70'));
  if (pct < min) return { ok: false, code: 'PROFILE_INCOMPLETE', status: 422, message: `Complete at least ${min}% of your profile before applying.`, pct, min, missing };
  if (!profile.cv_path) return { ok: false, code: 'CV_MISSING', status: 422, message: 'Upload your CV (PDF) before applying.', pct, min, missing };
  if (!user.access_activated_at) return { ok: false, code: 'ACCESS_REQUIRED', status: 402, message: 'Activate application access to apply.', pct, min };
  return { ok: true, internship, profile, pct, min };
}

/** In-app notification plus email, never throws. */
export async function tell(userId, { type, title, body, link, ctaLabel }) {
  await notify(userId, { type, title, body, link });
  const u = await db('users').where({ id: userId }).first('email', 'full_name');
  if (u) await sendEmail({ userId, to: u.email, template: type, ...notificationEmail({ name: u.full_name, title, body, ctaPath: link, ctaLabel }) });
}
