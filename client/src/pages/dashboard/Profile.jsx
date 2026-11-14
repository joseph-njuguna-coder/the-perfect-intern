import { useEffect, useState } from 'react';
import { api, upload } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Field from '../../components/Field.jsx';

export function TagInput({ label, value, onChange, error, hint }) {
  const [text, setText] = useState('');
  const add = () => {
    const parts = text.split(',').map((t) => t.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setText('');
  };
  return (
    <div>
      <label htmlFor="skills-input" className="mb-1.5 block text-sm font-semibold">{label}</label>
      <div className="flex gap-2">
        <input id="skills-input" className="input" value={text} placeholder="Type a skill and press Enter" onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur={add} />
        <button type="button" className="btn-outline" onClick={add}>Add</button>
      </div>
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {value.map((s) => (
            <li key={s} className="flex items-center gap-1 rounded-md bg-brand-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-brand-700">
              {s}<button type="button" aria-label={`Remove ${s}`} className="rounded px-1.5 hover:bg-white" onClick={() => onChange(value.filter((v) => v !== s))}>×</button>
            </li>
          ))}
        </ul>
      )}
      {hint && !error && <p className="mt-1 text-xs text-slate2">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

function FileCard({ title, accept, has, onUpload, children, note }) {
  const [st, setSt] = useState({ busy: false, error: '' });
  async function pick(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setSt({ busy: true, error: '' });
    try { await onUpload(file); setSt({ busy: false, error: '' }); }
    catch (err) { setSt({ busy: false, error: err.message }); }
  }
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3 flex items-center gap-4">
        {children}
        <div>
          <label className="btn-outline cursor-pointer py-2 text-xs">
            {st.busy ? 'Uploading…' : has ? 'Replace file' : 'Choose file'}
            <input type="file" accept={accept} className="sr-only" onChange={pick} disabled={st.busy} />
          </label>
          <p className="mt-1.5 text-xs text-slate2">{note}</p>
        </div>
      </div>
      {st.error && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{st.error}</p>}
    </div>
  );
}

export default function Profile() {
  const { refresh } = useAuth();
  const { data, loading, error } = useApi('/intern/profile');
  const cats = useApi('/public/categories');
  const counties = useApi('/public/counties');
  const [form, setForm] = useState(null);
  const [meta, setMeta] = useState({ hasPhoto: false, hasCv: false, completion: { pct: 0, missing: [] } });
  const [photoKey, setPhotoKey] = useState(0);
  const [st, setSt] = useState({ busy: false, msg: '', error: '', fields: {} });

  const load = (p) => {
    setForm({
      institution: p.institution || '', course: p.course || '', qualificationLevel: p.qualificationLevel || '',
      graduationYear: p.graduationYear || '', skills: p.skills || [], careerInterests: p.careerInterests || [],
      experience: p.experience || '', preferredCounty: p.preferredCounty || '', preferredWorkArrangement: p.preferredWorkArrangement || '',
      linkedinUrl: p.linkedinUrl || '', portfolioUrl: p.portfolioUrl || '',
    });
    setMeta({ hasPhoto: p.hasPhoto, hasCv: p.hasCv, completion: p.completion });
  };
  useEffect(() => { if (data) load(data.profile); }, [data]);

  if (loading || !form) return <p className="text-slate2">{error ? error.message : 'Loading your profile…'}</p>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleInterest = (slug) => setForm({ ...form, careerInterests: form.careerInterests.includes(slug) ? form.careerInterests.filter((s) => s !== slug) : [...form.careerInterests, slug] });

  async function save(e) {
    e.preventDefault();
    setSt({ busy: true, msg: '', error: '', fields: {} });
    try {
      const d = await api('/intern/profile', { method: 'PUT', body: form });
      load(d.profile); await refresh();
      setSt({ busy: false, msg: 'Profile saved.', error: '', fields: {} });
    } catch (err) { setSt({ busy: false, msg: '', error: Object.keys(err.fields || {}).length ? 'Please correct the highlighted fields.' : err.message, fields: err.fields || {} }); }
  }
  const afterUpload = async (d) => { setMeta({ hasPhoto: d.profile.hasPhoto, hasCv: d.profile.hasCv, completion: d.profile.completion }); await refresh(); };
  const f = st.fields;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">My profile</h1>
        <p className="mt-1 text-slate2">Companies see this when you apply. Completion: <strong className="text-ink">{meta.completion.pct}%</strong>{meta.completion.missing.length > 0 && ` (missing: ${meta.completion.missing.join(', ')})`}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FileCard title="Profile photograph" accept="image/jpeg,image/png,image/webp" has={meta.hasPhoto} note="JPG, PNG or WebP, up to 2 MB"
          onUpload={async (file) => { const d = await upload('/intern/profile/photo', file); setPhotoKey((k) => k + 1); await afterUpload(d); }}>
          {meta.hasPhoto
            ? <img src={`/api/intern/profile/photo?v=${photoKey}`} alt="Your profile" className="h-16 w-16 rounded-full object-cover" />
            : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-paper text-xs text-slate2">No photo</div>}
        </FileCard>
        <FileCard title="CV (PDF)" accept="application/pdf" has={meta.hasCv} note="PDF only, up to 5 MB" onUpload={async (file) => afterUpload(await upload('/intern/profile/cv', file))}>
          <div className="text-sm">{meta.hasCv ? <a className="font-semibold text-brand underline" href="/api/intern/profile/cv">Download current CV</a> : <span className="text-slate2">Not uploaded</span>}</div>
        </FileCard>
      </div>

      <form onSubmit={save} className="space-y-5 rounded-2xl border border-line bg-white p-6" noValidate>
        <h2 className="text-lg font-bold">Education</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Institution attended" name="institution" value={form.institution} onChange={set('institution')} error={f.institution} />
          <Field label="Course studied" name="course" value={form.course} onChange={set('course')} error={f.course} />
          <Field as="select" label="Qualification level" name="qualificationLevel" value={form.qualificationLevel} onChange={set('qualificationLevel')} error={f.qualificationLevel}>
            <option value="">Select level</option>{(data.qualifications || []).map((q) => <option key={q}>{q}</option>)}
          </Field>
          <Field label="Graduation year" name="graduationYear" type="number" inputMode="numeric" value={form.graduationYear} onChange={set('graduationYear')} error={f.graduationYear} hint="Expected year if you are still studying" />
        </div>

        <h2 className="pt-2 text-lg font-bold">Skills and interests</h2>
        <TagInput label="Skills" value={form.skills} onChange={(skills) => setForm({ ...form, skills })} error={f.skills} hint="Separate with commas or press Enter" />
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Career interests (choose up to 8)</legend>
          <div className="flex flex-wrap gap-2">
            {(cats.data?.categories || []).map((c) => {
              const on = form.careerInterests.includes(c.slug);
              return <button type="button" key={c.slug} aria-pressed={on} onClick={() => toggleInterest(c.slug)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? 'border-brand bg-brand text-white' : 'border-line hover:border-ink'}`}>{c.name}</button>;
            })}
          </div>
          {f.careerInterests && <p className="mt-1 text-xs font-medium text-red-600">{f.careerInterests}</p>}
        </fieldset>
        <Field as="textarea" rows={4} label="Previous experience (optional)" name="experience" value={form.experience} onChange={set('experience')} error={f.experience} />

        <h2 className="pt-2 text-lg font-bold">Preferences</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field as="select" label="Preferred internship location" name="preferredCounty" value={form.preferredCounty} onChange={set('preferredCounty')} error={f.preferredCounty}>
            <option value="">Select county</option>{(counties.data?.counties || []).map((c) => <option key={c}>{c}</option>)}
          </Field>
          <Field as="select" label="Preferred work arrangement" name="preferredWorkArrangement" value={form.preferredWorkArrangement} onChange={set('preferredWorkArrangement')} error={f.preferredWorkArrangement}>
            <option value="">Select</option><option value="physical">On site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option>
          </Field>
          <Field label="LinkedIn profile (optional)" name="linkedinUrl" type="url" placeholder="https://linkedin.com/in/…" value={form.linkedinUrl} onChange={set('linkedinUrl')} error={f.linkedinUrl} />
          <Field label="Portfolio link (optional)" name="portfolioUrl" type="url" placeholder="https://" value={form.portfolioUrl} onChange={set('portfolioUrl')} error={f.portfolioUrl} />
        </div>

        {st.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{st.error}</p>}
        {st.msg && <p role="status" className="rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-700">{st.msg}</p>}
        <button className="btn-primary" disabled={st.busy}>{st.busy ? 'Saving…' : 'Save profile'}</button>
      </form>
    </div>
  );
}
