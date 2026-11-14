import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import Field from '../components/Field.jsx';

const Shell = ({ title, subtitle, children, wide }) => (
  <div className={`container-x py-14 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
    <h1 className="text-3xl font-extrabold">{title}</h1>
    {subtitle && <p className="mt-2 text-slate2">{subtitle}</p>}
    <div className="mt-8 rounded-2xl border border-line bg-white p-6">{children}</div>
  </div>
);
const Alert = ({ kind = 'error', children }) => children ? (
  <p role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm font-medium ${kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'}`}>{children}</p>
) : null;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from;
  const [form, setForm] = useState({ email: '', password: '' });
  const [st, setSt] = useState({ busy: false, error: '', code: '', info: '', fields: {} });

  async function submit(e) {
    e.preventDefault();
    setSt({ busy: true, error: '', code: '', info: '', fields: {} });
    try { await login(form.email, form.password); navigate(from || '/dashboard', { replace: true }); }
    catch (err) { setSt({ busy: false, error: err.message, code: err.code, info: '', fields: err.fields }); }
  }
  async function resend() {
    try { const d = await api('/auth/resend-verification', { method: 'POST', body: { email: form.email } }); setSt((s) => ({ ...s, info: d.message, error: '' })); }
    catch (err) { setSt((s) => ({ ...s, error: err.message })); }
  }

  return (
    <Shell title="Sign in" subtitle="Welcome back.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email address" name="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={st.fields.email} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={st.fields.password} />
        <Alert>{st.error}</Alert>
        <Alert kind="info">{st.info}</Alert>
        {st.code === 'EMAIL_NOT_VERIFIED' && <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={resend}>Send a new verification email</button>}
        <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="mt-5 flex justify-between text-sm">
        <Link to="/forgot-password" className="font-semibold text-brand hover:underline">Forgot password?</Link>
        <Link to="/register" className="font-semibold text-brand hover:underline">Create an account</Link>
      </div>
    </Shell>
  );
}

