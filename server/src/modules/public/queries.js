import { db } from '../../config/db.js';

/** Approved listings, not expired, from approved companies with active accounts. */
export const liveInternships = () => db('internships as i')
  .join('company_profiles as c', 'c.id', 'i.company_id')
  .join('internship_categories as k', 'k.id', 'i.category_id')
  .join('users as u', 'u.id', 'c.user_id')
  .where('i.status', 'approved')
  .where('c.approval_status', 'approved')
  .where('u.status', 'active')
  .whereRaw('i.deadline >= CURRENT_DATE');

export const listingColumns = [
  'i.id', 'i.reference', 'i.title', 'i.county', 'i.location', 'i.work_arrangement as workArrangement',
  'i.duration_months as durationMonths', 'i.deadline', 'i.is_paid as isPaid', 'i.stipend_amount as stipendAmount',
  'i.skills', 'i.is_featured as isFeatured', 'i.created_at as createdAt',
  'c.id as companyId', 'c.company_name as companyName', 'k.name as category', 'k.slug as categorySlug',
];
