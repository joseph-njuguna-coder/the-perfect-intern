import { Link } from 'react-router-dom';
const fmtDate = (d) => new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
const ARR = { remote: 'Remote', hybrid: 'Hybrid', physical: 'On site' };

export default function InternshipCard({ item, compact = false, saved = false, onToggleSave }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink font-display text-sm font-bold text-gold" aria-hidden="true">
          {item.companyName.split(' ').slice(0, 2).map((w) => w[0]).join('')}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.isPaid ? 'bg-brand-50 text-brand-700' : 'bg-paper text-slate2'}`}>
          {item.isPaid ? `Paid, KSh ${Number(item.stipendAmount).toLocaleString('en-KE')}/month` : 'Unpaid'}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug"><Link to={`/internships/${item.id}`} className="hover:text-brand hover:underline">{item.title}</Link></h3>
      <p className="mt-0.5 text-sm text-slate2">{item.companyName}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div><dt className="text-xs text-slate2">Location</dt><dd className="font-medium">{item.county}</dd></div>
        <div><dt className="text-xs text-slate2">Work style</dt><dd className="font-medium">{ARR[item.workArrangement]}</dd></div>
        <div><dt className="text-xs text-slate2">Duration</dt><dd className="font-medium">{item.durationMonths} months</dd></div>
        <div><dt className="text-xs text-slate2">Apply by</dt><dd className="font-medium">{fmtDate(item.deadline)}</dd></div>
      </dl>
      {!compact && item.skills?.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {item.skills.slice(0, 4).map((s) => <li key={s} className="rounded-md bg-paper px-2 py-1 text-xs text-slate2">{s}</li>)}
        </ul>
      )}
      <div className="mt-auto flex items-center justify-between pt-4">
        <p className="text-xs text-slate2">{item.category}</p>
        {onToggleSave && (
          <button type="button" onClick={() => onToggleSave(item.id, saved)} aria-pressed={saved}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${saved ? 'border-brand bg-brand-50 text-brand-700' : 'border-line text-ink hover:border-ink'}`}>
            {saved ? 'Saved' : 'Save'}
          </button>
        )}
      </div>
    </article>
  );
}
