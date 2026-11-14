import bcrypt from 'bcryptjs';

/** Development-only demo data. Skipped automatically in production. */
const DEMO_PASSWORD = 'Demo#2026pass';

const COMPANIES = [
  { name: 'Savanna Tech Labs', industry: 'Information Technology', county: 'Nairobi', website: 'https://example.com/savanna' },
  { name: 'Lakeside Agribusiness', industry: 'Agriculture', county: 'Kisumu', website: 'https://example.com/lakeside' },
  { name: 'Coastline Hospitality Group', industry: 'Hospitality and Tourism', county: 'Mombasa', website: 'https://example.com/coastline' },
  { name: 'Highland Finance Partners', industry: 'Finance and Accounting', county: 'Nakuru', website: 'https://example.com/highland' },
];

const LISTINGS = [
  ['Software Development Intern', 'software-development', 0, 'Nairobi', 'hybrid', 6, true, 15000, ['JavaScript', 'React', 'SQL'], true],
  ['IT Support Intern', 'information-technology', 0, 'Nairobi', 'physical', 3, false, null, ['Troubleshooting', 'Networking'], false],
  ['Data Analyst Intern', 'information-technology', 0, 'Nairobi', 'remote', 4, true, 12000, ['Excel', 'SQL', 'Power BI'], true],
  ['Agribusiness Research Intern', 'agriculture', 1, 'Kisumu', 'physical', 3, false, null, ['Research', 'Data collection'], false],
  ['Farm Operations Intern', 'agriculture', 1, 'Kisumu', 'physical', 6, true, 10000, ['Supply chain', 'Field management'], false],
  ['Front Office Intern', 'hospitality-tourism', 2, 'Mombasa', 'physical', 3, true, 9000, ['Customer service', 'Communication'], true],
  ['Digital Marketing Intern', 'marketing', 2, 'Mombasa', 'hybrid', 4, false, null, ['Social media', 'Content writing'], false],
  ['Accounts Intern', 'finance-accounting', 3, 'Nakuru', 'physical', 6, true, 12000, ['Bookkeeping', 'Excel'], false],
  ['Audit Assistant Intern', 'finance-accounting', 3, 'Nakuru', 'hybrid', 4, true, 14000, ['Auditing', 'Attention to detail'], true],
  ['HR Support Intern', 'human-resources', 0, 'Nairobi', 'hybrid', 3, false, null, ['Recruitment', 'Records management'], false],
];

export async function seed(knex) {
  if (process.env.NODE_ENV === 'production') return;
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const cats = Object.fromEntries((await knex('internship_categories')).map((c) => [c.slug, c.id]));

  const ensureUser = async (role, email, full_name, extra = {}) => {
    const found = await knex('users').whereRaw('lower(email)=?', [email]).first();
    if (found) return found.id;
    const [row] = await knex('users').insert({
      role, email, full_name, password_hash: hash, status: 'active',
      email_verified_at: knex.fn.now(), consent_at: knex.fn.now(), ...extra,
    }).returning('id');
    return row.id ?? row;
  };

  const internId = await ensureUser('intern', 'intern@demo.test', 'Amina Wanjiru', { county: 'Nairobi', phone: '254712345678' });
  await knex('intern_profiles').insert({ user_id: internId }).onConflict('user_id').ignore();

  // Second demo intern. Neither demo intern has access: activate it through the (sandbox or mock) payment flow.
  const intern2 = await ensureUser('intern', 'intern2@demo.test', 'Brian Otieno', { county: 'Kisumu', phone: '254722345678' });
  await knex('intern_profiles').insert({ user_id: intern2 }).onConflict('user_id').ignore();

  const companyIds = [];
  for (const [i, c] of COMPANIES.entries()) {
    const uid = await ensureUser('company', `company${i + 1}@demo.test`, c.name, { county: c.county });
    await knex('company_profiles').insert({
      user_id: uid, company_name: c.name, official_email: `company${i + 1}@demo.test`,
      industry: c.industry, county: c.county, website: c.website,
      description: `${c.name} offers structured, mentored internships for students and recent graduates.`,
      approval_status: 'approved', approved_at: knex.fn.now(),
    }).onConflict('user_id').ignore();
    companyIds.push((await knex('company_profiles').where({ user_id: uid }).first()).id);
  }

  for (const [i, l] of LISTINGS.entries()) {
    const [title, cat, ci, county, arrangement, months, paid, stipend, skills, featured] = l;
    const reference = `INT-DEMO-${String(i + 1).padStart(4, '0')}`;
    const deadline = new Date(Date.now() + (20 + i * 4) * 86400000).toISOString().slice(0, 10);
    await knex('internships').insert({
      reference, company_id: companyIds[ci], category_id: cats[cat], title,
      department: 'Operations', county, location: county, work_arrangement: arrangement,
      duration_months: months, deadline, is_paid: paid, stipend_amount: stipend, skills,
      description: `Join ${COMPANIES[ci].name} for a ${months}-month internship. You will work with a mentor, ` +
        'take on real tasks from week one and finish with a reference and a portfolio of work.',
      responsibilities: 'Support the team with day-to-day tasks, document your work and present progress weekly.',
      qualifications: 'Currently enrolled in, or recently completed, a relevant diploma or degree.',
      positions: 2, status: 'approved', is_featured: featured, approved_at: knex.fn.now(),
    }).onConflict('reference').ignore();
  }
}
