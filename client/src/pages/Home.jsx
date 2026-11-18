import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import InternshipCard from '../components/InternshipCard.jsx';
import ContactForm from '../components/ContactForm.jsx';
import Socials from '../components/Socials.jsx';
import Img from '../components/Img.jsx';
import Reveal from '../components/Reveal.jsx';
import { TESTIMONIALS, FAQS } from '../content.js';

const STEPS = [
  ['Create your profile', 'Register for free, verify your email and add your education, skills and CV.'],
  ['Find a fit', 'Search by keyword, county, category, pay and work style.'],
  ['Activate and apply', 'Pay the one-time access fee by M-Pesa, then apply with a cover letter.'],
  ['Track your progress', 'Follow every application from submitted to selected on your dashboard.'],
];

const DURATION = 7000; // ms each audience is shown

const MODES = {
  intern: {
    to: '/internships', label: 'Find Internships', kicker: 'For students and graduates', img: 'student-laptop',
    text: 'Browse verified internships and attachments across Kenya, build one profile, and apply in minutes. Follow every application from submitted to selected.',
  },
  company: {
    to: '/register?role=company', label: 'Post an Internship', kicker: 'For companies', img: 'hiring-manager',
    text: 'Reach motivated students from universities, colleges and polytechnics. Post an internship for free, review applicants, and select your next intern in one place.',
  },
};
const COMPANY_CHIPS = ['Free to post', 'Every listing reviewed', 'Shortlist in one place'];

