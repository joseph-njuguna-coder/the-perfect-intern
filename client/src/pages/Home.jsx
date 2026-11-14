import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import InternshipCard from '../components/InternshipCard.jsx';
import ContactForm from '../components/ContactForm.jsx';
import Socials from '../components/Socials.jsx';
import { TESTIMONIALS, FAQS } from '../content.js';

const STEPS = [
  ['Create your profile', 'Register for free, verify your email and add your education, skills and CV.'],
  ['Find a fit', 'Search by keyword, county, category, pay and work style.'],
  ['Activate and apply', 'Pay the one-time access fee by M-Pesa, then apply with a cover letter.'],
  ['Track your progress', 'Follow every application from submitted to selected on your dashboard.'],
];

function Hero() {
  const { data, loading } = useApi('/public/internships/featured');
  const items = (data?.items || []).slice(0, 3);
  return (
    <section className="relative overflow-hidden bg-ink pb-28 pt-14 text-white sm:pt-20">
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.4rem]">Find Your Perfect Internship. Build Your Future.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-100">Connect with companies, discover internship opportunities and gain the practical experience needed to build a successful career.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/internships" className="btn-gold">Find Internships</Link>
            <Link to="/register?role=company" className="btn-ghost-light">Post an Internship</Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md" aria-label="Latest internships">
          {loading && <div className="h-64 animate-pulse rounded-xl bg-white/10" />}
          {!loading && items.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-ink">
              <p className="font-display text-lg font-bold">Opportunities are being added</p>
              <p className="mt-1 text-sm text-slate2">Approved internships appear here as soon as companies publish them.</p>
            </div>
          )}
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={it.id} className="animate-rise text-ink" style={{ animationDelay: `${i * 140}ms`, marginLeft: `${i * 18}px`, marginRight: `${(2 - i) * 18}px` }}>
                <InternshipCard item={it} compact />
              </div>
            ))}
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
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-xl shadow-ink/5 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-extrabold">Featured internships</h2>
          <Link to="/internships" className="text-sm font-semibold text-brand hover:underline">See all internships</Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-white" />)}
          {(featured.data?.items || []).map((it) => <InternshipCard key={it.id} item={it} />)}
        </div>
        {!featured.loading && !featured.data?.items?.length && <p className="mt-6 text-slate2">No internships are live yet. Check back soon.</p>}
      </section>

      <section className="bg-white section">
        <div className="container-x">
          <h2 className="text-3xl font-extrabold">Browse by category</h2>
          <p className="mt-2 text-slate2">Pick the field you want to grow in.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {(cats.data?.categories || []).map((c) => (
              <Link key={c.id} to={`/internships?category=${c.slug}`} className="group rounded-xl border border-line p-4 transition-colors hover:border-brand hover:bg-brand-50">
                <p className="text-sm font-bold leading-snug">{c.name}</p>
                <p className="mt-1 text-xs text-slate2">{c.count} open {c.count === 1 ? 'role' : 'roles'}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section container-x">
        <h2 className="text-3xl font-extrabold">How The Perfect Intern works</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="relative rounded-xl border border-line bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-gold">{i + 1}</span>
              <h3 className="mt-4 text-base font-bold">{t}</h3>
              <p className="mt-1 text-sm text-slate2">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-slate2">Registering and browsing are free. Application access is a one-time payment of KSh {fee}. Payment does not guarantee an interview or placement.</p>
      </section>

      <section className="bg-white section">
        <div className="container-x grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl bg-paper p-7">
            <h2 className="text-2xl font-extrabold">For interns</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {['One profile and one CV for every application', 'Free browsing of every approved internship', 'Pay once, then apply as often as you like', 'Track each application from submitted to selected', 'Email and in-app updates when your status changes'].map((b) => <li key={b} className="flex gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />{b}</li>)}
            </ul>
            <Link to="/register" className="btn-primary mt-6">Create an intern account</Link>
          </div>
          <div className="rounded-2xl bg-ink p-7 text-white">
            <h2 className="text-2xl font-extrabold">For companies</h2>
            <ul className="mt-4 space-y-3 text-sm text-ink-100">
              {['Reach students and graduates across all 47 counties', 'Receive applications with profile, CV and cover letter together', 'Shortlist, reject, schedule interviews and select in one place', 'Only see applicants to your own listings', 'Listings reviewed before they go live, so intern trust stays high'].map((b) => <li key={b} className="flex gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />{b}</li>)}
            </ul>
            <Link to="/register?role=company" className="btn-gold mt-6">Register your company</Link>
          </div>
        </div>
      </section>

      <section className="section container-x">
        <h2 className="text-3xl font-extrabold">Featured companies</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(companies.data?.companies || []).map((c) => (
            <Link key={c.id} to={`/internships?company=${c.id}`} className="rounded-xl border border-line bg-white p-5 transition-colors hover:border-brand">
              <p className="font-display text-base font-bold">{c.name}</p>
              <p className="mt-0.5 text-sm text-slate2">{c.industry} · {c.county}</p>
              <p className="mt-3 text-sm font-semibold text-brand">{c.openings} open {c.openings === 1 ? 'role' : 'roles'}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-ink py-14 text-white">
        <div className="container-x grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          {[[s?.interns, 'Registered interns'], [s?.companies, 'Approved companies'], [s?.openings, 'Open internships'], [s?.applications, 'Applications submitted']].map(([n, l]) => (
            <div key={l}><p className="font-display text-4xl font-extrabold text-gold">{n == null ? '–' : Number(n).toLocaleString('en-KE')}</p><p className="mt-1 text-sm text-ink-100">{l}</p></div>
          ))}
        </div>
      </section>

      <section className="section container-x">
        <h2 className="text-3xl font-extrabold">What people say</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.quote} className="rounded-xl border border-line bg-white p-6">
              <blockquote className="text-sm leading-relaxed">{t.quote}</blockquote>
              <figcaption className="mt-4 text-sm font-semibold">{t.name}<span className="block text-xs font-normal text-slate2">{t.role}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="bg-white section">
        <div className="container-x max-w-3xl">
          <h2 className="text-3xl font-extrabold">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-line rounded-xl border border-line">
            {FAQS(fee).map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{q}<span className="text-brand transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary>
                <p className="mt-3 text-sm text-slate2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section container-x grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-3xl font-extrabold">Talk to us</h2>
          <p className="mt-3 text-slate2">Questions about registering, payment or listing an internship? Send a message and we will reply by email.</p>
          <p className="mt-6 text-sm font-semibold">Follow us</p>
          <div className="mt-2"><Socials /></div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6"><ContactForm /></div>
      </section>
    </>
  );
}
