import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useApi } from '../../../lib/useApi.js';
import { STATUS, fmtDate, fmtDateTime } from '../../../lib/format.js';
import { useFilters, Pager, Pill, Heading, Notice, SearchBox } from '../../../components/ui.jsx';

const US = { active: ['Active', 'bg-brand-50 text-brand-700'], suspended: ['Suspended', 'bg-red-50 text-red-700'], pending_verification: ['Unverified', 'bg-gold-50 text-gold-700'] };

export function AdminInterns() {
  const f = useFilters();
  const { data, loading, error } = useApi('/admin/interns', { ...f.q, limit: 20 }, f.key);
  return (
    <>
      <Heading sub="Search interns, review activity, suspend or reactivate accounts.">Interns</Heading>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <SearchBox value={f.q.q} onCommit={(v) => f.set('q', v)} placeholder="Search by name, email or phone" />
        <select className="input" aria-label="Status" value={f.q.status || ''} onChange={(e) => f.set('status', e.target.value)}>
          <option value="">All statuses</option>{Object.entries(US).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <Notice kind="error">{error?.message}</Notice>{loading && <p className="text-slate2">Loading…</p>}
      {data && !data.items.length && <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-slate2">No interns match.</p>}
      {data?.items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-slate2"><tr><th className="p-3">Intern</th><th className="p-3">Status</th><th className="p-3">Profile</th><th className="p-3">Access</th><th className="p-3">Applications</th><th className="p-3">Joined</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td className="p-3"><Link className="font-bold hover:text-brand hover:underline" to={`/dashboard/admin/interns/${u.id}`}>{u.name}</Link><br /><span className="text-xs text-slate2">{u.email} · {u.phone || 'no phone'}</span></td>
                  <td className="p-3"><Pill cls={US[u.status][1]}>{US[u.status][0]}</Pill></td><td className="p-3">{u.completion}%</td>
                  <td className="p-3">{u.hasAccess ? 'Paid' : 'No'}</td><td className="p-3">{u.applications}</td><td className="p-3">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager data={data} goto={f.goto} />
    </>
  );
}

export function AdminInternDetail() {
  const { id } = useParams();
  const [v, setV] = useState(0);
  const { data, loading, error } = useApi(`/admin/interns/${id}`, undefined, String(v));
  const [msg, setMsg] = useState({ ok: '', error: '' });
  if (loading && !data) return <p className="text-slate2">Loading…</p>;
  if (error && !data) return <Notice kind="error">{error.message}</Notice>;
  const u = data.intern;
  const act = async (path, ok, confirm) => {
    if (confirm && !window.confirm(confirm)) return;
    setMsg({ ok: '', error: '' });
    try { await api(`/admin/interns/${id}/${path}`, { method: 'POST' }); setMsg({ ok, error: '' }); setV((x) => x + 1); } catch (e) { setMsg({ ok: '', error: e.message }); }
  };
  return (
    <div className="max-w-4xl space-y-6">
      <Link to="/dashboard/admin/interns" className="text-sm font-semibold text-brand hover:underline">All interns</Link>
      <Heading right={<Pill cls={US[u.status][1]}>{US[u.status][0]}</Pill>} sub={`${u.email} · joined ${fmtDate(u.createdAt)}${u.lastLoginAt ? ` · last sign-in ${fmtDateTime(u.lastLoginAt)}` : ''}`}>{u.name}</Heading>
      <Notice>{msg.ok}</Notice><Notice kind="error">{msg.error}</Notice>
      <div className="flex gap-3">
        {u.status === 'suspended'
          ? <button className="btn-primary" onClick={() => act('reactivate', 'Account reactivated.')}>Reactivate account</button>
          : <button className="btn-outline text-red-600" onClick={() => act('suspend', 'Account suspended and signed out.', `Suspend ${u.name}? They will be signed out and unable to sign in.`)}>Suspend account</button>}
      </div>
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-bold">Profile ({u.completion}% complete)</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {[['Phone', u.phone], ['County', u.county], ['Institution', u.institution], ['Course', u.course], ['Qualification', u.qualification], ['Graduation year', u.graduationYear], ['Preferred county', u.preferredCounty], ['Application access', u.accessActivatedAt ? `Active since ${fmtDate(u.accessActivatedAt)}` : 'Not activated']].map(([k, val]) => <div key={k}><dt className="text-xs text-slate2">{k}</dt><dd className="font-medium">{val || '–'}</dd></div>)}
        </dl>
        {u.skills?.length > 0 && <p className="mt-3 text-sm text-slate2">Skills: {u.skills.join(', ')}</p>}
      </section>
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-bold">Payment history</h2>
        {data.payments.length === 0 ? <p className="mt-2 text-sm text-slate2">No payments.</p> : (
          <ul className="mt-3 divide-y divide-line text-sm">{data.payments.map((p) => <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2"><span>KSh {p.amount} · {fmtDateTime(p.transactionDate || p.createdAt)} · <span className="font-mono text-xs">{p.mpesaReceipt || 'no code'}</span></span><Pill>{p.status}</Pill></li>)}</ul>
        )}
      </section>
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-bold">Application activity</h2>
        {data.applications.length === 0 ? <p className="mt-2 text-sm text-slate2">No applications.</p> : (
          <ul className="mt-3 divide-y divide-line text-sm">{data.applications.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span><strong>{a.title}</strong> <span className="text-slate2">at {a.companyName} · {fmtDate(a.submittedAt)}</span></span><Pill cls={STATUS[a.status][1]}>{STATUS[a.status][0]}</Pill></li>)}</ul>
        )}
      </section>
    </div>
  );
}
