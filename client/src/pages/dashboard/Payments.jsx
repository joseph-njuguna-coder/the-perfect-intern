import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../lib/useApi.js';
import { fmtDateTime } from '../../lib/format.js';

const BADGE = {
  success: ['Successful', 'bg-brand-50 text-brand-700'], pending: ['Pending', 'bg-gold-50 text-gold-700'],
  failed: ['Failed', 'bg-red-50 text-red-700'], cancelled: ['Cancelled', 'bg-paper text-slate2'],
};

export function Payments() {
  const { data, loading, error } = useApi('/payments');
  const items = data?.items || [];
  return (
    <>
      <div className="mb-6"><h1 className="text-3xl font-extrabold">Payments</h1><p className="mt-1 text-slate2">Your application-access payment history.</p></div>
      {loading && <p className="text-slate2">Loading…</p>}
      {error && <p role="alert" className="text-red-600">{error.message}</p>}
      {data && !items.length && (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center"><p className="font-display text-lg font-bold">No payments yet</p><p className="mt-1 text-sm text-slate2">You pay once, when you first apply to an internship.</p><Link to="/internships" className="btn-primary mt-5">Browse internships</Link></div>
      )}
      {items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-slate2"><tr><th className="p-3">Date</th><th className="p-3">Amount</th><th className="p-3">M-Pesa code</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Receipt</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {items.map((p) => {
                const [label, cls] = BADGE[p.status];
                return (
                  <tr key={p.id}>
                    <td className="p-3">{fmtDateTime(p.transactionDate || p.createdAt)}</td>
                    <td className="p-3">KSh {p.amount.toLocaleString('en-KE')}</td>
                    <td className="p-3 font-mono text-xs">{p.mpesaReceipt || '–'}</td>
                    <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>{p.status === 'failed' && p.resultDesc && <span className="mt-1 block max-w-[16rem] text-xs text-slate2">{p.resultDesc}</span>}</td>
                    <td className="p-3">{p.status === 'success' && <Link to={`/dashboard/payments/${p.id}`} className="text-xs font-semibold text-brand underline">Receipt</Link>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function Receipt({ admin = false }) {
  const { id } = useParams();
  const { data, loading, error } = useApi(admin ? `/admin/payments/${id}/receipt` : `/payments/${id}/receipt`);
  if (loading) return <p className="text-slate2">Loading…</p>;
  if (error) return <p role="alert" className="text-red-600">{error.message}</p>;
  const r = data.receipt;
  const rows = [['Receipt number', r.receiptNumber], ['M-Pesa transaction code', r.mpesaReceipt || 'Pending from Safaricom'], ['Date', fmtDateTime(r.transactionDate || r.createdAt)], ['Paid by', r.payer.name], ['Email', r.payer.email], ['M-Pesa number', r.phone], ['Description', r.description]];
  return (
    <div className="max-w-xl">
      <div className="mb-4 flex gap-3 print:hidden"><Link to={admin ? '/dashboard/admin/finance' : '/dashboard/payments'} className="btn-outline">{admin ? 'Back to finance' : 'Back to payments'}</Link><button className="btn-primary" onClick={() => window.print()}>Print or save as PDF</button></div>
      <article className="rounded-2xl border border-line bg-white p-8 print:border-0 print:p-0">
        <div className="flex items-center gap-3"><img src="/logo-mark.png" alt="" width="44" height="44" /><p className="font-display text-xl font-extrabold">The Perfect Intern</p></div>
        <h1 className="mt-6 text-2xl font-extrabold">Payment receipt</h1>
        <p className="font-display text-4xl font-extrabold text-brand">KSh {r.amount.toLocaleString('en-KE')}</p>
        <dl className="mt-6 divide-y divide-line text-sm">
          {rows.map(([k, v]) => (<div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-slate2">{k}</dt><dd className="text-right font-semibold break-all">{v}</dd></div>))}
        </dl>
        <p className="mt-6 rounded-lg bg-paper p-3 text-xs text-slate2">{r.note}</p>
      </article>
    </div>
  );
}
