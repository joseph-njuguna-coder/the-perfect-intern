import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { STATUS, fmtDate, fmtDateTime } from '../../lib/format.js';
import InternshipCard from '../../components/InternshipCard.jsx';
import Field from '../../components/Field.jsx';

const Title = ({ children, sub }) => (<div className="mb-6"><h1 className="text-3xl font-extrabold">{children}</h1>{sub && <p className="mt-1 text-slate2">{sub}</p>}</div>);
const Empty = ({ title, body, to, cta }) => (
  <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
    <p className="font-display text-lg font-bold">{title}</p>
    <p className="mt-1 text-sm text-slate2">{body}</p>
    {to && <Link to={to} className="btn-primary mt-5">{cta}</Link>}
  </div>
);

export function Saved() {
  const { data, loading, error } = useApi('/intern/saved');
  const [removed, setRemoved] = useState([]);
  async function unsave(id) {
    await api(`/intern/saved/${id}`, { method: 'DELETE' });
    setRemoved((r) => [...r, id]);
  }
  const items = (data?.items || []).filter((i) => !removed.includes(i.id));
  return (
    <>
      <Title sub="Internships you bookmarked. Expired listings disappear automatically.">Saved internships</Title>
      {loading && <p className="text-slate2">Loading…</p>}
      {error && <p role="alert" className="text-red-600">{error.message}</p>}
      {!loading && !items.length && <Empty title="Nothing saved yet" body="Use Save on any internship to keep it here." to="/internships" cta="Browse internships" />}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => <InternshipCard key={it.id} item={it} saved onToggleSave={() => unsave(it.id)} />)}
      </div>
    </>
  );
}

const WITHDRAWABLE = ['submitted', 'under_review', 'shortlisted', 'interview_scheduled'];

