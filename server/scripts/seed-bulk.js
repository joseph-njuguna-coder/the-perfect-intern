// Bulk demo data: ~1,200 interns, ~80 companies, hundreds of internships, applications and payments (all fictional).
//   npm run seed:bulk                      shows what it would do and which database it would touch (changes nothing)
//   npm run seed:bulk -- --yes             creates the data (refuses if bulk demo data already exists)
//   npm run seed:bulk -- --yes --clean     removes old bulk demo data, then creates fresh data
//   npm run seed:bulk -- --clean-only --yes   removes ALL bulk demo data and stops
// Options: --interns 1200  --companies 80  --per-company 4  --password "Demo#2026pass"
// Everything it creates has an email ending in @bulk.demo.test, so cleanup never touches real accounts.
// Run `npm run seed` first (it creates the categories). Run this from your computer with DATABASE_URL in server/.env.
import 'dotenv/config';
import knex from 'knex';
import bcrypt from 'bcryptjs';
import { COUNTIES } from '../src/config/constants.js';
import { generate, DEMO_DOMAIN, CHECKOUT_PREFIX } from './lib/bulk-data.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const val = (n, d) => (flag(n) ? args[args.indexOf(`--${n}`) + 1] : d);
const num = (n, d, max) => Math.min(max, Math.max(1, Number(val(n, d)) || d));

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set. Put it in server/.env first.'); process.exit(1); }
const host = new URL(process.env.DATABASE_URL).host;
const internCount = num('interns', 1200, 20000);
const companyCount = num('companies', 80, 2000);
const perCompany = num('per-company', 4, 20);
const password = val('password', 'Demo#2026pass');
const like = `%@${DEMO_DOMAIN}`;

console.log(`Database : ${host}`);
if (flag('clean-only')) console.log('Plan     : DELETE all bulk demo data (emails ending in @' + DEMO_DOMAIN + ')');
else console.log(`Plan     : ${flag('clean') ? 'delete old bulk demo data, then ' : ''}create ${internCount} interns, ${companyCount} companies, about ${companyCount * perCompany} internships, plus applications and payments`);
if (!flag('yes')) { console.log('\nNothing changed. Add --yes to run it. Make sure the database above is the one you intend.'); process.exit(0); }

const db = knex({ client: 'pg', connection: process.env.DATABASE_URL, pool: { min: 0, max: 4 } });

async function cleanup(trx) {
  const ids = (await trx('users').whereLike('email', like).select('id')).map((r) => r.id);
  if (!ids.length) return 0;
  await trx('users').whereIn('id', ids).update({ access_payment_id: null });
  await trx('payments').whereIn('user_id', ids).del();
  await trx('users').whereIn('id', ids).del(); // cascades to profiles, companies, internships, applications, documents, notifications
  return ids.length;
}

