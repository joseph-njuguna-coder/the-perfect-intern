// Pure data generator for the bulk demo seed (no database access, so it can be unit tested).
// Everything is fictional. Emails end in @bulk.demo.test; phone numbers are random and are never contacted.
import { completion } from '../../src/modules/intern/completion.js';

export const DEMO_DOMAIN = 'bulk.demo.test';
export const CHECKOUT_PREFIX = 'ws_CO_BULK_';
const DAY = 86400000;

export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const FEMALE = ['Amina', 'Wanjiru', 'Akinyi', 'Njeri', 'Atieno', 'Mwajuma', 'Chebet', 'Nyambura', 'Wairimu', 'Achieng', 'Faith', 'Grace', 'Mercy', 'Joy', 'Esther', 'Naomi', 'Lucy', 'Purity', 'Beatrice', 'Caroline', 'Linet', 'Sharon', 'Brenda', 'Cynthia', 'Winnie', 'Zawadi', 'Halima', 'Fatuma', 'Zainab', 'Asha', 'Kerubo', 'Moraa', 'Naserian', 'Wangari', 'Mumbua', 'Kavata', 'Nekesa', 'Valary', 'Judith', 'Irene'];
const MALE = ['Brian', 'Kevin', 'Dennis', 'Victor', 'Collins', 'Felix', 'Ian', 'Kelvin', 'Allan', 'Samuel', 'Peter', 'Daniel', 'David', 'Joseph', 'Mark', 'Eric', 'Elvis', 'Ronald', 'Festus', 'Gideon', 'Hassan', 'Ibrahim', 'Abdi', 'Juma', 'Kamau', 'Mutua', 'Kiprop', 'Barasa', 'Otieno', 'Omondi', 'Mwangi', 'Kariuki', 'Wekesa', 'Titus', 'Brighton', 'Moses', 'Stephen', 'Evans', 'Nicholas', 'Patrick'];
const SURNAMES = ['Mwangi', 'Kamau', 'Njoroge', 'Otieno', 'Omondi', 'Ochieng', 'Odhiambo', 'Wafula', 'Barasa', 'Wekesa', 'Kiprotich', 'Kipkemboi', 'Cheruiyot', 'Koech', 'Mutua', 'Musyoka', 'Kioko', 'Muthoni', 'Njuguna', 'Karanja', 'Maina', 'Kimani', 'Githinji', 'Wanyama', 'Simiyu', 'Mohamed', 'Hassan', 'Abdi', 'Ali', 'Juma', 'Mwinyi', 'Said', 'Nyaga', 'Mbugua', 'Langat', 'Rono', 'Sang', 'Onyango', 'Owino', 'Awino', 'Mokaya', 'Nyamweya', 'Ogutu', 'Okoth', 'Kilonzo', 'Mulwa', 'Ndungu', 'Wambui', 'Chepkoech', 'Ngugi'];
const INSTITUTIONS = ['University of Nairobi', 'Kenyatta University', 'Moi University', 'JKUAT', 'Strathmore University', 'Egerton University', 'Maseno University', 'Technical University of Kenya', 'Multimedia University of Kenya', 'Kisii University', 'Mount Kenya University', 'KCA University', 'USIU-Africa', 'Daystar University', 'Kenya Methodist University', 'Dedan Kimathi University', 'Meru University of Science and Technology', 'Chuka University', 'Pwani University', 'Technical University of Mombasa', 'Kirinyaga University', 'Machakos University', 'Karatina University', 'Laikipia University'];
const COUNTY_WEIGHTS = { Nairobi: 30, Mombasa: 9, Kisumu: 7, Nakuru: 7, Kiambu: 7, 'Uasin Gishu': 5, Machakos: 4, Kakamega: 3, Nyeri: 3, Meru: 3, Kisii: 3, Kajiado: 3, Bungoma: 2, Kilifi: 2, Embu: 2, Kericho: 2, Nandi: 2, Kirinyaga: 2, Siaya: 1.5, 'Trans Nzoia': 1.5 };
const QUALS = [["Bachelor's degree", 70], ['Diploma', 22], ['Higher National Diploma', 4], ["Master's degree", 2], ['Certificate', 2]];

