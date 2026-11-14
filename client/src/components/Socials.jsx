import { SOCIALS } from '../content.js';

/** Text-labelled links (accessible, no icon dependencies). `dark` styles them for the navy footer. */
export default function Socials({ dark = false, showHandles = false }) {
  const base = dark ? 'border-white/25 text-white hover:bg-white/10' : 'border-line bg-white text-ink hover:border-brand hover:text-brand';
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Social media">
      {SOCIALS.map((s) => (
        <li key={s.name}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${base}`} aria-label={`${s.name}: ${s.handle} (opens in a new tab)`}>
            {s.name}{showHandles && <span className={`font-normal ${dark ? 'text-ink-300' : 'text-slate2'}`}>{s.handle}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
