import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../lib/useApi.js';
import InternshipCard from '../components/InternshipCard.jsx';

export default function Internships() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState(null);
  useEffect(() => {
    if (user?.role === 'intern') api('/intern/saved/ids').then((d) => setSavedIds(new Set(d.ids))).catch(() => {});
  }, [user]);
  async function toggleSave(id, isSaved) {
    try {
      await api(`/intern/saved/${id}`, { method: isSaved ? 'DELETE' : 'POST' });
      setSavedIds((s) => { const n = new Set(s); if (isSaved) n.delete(id); else n.add(id); return n; });
    } catch { /* leave state unchanged; the button stays as it was */ }
  }
  const query = Object.fromEntries(params);
  const page = Number(query.page || 1);
  const counties = useApi('/public/counties');
  const cats = useApi('/public/categories');
  const { data, loading, error } = useApi('/public/internships', { ...query, limit: 12 }, params.toString());

  const update = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    next.delete('page');
    setParams(next);
  };
  const goto = (p) => { const n = new URLSearchParams(params); n.set('page', p); setParams(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const hasFilters = [...params.keys()].some((k) => k !== 'page');

  return (
    <div className="container-x py-12">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Browse internships</h1>
      <p className="mt-2 text-slate2">Every listing here has been approved. Browsing is always free.</p>

      <div className="mt-8 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input sm:col-span-2 lg:col-span-4" placeholder="Search by title, keyword or company" aria-label="Search" defaultValue={query.q || ''} key={`q-${query.q || ''}`}
          onKeyDown={(e) => e.key === 'Enter' && update('q', e.currentTarget.value.trim())} onBlur={(e) => e.target.value.trim() !== (query.q || '') && update('q', e.target.value.trim())} />
        <select className="input" aria-label="County" value={query.county || ''} onChange={(e) => update('county', e.target.value)}>
          <option value="">Any county</option>{(counties.data?.counties || []).map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input" aria-label="Category" value={query.category || ''} onChange={(e) => update('category', e.target.value)}>
          <option value="">All categories</option>{(cats.data?.categories || []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="input" aria-label="Work arrangement" value={query.arrangement || ''} onChange={(e) => update('arrangement', e.target.value)}>
          <option value="">Any work style</option><option value="physical">On site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option>
        </select>
        <select className="input" aria-label="Pay" value={query.paid || ''} onChange={(e) => update('paid', e.target.value)}>
          <option value="">Paid or unpaid</option><option value="true">Paid</option><option value="false">Unpaid</option>
        </select>
        <select className="input" aria-label="Duration" value={query.maxDuration || ''} onChange={(e) => update('maxDuration', e.target.value)}>
          <option value="">Any duration</option><option value="3">Up to 3 months</option><option value="6">Up to 6 months</option><option value="12">Up to 12 months</option>
        </select>
        {hasFilters && <button className="btn-outline" onClick={() => setParams({})}>Clear filters</button>}
      </div>

      {error && <p role="alert" className="mt-8 text-red-600">{error.message}</p>}
      <p className="mt-6 text-sm text-slate2" aria-live="polite">{loading ? 'Loading…' : `${data?.total ?? 0} internships found`}</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.items || []).map((it) => <InternshipCard key={it.id} item={it} saved={savedIds?.has(it.id)} onToggleSave={savedIds ? toggleSave : undefined} />)}
      </div>
      {!loading && data && data.total === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-display text-lg font-bold">No internships match those filters</p>
          <p className="mt-1 text-sm text-slate2">Try a different county or category, or clear the filters.</p>
        </div>
      )}
      {data && data.pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button className="btn-outline" disabled={page <= 1} onClick={() => goto(page - 1)}>Previous</button>
          <span className="text-sm text-slate2">Page {page} of {data.pages}</span>
          <button className="btn-outline" disabled={page >= data.pages} onClick={() => goto(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
