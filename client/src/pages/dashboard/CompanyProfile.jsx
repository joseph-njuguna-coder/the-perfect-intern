import { useEffect, useState } from 'react';
import { api, upload } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { fmtDate } from '../../lib/format.js';
import Field from '../../components/Field.jsx';

const DOC_LABELS = {
  certificate_of_incorporation: 'Certificate of incorporation', kra_pin: 'KRA PIN certificate',
  business_permit: 'Business permit', cr12: 'CR12', other: 'Other supporting document',
};

function Documents() {
  const { data, loading } = useApi('/company/documents');
  const [items, setItems] = useState(null);
  const [docType, setDocType] = useState('');
  const [st, setSt] = useState({ busy: false, error: '' });
  useEffect(() => { if (data) setItems(data.items); }, [data]);
  const reload = () => api('/company/documents').then((d) => setItems(d.items));

  async function add(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!docType) { setSt({ busy: false, error: 'Select the document type first.' }); return; }
    setSt({ busy: true, error: '' });
    try {
      const body = new FormData();
      body.append('docType', docType); body.append('file', file);
      // Text fields must precede the file so the server can read them; upload() only sends the file, so use fetch directly here.
      const csrf = (await (await fetch('/api/csrf', { credentials: 'include' })).json()).token;
      const res = await fetch('/api/company/documents', { method: 'POST', credentials: 'include', headers: { 'x-csrf-token': csrf }, body });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out?.error?.fields?.docType || out?.error?.message || 'Upload failed.');
      await reload(); setSt({ busy: false, error: '' }); setDocType('');
    } catch (err) { setSt({ busy: false, error: err.message }); }
  }
  async function remove(id) {
    try { await api(`/company/documents/${id}`, { method: 'DELETE' }); await reload(); }
    catch (err) { setSt({ busy: false, error: err.message }); }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <h2 className="text-lg font-bold">Verification documents</h2>
      <p className="mt-1 text-sm text-slate2">PDF, JPG, PNG or WebP, up to 5 MB each. Administrators review these before approving your company. Only you and administrators can see them.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="docType" className="mb-1.5 block text-sm font-semibold">Document type</label>
          <select id="docType" className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
            <option value="">Select type</option>{Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <label className="btn-outline cursor-pointer">{st.busy ? 'Uploading…' : 'Choose file'}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={add} disabled={st.busy} /></label>
      </div>
      {st.error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{st.error}</p>}
      {loading && <p className="mt-4 text-sm text-slate2">Loading…</p>}
      {items?.length === 0 && <p className="mt-4 text-sm text-slate2">No documents uploaded yet.</p>}
      {items?.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {items.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span><strong>{DOC_LABELS[d.docType]}</strong> <span className="text-slate2">{d.originalName} · {fmtDate(d.createdAt)}</span></span>
              <span className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${d.verified ? 'bg-brand-50 text-brand-700' : 'bg-paper text-slate2'}`}>{d.verified ? 'Verified' : 'Awaiting review'}</span>
                <a className="font-semibold text-brand underline" href={`/api/company/documents/${d.id}/file`}>Download</a>
                {!d.verified && <button className="font-semibold text-red-600 hover:underline" onClick={() => remove(d.id)}>Delete</button>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function CompanyProfile() {
  const { data, loading, error } = useApi('/company/profile');
  const cats = useApi('/public/categories');
  const counties = useApi('/public/counties');
  const [form, setForm] = useState(null);
  const [hasLogo, setHasLogo] = useState(false);
  const [logoKey, setLogoKey] = useState(0);
  const [st, setSt] = useState({ busy: false, msg: '', error: '', fields: {} });
  const [logoErr, setLogoErr] = useState('');

  useEffect(() => {
    if (!data) return;
    const c = data.company;
    setForm({ companyName: c.companyName || '', officialEmail: c.officialEmail || '', phone: c.phone || '', address: c.address || '', county: c.county || '', industry: c.industry || '', website: c.website || '', description: c.description || '', registrationNumber: c.registrationNumber || '' });
    setHasLogo(c.hasLogo);
  }, [data]);
  if (loading || !form) return <p className="text-slate2">{error ? error.message : 'Loading…'}</p>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const f = st.fields;

  async function save(e) {
    e.preventDefault();
    setSt({ busy: true, msg: '', error: '', fields: {} });
    try { await api('/company/profile', { method: 'PUT', body: form }); setSt({ busy: false, msg: 'Company profile saved.', error: '', fields: {} }); }
    catch (err) { setSt({ busy: false, msg: '', error: Object.keys(err.fields || {}).length ? 'Please correct the highlighted fields.' : err.message, fields: err.fields || {} }); }
  }
  async function logo(e) {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    setLogoErr('');
    try { await upload('/company/logo', file); setHasLogo(true); setLogoKey((k) => k + 1); } catch (err) { setLogoErr(err.message); }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-extrabold">Company profile</h1>
      <section className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5">
        {hasLogo ? <img src={`/api/company/logo?v=${logoKey}`} alt="Company logo" className="h-16 w-16 rounded-lg border border-line object-contain" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-paper text-xs text-slate2">No logo</div>}
        <div>
          <label className="btn-outline cursor-pointer py-2 text-xs">{hasLogo ? 'Replace logo' : 'Upload logo'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={logo} /></label>
          <p className="mt-1.5 text-xs text-slate2">JPG, PNG or WebP, up to 2 MB</p>
          {logoErr && <p role="alert" className="text-xs font-medium text-red-600">{logoErr}</p>}
        </div>
      </section>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-line bg-white p-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" name="companyName" value={form.companyName} onChange={set('companyName')} error={f.companyName} />
          <Field label="Official email" name="officialEmail" type="email" value={form.officialEmail} onChange={set('officialEmail')} error={f.officialEmail} />
          <Field label="Phone number" name="phone" type="tel" value={form.phone} onChange={set('phone')} error={f.phone} />
          <Field label="Website (optional)" name="website" type="url" placeholder="https://" value={form.website} onChange={set('website')} error={f.website} />
          <Field label="Physical address" name="address" value={form.address} onChange={set('address')} error={f.address} />
          <Field as="select" label="County" name="county" value={form.county} onChange={set('county')} error={f.county}>
            <option value="">Select county</option>{(counties.data?.counties || []).map((c) => <option key={c}>{c}</option>)}
          </Field>
          <Field as="select" label="Industry" name="industry" value={form.industry} onChange={set('industry')} error={f.industry}>
            <option value="">Select industry</option>{(cats.data?.categories || []).map((c) => <option key={c.id}>{c.name}</option>)}<option>Other</option>
          </Field>
          <Field label="Business registration number (optional)" name="registrationNumber" value={form.registrationNumber} onChange={set('registrationNumber')} error={f.registrationNumber} />
        </div>
        <Field as="textarea" rows={5} label="About your company" name="description" value={form.description} onChange={set('description')} error={f.description} hint="Interns read this before applying" />
        {st.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{st.error}</p>}
        {st.msg && <p role="status" className="rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-700">{st.msg}</p>}
        <button className="btn-primary" disabled={st.busy}>{st.busy ? 'Saving…' : 'Save company profile'}</button>
      </form>
      <Documents />
    </div>
  );
}
