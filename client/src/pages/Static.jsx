import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import ContactForm from '../components/ContactForm.jsx';
import Socials from '../components/Socials.jsx';
import Img from '../components/Img.jsx';
import Reveal from '../components/Reveal.jsx';
import { RESOURCES } from '../content.js';

const H = ({ children }) => <h2 className="text-xl font-bold sm:text-2xl">{children}</h2>;
const Dot = ({ color = 'bg-gold' }) => <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${color}`} />;
const Bullets = ({ items }) => <ul className="mt-3 space-y-2.5">{items.map((t) => <li key={t} className="flex gap-3 text-slate2"><Dot />{t}</li>)}</ul>;

/** Page header with a photo on the right on larger screens. */
const PageHead = ({ title, intro, image, children }) => (
  <section className="bg-white">
    <div className="container-x grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr]">
      <Reveal>
        <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-xl text-lg text-slate2">{intro}</p>}
        {children}
      </Reveal>
      <Reveal delay={150} className="relative">
        <div aria-hidden="true" className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-gold/30 blur-2xl" />
        <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-line sm:aspect-[4/3]">
          <Img name={image} priority sizes="(min-width: 1024px) 40vw, 92vw" className="kb h-full w-full" />
        </div>
      </Reveal>
    </div>
  </section>
);

export function ForCompanies() {
  return (
    <>
      <PageHead image="hiring-manager" title="Hire interns who are ready to learn" intro="Post internships and attachments, review applicants and select candidates in one place. Posting is free for companies.">
        <Link to="/register?role=company" className="btn-primary mt-6 px-7 py-4 text-base">Register your company</Link>
      </PageHead>
      <div className="container-x grid gap-12 py-14 lg:grid-cols-2">
        <Reveal>
          <H>Why host an intern</H>
          <Bullets items={RESOURCES.whyHire} />
          <p className="mt-4 text-xs text-slate2">Adapted from guidance published by the UMBC Career Center.</p>
        </Reveal>
        <div className="space-y-10">
          <Reveal delay={100}>
            <H>What you can do</H>
            <Bullets items={['Create listings with responsibilities, required skills, stipend, duration and deadline.', 'Review applicant profiles, download CVs and read cover letters.', 'Shortlist, reject, schedule interviews and select candidates.', 'Message applicants and see applications for your own listings only.']} />
          </Reveal>
          <Reveal delay={200}>
            <H>How approval works</H>
            <p className="mt-3 text-slate2">Register your company and verify your email. Our team reviews your company before any of your listings become visible to interns, and each new listing is approved before it goes live.</p>
            <p className="mt-3 text-slate2">Looking for ideas on structure, pay and mentoring? See our <Link to="/resources" className="font-semibold text-brand underline">resources</Link>.</p>
          </Reveal>
        </div>
      </div>
      <section className="container-x pb-16">
        <Reveal className="grid items-center gap-8 overflow-hidden rounded-3xl bg-ink text-white md:grid-cols-2">
          <div className="p-8 sm:p-10">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Find your next intern</h2>
            <p className="mt-3 text-ink-100">Students from universities, colleges, polytechnics and vocational institutions are looking for hands-on experience.</p>
            <Link to="/register?role=company" className="btn-gold mt-6 px-7 py-4 text-base">Post an internship</Link>
          </div>
          <div className="relative h-56 md:h-full md:min-h-[16rem]"><Img name="professional-tablet" sizes="(min-width: 768px) 45vw, 100vw" className="absolute inset-0 h-full w-full" /></div>
        </Reveal>
      </section>
    </>
  );
}

export function HowItWorks() {
  const { data } = useApi('/public/settings');
  const fee = data?.accessFee ?? 199;
  return (
    <>
      <PageHead image="campus-entrance" title="How it works" intro="Free to register and browse. Pay once when you are ready to apply." />
      <div className="container-x grid gap-10 py-14 lg:grid-cols-2">
        <Reveal className="rounded-2xl border border-line bg-white p-7">
          <H>For interns</H>
          <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-slate2">
            <li>Register and verify your email.</li>
            <li>Complete your profile and upload your CV as a PDF.</li>
            <li>Browse internships and save the ones you like.</li>
            <li>Choose Apply Now. The first time, you pay a one-time access fee of KSh {fee} by M-Pesa.</li>
            <li>Submit your application with a cover letter and track its status.</li>
          </ol>
          <p className="mt-5 rounded-lg bg-gold-50 p-4 text-sm">Payment activates application access. It does not guarantee an interview, placement or employment, and the fee is not refunded if an application is unsuccessful, because the company makes the final decision.</p>
          <p className="mt-3 text-sm text-slate2">The fee helps us maintain the website, widen the pool of opportunities through research, and fund the marketing team that persuades companies to share internships with us.</p>
        </Reveal>
        <Reveal delay={120} className="rounded-2xl border border-line bg-white p-7">
          <H>For companies</H>
          <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-slate2">
            <li>Register your company and submit verification documents.</li>
            <li>Wait for administrator approval.</li>
            <li>Publish internships. Each listing is reviewed before it goes live.</li>
            <li>Review applicants, shortlist, interview and select.</li>
          </ol>
          <p className="mt-5 text-sm text-slate2">The Perfect Intern does not select students. Companies decide who to shortlist, interview and select.</p>
        </Reveal>
      </div>
    </>
  );
}

export function About() {
  return (
    <>
      <PageHead image="classmates" title="About The Perfect Intern" intro="Your professional journey starts here." />
      <div className="container-x grid gap-10 py-14 lg:grid-cols-[1.2fr_0.8fr]">
        <Reveal className="space-y-4 text-slate2">
          <p>The Perfect Intern is a Kenyan company, based in Kenya, that links companies with people looking for internships and attachments. Practical experience is often the missing step between studying and getting hired. We make it easier to find, apply for and track those opportunities.</p>
          <p>We do not select students. Students apply from the pool of opportunities that companies share, and the decision to accept or decline an application lies solely with the company. Everyone in a tertiary institution, including universities, colleges, polytechnics and vocational training institutions, can use the platform.</p>
          <p>We review every company and every listing before interns see it, because trust is what makes a marketplace work. Your data is handled in line with the Kenya Data Protection Act, 2019. Read our <Link to="/privacy" className="font-semibold text-brand underline">Privacy Policy</Link>.</p>
          <p className="font-display text-xl font-extrabold text-ink">Your Career. Your Opportunity. Your Future.</p>
        </Reveal>
        <Reveal delay={150} className="space-y-5">
          <div className="rounded-2xl border border-line bg-white p-6">
            <p className="font-bold">Follow us</p>
            <div className="mt-3"><Socials showHandles /></div>
          </div>
          <div className="relative h-56 overflow-hidden rounded-2xl"><Img name="phone-call" sizes="(min-width: 1024px) 30vw, 92vw" className="h-full w-full" /></div>
        </Reveal>
      </div>
    </>
  );
}

export function Contact() {
  return (
    <div className="container-x max-w-3xl py-14">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Contact us</h1>
      <p className="mt-3 text-lg text-slate2">Send a message and we will reply by email.</p>
      <div className="mt-8 rounded-2xl border border-line bg-white p-6"><ContactForm /></div>
      <h2 className="mt-10 text-xl font-bold">Follow The Perfect Intern</h2>
      <div className="mt-3"><Socials showHandles /></div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-4xl font-extrabold">Page not found</h1>
      <p className="mt-3 text-slate2">The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
