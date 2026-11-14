import bcrypt from 'bcryptjs';

const CATEGORIES = [
  ['Information Technology', 'information-technology'], ['Software Development', 'software-development'],
  ['Engineering', 'engineering'], ['Business Administration', 'business-administration'],
  ['Finance and Accounting', 'finance-accounting'], ['Marketing', 'marketing'],
  ['Human Resources', 'human-resources'], ['Procurement and Supply Chain', 'procurement-supply-chain'],
  ['Hospitality and Tourism', 'hospitality-tourism'], ['Healthcare', 'healthcare'],
  ['Media and Communications', 'media-communications'], ['Architecture and Construction', 'architecture-construction'],
  ['Agriculture', 'agriculture'], ['Education', 'education'], ['Law', 'law'], ['Customer Service', 'customer-service'],
];

export async function seed(knex) {
  for (const [i, [name, slug]] of CATEGORIES.entries()) {
    await knex('internship_categories').insert({ name, slug, sort_order: i }).onConflict('slug').ignore();
  }

  const settings = {
    access_fee: '199',
    payment_model: 'one_time',
    min_profile_completion: '70',
  };
  for (const [key, value] of Object.entries(settings)) {
    await knex('admin_settings').insert({ key, value }).onConflict('key').ignore();
  }

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@theperfectintern.co.ke').toLowerCase();
  const exists = await knex('users').whereRaw('lower(email) = ?', [email]).first();
  if (!exists) {
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password) throw new Error('Set SEED_ADMIN_PASSWORD before seeding the admin account.');
    await knex('users').insert({
      role: 'admin', email, full_name: 'Platform Administrator',
      password_hash: await bcrypt.hash(password, 12),
      status: 'active', email_verified_at: knex.fn.now(), consent_at: knex.fn.now(),
    });
  }
}
