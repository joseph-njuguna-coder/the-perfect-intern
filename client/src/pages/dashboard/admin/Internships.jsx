import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useApi } from '../../../lib/useApi.js';
import { fmtDate } from '../../../lib/format.js';
import { useFilters, Pager, Pill, Heading, Notice, SearchBox, ReasonDialog } from '../../../components/ui.jsx';

const ST = {
  pending_approval: ['Pending', 'bg-gold-50 text-gold-700'], approved: ['Approved', 'bg-brand-50 text-brand-700'],
  rejected: ['Rejected', 'bg-red-50 text-red-700'], closed: ['Closed', 'bg-paper text-slate2'], draft: ['Draft', 'bg-paper text-slate2'],
};

export default function AdminInternships() {
  const f = useFilters();
  const [version, setVersion] = useState(0);
  const { data, loading, error } = useApi('/admin/internships', { ...f.q, limit: 20 }, `${f.key}|${version}`);
  const [dialog, setDialog] = useState(null); // { id, mode }
  const [msg, setMsg] = useState({ ok: '', error: '' });
  const reload = () => setVersion((v) => v + 1);
  const run = async (fn, ok) => { setMsg({ ok: '', error: '' }); try { const r = await fn(); setMsg({ ok: typeof ok === 'function' ? ok(r) : ok, error: '' }); reload(); } catch (e) { setMsg({ ok: '', error: e.message }); } };

  return (
    <>
      <Heading sub="Review submissions, feature the best, and remove anything inappropriate." right={<button className="btn-outline" onClick={() => window.confirm('Close every approved listing whose deadline has passed?') && run(() => api('/admin/internships/close-expired', { method: 'POST' }), (r) => `${r.closed} expired listing(s) closed.`)}>Close expired listings</button>}>Internships</Heading>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <SearchBox value={f.q.q} onCommit={(v) => f.set('q', v)} placeholder="Search by title, company or reference" />
        <select className="input" aria-label="Status" value={f.q.status || ''} onChange={(e) => f.set('status', e.target.value)}>
          <option value="">All statuses</option>{Object.entries(ST).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {f.q.companyId && <p className="mb-3 text-sm text-slate2">Filtered to one company. <button className="font-semibold text-brand underline" onClick={() => f.set('companyId', '')}>Clear</button></p>}
      <Notice>{msg.ok}</Notice><Notice kind="error">{msg.error || error?.message}</Notice>
      {loading && <p className="text-slate2">Loading…</p>}
      {data && !data.items.length && <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-slate2">No internships match.</p>}
      {data?.items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-slate2"><tr><th className="p-3">Internship</th><th className="p-3">Status</th><th className="p-3">Deadline</th><th className="p-3">Applicants</th><th className="p-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.items.map((i) => {
                const [label, cls] = ST[i.status];
                return (
                  <tr key={i.id} className="align-top">
                    <td className="p-3"><strong>{i.title}</strong>{i.isFeatured && <span className="ml-2 text-xs font-semibold text-gold-700">Featured</span>}<br /><span className="text-xs text-slate2">{i.companyName} · {i.reference}</span>
                      {i.companyStatus !== 'approved' && <span className="mt-1 block text-xs text-red-600">Company is {i.companyStatus}: not visible to interns</span>}</td>
                    <td className="p-3"><Pill cls={cls}>{i.expired ? 'Expired' : label}</Pill>{i.status === 'rejected' && i.rejectionReason && <span className="mt-1 block max-w-[14rem] text-xs text-slate2">{i.rejectionReason}</span>}</td>
                    <td className="p-3">{fmtDate(i.deadline)}</td><td className="p-3">{i.applicants}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                        {['pending_approval', 'rejected'].includes(i.status) && <button className="text-brand underline" onClick={() => run(() => api(`/admin/internships/${i.id}/approve`, { method: 'POST' }), 'Approved and the company was notified.')}>Approve</button>}
                        {['pending_approval', 'approved'].includes(i.status) && <button className="underline" onClick={() => setDialog({ id: i.id, mode: 'reject' })}>Reject</button>}
                        {i.status === 'approved' && <button className="underline" onClick={() => run(() => api(`/admin/internships/${i.id}/feature`, { method: 'POST', body: { featured: !i.isFeatured } }), i.isFeatured ? 'Removed from featured.' : 'Featured on the home page.')}>{i.isFeatured ? 'Unfeature' : 'Feature'}</button>}
                        <Link className="text-brand underline" to={`/dashboard/admin/internships/${i.id}/edit`}>Edit</Link>
                        <button className="text-red-600 underline" onClick={() => setDialog({ id: i.id, mode: 'remove' })}>Remove</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager data={data} goto={f.goto} />
      <ReasonDialog open={dialog?.mode === 'reject'} title="Reject internship" confirmLabel="Reject" danger onCancel={() => setDialog(null)} onSubmit={async (reason) => { await api(`/admin/internships/${dialog.id}/reject`, { method: 'POST', body: { reason } }); setDialog(null); setMsg({ ok: 'Rejected and the company was notified.', error: '' }); reload(); }} />
      <ReasonDialog open={dialog?.mode === 'remove'} title="Remove internship" confirmLabel="Remove" danger onCancel={() => setDialog(null)} onSubmit={async (reason) => { const r = await api(`/admin/internships/${dialog.id}`, { method: 'DELETE', body: { reason } }); setDialog(null); setMsg({ ok: r.mode === 'closed' ? 'Listing closed (it has applications, so its history is kept).' : 'Listing deleted.', error: '' }); reload(); }} />
    </>
  );
}
