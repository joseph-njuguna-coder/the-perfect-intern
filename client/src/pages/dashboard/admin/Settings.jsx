import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import { useApi } from '../../../lib/useApi.js';
import { fmtDateTime } from '../../../lib/format.js';
import { useFilters, Pager, Pill, Heading, Notice, SearchBox } from '../../../components/ui.jsx';
import Field from '../../../components/Field.jsx';

function PlatformSettings() {
  const { data } = useApi('/admin/settings');
  const [form, setForm] = useState(null);
  const [st, setSt] = useState({ busy: false, ok: '', error: '', fields: {} });
  useEffect(() => { if (data) setForm({ accessFee: data.settings.accessFee, minProfileCompletion: data.settings.minProfileCompletion }); }, [data]);
  if (!form) return null;
  async function save(e) {
    e.preventDefault();
    if (Number(form.accessFee) !== data.settings.accessFee && !window.confirm(`Change the application-access fee to KSh ${form.accessFee}? New payments will use this amount immediately.`)) return;
    setSt({ busy: true, ok: '', error: '', fields: {} });
    try { await api('/admin/settings', { method: 'PUT', body: form }); setSt({ busy: false, ok: 'Settings saved.', error: '', fields: {} }); }
    catch (err) { setSt({ busy: false, ok: '', error: Object.keys(err.fields || {}).length ? '' : err.message, fields: err.fields || {} }); }
  }
  return (
    <form onSubmit={save} className="max-w-xl space-y-4 rounded-2xl border border-line bg-white p-6" noValidate>
      <h2 className="text-lg font-bold">Payments and applications</h2>
      <Field label="Application-access fee (KSh)" name="accessFee" type="number" min="1" value={form.accessFee} onChange={(e) => setForm({ ...form, accessFee: e.target.value })} error={st.fields.accessFee} hint="Charged once per intern. Past payments are never changed." />
      <div><p className="mb-1.5 text-sm font-semibold">Payment model</p><p className="rounded-lg bg-paper px-3.5 py-2.5 text-sm">One-time payment (the only model currently supported)</p></div>
      <Field label="Minimum profile completion to apply (%)" name="minProfileCompletion" type="number" min="0" max="100" value={form.minProfileCompletion} onChange={(e) => setForm({ ...form, minProfileCompletion: e.target.value })} error={st.fields.minProfileCompletion} />
      <Notice>{st.ok}</Notice><Notice kind="error">{st.error}</Notice>
      <button className="btn-primary" disabled={st.busy}>{st.busy ? 'Saving…' : 'Save settings'}</button>
    </form>
  );
}

function Categories() {
  const [v, setV] = useState(0);
  const { data } = useApi('/admin/categories', undefined, String(v));
  const [name, setName] = useState('');
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState({ ok: '', error: '' });
  const run = async (fn, ok) => { setMsg({ ok: '', error: '' }); try { await fn(); setMsg({ ok, error: '' }); setV((x) => x + 1); } catch (e) { setMsg({ ok: '', error: e.fields?.name || e.message }); } };
  return (
    <section className="max-w-2xl rounded-2xl border border-line bg-white p-6">
      <h2 className="text-lg font-bold">Internship categories</h2>
      <form className="mt-4 flex gap-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await api('/admin/categories', { method: 'POST', body: { name } }); setName(''); }, 'Category added.'); }}>
        <input className="input" aria-label="New category name" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-primary">Add</button>
      </form>
      <div className="mt-3"><Notice>{msg.ok}</Notice><Notice kind="error">{msg.error}</Notice></div>
      <ul className="divide-y divide-line">
        {(data?.items || []).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            {edit?.id === c.id ? (
              <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); run(async () => { await api(`/admin/categories/${c.id}`, { method: 'PUT', body: { name: edit.name } }); setEdit(null); }, 'Category renamed.'); }}>
                <input className="input" aria-label="Category name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><button className="btn-primary py-2">Save</button><button type="button" className="btn-outline py-2" onClick={() => setEdit(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <span className={c.isActive ? '' : 'text-slate2 line-through'}>{c.name} <span className="text-xs text-slate2">({c.internships})</span></span>
                <span className="flex gap-3 text-xs font-semibold">
                  <button className="underline" onClick={() => setEdit({ id: c.id, name: c.name })}>Rename</button>
                  <button className="underline" onClick={() => run(() => api(`/admin/categories/${c.id}`, { method: 'PUT', body: { name: c.name, isActive: !c.isActive } }), c.isActive ? 'Category hidden from new listings.' : 'Category active.')}>{c.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button className="text-red-600 underline" onClick={() => window.confirm(`Delete "${c.name}"?`) && run(() => api(`/admin/categories/${c.id}`, { method: 'DELETE' }), 'Category deleted.')}>Delete</button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AdminSettings() {
  return (<><Heading sub="Fee, application rules and categories.">Platform settings</Heading><div className="space-y-8"><PlatformSettings /><Categories /></div></>);
}

export function AdminAudit() {
  const f = useFilters();
  const { data, loading, error } = useApi('/admin/audit', { ...f.q, limit: 30 }, f.key);
  return (
    <>
      <Heading sub="Every critical action, newest first.">Audit log</Heading>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <SearchBox label="Action" value={f.q.action} onCommit={(v) => f.set('action', v)} placeholder="Filter by action, e.g. payment. or admin.company" />
        <SearchBox label="Actor or entity" value={f.q.q} onCommit={(v) => f.set('q', v)} placeholder="Actor email or entity id" />
      </div>
      <Notice kind="error">{error?.message}</Notice>{loading && !data && <p className="text-slate2">Loading…</p>}
      {data?.items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line text-slate2"><tr><th className="p-3">When</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Detail</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.items.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="p-3 whitespace-nowrap">{fmtDateTime(a.createdAt)}</td><td className="p-3">{a.actor || 'system'}</td>
                  <td className="p-3"><Pill>{a.action}</Pill></td><td className="p-3">{a.entityType} {a.entityId}</td>
                  <td className="p-3 font-mono break-all text-slate2">{a.after ? JSON.stringify(a.after) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && !data.items.length && <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-slate2">No entries.</p>}
      <Pager data={data} goto={f.goto} />
    </>
  );
}