export function Register() {
  const [params, setParams] = useSearchParams();
  const role = params.get('role') === 'company' ? 'company' : 'intern';
  const counties = useApi('/public/counties');
  const cats = useApi('/public/categories');
  const blank = { fullName: '', email: '', phone: '', password: '', county: '', consent: false, gender: '', dateOfBirth: '', companyName: '', industry: '' };
  const [form, setForm] = useState(blank);
  const [st, setSt] = useState({ busy: false, error: '', fields: {}, done: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSt({ busy: true, error: '', fields: {}, done: '' });
    try {
      const d = await api(`/auth/register/${role}`, { method: 'POST', body: form });
      setSt({ busy: false, error: '', fields: {}, done: d.message });
    } catch (err) { setSt({ busy: false, error: err.fields && Object.keys(err.fields).length ? '' : err.message, fields: err.fields || {}, done: '' }); }
  }

  if (st.done) {
    return (
      <Shell title="Check your email">
        <p className="text-slate2">{st.done} The link is valid for 24 hours.</p>
        <Link to="/login" className="btn-primary mt-6">Go to sign in</Link>
      </Shell>
    );
  }

  return (
    <Shell wide title={role === 'company' ? 'Register your company' : 'Create your intern account'} subtitle="Free to register. We will email you a link to verify your address.">
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-paper p-1" role="tablist">
        {['intern', 'company'].map((r) => (
          <button key={r} type="button" role="tab" aria-selected={role === r} onClick={() => setParams({ role: r })} className={`rounded-md py-2 text-sm font-semibold ${role === r ? 'bg-white shadow-sm' : 'text-slate2'}`}>{r === 'intern' ? "I'm an intern" : "I'm a company"}</button>
        ))}
      </div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {role === 'company' && (
          <>
            <Field label="Company name" name="companyName" value={form.companyName} onChange={set('companyName')} error={st.fields.companyName} />
            <Field as="select" label="Industry" name="industry" value={form.industry} onChange={set('industry')} error={st.fields.industry}>
              <option value="">Select industry</option>
              {(cats.data?.categories || []).map((c) => <option key={c.id}>{c.name}</option>)}
              <option>Other</option>
            </Field>
          </>
        )}
        <Field label={role === 'company' ? 'Contact person' : 'Full name'} name="fullName" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={st.fields.fullName} />
        <Field label={role === 'company' ? 'Official email' : 'Email address'} name="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={st.fields.email} />
        <Field label="Phone number" name="phone" type="tel" autoComplete="tel" hint="e.g. 0712345678" value={form.phone} onChange={set('phone')} error={st.fields.phone} />
        <Field as="select" label="County" name="county" value={form.county} onChange={set('county')} error={st.fields.county}>
          <option value="">Select county</option>
          {(counties.data?.counties || []).map((c) => <option key={c}>{c}</option>)}
        </Field>
        <Field label="Password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters with a letter and a number" value={form.password} onChange={set('password')} error={st.fields.password} />
        <div className="hidden sm:block" />
        {role === 'intern' && (
          <>
            <Field as="select" label="Gender (optional)" name="gender" value={form.gender} onChange={set('gender')}>
              <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
            </Field>
            <Field label="Date of birth (optional)" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} error={st.fields.dateOfBirth} />
          </>
        )}
        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={form.consent} onChange={set('consent')} />
            <span>I have read the <Link to="/privacy" target="_blank" className="font-semibold text-brand underline">privacy notice</Link> and consent to The Perfect Intern processing my personal data as described.</span>
          </label>
          {st.fields.consent && <p className="mt-1 text-xs font-medium text-red-600">{st.fields.consent}</p>}
        </div>
        <div className="space-y-3 sm:col-span-2">
          <Alert>{st.error}</Alert>
          <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? 'Creating account…' : 'Create account'}</button>
          <p className="text-center text-sm text-slate2">Already registered? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></p>
        </div>
      </form>
    </Shell>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [st, setSt] = useState({ status: 'working', message: '' });
  useEffect(() => {
    let live = true;
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then((d) => live && setSt({ status: 'ok', message: d.message }))
      .catch((e) => live && setSt({ status: 'error', message: e.message }));
    return () => { live = false; };
  }, [token]);
  return (
    <Shell title="Email verification">
      {st.status === 'working' && <p className="text-slate2">Verifying your email…</p>}
      {st.status === 'ok' && <><Alert kind="info">{st.message}</Alert><Link to="/login" className="btn-primary mt-5">Sign in</Link></>}
      {st.status === 'error' && <><Alert>{st.message}</Alert><Link to="/login" className="btn-outline mt-5">Go to sign in to request a new link</Link></>}
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [st, setSt] = useState({ busy: false, msg: '', error: '' });
  async function submit(e) {
    e.preventDefault();
    setSt({ busy: true, msg: '', error: '' });
    try { const d = await api('/auth/forgot-password', { method: 'POST', body: { email } }); setSt({ busy: false, msg: d.message, error: '' }); }
    catch (err) { setSt({ busy: false, msg: '', error: err.fields?.email || err.message }); }
  }
  return (
    <Shell title="Reset your password" subtitle="Enter your email and we will send a reset link.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email address" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Alert>{st.error}</Alert><Alert kind="info">{st.msg}</Alert>
        <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
    </Shell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [st, setSt] = useState({ busy: false, msg: '', error: '' });
  async function submit(e) {
    e.preventDefault();
    setSt({ busy: true, msg: '', error: '' });
    try { const d = await api('/auth/reset-password', { method: 'POST', body: { token: params.get('token') || '', password } }); setSt({ busy: false, msg: d.message, error: '' }); }
    catch (err) { setSt({ busy: false, msg: '', error: err.fields?.password || err.fields?.token || err.message }); }
  }
  return (
    <Shell title="Choose a new password">
      {st.msg ? <><Alert kind="info">{st.msg}</Alert><Link to="/login" className="btn-primary mt-5">Sign in</Link></> : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters with a letter and a number" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Alert>{st.error}</Alert>
          <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? 'Saving…' : 'Update password'}</button>
        </form>
      )}
    </Shell>
  );
}
