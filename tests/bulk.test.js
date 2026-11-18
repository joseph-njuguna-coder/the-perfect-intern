import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, DEMO_DOMAIN, CHECKOUT_PREFIX } from '../server/scripts/lib/bulk-data.js';
import { COUNTIES } from '../server/src/config/constants.js';

const SLUGS = ['information-technology', 'software-development', 'engineering', 'business-administration', 'finance-accounting', 'marketing', 'human-resources', 'procurement-supply-chain', 'hospitality-tourism', 'healthcare', 'media-communications', 'architecture-construction', 'agriculture', 'education', 'law', 'customer-service'];
const now = new Date('2026-11-14T10:00:00Z');
const d = generate({ internCount: 1200, companyCount: 80, perCompany: 4, categorySlugs: SLUGS, counties: COUNTIES, now });
const unique = (arr) => new Set(arr).size === arr.length;

test('generates the requested volume', () => {
  assert.equal(d.internUsers.length, 1200);
  assert.equal(d.companies.length, 80);
  assert.ok(d.internships.length >= 200, `internships: ${d.internships.length}`);
  assert.ok(d.applications.length >= 800, `applications: ${d.applications.length}`);
  assert.ok(d.payments.filter((p) => p.status === 'success').length >= 400);
});

test('identifiers are unique and clearly marked as demo data', () => {
  assert.ok(unique([...d.internUsers, ...d.companyUsers].map((u) => u.email)));
  assert.ok([...d.internUsers, ...d.companyUsers].every((u) => u.email.endsWith(`@${DEMO_DOMAIN}`)));
  assert.ok(unique(d.internships.map((i) => i.reference)));
  assert.ok(unique(d.applications.map((a) => a.reference)));
  assert.ok(unique(d.payments.map((p) => p.checkout_request_id)));
  assert.ok(d.payments.every((p) => p.checkout_request_id.startsWith(CHECKOUT_PREFIX)));
  assert.ok(unique(d.payments.filter((p) => p.mpesa_receipt).map((p) => p.mpesa_receipt)));
  assert.ok(unique(d.companies.map((c) => c.company_name)));
});

test('applications are consistent: one per intern and internship, only by paid interns, to open listings', () => {
  const paid = new Set(d.payments.filter((p) => p.status === 'success').map((p) => p.userKey));
  const refs = new Map(d.internships.map((i) => [i.reference, i]));
  const companies = new Map(d.companies.map((c) => [c.userKey, c]));
  assert.ok(unique(d.applications.map((a) => `${a.internKey}|${a.internshipRef}`)));
  for (const a of d.applications) {
    assert.ok(paid.has(a.internKey), 'applicant has paid');
    const it = refs.get(a.internshipRef);
    assert.ok(it && it.status === 'approved');
    assert.equal(companies.get(it.companyKey).approval_status, 'approved');
    assert.ok(a.submitted_at <= now && a.submitted_at >= it.created_at);
  }
});

test('payments and profiles are valid', () => {
  assert.ok(d.payments.every((p) => p.amount === 199 && /^2547\d{8}$/.test(p.phone)));
  assert.ok(d.payments.filter((p) => p.status === 'success').every((p) => /^[A-Z0-9]{10}$/.test(p.mpesa_receipt) && p.result_code === 0));
  assert.ok(d.payments.filter((p) => p.status !== 'success').every((p) => !p.mpesa_receipt && p.result_code !== 0));
  assert.ok(d.profiles.every((p) => p.completion_pct >= 0 && p.completion_pct <= 80));
  assert.ok(d.profiles.some((p) => p.completion_pct >= 70) && d.profiles.some((p) => p.completion_pct < 50));
});

test('dates never lie in the future (except interviews and deadlines) and are spread over time', () => {
  for (const u of [...d.internUsers, ...d.companyUsers]) assert.ok(u.created_at <= now);
  for (const i of d.internships) assert.ok(i.created_at <= now);
  const oldest = Math.min(...d.internUsers.map((u) => u.created_at.getTime()));
  assert.ok(now.getTime() - oldest > 100 * 86400000);
  assert.ok(d.applications.filter((a) => a.interview_at).every((a) => a.interview_at > now && a.status === 'interview_scheduled'));
});

test('generation is reproducible', () => {
  const again = generate({ internCount: 1200, companyCount: 80, perCompany: 4, categorySlugs: SLUGS, counties: COUNTIES, now });
  assert.equal(again.applications.length, d.applications.length);
  assert.equal(again.internUsers[5].email, d.internUsers[5].email);
});
