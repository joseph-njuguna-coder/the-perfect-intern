import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useApi } from '../../../lib/useApi.js';
import { fmtDate } from '../../../lib/format.js';
import { useFilters, Pager, Pill, Heading, Notice, SearchBox, ReasonDialog } from '../../../components/ui.jsx';
import Field from '../../../components/Field.jsx';

export const COMPANY_BADGE = { pending: ['Pending', 'bg-gold-50 text-gold-700'], approved: ['Approved', 'bg-brand-50 text-brand-700'], rejected: ['Rejected', 'bg-red-50 text-red-700'], suspended: ['Suspended', 'bg-red-50 text-red-700'] };
const DOC = { certificate_of_incorporation: 'Certificate of incorporation', kra_pin: 'KRA PIN', business_permit: 'Business permit', cr12: 'CR12', other: 'Other' };

export function AdminCompanies() {
  const f = useFilters();
  const { data, loading, error } = useApi('/admin/companies', { ...f.q, limit: 20 }, f.key);
  return (
    <>
      <Heading sub="Companies must be approved before their listings are visible.">Companies</Heading>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <SearchBox value={f.q.q} onCommit={(v) => f.set('q', v)} placeholder="Search by company name or email" />
        <select className="input" aria-label="Approval status" value={f.q.approvalStatus || ''} onChange={(e) => f.set('approvalStatus', e.target.value)}>
          <option value="">All statuses</option>{Object.entries(COMPANY_BADGE).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {error && <Notice kind="error">{error.message}</Notice>}{loading && <p className="text-slate2">Loading…</p>}
      {data && !data.items.length && <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-slate2">No companies match.</p>}
      {data?.items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-slate2"><tr><th className="p-3">Company</th><th className="p-3">Status</th><th className="p-3">Documents</th><th className="p-3">Listings</th><th className="p-3">Registered</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td className="p-3"><Link className="font-bold hover:text-brand hover:underline" to={`/dashboard/admin/companies/${c.id}`}>{c.name}</Link><br /><span className="text-xs text-slate2">{c.email} · {c.county || 'No county'}</span></td>
                  <td className="p-3"><Pill cls={COMPANY_BADGE[c.approvalStatus][1]}>{COMPANY_BADGE[c.approvalStatus][0]}</Pill></td>
                  <td className="p-3">{c.verifiedDocuments}/{c.documents} verified</td><td className="p-3">{c.internships}</td><td className="p-3">{fmtDate(c.createdAt)}</td>
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

export function AdminCompanyDetail() {
  const { id } = useParams();
  const [version, setVersion] = useState(0);
  const { data: d, loading, error } = useApi(`/admin/companies/${id}`, undefined, String(version));
  const [dialog, setDialog] = useState(null);
  const [msg, setMsg] = useState({ ok: '', error: '' });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const counties = useApi('/public/counties');
  if (loading && !d) return <p className="text-slate2">Loading…</p>;
  if (error && !d) return <Notice kind="error">{error.message}</Notice>;
  if (!d) return null;
  const c = d.company;
  const reload = () => setVersion((v) => v + 1);
  const run = async (fn, ok) => { setMsg({ ok: '', error: '' }); try { await fn(); setMsg({ ok, error: '' }); reload(); } catch (e) { setMsg({ ok: '', error: e.message }); } };
  const [label, cls] = COMPANY_BADGE[c.approvalStatus];
  const unverified = d.documents.length === 0;

  return (
    <div className="max-w-4xl space-y-6">
      <Link to="/dashboard/admin/companies" className="text-sm font-semibold text-brand hover:underline">All companies</Link>
      <Heading right={<Pill cls={cls}>{label}</Pill>} sub={`${c.industry || 'No industry'} · ${c.county || 'No county'} · registered ${fmtDate(c.createdAt)}`}>{c.name}</Heading>
      <Notice>{msg.ok}</Notice><Notice kind="error">{msg.error}</Notice>
      {c.rejectionReason && <p className="rounded-lg bg-paper p-3 text-sm text-slate2">Reason on record: {c.rejectionReason}</p>}

      <section className="flex flex-wrap gap-3 rounded-xl border border-line bg-white p-4">
        {c.approvalStatus !== 'approved' && <button className="btn-primary" onClick={() => window.confirm(unverified ? 'This company has uploaded no verification documents. Approve anyway?' : 'Approve this company?') && run(() => api(`/admin/companies/${id}/approve`, { method: 'POST' }), 'Company approved and notified.')}>{c.approvalStatus === 'pending' ? 'Approve' : 'Reinstate and approve'}</button>}
        {c.approvalStatus !== 'rejected' && <button className="btn-outline" onClick={() => setDialog('reject')}>Reject</button>}
        {c.approvalStatus === 'approved' && <button className="btn-outline text-red-600" onClick={() => setDialog('suspend')}>Suspend</button>}
        <button className="btn-outline" onClick={() => { setForm({ companyName: c.name, phone: c.phone || '', address: c.address || '', county: c.county || '', industry: c.industry || '', website: c.website || '', description: c.description || '' }); setEditing(!editing); }}>{editing ? 'Cancel edit' : 'Edit profile'}</button>
      </section>

      {editing && form && (
        <form className="space-y-4 rounded-xl border border-line bg-white p-5" onSubmit={(e) => { e.preventDefault(); run(async () => { await api(`/admin/companies/${id}`, { method: 'PUT', body: form }); setEditing(false); }, 'Profile updated.'); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" name="companyName" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            <Field label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Field label="Address" name="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Field as="select" label="County" name="county" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })}><option value="">None</option>{(counties.data?.counties || []).map((x) => <option key={x}>{x}</option>)}</Field>
            <Field label="Industry" name="industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            <Field label="Website" name="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
          <Field as="textarea" rows={4} label="Description" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button className="btn-primary">Save changes</button>
        </form>
      )}

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-bold">Details</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {[['Email', c.email], ['Phone', c.phone], ['Address', c.address], ['Website', c.website], ['Registration number', c.registrationNumber]].map(([k, v]) => <div key={k}><dt className="text-xs text-slate2">{k}</dt><dd className="font-medium break-words">{v || '–'}</dd></div>)}
        </dl>
        {c.description && <p className="mt-4 whitespace-pre-line text-sm text-slate2">{c.description}</p>}
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-bold">Verification documents</h2>
        {d.documents.length === 0 ? <p className="mt-2 text-sm text-slate2">No documents uploaded.</p> : (
          <ul className="mt-3 divide-y divide-line">
            {d.documents.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span><strong>{DOC[x.docType]}</strong> <span className="text-slate2">{x.originalName} · {fmtDate(x.createdAt)}</span></span>
                <span className="flex items-center gap-3">
                  <Pill cls={x.verified ? 'bg-brand-50 text-brand-700' : undefined}>{x.verified ? 'Verified' : 'Unverified'}</Pill>
                  <a className="font-semibold text-brand underline" href={`/api/admin/companies/${id}/documents/${x.id}/file`}>Download</a>
                  <button className="font-semibold underline" onClick={() => run(() => api(`/admin/companies/${id}/documents/${x.id}/verify`, { method: 'POST', body: { verified: !x.verified } }), x.verified ? 'Verification removed.' : 'Document verified.')}>{x.verified ? 'Unverify' : 'Verify'}</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-bold">Internships ({d.internships.length})</h2>
        {d.internships.length === 0 ? <p className="mt-2 text-sm text-slate2">None posted.</p> : <ul className="mt-3 divide-y divide-line text-sm">{d.internships.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.title}</span><span className="text-slate2">{i.status.replace('_', ' ')} · {fmtDate(i.deadline)}</span></li>)}</ul>}
        <Link to={`/dashboard/admin/internships?companyId=${id}`} className="mt-3 inline-block text-sm font-semibold text-brand underline">Manage in internships</Link>
      </section>

      <ReasonDialog open={dialog === 'reject'} title="Reject company" confirmLabel="Reject" danger onCancel={() => setDialog(null)} onSubmit={async (reason) => { await api(`/admin/companies/${id}/reject`, { method: 'POST', body: { reason } }); setDialog(null); setMsg({ ok: 'Company rejected and notified.', error: '' }); reload(); }} />
      <ReasonDialog open={dialog === 'suspend'} title="Suspend company" confirmLabel="Suspend" danger onCancel={() => setDialog(null)} onSubmit={async (reason) => { await api(`/admin/companies/${id}/suspend`, { method: 'POST', body: { reason } }); setDialog(null); setMsg({ ok: 'Company suspended. Its listings are hidden.', error: '' }); reload(); }} />
    </div>
  );
}
