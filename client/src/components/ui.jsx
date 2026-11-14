import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/** URL-driven list filters: params in the query string, page resets when a filter changes. */
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const set = (k, v) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); n.delete('page'); setParams(n); };
  const goto = (p) => { const n = new URLSearchParams(params); n.set('page', p); setParams(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return { q: Object.fromEntries(params), set, goto, key: params.toString(), clear: () => setParams({}) };
}

export function Pager({ data, goto }) {
  if (!data || data.pages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button className="btn-outline" disabled={data.page <= 1} onClick={() => goto(data.page - 1)}>Previous</button>
      <span className="text-sm text-slate2">Page {data.page} of {data.pages} ({data.total} total)</span>
      <button className="btn-outline" disabled={data.page >= data.pages} onClick={() => goto(data.page + 1)}>Next</button>
    </div>
  );
}

export const Pill = ({ children, cls = 'bg-paper text-slate2' }) => <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
export const Heading = ({ children, sub, right }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold">{children}</h1>{sub && <p className="mt-1 text-slate2">{sub}</p>}</div>{right}</div>
);
export const Notice = ({ kind = 'ok', children }) => children ? (
  <p role={kind === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-lg p-3 text-sm font-medium ${kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'}`}>{children}</p>
) : null;

/** Text box that applies on Enter or blur, so every keystroke does not hit the API. */
export function SearchBox({ value, onCommit, placeholder, label = 'Search' }) {
  const [v, setV] = useState(value || '');
  useEffect(() => setV(value || ''), [value]);
  const commit = () => v.trim() !== (value || '') && onCommit(v.trim());
  return <input className="input" aria-label={label} placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit()} onBlur={commit} />;
}

/** Native <dialog> that collects a required reason. */
export function ReasonDialog({ open, title, confirmLabel = 'Confirm', danger = false, onSubmit, onCancel }) {
  const ref = useRef(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) { setReason(''); setErr(''); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await onSubmit(reason); } catch (x) { setErr(x.fields?.reason || x.message); } finally { setBusy(false); }
  }
  return (
    <dialog ref={ref} onCancel={onCancel} className="w-full max-w-md rounded-2xl border border-line p-0 backdrop:bg-ink/50">
      <form onSubmit={go} className="space-y-4 p-6">
        <h2 className="text-lg font-bold">{title}</h2>
        <label className="block text-sm font-semibold" htmlFor="reason-text">Reason</label>
        <textarea id="reason-text" rows={4} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="This is recorded and shown to the company." />
        {err && <p role="alert" className="text-sm font-medium text-red-600">{err}</p>}
        <div className="flex justify-end gap-3"><button type="button" className="btn-outline" onClick={onCancel}>Cancel</button><button className={danger ? 'btn bg-red-600 text-white hover:bg-red-700' : 'btn-primary'} disabled={busy}>{busy ? 'Saving…' : confirmLabel}</button></div>
      </form>
    </dialog>
  );
}