const CATS = {
  'information-technology': { courses: ['BSc Information Technology', 'BSc Computer Science', 'Diploma in ICT'], skills: ['Networking', 'Troubleshooting', 'Linux', 'Helpdesk', 'Cybersecurity basics', 'Hardware repair'], titles: ['IT Support Intern', 'Network Intern', 'Systems Administration Intern', 'Cybersecurity Intern'], suffix: ['Tech Labs', 'Digital', 'Systems', 'Networks'], tasks: ['Resolve user support tickets and document fixes.', 'Help maintain network equipment and user accounts.', 'Assist with software rollouts and security checks.'] },
  'software-development': { courses: ['BSc Software Engineering', 'BSc Computer Science', 'BSc Information Technology'], skills: ['JavaScript', 'React', 'Node.js', 'SQL', 'Python', 'Git', 'Java', 'Flutter'], titles: ['Software Developer Intern', 'Web Developer Intern', 'QA Intern', 'Mobile App Intern', 'Data Analyst Intern'], suffix: ['Software', 'Labs', 'Apps', 'Softworks'], tasks: ['Build and test small features with a mentor.', 'Write clean, reviewed code and fix bugs.', 'Help test releases and report defects.'] },
  engineering: { courses: ['BEng Electrical Engineering', 'BEng Civil Engineering', 'BSc Mechanical Engineering'], skills: ['AutoCAD', 'Site supervision', 'Circuit design', 'MATLAB', 'Maintenance planning'], titles: ['Electrical Engineering Intern', 'Civil Engineering Intern', 'Maintenance Engineering Intern'], suffix: ['Engineering Works', 'Engineers', 'Power Solutions'], tasks: ['Assist engineers on site inspections and drawings.', 'Prepare technical reports and maintenance logs.'] },
  'business-administration': { courses: ['BCom Business Administration', 'BBA', 'Diploma in Business Management'], skills: ['Excel', 'Reporting', 'Communication', 'Project coordination', 'Minute taking'], titles: ['Business Operations Intern', 'Administration Intern', 'Project Support Intern'], suffix: ['Consultants', 'Holdings', 'Business Services'], tasks: ['Support daily operations and prepare reports.', 'Coordinate schedules, documents and meetings.'] },
  'finance-accounting': { courses: ['BCom Accounting', 'BSc Finance', 'CPA Part II'], skills: ['Bookkeeping', 'Excel', 'QuickBooks', 'Auditing', 'Tax basics'], titles: ['Accounts Intern', 'Audit Assistant Intern', 'Finance Intern'], suffix: ['Finance Partners', 'Capital', 'Accounting Services'], tasks: ['Record transactions and reconcile accounts.', 'Assist auditors with sampling and working papers.'] },
  marketing: { courses: ['BCom Marketing', 'Diploma in Marketing', 'BA Communication'], skills: ['Social media', 'SEO', 'Content writing', 'Canva', 'Analytics'], titles: ['Digital Marketing Intern', 'Brand Intern', 'Content Marketing Intern'], suffix: ['Media Group', 'Brands', 'Creative Agency'], tasks: ['Plan and publish social media content.', 'Track campaign results and prepare weekly reports.'] },
  'human-resources': { courses: ['BA Human Resource Management', 'BCom Human Resource', 'Diploma in HR'], skills: ['Recruitment', 'Records management', 'Payroll basics', 'Interviewing'], titles: ['HR Support Intern', 'Recruitment Intern'], suffix: ['People Solutions', 'Staffing', 'HR Services'], tasks: ['Screen CVs and schedule interviews.', 'Maintain staff records and onboarding files.'] },
  'procurement-supply-chain': { courses: ['BSc Supply Chain Management', 'Diploma in Procurement', 'BCom Procurement'], skills: ['Procurement', 'Inventory', 'Logistics', 'Excel', 'Vendor management'], titles: ['Procurement Intern', 'Logistics Intern', 'Supply Chain Intern'], suffix: ['Logistics', 'Supply Co', 'Freight'], tasks: ['Prepare purchase orders and track deliveries.', 'Help manage stock records and supplier files.'] },
  'hospitality-tourism': { courses: ['BSc Hospitality Management', 'Diploma in Tourism', 'Diploma in Food and Beverage'], skills: ['Customer service', 'Front office', 'Events', 'Food safety', 'Reservations'], titles: ['Front Office Intern', 'Events Intern', 'Guest Relations Intern'], suffix: ['Hospitality Group', 'Safaris', 'Hotels'], tasks: ['Welcome guests and manage reservations.', 'Support event setup and guest feedback.'] },
  healthcare: { courses: ['BSc Nursing', 'Diploma in Clinical Medicine', 'BSc Public Health'], skills: ['Patient care', 'Records', 'First aid', 'Community outreach'], titles: ['Health Records Intern', 'Community Health Intern', 'Pharmacy Intern'], suffix: ['Health Services', 'Medical Centre', 'Care'], tasks: ['Update patient records and support clinic flow.', 'Join outreach visits and health education sessions.'] },
  'media-communications': { courses: ['BA Journalism', 'BA Communication', 'Diploma in Film and Media'], skills: ['Video editing', 'Copywriting', 'Photography', 'Reporting', 'Social media'], titles: ['Media Intern', 'Content Production Intern', 'PR Intern'], suffix: ['Media House', 'Studios', 'Communications'], tasks: ['Write, edit and publish content.', 'Assist with shoots, editing and press releases.'] },
  'architecture-construction': { courses: ['BSc Architecture', 'BSc Quantity Surveying', 'BSc Construction Management'], skills: ['AutoCAD', 'Revit', 'Site supervision', 'BQ preparation'], titles: ['Architecture Intern', 'Quantity Surveying Intern', 'Site Intern'], suffix: ['Architects', 'Builders', 'Construction'], tasks: ['Prepare drawings and bills of quantities.', 'Assist with site measurements and progress reports.'] },
  agriculture: { courses: ['BSc Agribusiness', 'BSc Agriculture', 'Diploma in Agriculture'], skills: ['Crop management', 'Research', 'Data collection', 'GIS', 'Extension'], titles: ['Agribusiness Intern', 'Farm Operations Intern', 'Extension Services Intern'], suffix: ['Agribusiness', 'Farms', 'Agri Solutions'], tasks: ['Collect field data and support farm operations.', 'Help farmers adopt better practices and record results.'] },
  education: { courses: ['BEd Arts', 'BEd Science', 'Diploma in Education'], skills: ['Lesson planning', 'Tutoring', 'Classroom management', 'Assessment'], titles: ['Teaching Assistant Intern', 'Curriculum Support Intern'], suffix: ['Learning Centre', 'Academy', 'Education Trust'], tasks: ['Support lessons and prepare learning materials.', 'Mark assessments and track learner progress.'] },
  law: { courses: ['LLB'], skills: ['Legal research', 'Drafting', 'Case management', 'Client intake'], titles: ['Legal Intern', 'Paralegal Intern'], suffix: ['Law Chambers', 'Advocates', 'Legal Associates'], tasks: ['Research case law and draft documents.', 'Organise case files and attend court with advocates.'] },
  'customer-service': { courses: ['BCom Business Administration', 'Diploma in Customer Service', 'BA Communication'], skills: ['Communication', 'CRM', 'Call handling', 'Problem solving'], titles: ['Customer Support Intern', 'Call Centre Intern'], suffix: ['Customer Care', 'Contact Centre', 'Service Desk'], tasks: ['Answer customer queries and log requests.', 'Follow up on complaints until resolved.'] },
};
const PREFIX = ['Savanna', 'Rift', 'Lakeside', 'Highland', 'Coastal', 'Equator', 'Karura', 'Tsavo', 'Amboseli', 'Nyali', 'Mara', 'Baobab', 'Acacia', 'Jacaranda', 'Safari', 'Kijani', 'Jua', 'Pamoja', 'Umoja', 'Tumaini', 'Harambee', 'Imani', 'Zawadi', 'Nuru', 'Msingi', 'Bidii', 'Jenga', 'Kilimo', 'Pwani', 'Ukweli', 'Mlima', 'Bonde', 'Kibo', 'Ziwa', 'Mwanga', 'Chui', 'Twiga', 'Simba', 'Tembo', 'Duma'];
const STREETS = ['Kenyatta Avenue', 'Moi Avenue', 'Mombasa Road', 'Thika Road', 'Ngong Road', 'Waiyaki Way', 'Lenana Road', 'Oginga Odinga Street', 'Kimathi Street', 'Haile Selassie Avenue', 'Tom Mboya Street', 'Mama Ngina Street'];
const CO_ADJ = ['a growing team', 'a values-driven culture', 'hands-on mentorship', 'a collaborative environment'];
const AMOUNTS = [5000, 8000, 10000, 12000, 15000, 20000];
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

