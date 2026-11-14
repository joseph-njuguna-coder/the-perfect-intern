import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useApi } from '../../../lib/useApi.js';
import { fmtDateTime } from '../../../lib/format.js';
import { useFilters, Pager, Pill, Heading, Notice, SearchBox } from '../../../components/ui.jsx';
import { RevenueCharts } from './Analytics.jsx';

const PB = { success: 'bg-brand-50 text-brand-700', pending: 'bg-gold-50 text-gold-700', failed: 'bg-red-50 text-red-700', cancelled: 'bg-paper text-slate2' };

function Details({ id }) {
  const { data, loading, error } = useApi(`/admin/payments/${id}`);
  if (loading) return <p className="text-sm text-slate2">Loading…</p>;
  if (error) return <Notice kind="error">{error.message}</Notice>;
  const p = data.payment;
  return (
    <div className="grid gap-4 text-xs md:grid-cols-2">
      <dl className="grid grid-cols-2 gap-2">
        {[['Checkout request ID', p.checkoutRequestId], ['Merchant request ID', p.merchantRequestId], ['Result code', p.resultCode ?? 'none'], ['Result', p.resultDesc]].map(([k, v]) => <div key={k}><dt className="text-slate2">{k}</dt><dd className="font-mono break-all">{v || '–'}</dd></div>)}
      </dl>
      <div><p className="text-slate2">Audit trail</p>
        <ul className="mt-1 space-y-1">{data.trail.map((t, i) => <li key={i}><span className="font-semibold">{t.action}</span> <span className="text-slate2">{fmtDateTime(t.createdAt)}</span></li>)}</ul>
      </div>
    </div>
  );
}

export default function AdminFinance() {
  const f = useFilters();
  const { data, loading, error } = useApi('/admin/payments', { ...f.q, limit: 20 }, f.key);
  const [open, setOpen] = useState(null);
  const exportQs = new URLSearchParams(Object.entries(f.q).filter(([k, v]) => v && ['q', 'status', 'from', 'to'].includes(k))).toString();
  return (
    <>
      <Heading sub="Every transaction is recorded and auditable." right={<a className="btn-primary" href={`/api/admin/payments/export.csv${exportQs ? `?${exportQs}` : ''}`}>Export CSV</a>}>Finance</Heading>
      <div className="mb-6"><RevenueCharts /></div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2"><SearchBox value={f.q.q} onCommit={(v) => f.set('q', v)} placeholder="Search M-Pesa code, receipt, phone, name or email" /></div>
        <select className="input" aria-label="Status" value={f.q.status || ''} onChange={(e) => f.set('status', e.target.value)}>
          <option value="">All statuses</option>{['success', 'pending', 'failed', 'cancelled'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" className="input" aria-label="From date" value={f.q.from || ''} onChange={(e) => f.set('from', e.target.value)} />
          <input type="date" className="input" aria-label="To date" value={f.q.to || ''} onChange={(e) => f.set('to', e.target.value)} />
        </div>
      </div>
      {data && <p className="mb-3 text-sm text-slate2">Matching filters: <strong className="text-ink">KSh {Number(data.totals.revenue).toLocaleString('en-KE')}</strong> from {data.totals.successful} successful payment(s), {data.total} transaction(s) total.</p>}
      <Notice kind="error">{error?.message}</Notice>{loading && !data && <p className="text-slate2">Loading…</p>}
      {data && !data.items.length && <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-slate2">No transactions match.</p>}
      {data?.items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-slate2"><tr><th className="p-3">Date</th><th className="p-3">Intern</th><th className="p-3">Amount</th><th className="p-3">M-Pesa code</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.items.map((p) => (
                <Fragment key={p.id}>
                  <tr>
                    <td className="p-3">{fmtDateTime(p.transactionDate || p.createdAt)}</td>
                    <td className="p-3"><Link className="font-semibold hover:text-brand hover:underline" to={`/dashboard/admin/interns/${p.userId}`}>{p.name}</Link><br /><span className="text-xs text-slate2">{p.phone}</span></td>
                    <td className="p-3">KSh {p.amount.toLocaleString('en-KE')}</td><td className="p-3 font-mono text-xs">{p.mpesaReceipt || '–'}</td>
                    <td className="p-3"><Pill cls={PB[p.status]}>{p.status}</Pill></td>
                    <td className="p-3"><div className="flex gap-3 text-xs font-semibold"><button className="underline" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>Details</button>{p.status === 'success' && <Link className="text-brand underline" to={`/dashboard/admin/finance/${p.id}`}>Receipt</Link>}</div></td>
                  </tr>
                  {open === p.id && <tr className="bg-paper"><td colSpan={6} className="p-4"><Details id={p.id} /></td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager data={data} goto={f.goto} />
    </>
  );
}
