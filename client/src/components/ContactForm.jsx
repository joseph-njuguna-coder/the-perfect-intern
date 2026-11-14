import { useState } from 'react';
import { api } from '../lib/api.js';
import Field from './Field.jsx';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [state, setState] = useState({ busy: false, done: '', error: '', fields: {} });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, done: '', error: '', fields: {} });
    try {
      const d = await api('/public/contact', { method: 'POST', body: form });
      setForm({ name: '', email: '', subject: '', message: '' });
      setState({ busy: false, done: d.message, error: '', fields: {} });
    } catch (err) {
      setState({ busy: false, done: '', error: err.message, fields: err.fields });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" value={form.name} onChange={set('name')} error={state.fields.name} autoComplete="name" />
        <Field label="Email address" name="email" type="email" value={form.email} onChange={set('email')} error={state.fields.email} autoComplete="email" />
      </div>
      <Field label="Subject" name="subject" value={form.subject} onChange={set('subject')} />
      <Field label="Message" name="message" as="textarea" rows={5} value={form.message} onChange={set('message')} error={state.fields.message} />
      {state.error && !Object.keys(state.fields).length && <p role="alert" className="text-sm font-medium text-red-600">{state.error}</p>}
      {state.done && <p role="status" className="rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-700">{state.done}</p>}
      <button className="btn-primary" disabled={state.busy}>{state.busy ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}