function Hero() {
  const { data } = useApi('/public/internships/featured');
  const listing = data?.items?.[0];
  const [mode, setMode] = useState('intern');
  const [hover, setHover] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const on = (e) => setReduce(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const playing = !reduce && !hover && !paused;
  useEffect(() => {
    if (!playing) return undefined;
    const t = setTimeout(() => setMode((m) => (m === 'intern' ? 'company' : 'intern')), DURATION);
    return () => clearTimeout(t);
  }, [playing, mode]);

  const engage = (key) => { setMode(key); setHover(true); };
  const big = 'relative flex min-h-[4.5rem] items-center justify-center overflow-hidden rounded-2xl px-8 text-lg font-bold transition-all duration-500 sm:text-xl';

  return (
    <section className="relative overflow-hidden bg-ink pb-32 pt-12 text-white sm:pt-16">
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.4rem]">Find Your Perfect Internship. Build Your Future.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-100">Connect with companies, discover internship opportunities and gain the practical experience needed to build a successful career.</p>

          <div className="mt-8" onMouseLeave={() => setHover(false)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHover(false); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(MODES).map(([key, m]) => {
                const active = mode === key;
                return (
                  <Link key={key} to={m.to} onMouseEnter={() => engage(key)} onFocus={() => engage(key)}
                    className={`${big} ${active ? 'scale-[1.02] bg-gold text-ink shadow-xl shadow-black/25' : 'border-2 border-white/30 text-white hover:border-white/60'}`}>
                    {m.label}
                    {active && playing && <span key={mode} className="progress-run absolute inset-x-0 bottom-0 h-1 bg-ink/40" style={{ '--dur': `${DURATION}ms` }} aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>

            {/* The description slides from one audience to the other; the notch follows the active button. */}
            <div className="relative mt-5 rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
              <span aria-hidden="true" className={`absolute -top-2 hidden h-4 w-4 rotate-45 border-l border-t border-white/15 bg-[#0E2B6A] transition-all duration-700 ease-out sm:block ${mode === 'intern' ? 'left-[23%]' : 'left-[73%]'}`} />
              <div className="grid overflow-hidden">
                {Object.entries(MODES).map(([key, m]) => (
                  <div key={key} aria-hidden={mode !== key}
                    className={`col-start-1 row-start-1 transition-all duration-700 ease-out ${mode === key ? 'translate-x-0 opacity-100' : `pointer-events-none opacity-0 ${key === 'intern' ? '-translate-x-10' : 'translate-x-10'}`}`}>
                    <p className="text-sm font-semibold text-gold">{m.kicker}</p>
                    <p className="mt-1.5 leading-relaxed text-ink-100">{m.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-ink-300">
              <div className="flex items-center gap-2" role="group" aria-label="Choose audience">
                {Object.entries(MODES).map(([key, m]) => (
                  <button key={key} type="button" onClick={() => setMode(key)} aria-pressed={mode === key}
                    className={`rounded-full px-3 py-1 font-semibold transition-colors ${mode === key ? 'bg-white text-ink' : 'text-ink-100 hover:bg-white/10'}`}>
                    {key === 'intern' ? 'Students' : 'Companies'}
                  </button>
                ))}
              </div>
              {!reduce && <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused} className="rounded-full px-3 py-1 font-semibold text-ink-100 hover:bg-white/10">{paused ? 'Play animation' : 'Pause animation'}</button>}
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div aria-hidden="true" className="absolute -right-6 -top-6 h-44 w-44 rounded-full bg-gold/25 blur-3xl" />
          <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-white/15 sm:aspect-[4/5]">
            {Object.entries(MODES).map(([key, m]) => (
              <Img key={key} name={m.img} priority={key === 'intern'} sizes="(min-width: 1024px) 40vw, 90vw"
                className={`kb absolute inset-0 h-full w-full transition-opacity duration-1000 ${mode === key ? 'opacity-100' : 'opacity-0'}`} alt={mode === key ? undefined : ''} />
            ))}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 grid">
              <div className={`col-start-1 row-start-1 transition-all duration-700 ${mode === 'intern' ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`} aria-hidden={mode !== 'intern'}>
                <div className="floaty rounded-2xl bg-white p-4 text-ink shadow-xl">
                  <p className="text-xs font-semibold text-brand">{listing ? 'Latest verified listing' : 'Verified internships across Kenya'}</p>
                  {listing ? (
                    <>
                      <p className="mt-1 font-display text-base font-bold leading-snug">{listing.title}</p>
                      <p className="text-sm text-slate2">{listing.companyName} · {listing.county}{listing.isPaid ? ` · Paid, KSh ${Number(listing.stipendAmount).toLocaleString('en-KE')}/month` : ''}</p>
                    </>
                  ) : <p className="mt-1 text-sm text-slate2">Every listing is reviewed before it goes live.</p>}
                </div>
              </div>
              <div className={`col-start-1 row-start-1 flex flex-wrap content-end gap-2 transition-all duration-700 ${mode === 'company' ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`} aria-hidden={mode !== 'company'}>
                {COMPANY_CHIPS.map((c) => <span key={c} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-lg">{c}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchPanel() {
  const navigate = useNavigate();
  const counties = useApi('/public/counties');
  const cats = useApi('/public/categories');
  const [f, setF] = useState({ q: '', county: '', category: '', arrangement: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    navigate(`/internships?${new URLSearchParams(Object.entries(f).filter(([, v]) => v))}`);
  };
  return (
    <section className="container-x relative -mt-14" aria-label="Search internships">
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-xl shadow-ink/10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
        <input className="input" placeholder="Job title or keyword" aria-label="Job title or keyword" value={f.q} onChange={set('q')} />
        <select className="input" aria-label="County" value={f.county} onChange={set('county')}>
          <option value="">Any county</option>
          {(counties.data?.counties || []).map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input" aria-label="Category" value={f.category} onChange={set('category')}>
          <option value="">All categories</option>
          {(cats.data?.categories || []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="input" aria-label="Work arrangement" value={f.arrangement} onChange={set('arrangement')}>
          <option value="">Any work style</option>
          <option value="physical">On site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option>
        </select>
        <button className="btn-primary">Search</button>
      </form>
    </section>
  );
}

const Tile = ({ name, delay, className }) => (
  <Reveal delay={delay} className={`group relative overflow-hidden rounded-2xl ${className}`}>
    <Img name={name} sizes="(min-width: 1024px) 28vw, 45vw" className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" />
    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
  </Reveal>
);

export default function Home() {
  const featured = useApi('/public/internships/featured');
  const cats = useApi('/public/categories');
  const companies = useApi('/public/companies/featured');
  const stats = useApi('/public/stats');
  const settings = useApi('/public/settings');
  const fee = settings.data?.accessFee ?? 199;
  const s = stats.data;

  return (
    <>
      <Hero />
      <SearchPanel />

      <section className="section container-x">
        <Reveal className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-extrabold">Featured internships</h2>
          <Link to="/internships" className="text-sm font-semibold text-brand hover:underline">See all internships</Link>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-white" />)}
          {(featured.data?.items || []).map((it, i) => <Reveal key={it.id} delay={i * 90}><InternshipCard item={it} /></Reveal>)}
        </div>
        {!featured.loading && !featured.data?.items?.length && <p className="mt-6 text-slate2">No internships are live yet. Check back soon.</p>}
      </section>

      <section className="bg-white section">
        <div className="container-x">
          <Reveal><h2 className="text-3xl font-extrabold">Browse by category</h2><p className="mt-2 text-slate2">Pick the field you want to grow in.</p></Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {(cats.data?.categories || []).map((c, i) => (
              <Reveal key={c.id} delay={(i % 4) * 70}>
                <Link to={`/internships?category=${c.slug}`} className="group block h-full rounded-xl border border-line p-4 transition-all hover:-translate-y-0.5 hover:border-brand hover:bg-brand-50">
                  <p className="text-sm font-bold leading-snug">{c.name}</p>
                  <p className="mt-1 text-xs text-slate2">{c.count} open {c.count === 1 ? 'role' : 'roles'}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section container-x">
        <Reveal><h2 className="text-3xl font-extrabold">How The Perfect Intern works</h2></Reveal>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <Reveal as="li" key={t} delay={i * 110} className="relative rounded-xl border border-line bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-gold">{i + 1}</span>
              <h3 className="mt-4 text-base font-bold">{t}</h3>
              <p className="mt-1 text-sm text-slate2">{d}</p>
            </Reveal>
          ))}
        </ol>
        <p className="mt-6 text-sm text-slate2">Registering and browsing are free. Application access is a one-time payment of KSh {fee}, which is not refunded. Payment does not guarantee an interview or placement.</p>
      </section>

      <section className="bg-white section">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-extrabold">Made for every learner in Kenya</h2>
            <p className="mt-3 text-slate2">The Perfect Intern is not only for university students. Anyone in a university, college, polytechnic or vocational training institution who needs an internship or attachment can use it.</p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {['Build one profile and reuse it for every application', 'See pay, duration, county and work style before you apply', 'Companies decide who they shortlist, interview and select'].map((t) => (
                <li key={t} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />{t}</li>
              ))}
            </ul>
            <Link to="/how-it-works" className="btn-outline mt-6">See how it works</Link>
          </Reveal>
          <div className="grid h-[24rem] grid-cols-5 grid-rows-2 gap-3 sm:h-[30rem]">
            <Tile name="reading-break" delay={0} className="col-span-2 row-span-2" />
            <Tile name="classmates" delay={140} className="col-span-3" />
            <Tile name="focus-work" delay={280} className="col-span-3" />
          </div>
        </div>
      </section>

      <section className="section container-x">
        <div className="grid gap-8 md:grid-cols-2">
          <Reveal className="overflow-hidden rounded-3xl bg-paper ring-1 ring-line">
            <div className="group relative h-52 overflow-hidden">
              <Img name="campus-entrance" sizes="(min-width: 768px) 45vw, 100vw" className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-paper via-paper/10 to-transparent" />
            </div>
            <div className="p-7 pt-3">
              <h2 className="text-2xl font-extrabold">For interns</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {['One profile and one CV for every application', 'Free browsing of every approved internship', 'Pay once, then apply as often as you like', 'Track each application from submitted to selected', 'Email and in-app updates when your status changes'].map((b) => <li key={b} className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />{b}</li>)}
              </ul>
              <Link to="/register" className="btn-primary mt-6">Create an intern account</Link>
            </div>
          </Reveal>
          <Reveal delay={140} className="overflow-hidden rounded-3xl bg-ink text-white">
            <div className="group relative h-52 overflow-hidden">
              <Img name="professional-tablet" sizes="(min-width: 768px) 45vw, 100vw" className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
            </div>
            <div className="p-7 pt-3">
              <h2 className="text-2xl font-extrabold">For companies</h2>
              <ul className="mt-4 space-y-3 text-sm text-ink-100">
                {['Reach students and graduates across all 47 counties', 'Receive applications with profile, CV and cover letter together', 'Shortlist, reject, schedule interviews and select in one place', 'Only see applicants to your own listings', 'Listings reviewed before they go live, so intern trust stays high'].map((b) => <li key={b} className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />{b}</li>)}
              </ul>
              <Link to="/register?role=company" className="btn-gold mt-6">Register your company</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white section">
        <div className="container-x">
          <Reveal><h2 className="text-3xl font-extrabold">Featured companies</h2></Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(companies.data?.companies || []).map((c, i) => (
              <Reveal key={c.id} delay={(i % 4) * 80}>
                <Link to={`/internships?company=${c.id}`} className="block h-full rounded-xl border border-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand">
                  <p className="font-display text-base font-bold">{c.name}</p>
                  <p className="mt-0.5 text-sm text-slate2">{c.industry} · {c.county}</p>
                  <p className="mt-3 text-sm font-semibold text-brand">{c.openings} open {c.openings === 1 ? 'role' : 'roles'}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-14 text-white">
        <div className="container-x grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          {[[s?.interns, 'Registered interns'], [s?.companies, 'Approved companies'], [s?.openings, 'Open internships'], [s?.applications, 'Applications submitted']].map(([n, l], i) => (
            <Reveal key={l} delay={i * 100}><p className="font-display text-4xl font-extrabold text-gold">{n == null ? '–' : Number(n).toLocaleString('en-KE')}</p><p className="mt-1 text-sm text-ink-100">{l}</p></Reveal>
          ))}
        </div>
      </section>

      <section className="section container-x">
        <Reveal><h2 className="text-3xl font-extrabold">What people say</h2></Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal as="figure" key={t.quote} delay={i * 110} className="rounded-xl border border-line bg-white p-6">
              <blockquote className="text-sm leading-relaxed">{t.quote}</blockquote>
              <figcaption className="mt-4 text-sm font-semibold">{t.name}<span className="block text-xs font-normal text-slate2">{t.role}</span></figcaption>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-white section">
        <div className="container-x max-w-3xl">
          <Reveal><h2 className="text-3xl font-extrabold">Frequently asked questions</h2></Reveal>
          <Reveal delay={100} className="mt-8 divide-y divide-line rounded-xl border border-line">
            {FAQS(fee).map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{q}<span className="text-brand transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary>
                <p className="mt-3 text-sm text-slate2">{a}</p>
              </details>
            ))}
          </Reveal>
          <p className="mt-6 text-sm text-slate2">More guidance for students and companies is in our <Link to="/resources" className="font-semibold text-brand underline">resources</Link>.</p>
        </div>
      </section>

      <section className="section container-x grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <h2 className="text-3xl font-extrabold">Talk to us</h2>
          <p className="mt-3 text-slate2">Questions about registering, payment or listing an internship? Send a message and we will reply by email.</p>
          <p className="mt-6 text-sm font-semibold">Follow us</p>
          <div className="mt-2"><Socials /></div>
        </Reveal>
        <Reveal delay={120} className="rounded-2xl border border-line bg-white p-6"><ContactForm /></Reveal>
      </section>
    </>
  );
}
