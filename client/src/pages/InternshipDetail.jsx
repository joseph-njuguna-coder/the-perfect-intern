import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { STATUS, fmtDate } from '../lib/format.js';

const ARR = { remote: 'Remote', hybrid: 'Hybrid', physical: 'On site' };
const Block = ({ title, children }) => children ? (<section><h2 className="text-lg font-bold">{title}</h2><div className="mt-2 whitespace-pre-line leading-relaxed text-slate2">{children}</div></section>) : null;

function ApplyPanel({ item }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [elig, setElig] = useState(null);
  const [saved, setSaved] = useState(false);
  const [cover, setCover] = useState('');
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState({ busy: false, error: '', fields: {}, done: null });

  const refresh = () => api(`/intern/internships/${item.id}/eligibility`).then(setElig).catch(() => setElig(null));
  useEffect(() => {
    if (user?.role !== 'intern') return;
    refresh();
    api('/intern/saved/ids').then((d) => setSaved(d.ids.includes(item.id))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, item.id]);

  if (loading) return null;
  const box = 'rounded-2xl border border-line bg-white p-5';

  if (!user) {
    return (
      <div className={box}>
        <p className="font-semibold">Interested in this internship?</p>
        <p className="mt-1 text-sm text-slate2">Sign in or create a free account to apply.</p>
        <div className="mt-4 flex gap-3">
          <button className="btn-primary flex-1" onClick={() => navigate('/login', { state: { from: location.pathname } })}>Apply Now</button>
          <Link to="/register" className="btn-outline flex-1">Register</Link>
        </div>
      </div>
    );
  }
  if (user.role !== 'intern') return <div className={box}><p className="text-sm text-slate2">You are signed in as {user.role === 'company' ? 'a company' : 'an administrator'}. Sign in with an intern account to apply.</p></div>;
  if (!elig) return <div className={box}><p className="text-sm text-slate2">Checking your application status…</p></div>;

  async function toggleSave() {
    try { await api(`/intern/saved/${item.id}`, { method: saved ? 'DELETE' : 'POST' }); setSaved(!saved); } catch { /* unchanged */ }
  }
  async function submit(e) {
    e.preventDefault();
    setSt({ busy: true, error: '', fields: {}, done: null });
    try {
      const d = await api('/intern/applications', { method: 'POST', body: { internshipId: item.id, coverLetter: cover } });
      setSt({ busy: false, error: '', fields: {}, done: d.application });
      refresh();
    } catch (err) {
      if (err.code === 'ACCESS_REQUIRED') return navigate(`/pay?internship=${item.id}`);
      setSt({ busy: false, error: Object.keys(err.fields || {}).length ? '' : err.message, fields: err.fields || {}, done: null });
    }
  }

  const saveBtn = <button type="button" onClick={toggleSave} aria-pressed={saved} className="btn-outline mt-3 w-full">{saved ? 'Saved' : 'Save for later'}</button>;

  if (st.done) {
    return <div className={box}><p className="font-display text-lg font-bold text-brand-700">Application submitted</p><p className="mt-1 text-sm text-slate2">Reference <span className="font-mono">{st.done.reference}</span>. We emailed you a confirmation.</p><Link to="/dashboard/applications" className="btn-primary mt-4 w-full">Track application</Link></div>;
  }
  if (elig.code === 'ALREADY_APPLIED') {
    const [label, cls] = STATUS[elig.applicationStatus];
    return <div className={box}><p className="font-semibold">You applied to this internship</p><p className="mt-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span> <span className="font-mono text-xs text-slate2">{elig.reference}</span></p><Link to="/dashboard/applications" className="btn-outline mt-4 w-full">View my applications</Link></div>;
  }
  if (elig.code === 'NOT_AVAILABLE') return <div className={box}><p className="text-sm text-slate2">{elig.message}</p></div>;

  // Steps 2 and 3 of the apply workflow: profile first, then paid access.
  if (elig.code === 'PROFILE_INCOMPLETE' || elig.code === 'CV_MISSING') {
    return (
      <div className={box}>
        <p className="font-semibold">Finish your profile to apply</p>
        <p className="mt-1 text-sm text-slate2">{elig.message}{elig.pct != null && ` You are at ${elig.pct}%.`}</p>
        {elig.missing?.length > 0 && <p className="mt-2 text-xs text-slate2">Missing: {elig.missing.join(', ')}.</p>}
        <Link to="/dashboard/profile" className="btn-primary mt-4 w-full">Complete profile</Link>{saveBtn}
      </div>
    );
  }
  if (elig.code === 'ACCESS_REQUIRED') {
    return (
      <div className={box}>
        <p className="font-semibold">Activate application access</p>
        <p className="mt-1 text-sm text-slate2">A one-time payment of <strong className="text-ink">KSh {elig.accessFee}</strong> lets you apply to as many internships as you like. It does not guarantee an interview or placement.</p>
        <Link to={`/pay?internship=${item.id}`} className="btn-primary mt-4 w-full">Apply Now</Link>{saveBtn}
      </div>
    );
  }
  return (
    <div className={box}>
      {!open ? (
        <><button className="btn-primary w-full" onClick={() => setOpen(true)}>Apply Now</button>{saveBtn}</>
      ) : (
        <form onSubmit={submit} noValidate>
          <label htmlFor="cover" className="mb-1.5 block text-sm font-semibold">Cover letter</label>
          <textarea id="cover" rows={8} className="input" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Tell the company why you are a good fit and what you hope to learn." aria-invalid={Boolean(st.fields.coverLetter)} />
          <p className="mt-1 text-xs text-slate2">Your profile and CV (PDF) are sent with this application. {cover.length}/3000</p>
          {st.fields.coverLetter && <p className="mt-1 text-xs font-medium text-red-600">{st.fields.coverLetter}</p>}
          {st.error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{st.error}</p>}
          <div className="mt-4 flex gap-3"><button className="btn-primary flex-1" disabled={st.busy}>{st.busy ? 'Submitting…' : 'Submit application'}</button><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      )}
    </div>
  );
}

export default function InternshipDetail() {
  const { id } = useParams();
  const { data, loading, error } = useApi(`/public/internships/${id}`);
  if (loading) return <div className="container-x py-16 text-slate2">Loading…</div>;
  if (error) return (
    <div className="container-x py-20 text-center">
      <h1 className="text-3xl font-extrabold">Internship not available</h1>
      <p className="mt-2 text-slate2">{error.message}</p>
      <Link to="/internships" className="btn-primary mt-6">Browse internships</Link>
    </div>
  );
  const it = data.internship;
  return (
    <div className="container-x py-10">
      <Link to="/internships" className="text-sm font-semibold text-brand hover:underline">All internships</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
        <article className="space-y-7">
          <header>
            <div className="flex items-center gap-3">
              {it.hasLogo ? <img src={`/api/public/companies/${it.companyId}/logo`} alt="" className="h-12 w-12 rounded-lg border border-line object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink font-display text-sm font-bold text-gold" aria-hidden="true">{it.companyName.split(' ').slice(0, 2).map((w) => w[0]).join('')}</div>}
              <p className="font-semibold">{it.companyName}</p>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{it.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-paper px-3 py-1">{it.category}</span>
              <span className="rounded-full bg-paper px-3 py-1">{ARR[it.workArrangement]}</span>
              <span className={`rounded-full px-3 py-1 ${it.isPaid ? 'bg-brand-50 text-brand-700' : 'bg-paper'}`}>{it.isPaid ? `Paid, KSh ${Number(it.stipendAmount).toLocaleString('en-KE')}/month` : 'Unpaid'}</span>
            </div>
          </header>
          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-white p-5 text-sm sm:grid-cols-4">
            {[['Location', [it.county, it.location].filter(Boolean).join(', ') || 'Remote'], ['Duration', `${it.durationMonths} months`], ['Positions', it.positions], ['Apply by', fmtDate(it.deadline)], ...(it.startDate ? [['Starts', fmtDate(it.startDate)]] : []), ...(it.department ? [['Department', it.department]] : [])].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-slate2">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>
          <Block title="About the internship">{it.description}</Block>
          <Block title="Responsibilities">{it.responsibilities}</Block>
          <Block title="Required qualifications">{it.qualifications}</Block>
          {it.skills?.length > 0 && <section><h2 className="text-lg font-bold">Skills</h2><ul className="mt-2 flex flex-wrap gap-2">{it.skills.map((s) => <li key={s} className="rounded-md bg-white px-2.5 py-1 text-sm text-slate2 ring-1 ring-line">{s}</li>)}</ul></section>}
          <Block title="Additional requirements">{it.additionalRequirements}</Block>
          <Block title={`About ${it.companyName}`}>{it.companyDescription}{it.companyWebsite && <a href={it.companyWebsite} target="_blank" rel="noopener noreferrer" className="mt-2 block font-semibold text-brand underline">Company website</a>}</Block>
        </article>
        <aside className="lg:sticky lg:top-24 lg:self-start"><ApplyPanel item={it} /></aside>
      </div>
    </div>
  );
}