export function Applications() {
  const { data, loading, error } = useApi('/intern/applications');
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (data) setItems(data.items); }, [data]);
  async function withdraw(a) {
    if (!window.confirm(`Withdraw your application for "${a.title}"? You cannot reapply to this listing afterwards.`)) return;
    setErr('');
    try { await api(`/intern/applications/${a.id}/withdraw`, { method: 'POST' }); setItems((l) => l.map((x) => (x.id === a.id ? { ...x, status: 'withdrawn' } : x))); }
    catch (e) { setErr(e.message); }
  }
  return (
    <>
      <Title sub="Every application and where it stands.">My applications</Title>
      {loading && <p className="text-slate2">Loading…</p>}
      {(error || err) && <p role="alert" className="mb-3 text-red-600">{err || error.message}</p>}
      {items && !items.length && <Empty title="No applications yet" body="Applications you submit will be tracked here from submitted to selected." to="/internships" cta="Find internships" />}
      {items?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-slate2"><tr><th className="p-3">Reference</th><th className="p-3">Internship</th><th className="p-3">Submitted</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {items.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="p-3 font-mono text-xs">{a.reference}</td>
                  <td className="p-3"><Link to={`/internships/${a.internshipId}`} className="font-bold hover:text-brand hover:underline">{a.title}</Link><br /><span className="text-slate2">{a.companyName}</span></td>
                  <td className="p-3">{fmtDate(a.submittedAt)}</td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[a.status][1]}`}>{STATUS[a.status][0]}</span>{a.interviewAt && a.status === 'interview_scheduled' && <span className="mt-1 block text-xs text-slate2">Interview {fmtDateTime(a.interviewAt)}</span>}</td>
                  <td className="p-3">{WITHDRAWABLE.includes(a.status) && <button className="text-xs font-semibold text-red-600 underline" onClick={() => withdraw(a)}>Withdraw</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/account/notifications').then((d) => setItems(d.items)).catch((e) => setError(e.message)); }, []);
  async function open(n) {
    if (!n.readAt) { await api(`/account/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {}); setItems((l) => l.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))); }
    if (n.link) navigate(n.link);
  }
  async function readAll() { await api('/account/notifications/read-all', { method: 'POST' }); setItems((l) => l.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() }))); }
  const unread = items?.filter((n) => !n.readAt).length || 0;
  return (
    <>
      <Title sub="Updates about your account and applications.">Notifications</Title>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {items && !items.length && <Empty title="You are all caught up" body="New updates will appear here." />}
      {items?.length > 0 && (
        <>
          <button className="btn-outline mb-4 py-2" onClick={readAll} disabled={!unread}>Mark all as read</button>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {items.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(n)} className={`flex w-full items-start gap-3 p-4 text-left hover:bg-paper ${n.readAt ? '' : 'bg-brand-50/40'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-brand'}`} aria-label={n.readAt ? 'Read' : 'Unread'} />
                  <span className="min-w-0"><span className="block text-sm font-semibold">{n.title}</span>{n.body && <span className="block text-sm text-slate2">{n.body}</span>}<span className="mt-1 block text-xs text-slate2">{fmtDateTime(n.createdAt)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function YourData({ user }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [st, setSt] = useState({ busy: false, error: '', fields: {} });
  async function erase(e) {
    e.preventDefault();
    setSt({ busy: true, error: '', fields: {} });
    try { await api('/account/delete', { method: 'POST', body: form }); await logout(); navigate('/', { replace: true }); }
    catch (err) { setSt({ busy: false, error: Object.keys(err.fields || {}).length ? '' : err.message, fields: err.fields || {} }); }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-6">
      <h2 className="text-lg font-bold">Your data</h2>
      <p className="text-sm text-slate2">Under the Kenya Data Protection Act you can get a copy of your personal data and ask for it to be erased.</p>
      <a className="btn-outline" href="/api/account/export" download>Download my data (JSON)</a>
      {user.role !== 'intern' ? (
        <p className="text-sm text-slate2">To close a company or administrator account, contact support.</p>
      ) : !open ? (
        <div><button className="btn-outline text-red-600" onClick={() => setOpen(true)}>Delete my account</button></div>
      ) : (
        <form onSubmit={erase} className="space-y-4 rounded-xl border border-red-200 bg-red-50/40 p-4" noValidate>
          <p className="text-sm">This permanently removes your profile, CV, photo, saved internships and notifications, and withdraws open applications. Payment and audit records are kept as the law requires, without your personal details. This cannot be undone.</p>
          <Field label="Your password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={st.fields.password} />
          <Field label="Type DELETE to confirm" name="confirm" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={st.fields.confirm} />
          {st.error && <p role="alert" className="text-sm font-medium text-red-700">{st.error}</p>}
          <div className="flex gap-3"><button className="btn bg-red-600 text-white hover:bg-red-700" disabled={st.busy}>{st.busy ? 'Deleting…' : 'Permanently delete'}</button><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      )}
    </section>
  );
}

export function Settings() {
  const { user, refresh } = useAuth();
  const counties = useApi('/public/counties');
  const [acc, setAcc] = useState({ fullName: user.fullName, phone: user.phone ? `0${user.phone.slice(3)}` : '', county: user.county || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [a, setA] = useState({ busy: false, msg: '', error: '', fields: {} });
  const [p, setP] = useState({ busy: false, msg: '', error: '', fields: {} });

  async function saveAccount(e) {
    e.preventDefault(); setA({ busy: true, msg: '', error: '', fields: {} });
    try { const d = await api('/account', { method: 'PUT', body: acc }); await refresh(); setA({ busy: false, msg: d.message, error: '', fields: {} }); }
    catch (err) { setA({ busy: false, msg: '', error: Object.keys(err.fields || {}).length ? '' : err.message, fields: err.fields || {} }); }
  }
  async function savePassword(e) {
    e.preventDefault(); setP({ busy: true, msg: '', error: '', fields: {} });
    try { const d = await api('/account/password', { method: 'POST', body: pw }); setPw({ currentPassword: '', newPassword: '' }); setP({ busy: false, msg: d.message, error: '', fields: {} }); }
    catch (err) { setP({ busy: false, msg: '', error: Object.keys(err.fields || {}).length ? '' : err.message, fields: err.fields || {} }); }
  }
  const Msg = ({ s }) => (<>{s.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{s.error}</p>}{s.msg && <p role="status" className="rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-700">{s.msg}</p>}</>);

  return (
    <div className="max-w-xl space-y-8">
      <Title sub={user.email}>Account settings</Title>
      <form onSubmit={saveAccount} className="space-y-4 rounded-2xl border border-line bg-white p-6" noValidate>
        <h2 className="text-lg font-bold">Your details</h2>
        <Field label="Full name" name="fullName" value={acc.fullName} onChange={(e) => setAcc({ ...acc, fullName: e.target.value })} error={a.fields.fullName} />
        <Field label="Phone number" name="phone" type="tel" value={acc.phone} onChange={(e) => setAcc({ ...acc, phone: e.target.value })} error={a.fields.phone} />
        <Field as="select" label="County" name="county" value={acc.county} onChange={(e) => setAcc({ ...acc, county: e.target.value })} error={a.fields.county}>
          <option value="">Select county</option>{(counties.data?.counties || []).map((c) => <option key={c}>{c}</option>)}
        </Field>
        <Msg s={a} /><button className="btn-primary" disabled={a.busy}>{a.busy ? 'Saving…' : 'Save details'}</button>
      </form>
      <form onSubmit={savePassword} className="space-y-4 rounded-2xl border border-line bg-white p-6" noValidate>
        <h2 className="text-lg font-bold">Change password</h2>
        <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} error={p.fields.currentPassword} />
        <Field label="New password" name="newPassword" type="password" autoComplete="new-password" hint="At least 8 characters with a letter and a number" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={p.fields.newPassword} />
        <Msg s={p} /><button className="btn-primary" disabled={p.busy}>{p.busy ? 'Saving…' : 'Change password'}</button>
      </form>
      <YourData user={user} />
    </div>
  );
}
