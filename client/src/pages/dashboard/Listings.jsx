import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { fmtDate } from '../../lib/format.js';
import Field from '../../components/Field.jsx';
import { TagInput } from './Profile.jsx';

function statusBadge(i) {
  if (i.status === 'approved') return i.expired ? ['Expired', 'bg-paper text-slate2'] : ['Live', 'bg-brand-50 text-brand-700'];
  return {
    pending_approval: ['Pending approval', 'bg-gold-50 text-gold-700'],
    rejected: ['Rejected', 'bg-red-50 text-red-700'],
    closed: ['Closed', 'bg-paper text-slate2'],
    draft: ['Draft', 'bg-paper text-slate2'],
  }[i.status];
}

export function Listings() {
  const location = useLocation();
  const { data, loading, error } = useApi('/company/internships');
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState(location.state?.msg || '');
  const [err, setErr] = useState('');
  useEffect(() => { if (data) setItems(data.items); }, [data]);
  const reload = () => api('/company/internships').then((d) => setItems(d.items));

  async function act(fn, success) {
    setErr(''); setMsg('');
    try { await fn(); await reload(); setMsg(success); } catch (e) { setErr(e.message); }
  }
  const close = (i) => window.confirm(`Close "${i.title}"? Interns will no longer be able to apply.`) && act(() => api(`/company/internships/${i.id}/close`, { method: 'POST' }), 'Listing closed.');
  const remove = (i) => window.confirm(`Delete "${i.title}"? This cannot be undone.`) && act(() => api(`/company/internships/${i.id}`, { method: 'DELETE' }), 'Listing deleted.');

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold">My internships</h1><p className="mt-1 text-slate2">New and edited listings are reviewed before they go live.</p></div>
        <Link to="/dashboard/listings/new" className="btn-primary">Post an internship</Link>
      </div>
      {msg && <p role="status" className="mb-4 rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-700">{msg}</p>}
      {(err || error) && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{err || error.message}</p>}
      {loading && <p className="text-slate2">Loading…</p>}
      {items?.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-display text-lg font-bold">No internships posted yet</p>
          <p className="mt-1 text-sm text-slate2">Post your first listing to start receiving applications.</p>
          <Link to="/dashboard/listings/new" className="btn-primary mt-5">Post an internship</Link>
        </div>
      )}
      {items?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-slate2"><tr><th className="p-3">Internship</th><th className="p-3">Status</th><th className="p-3">Deadline</th><th className="p-3">Applicants</th><th className="p-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-line">
              {items.map((i) => {
                const [label, cls] = statusBadge(i);
                return (
                  <tr key={i.id} className="align-top">
                    <td className="p-3"><strong>{i.title}</strong><br /><span className="text-xs text-slate2">{i.reference} · {i.category}</span></td>
                    <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>{i.status === 'rejected' && i.rejectionReason && <span className="mt-1 block max-w-[14rem] text-xs text-slate2">{i.rejectionReason}</span>}</td>
                    <td className="p-3">{fmtDate(i.deadline)}</td>
                    <td className="p-3">{i.applicants > 0 ? <Link className="font-semibold text-brand underline" to={`/dashboard/applicants?internshipId=${i.id}`}>{i.applicants}</Link> : 0}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-3 text-xs font-semibold">
                        {i.status !== 'closed' && <Link className="text-brand underline" to={`/dashboard/listings/${i.id}/edit`}>Edit</Link>}
                        {i.status !== 'closed' && <button className="text-ink underline" onClick={() => close(i)}>Close</button>}
                        {i.applicants === 0 && <button className="text-red-600 underline" onClick={() => remove(i)}>Delete</button>}
                      </div>
                    </td>
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

const EMPTY = { title: '', department: '', categoryId: '', description: '', responsibilities: '', qualifications: '', skills: [], positions: 1, county: '', location: '', workArrangement: '', durationMonths: 3, startDate: '', deadline: '', isPaid: false, stipendAmount: '', additionalRequirements: '' };

export function ListingForm({ admin = false }) {
  const base = admin ? '/admin/internships' : '/company/internships';
  const home = admin ? '/dashboard/admin/internships' : '/dashboard/listings';
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const cats = useApi('/public/categories');
  const counties = useApi('/public/counties');
  const existing = useApi(editing ? `${base}/${id}` : '/public/settings');
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState(null);
  const [st, setSt] = useState({ busy: false, error: '', fields: {} });

  useEffect(() => {
    if (!editing || !existing.data) return;
    const i = existing.data.internship;
    setStatus(i.status);
    setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(i).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])), skills: i.skills || [], isPaid: i.isPaid, stipendAmount: i.stipendAmount ? Number(i.stipendAmount) : '' });
  }, [editing, existing.data]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const f = st.fields;

  async function submit(e) {
    e.preventDefault();
    setSt({ busy: true, error: '', fields: {} });
    try {
      const d = await api(editing ? `${base}/${id}` : base, { method: editing ? 'PUT' : 'POST', body: form });
      navigate(home, { state: { msg: editing ? (d.resubmitted ? 'Changes saved. The listing is back in review and will go live once approved.' : 'Changes saved.') : 'Internship submitted. It will go live once an administrator approves it.' } });
    } catch (err) {
      setSt({ busy: false, error: Object.keys(err.fields || {}).length ? 'Please correct the highlighted fields.' : err.message, fields: err.fields || {} });
    }
  }

  if (editing && existing.loading) return <p className="text-slate2">Loading…</p>;
  if (editing && existing.error) return <p role="alert" className="text-red-600">{existing.error.message}</p>;

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-5" noValidate>
      <div>
        <h1 className="text-3xl font-extrabold">{editing ? 'Edit internship' : 'Post an internship'}</h1>
        {editing && !admin && ['approved', 'rejected'].includes(status) && <p className="mt-2 rounded-lg bg-gold-50 p-3 text-sm">Saving changes sends this listing back for approval, and it will not be visible to interns until it is approved again.</p>}
      </div>
      <section className="space-y-4 rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-bold">Role</h2>
        <Field label="Internship title" name="title" value={form.title} onChange={set('title')} error={f.title} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department (optional)" name="department" value={form.department} onChange={set('department')} error={f.department} />
          <Field as="select" label="Category" name="categoryId" value={form.categoryId} onChange={set('categoryId')} error={f.categoryId}>
            <option value="">Select category</option>{(cats.data?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Field>
        </div>
        <Field as="textarea" rows={5} label="Description" name="description" value={form.description} onChange={set('description')} error={f.description} />
        <Field as="textarea" rows={4} label="Responsibilities" name="responsibilities" value={form.responsibilities} onChange={set('responsibilities')} error={f.responsibilities} />
        <Field as="textarea" rows={3} label="Required qualifications" name="qualifications" value={form.qualifications} onChange={set('qualifications')} error={f.qualifications} />
        <TagInput label="Required skills" value={form.skills} onChange={(skills) => setForm({ ...form, skills })} error={f.skills} hint="Separate with commas or press Enter" />
        <Field as="textarea" rows={3} label="Additional requirements (optional)" name="additionalRequirements" value={form.additionalRequirements} onChange={set('additionalRequirements')} error={f.additionalRequirements} />
      </section>
      <section className="space-y-4 rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-bold">Terms</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field as="select" label="Work arrangement" name="workArrangement" value={form.workArrangement} onChange={set('workArrangement')} error={f.workArrangement}>
            <option value="">Select</option><option value="physical">On site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option>
          </Field>
          <Field as="select" label="County" name="county" value={form.county} onChange={set('county')} error={f.county} hint={form.workArrangement === 'remote' ? 'Optional for remote roles' : undefined}>
            <option value="">Select county</option>{(counties.data?.counties || []).map((c) => <option key={c}>{c}</option>)}
          </Field>
          <Field label="Location details (optional)" name="location" value={form.location} onChange={set('location')} error={f.location} placeholder="e.g. Westlands, Nairobi" />
          <Field label="Number of positions" name="positions" type="number" min="1" value={form.positions} onChange={set('positions')} error={f.positions} />
          <Field label="Duration (months)" name="durationMonths" type="number" min="1" max="24" value={form.durationMonths} onChange={set('durationMonths')} error={f.durationMonths} />
          <Field label="Application deadline" name="deadline" type="date" value={form.deadline} onChange={set('deadline')} error={f.deadline} />
          <Field label="Start date (optional)" name="startDate" type="date" value={form.startDate} onChange={set('startDate')} error={f.startDate} />
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Compensation</legend>
          <div className="flex gap-6 text-sm">
            {[[false, 'Unpaid'], [true, 'Paid']].map(([v, l]) => (
              <label key={l} className="flex items-center gap-2"><input type="radio" name="isPaid" className="accent-brand" checked={form.isPaid === v} onChange={() => setForm({ ...form, isPaid: v, stipendAmount: v ? form.stipendAmount : '' })} />{l}</label>
            ))}
          </div>
        </fieldset>
        {form.isPaid && <Field label="Monthly stipend (KSh)" name="stipendAmount" type="number" min="1" value={form.stipendAmount} onChange={set('stipendAmount')} error={f.stipendAmount} />}
      </section>
      {st.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{st.error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" disabled={st.busy}>{st.busy ? 'Saving…' : editing ? 'Save changes' : 'Submit for approval'}</button>
        <Link to={home} className="btn-outline">Cancel</Link>
      </div>
    </form>
  );
}
