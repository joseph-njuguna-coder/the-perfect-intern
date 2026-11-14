import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { STATUS, fmtDate, fmtDateTime } from '../../lib/format.js';
import Field from '../../components/Field.jsx';

const Badge = ({ s }) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[s][1]}`}>{STATUS[s][0]}</span>;

export function Applicants() {
  const [params, setParams] = useSearchParams();
  const q = Object.fromEntries(params);
  const page = Number(q.page || 1);
  const { data, loading, error } = useApi('/company/applications', { ...q, limit: 20 }, params.toString());
  const listings = useApi('/company/internships');
  const update = (k, v) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); n.delete('page'); setParams(n); };
  const goto = (p) => { const n = new URLSearchParams(params); n.set('page', p); setParams(n); };

  return (
    <>
      <div className="mb-6"><h1 className="text-3xl font-extrabold">Applicants</h1><p className="mt-1 text-slate2">Applications to your internships only.</p></div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <select className="input" aria-label="Internship" value={q.internshipId || ''} onChange={(e) => update('internshipId', e.target.value)}>
          <option value="">All internships</option>{(listings.data?.items || []).map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
        </select>
        <select className="input" aria-label="Status" value={q.status || ''} onChange={(e) => update('status', e.target.value)}>
          <option value="">All statuses</option>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {error && <p role="alert" className="text-red-600">{error.message}</p>}
      {loading && <p className="text-slate2">Loading…</p>}
      {data && data.total === 0 && <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center"><p className="font-display text-lg font-bold">No applications found</p><p className="mt-1 text-sm text-slate2">Applications appear here as interns apply to your live listings.</p></div>}
      {data?.items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-slate2"><tr><th className="p-3">Applicant</th><th className="p-3">Internship</th><th className="p-3">Submitted</th><th className="p-3">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td className="p-3"><Link to={`/dashboard/applicants/${a.id}`} className="font-bold hover:text-brand hover:underline">{a.name}</Link><br /><span className="text-xs text-slate2">{[a.course, a.institution].filter(Boolean).join(', ') || a.county}</span></td>
                  <td className="p-3">{a.internshipTitle}<br /><span className="font-mono text-xs text-slate2">{a.reference}</span></td>
                  <td className="p-3">{fmtDate(a.submittedAt)}</td>
                  <td className="p-3"><Badge s={a.status} />{a.status === 'interview_scheduled' && a.interviewAt && <span className="mt-1 block text-xs text-slate2">{fmtDateTime(a.interviewAt)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.pages > 1 && <div className="mt-6 flex items-center justify-center gap-3"><button className="btn-outline" disabled={page <= 1} onClick={() => goto(page - 1)}>Previous</button><span className="text-sm text-slate2">Page {page} of {data.pages}</span><button className="btn-outline" disabled={page >= data.pages} onClick={() => goto(page + 1)}>Next</button></div>}
    </>
  );
}

const NEXT = {
  submitted: ['under_review', 'shortlisted', 'rejected'], under_review: ['shortlisted', 'rejected'],
  shortlisted: ['interview_scheduled', 'selected', 'rejected'], interview_scheduled: ['interview_scheduled', 'selected', 'rejected'],
  selected: [], rejected: [], withdrawn: [],
};
const ACTION = { under_review: 'Mark under review', shortlisted: 'Shortlist', interview_scheduled: 'Schedule interview', selected: 'Select candidate', rejected: 'Reject' };
const Row = ({ k, v }) => v ? (<div><dt className="text-xs text-slate2">{k}</dt><dd className="text-sm font-medium break-words">{v}</dd></div>) : null;

export function ApplicantDetail() {
  const { id } = useParams();
  const { data, loading, error } = useApi(`/company/applications/${id}`);
  const [a, setA] = useState(null);
  const [action, setAction] = useState(null);
  const [form, setForm] = useState({ interviewAt: '', interviewNotes: '', message: '' });
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [st, setSt] = useState({ busy: false, ok: '', error: '', fields: {} });
  const [mst, setMst] = useState({ busy: false, ok: '', error: '' });
  useEffect(() => { if (data) { setA(data.application); setNotes(data.application.companyNotes || ''); } }, [data]);
  if (loading || !a) return <p className="text-slate2">{error ? error.message : 'Loading…'}</p>;
  const next = NEXT[a.status];

  async function apply(e) {
    e.preventDefault();
    setSt({ busy: true, ok: '', error: '', fields: {} });
    try {
      await api(`/company/applications/${id}/status`, { method: 'PUT', body: { status: action, ...(action === 'interview_scheduled' ? { interviewAt: form.interviewAt, interviewNotes: form.interviewNotes } : {}), message: form.message } });
      const fresh = await api(`/company/applications/${id}`);
      setA(fresh.application); setAction(null); setForm({ interviewAt: '', interviewNotes: '', message: '' });
      setSt({ busy: false, ok: 'Status updated and the applicant has been notified.', error: '', fields: {} });
    } catch (err) { setSt({ busy: false, ok: '', error: Object.keys(err.fields || {}).length ? '' : err.message, fields: err.fields || {} }); }
  }
  async function saveNotes() { try { await api(`/company/applications/${id}/notes`, { method: 'PUT', body: { companyNotes: notes } }); setSt((s) => ({ ...s, ok: 'Notes saved.', error: '' })); } catch (err) { setSt((s) => ({ ...s, error: err.message, ok: '' })); } }
  async function sendMessage(e) {
    e.preventDefault(); setMst({ busy: true, ok: '', error: '' });
    try { await api(`/company/applications/${id}/message`, { method: 'POST', body: { message: msg } }); setMsg(''); setMst({ busy: false, ok: 'Message sent by email and in-app notification.', error: '' }); }
    catch (err) { setMst({ busy: false, ok: '', error: err.fields?.message || err.message }); }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link to="/dashboard/applicants" className="text-sm font-semibold text-brand hover:underline">All applicants</Link>
      <header className="flex flex-wrap items-center gap-4">
        {a.hasPhoto ? <img src={`/api/company/applications/${id}/photo`} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display font-bold text-gold" aria-hidden="true">{a.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}</div>}
        <div className="min-w-0 flex-1"><h1 className="text-2xl font-extrabold">{a.name}</h1><p className="text-sm text-slate2">{a.internshipTitle} · <span className="font-mono">{a.reference}</span> · {fmtDate(a.submittedAt)}</p></div>
        <Badge s={a.status} />
      </header>
      {a.status === 'interview_scheduled' && a.interviewAt && <p className="rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-700">Interview: {fmtDateTime(a.interviewAt)}{a.interviewNotes && ` · ${a.interviewNotes}`}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-line bg-white p-5"><h2 className="font-bold">Cover letter</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate2">{a.coverLetter}</p></section>
          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-bold">Profile</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Row k="Email" v={a.email} /><Row k="Phone" v={a.phone} /><Row k="County" v={a.county} />
              <Row k="Institution" v={a.institution} /><Row k="Course" v={a.course} /><Row k="Qualification" v={a.qualification} /><Row k="Graduation year" v={a.graduationYear} />
              <Row k="Preferred location" v={a.preferredCounty} /><Row k="Work arrangement" v={a.preferredWorkArrangement} />
            </dl>
            {a.skills?.length > 0 && <ul className="mt-4 flex flex-wrap gap-1.5">{a.skills.map((s) => <li key={s} className="rounded-md bg-paper px-2 py-1 text-xs text-slate2">{s}</li>)}</ul>}
            {a.experience && <p className="mt-4 whitespace-pre-line text-sm text-slate2">{a.experience}</p>}
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
              {a.linkedinUrl && <a className="text-brand underline" href={a.linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
              {a.portfolioUrl && <a className="text-brand underline" href={a.portfolioUrl} target="_blank" rel="noopener noreferrer">Portfolio</a>}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <a className="btn-primary w-full" href={`/api/company/applications/${id}/cv`}>Download CV</a>
          <section className="rounded-xl border border-line bg-white p-4">
            <h2 className="font-bold">Update status</h2>
            {next.length === 0 ? <p className="mt-2 text-sm text-slate2">This application is {STATUS[a.status][0].toLowerCase()}. No further actions.</p> : !action ? (
              <div className="mt-3 flex flex-col gap-2">{next.map((n) => <button key={n} className={n === 'rejected' ? 'btn-outline text-red-600' : 'btn-outline'} onClick={() => setAction(n)}>{ACTION[n]}</button>)}</div>
            ) : (
              <form onSubmit={apply} className="mt-3 space-y-3" noValidate>
                <p className="text-sm font-semibold">{ACTION[action]}</p>
                {action === 'interview_scheduled' && (<>
                  <Field label="Date and time (Kenya time)" name="interviewAt" type="datetime-local" value={form.interviewAt} onChange={(e) => setForm({ ...form, interviewAt: e.target.value })} error={st.fields.interviewAt} />
                  <Field label="Venue or meeting link (optional)" name="interviewNotes" value={form.interviewNotes} onChange={(e) => setForm({ ...form, interviewNotes: e.target.value })} />
                </>)}
                <Field as="textarea" rows={3} label="Message to applicant (optional)" name="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                <div className="flex gap-2"><button className="btn-primary flex-1" disabled={st.busy}>{st.busy ? 'Saving…' : 'Confirm'}</button><button type="button" className="btn-outline" onClick={() => setAction(null)}>Cancel</button></div>
              </form>
            )}
            {st.error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{st.error}</p>}
            {st.ok && <p role="status" className="mt-3 text-sm font-medium text-brand-700">{st.ok}</p>}
          </section>
          <section className="rounded-xl border border-line bg-white p-4">
            <h2 className="font-bold">Message the applicant</h2>
            <form onSubmit={sendMessage} className="mt-3 space-y-3" noValidate>
              <textarea className="input" rows={3} aria-label="Message" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a message. The applicant receives it by email and in-app." />
              {mst.error && <p role="alert" className="text-sm font-medium text-red-600">{mst.error}</p>}{mst.ok && <p role="status" className="text-sm font-medium text-brand-700">{mst.ok}</p>}
              <button className="btn-outline w-full" disabled={mst.busy || a.status === 'withdrawn'}>{mst.busy ? 'Sending…' : 'Send message'}</button>
            </form>
          </section>
          <section className="rounded-xl border border-line bg-white p-4">
            <h2 className="font-bold">Private notes</h2>
            <textarea className="input mt-3" rows={3} aria-label="Private notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only your team sees these." />
            <button className="btn-outline mt-2 w-full" onClick={saveNotes}>Save notes</button>
          </section>
        </aside>
      </div>
    </div>
  );
}
