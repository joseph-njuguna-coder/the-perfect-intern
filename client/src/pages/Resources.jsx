import { Link } from 'react-router-dom';
import Img from '../components/Img.jsx';
import Reveal from '../components/Reveal.jsx';
import { RESOURCES } from '../content.js';

const LinkList = ({ items }) => (
  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
    {items.map((l) => (
      <li key={l.url}>
        <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex h-full items-start justify-between gap-3 rounded-xl border border-line bg-white p-3.5 text-sm font-medium transition-colors hover:border-brand hover:text-brand">
          <span>{l.title}</span><span aria-hidden="true" className="text-slate2">↗</span><span className="sr-only">(opens in a new tab)</span>
        </a>
      </li>
    ))}
  </ul>
);
const Bullets = ({ items }) => <ul className="mt-4 space-y-2.5">{items.map((t) => <li key={t} className="flex gap-3 text-slate2"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />{t}</li>)}</ul>;

export default function Resources() {
  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <Img name="focus-work" priority sizes="100vw" className="kb absolute inset-0 h-full w-full opacity-35" alt="" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" aria-hidden="true" />
        <div className="container-x relative py-16 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-extrabold sm:text-5xl">Internship resources</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-100">Guides, reading, films and inspiration for students looking for an internship, and for companies thinking about hosting one.</p>
        </div>
      </section>

      <div className="container-x space-y-16 py-14">
        <Reveal>
          <h2 className="text-2xl font-extrabold sm:text-3xl">What is an internship?</h2>
          <p className="mt-3 max-w-3xl text-slate2">An internship is a professional learning experience that offers meaningful, practical work related to a student's field of study or career interest. It gives the student a chance to explore a career and build new skills. It gives the employer fresh ideas and energy, a chance to develop talent, and a possible pipeline of future full-time staff. A quality internship has:</p>
          <Bullets items={RESOURCES.quality} />
          <p className="mt-4 text-xs text-slate2">Adapted from guidance published by the UMBC Career Center.</p>
        </Reveal>

        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal className="rounded-2xl border border-line bg-white p-7">
            <h2 className="text-xl font-extrabold">What student interns expect</h2>
            <Bullets items={RESOURCES.expect} />
          </Reveal>
          <Reveal delay={120} className="rounded-2xl border border-line bg-white p-7">
            <h2 className="text-xl font-extrabold">Benefits of having an intern</h2>
            <Bullets items={RESOURCES.whyHire} />
            <Link to="/register?role=company" className="btn-primary mt-6">Post an internship</Link>
          </Reveal>
        </div>

        <Reveal>
          <h2 className="text-2xl font-extrabold sm:text-3xl">Should interns be paid?</h2>
          <p className="mt-3 max-w-3xl text-slate2">A long-running debate in Kenya and abroad. These articles cover the arguments and the law.</p>
          <LinkList items={RESOURCES.paid} />
        </Reveal>
        <Reveal><h2 className="text-2xl font-extrabold sm:text-3xl">The story of internships</h2><LinkList items={RESOURCES.history} /></Reveal>
        <Reveal><h2 className="text-2xl font-extrabold sm:text-3xl">Books and articles to read</h2><LinkList items={RESOURCES.books} /></Reveal>
        <Reveal><h2 className="text-2xl font-extrabold sm:text-3xl">Films and shows to watch</h2><LinkList items={RESOURCES.movies} /></Reveal>
        <Reveal><h2 className="text-2xl font-extrabold sm:text-3xl">Inspiration corridor</h2><LinkList items={RESOURCES.inspiration} /></Reveal>
        <p className="text-sm text-slate2">These links go to websites we do not control, and they open in a new tab. We are not responsible for their content. See our <Link to="/privacy#links" className="font-semibold text-brand underline">Privacy Policy</Link>.</p>
      </div>
    </>
  );
}