try {
  const cats = await db('internship_categories').select('id', 'slug', 'name');
  if (!cats.length) { console.error('No categories found. Run `npm run seed` first.'); process.exit(1); }
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  const catName = Object.fromEntries(cats.map((c) => [c.slug, c.name]));

  const existing = Number((await db('users').whereLike('email', like).count('* as n').first()).n);
  if (existing && !flag('clean') && !flag('clean-only')) {
    console.error(`\n${existing} bulk demo accounts already exist. Run again with --clean to replace them, or --clean-only to remove them.`);
    process.exit(1);
  }

  const started = Date.now();
  const hash = flag('clean-only') ? null : await bcrypt.hash(password, 10);

  const summary = await db.transaction(async (trx) => {
    let removed = 0;
    if (flag('clean') || flag('clean-only')) removed = await cleanup(trx);
    if (flag('clean-only')) return { removed };

    const d = generate({ internCount, companyCount, perCompany, categorySlugs: cats.map((c) => c.slug), counties: COUNTIES });
    const base = (u, role) => ({
      role, email: u.email, full_name: u.full_name, phone: u.phone, password_hash: hash, status: u.status, county: u.county,
      email_verified_at: u.email_verified_at ?? u.created_at, consent_at: u.created_at, created_at: u.created_at, updated_at: u.created_at,
      last_login_at: u.last_login_at ?? null, gender: u.gender ?? null, date_of_birth: u.date_of_birth ?? null,
    });
    await trx.batchInsert('users', d.companyUsers.map((u) => base(u, 'company')), 250);
    await trx.batchInsert('users', d.internUsers.map((u) => base(u, 'intern')), 250);
    const userId = Object.fromEntries((await trx('users').whereLike('email', like).select('id', 'email')).map((r) => [r.email, r.id]));

    await trx.batchInsert('company_profiles', d.companies.map((c) => ({
      user_id: userId[c.userKey], company_name: c.company_name, official_email: c.official_email, phone: c.phone, address: c.address, county: c.county,
      industry: catName[c.industry], website: c.website, description: c.description, registration_number: c.registration_number,
      approval_status: c.approval_status, rejection_reason: c.rejection_reason, approved_at: c.approval_status === 'approved' ? c.created_at : null,
      created_at: c.created_at, updated_at: c.created_at,
    })), 250);
    const companyId = {};
    for (const r of await trx('company_profiles').whereIn('user_id', Object.values(userId)).select('id', 'user_id')) companyId[r.user_id] = r.id;
    const cid = (key) => companyId[userId[key]];

    await trx.batchInsert('company_documents', d.documents.map((x) => ({
      company_id: cid(x.companyKey), doc_type: x.doc_type, file_path: 'removed', original_name: `${x.doc_type}.pdf`, verified: x.verified,
      verified_at: x.verified ? x.created_at : null, created_at: x.created_at,
    })), 250);

    await trx.batchInsert('internships', d.internships.map((i) => ({
      reference: i.reference, company_id: cid(i.companyKey), category_id: catId[i.categorySlug], title: i.title, department: i.department,
      description: i.description, responsibilities: i.responsibilities, qualifications: i.qualifications, skills: i.skills, positions: i.positions,
      county: i.county, location: i.location, work_arrangement: i.work_arrangement, duration_months: i.duration_months, start_date: i.start_date,
      deadline: i.deadline, is_paid: i.is_paid, stipend_amount: i.stipend_amount, status: i.status, is_featured: i.is_featured,
      rejection_reason: i.rejection_reason, approved_at: i.status === 'approved' || i.status === 'closed' ? i.created_at : null, created_at: i.created_at, updated_at: i.created_at,
    })), 250);
    const internshipId = Object.fromEntries((await trx('internships').whereIn('company_id', Object.values(companyId)).select('id', 'reference')).map((r) => [r.reference, r.id]));

    await trx.batchInsert('intern_profiles', d.profiles.map((p) => ({
      user_id: userId[p.userKey], institution: p.institution, course: p.course, qualification_level: p.qualification_level, graduation_year: p.graduation_year,
      skills: p.skills, career_interests: p.career_interests, experience: p.experience, preferred_county: p.preferred_county,
      preferred_work_arrangement: p.preferred_work_arrangement, linkedin_url: p.linkedin_url, photo_path: null, cv_path: null, completion_pct: p.completion_pct,
    })), 250);

    await trx.batchInsert('payments', d.payments.map((p) => ({
      user_id: userId[p.userKey], amount: p.amount, phone: p.phone, status: p.status, merchant_request_id: p.merchant_request_id,
      checkout_request_id: p.checkout_request_id, mpesa_receipt: p.mpesa_receipt, result_code: p.result_code, result_desc: p.result_desc,
      transaction_date: p.transaction_date, created_at: p.created_at, updated_at: p.created_at,
    })), 250);
    await trx.raw(`UPDATE payments SET receipt_number = 'TPI-' || to_char(created_at, 'YYYY') || '-' || lpad(id::text, 6, '0') WHERE status = 'success' AND checkout_request_id LIKE ?`, [`${CHECKOUT_PREFIX}%`]);
    await trx.raw(`UPDATE users u SET access_activated_at = p.created_at, access_payment_id = p.id FROM payments p
      WHERE p.user_id = u.id AND p.status = 'success' AND p.checkout_request_id LIKE ?`, [`${CHECKOUT_PREFIX}%`]);

    await trx.batchInsert('applications', d.applications.map((a) => ({
      reference: a.reference, internship_id: internshipId[a.internshipRef], intern_id: userId[a.internKey], cover_letter: a.cover_letter, cv_path: 'removed',
      status: a.status, interview_at: a.interview_at, interview_notes: a.interview_notes, submitted_at: a.submitted_at, updated_at: a.updated_at,
    })), 250);

    return {
      removed, interns: d.internUsers.length, companies: d.companies.length, internships: d.internships.length, applications: d.applications.length,
      paid: d.payments.filter((p) => p.status === 'success').length, payments: d.payments.length, first: d.internUsers[0].email, firstCompany: d.companyUsers[0].email,
    };
  });

  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
  if (summary.removed) console.log(`Removed ${summary.removed} old bulk demo accounts.`);
  if (summary.interns) {
    console.log(`Created: ${summary.interns} interns, ${summary.companies} companies, ${summary.internships} internships, ${summary.applications} applications, ${summary.payments} payments (${summary.paid} successful).`);
    console.log(`\nSample logins (password: ${password})\n  intern  : ${summary.first}\n  company : ${summary.firstCompany}\nThese are fake accounts. Remove them before real users arrive:  npm run seed:bulk -- --clean-only --yes`);
  }
} catch (err) {
  console.error('\nFAILED (nothing was saved):', err.message);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