export function generate({ internCount = 1200, companyCount = 80, perCompany = 4, categorySlugs, counties, now = new Date(), seed = 2026 }) {
  const rnd = mulberry32(seed);
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const chance = (p) => rnd() < p;
  const weighted = (pairs) => { const total = pairs.reduce((s, [, w]) => s + w, 0); let r = rnd() * total; for (const [v, w] of pairs) { if ((r -= w) < 0) return v; } return pairs[0][0]; };
  const sample = (arr, n) => { const a = [...arr]; const out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; };
  const nowMs = now.getTime();
  const between = (a, b) => new Date(a + rnd() * Math.max(1, b - a));
  const recent = (days) => new Date(nowMs - Math.pow(rnd(), 1.5) * days * DAY); // more recent than old: looks like growth
  const code = (alphabet, n) => Array.from({ length: n }, () => alphabet[Math.floor(rnd() * alphabet.length)]).join('');
  const phone = () => `2547${int(0, 9)}${String(int(0, 9999999)).padStart(7, '0')}`.slice(0, 12);
  const countyPairs = counties.map((c) => [c, COUNTY_WEIGHTS[c] || 0.4]);
  const slugs = categorySlugs.filter((s) => CATS[s]);
  const year = now.getFullYear();
  const hex = (n) => n.toString(16).toUpperCase().padStart(6, '0');

  /* ---------- companies ---------- */
  const companyUsers = []; const companies = []; const documents = []; const usedNames = new Set();
  for (let i = 1; i <= companyCount; i++) {
    const cat = pick(slugs);
    let name; let tries = 0;
    do { name = `${pick(PREFIX)} ${pick(CATS[cat].suffix)} Ltd`; tries++; } while (usedNames.has(name) && tries < 30);
    if (usedNames.has(name)) name = `${name.replace(' Ltd', '')} ${i} Ltd`;
    usedNames.add(name);
    const county = weighted(countyPairs);
    const email = `hr${String(i).padStart(4, '0')}@${DEMO_DOMAIN}`;
    const created = recent(160);
    const status = weighted([['approved', 84], ['pending', 9], ['rejected', 4], ['suspended', 3]]);
    const contact = `${pick([...FEMALE, ...MALE])} ${pick(SURNAMES)}`;
    const slug = name.toLowerCase().replace(/ ltd$/, '').replace(/[^a-z0-9]+/g, '');
    companyUsers.push({ key: email, email, full_name: contact, phone: phone(), county, status: 'active', created_at: created });
    companies.push({
      userKey: email, company_name: name, official_email: email, phone: phone(), address: `${int(1, 120)} ${pick(STREETS)}, ${county}`, county, industry: cat,
      website: `https://www.${slug}.example.com`, registration_number: `PVT-${int(100000, 999999)}`, approval_status: status, created_at: created,
      rejection_reason: status === 'rejected' ? 'Incomplete registration documents.' : status === 'suspended' ? 'Under review by the platform team.' : null,
      description: `${name} is a ${county}-based organisation offering structured, mentored internships. Interns join ${pick(CO_ADJ)} and take on real work from week one.`,
      cat,
    });
    if (status === 'approved') {
      documents.push({ companyKey: email, doc_type: 'certificate_of_incorporation', verified: true, created_at: created }, { companyKey: email, doc_type: 'kra_pin', verified: chance(0.8), created_at: created });
    } else if (status === 'pending') documents.push({ companyKey: email, doc_type: 'certificate_of_incorporation', verified: false, created_at: created });
  }

  /* ---------- internships ---------- */
  const internships = []; let refN = 0;
  for (const c of companies) {
    const n = Math.max(1, Math.round(perCompany + (rnd() - 0.5) * 3));
    if (c.approval_status === 'rejected' && chance(0.7)) continue;
    for (let j = 0; j < n; j++) {
      const cat = chance(0.7) ? c.cat : pick(slugs); const meta = CATS[cat];
      const created = new Date(Math.min(nowMs - 3600000, Math.max(c.created_at.getTime() + 3600000, nowMs - Math.pow(rnd(), 1.3) * 110 * DAY)));
      const cStatus = c.approval_status;
      let status = cStatus === 'approved' ? weighted([['approved', 82], ['pending_approval', 8], ['closed', 6], ['rejected', 4]]) : 'pending_approval';
      let deadline = new Date(nowMs + int(5, 60) * DAY);
      if (status === 'approved' && chance(0.06)) deadline = new Date(nowMs - int(2, 20) * DAY); // a few already expired
      if (status === 'closed') deadline = new Date(nowMs - int(1, 30) * DAY);
      const paid = chance(0.55); const arrangement = weighted([['physical', 55], ['hybrid', 30], ['remote', 15]]);
      const title = pick(meta.titles); const months = pick([2, 3, 3, 4, 6]);
      internships.push({
        companyKey: c.userKey, reference: `INT-${year}-${hex(0xB00000 + (refN++))}`, categorySlug: cat, title,
        department: pick(['Operations', 'Projects', 'Technology', 'Customer', 'Finance', 'Programmes']), county: arrangement === 'remote' && chance(0.6) ? null : c.county,
        location: c.county, work_arrangement: arrangement, duration_months: months, deadline: deadline.toISOString().slice(0, 10),
        start_date: new Date(deadline.getTime() + int(7, 30) * DAY).toISOString().slice(0, 10), is_paid: paid, stipend_amount: paid ? pick(AMOUNTS) : null,
        skills: sample(meta.skills, int(2, 4)), positions: int(1, 5), status, is_featured: status === 'approved' && chance(0.12), created_at: created,
        description: `${c.company_name} is looking for a ${title.toLowerCase()} for ${months} months. You will work alongside a mentor, take on real tasks from week one, and finish with a reference and a portfolio of work. ${pick(CO_ADJ)[0].toUpperCase()}${pick(CO_ADJ).slice(1)} awaits.`,
        responsibilities: sample(meta.tasks, 2).join(' '), qualifications: `Studying or recently completed ${pick(meta.courses)} or a related field.`,
        rejection_reason: status === 'rejected' ? 'Description needs more detail on responsibilities.' : null,
      });
    }
  }
  const openInternships = internships.filter((i) => i.status === 'approved' && companies.find((c) => c.userKey === i.companyKey).approval_status === 'approved');

  /* ---------- interns, profiles, payments ---------- */
  const internUsers = []; const profiles = []; const payments = []; let payN = 0;
  for (let i = 1; i <= internCount; i++) {
    const female = chance(0.5); const first = pick(female ? FEMALE : MALE); const last = pick(SURNAMES);
    const email = `intern${String(i).padStart(4, '0')}@${DEMO_DOMAIN}`;
    const created = recent(150);
    const status = weighted([['active', 94], ['pending_verification', 4], ['suspended', 2]]);
    const county = weighted(countyPairs);
    internUsers.push({
      key: email, email, full_name: `${first} ${last}`, phone: phone(), county, gender: chance(0.9) ? (female ? 'female' : 'male') : null,
      date_of_birth: `${int(1997, 2006)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, status,
      email_verified_at: status === 'pending_verification' ? null : new Date(created.getTime() + int(1, 600) * 60000), created_at: created,
      last_login_at: status === 'active' && chance(0.8) ? between(created.getTime(), nowMs) : null,
    });
    const primary = pick(slugs); const meta = CATS[primary]; const course = pick(meta.courses);
    const qual = /^Diploma/.test(course) ? 'Diploma' : /^CPA/.test(course) ? 'Certificate' : weighted(QUALS);
    const interests = [...new Set([primary, ...(chance(0.5) ? [pick(slugs)] : []), ...(chance(0.2) ? [pick(slugs)] : [])])];
    const fullProfile = chance(0.62);
    const p = {
      userKey: email, institution: fullProfile || chance(0.7) ? pick(INSTITUTIONS) : null, course: fullProfile || chance(0.7) ? course : null,
      qualification_level: fullProfile || chance(0.6) ? qual : null, graduation_year: fullProfile || chance(0.6) ? int(2025, 2028) : null,
      skills: fullProfile || chance(0.7) ? sample(meta.skills, int(3, 5)) : [], career_interests: fullProfile || chance(0.6) ? interests : [],
      experience: chance(0.35) ? `Volunteered with a student club and completed a short attachment in ${primary.replace(/-/g, ' ')}.` : null,
      preferred_county: fullProfile || chance(0.5) ? weighted(countyPairs) : null, preferred_work_arrangement: fullProfile || chance(0.5) ? weighted([['physical', 50], ['hybrid', 30], ['remote', 20]]) : null,
      linkedin_url: chance(0.3) ? `https://www.linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase()}-demo${i}` : null, photo_path: null, cv_path: null,
    };
    p.completion_pct = completion(p).pct; // photo and CV stay empty (no real files exist for demo accounts), so the maximum is 80%
    profiles.push(p);

    if (status === 'active') {
      const outcome = weighted([['paid', 46], ['none', 44], ['failed', 6], ['cancelled', 4]]);
      if (outcome !== 'none') {
        const at = between(created.getTime() + 3600000, nowMs); payN++;
        const success = outcome === 'paid';
        payments.push({
          userKey: email, amount: 199, phone: `2547${int(0, 9)}${String(int(0, 9999999)).padStart(7, '0')}`.slice(0, 12), status: success ? 'success' : outcome,
          checkout_request_id: `${CHECKOUT_PREFIX}${String(payN).padStart(6, '0')}`, merchant_request_id: `bulk-m-${payN}`,
          mpesa_receipt: success ? `${pick(['S', 'T', 'U'])}${code(LETTERS, 2)}${code(ALNUM, 7)}` : null,
          result_code: success ? 0 : outcome === 'cancelled' ? 1032 : 1,
          result_desc: success ? 'The service request is processed successfully.' : outcome === 'cancelled' ? 'Request cancelled by user' : 'The balance is insufficient for the transaction',
          transaction_date: success ? at : null, created_at: at,
        });
      }
    }
  }
  const paidAt = new Map(payments.filter((p) => p.status === 'success').map((p) => [p.userKey, p.created_at]));

  /* ---------- applications ---------- */
  const applications = []; const seen = new Set(); let appN = 0;
  const byCat = {}; for (const it of openInternships) (byCat[it.categorySlug] ||= []).push(it);
  for (const prof of profiles) {
    const paid = paidAt.get(prof.userKey); if (!paid || !openInternships.length) continue;
    const k = weighted([[0, 22], [1, 26], [2, 20], [3, 15], [4, 10], [5, 5], [6, 2]]);
    for (let a = 0; a < k; a++) {
      const pool = chance(0.6) && prof.career_interests.length && byCat[pick(prof.career_interests)]?.length ? byCat[pick(prof.career_interests)] : openInternships;
      const it = pick(pool); const id = `${prof.userKey}|${it.reference}`;
      if (seen.has(id)) continue; seen.add(id);
      const from = Math.max(paid.getTime(), it.created_at.getTime()); if (from >= nowMs - 3600000) continue;
      const submitted = between(from, nowMs); const status = weighted([['submitted', 30], ['under_review', 25], ['shortlisted', 15], ['interview_scheduled', 8], ['selected', 7], ['rejected', 12], ['withdrawn', 3]]);
      const interview = status === 'interview_scheduled' ? new Date(nowMs + int(1, 14) * DAY + int(9, 16) * 3600000) : null;
      applications.push({
        reference: `APP-${year}-${hex(0xA00000 + (appN++))}`, internKey: prof.userKey, internshipRef: it.reference, status, submitted_at: submitted,
        updated_at: new Date(Math.min(nowMs, submitted.getTime() + int(1, 72) * 3600000)), interview_at: interview, interview_notes: interview ? 'Office visit. Please bring your ID and a copy of your CV.' : null,
        cover_letter: `I am a ${prof.course || 'student'} ${prof.institution ? `at ${prof.institution} ` : ''}keen to learn ${it.title.replace(' Intern', '').toLowerCase()} skills. I am reliable, learn quickly and would value the chance to contribute from week one.`,
      });
    }
  }

  return { companyUsers, companies, documents, internships, internUsers, profiles, payments, applications };
}
