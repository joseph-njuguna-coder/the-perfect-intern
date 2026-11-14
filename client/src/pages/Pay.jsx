import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import Field from '../components/Field.jsx';

const POLL_MS = 3000;
const GIVE_UP_MS = 3 * 60 * 1000;

export default function Pay() {
  const [params] = useSearchParams();
  const internship = params.get('internship');
  const back = internship ? `/internships/${internship}` : '/internships';
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const settings = useApi('/public/settings');
  const fee = settings.data?.accessFee ?? 199;
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState('form'); // form | waiting | success | failed | slow
  const [payment, setPayment] = useState(null);
  const [st, setSt] = useState({ busy: false, error: '', fields: {} });
  const started = useRef(0);

  useEffect(() => { if (user?.phone && !phone) setPhone(`0${user.phone.slice(3)}`); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll our own backend. Success is only ever reported by the backend after Safaricom confirms the payment.
  useEffect(() => {
    if (phase !== 'waiting' || !payment) return undefined;
    const t = setInterval(async () => {
      try {
        const d = await api(`/payments/${payment.id}/status`);
        setPayment(d.payment);
        if (d.payment.status === 'success') { await refresh(); setPhase('success'); }
        else if (['failed', 'cancelled'].includes(d.payment.status)) setPhase('failed');
        else if (Date.now() - started.current > GIVE_UP_MS) setPhase('slow');
      } catch { /* keep polling */ }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [phase, payment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null;
  const Shell = ({ children }) => (
    <div className="container-x max-w-lg py-14">
      <h1 className="text-3xl font-extrabold">Activate application access</h1>
      <div className="mt-8 rounded-2xl border border-line bg-white p-6">{children}</div>
    </div>
  );

  if (!user) return <Shell><p className="text-sm text-slate2">Sign in to pay and apply.</p><Link to="/login" state={{ from: `/pay${internship ? `?internship=${internship}` : ''}` }} className="btn-primary mt-5 w-full">Sign in</Link></Shell>;
  if (user.role !== 'intern') return <Shell><p className="text-sm text-slate2">Only intern accounts pay the application-access fee.</p></Shell>;
  if (user.accessActivated && phase !== 'success') {
    return <Shell><p className="font-semibold text-brand-700">Application access is already active.</p><Link to={back} className="btn-primary mt-5 w-full">{internship ? 'Continue to the internship' : 'Browse internships'}</Link></Shell>;
  }

  async function pay(e) {
    e.preventDefault();
    setSt({ busy: true, error: '', fields: {} });
    try {
      const d = await api('/payments/initiate', { method: 'POST', body: { phone } });
      started.current = Date.now();
      setPayment(d.payment); setPhase('waiting'); setSt({ busy: false, error: '', fields: {} });
    } catch (err) {
      if (err.code === 'ALREADY_ACTIVE') { await refresh(); return; }
      setSt({ busy: false, error: Object.keys(err.fields || {}).length ? '' : err.message, fields: err.fields || {} });
    }
  }

  if (phase === 'waiting') {
    return (
      <Shell>
        <p className="font-display text-xl font-bold">Check your phone</p>
        <p className="mt-2 text-sm text-slate2" aria-live="polite">We sent an M-Pesa prompt for <strong className="text-ink">KSh {payment.amount}</strong> to <strong className="text-ink">{payment.phone}</strong>. Enter your M-Pesa PIN to approve it. This page updates automatically.</p>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-paper"><div className="h-full w-1/3 animate-pulse rounded-full bg-brand" /></div>
        <p className="mt-4 text-xs text-slate2">Do not close this page. If you already entered your PIN, we are waiting for Safaricom to confirm.</p>
      </Shell>
    );
  }
  if (phase === 'success') {
    return (
      <Shell>
        <p className="font-display text-xl font-bold text-brand-700">Payment confirmed</p>
        <p className="mt-2 text-sm text-slate2">Application access is now active on your account. M-Pesa code: <span className="font-mono">{payment?.mpesaReceipt || 'being finalised'}</span>.</p>
        <Link to={back} className="btn-primary mt-5 w-full">{internship ? 'Continue to the internship' : 'Browse internships'}</Link>
        {payment && <Link to={`/dashboard/payments/${payment.id}`} className="btn-outline mt-3 w-full">View receipt</Link>}
      </Shell>
    );
  }
  if (phase === 'slow') {
    return (
      <Shell>
        <p className="font-display text-xl font-bold">Still waiting for confirmation</p>
        <p className="mt-2 text-sm text-slate2">We have not heard back from Safaricom yet. If money left your account, access will activate automatically once it is confirmed. You can check progress under Payments.</p>
        <Link to="/dashboard/payments" className="btn-primary mt-5 w-full">View payments</Link>
      </Shell>
    );
  }
  if (phase === 'failed') {
    return (
      <Shell>
        <p className="font-display text-xl font-bold text-red-700">{payment?.status === 'cancelled' ? 'Payment cancelled' : 'Payment did not go through'}</p>
        <p className="mt-2 text-sm text-slate2">{payment?.resultDesc || 'No money was taken and access has not been activated.'}</p>
        <button className="btn-primary mt-5 w-full" onClick={() => { setPhase('form'); setPayment(null); }}>Try again</button>
        <Link to={back} className="btn-outline mt-3 w-full">Back</Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-sm text-slate2">One-time access fee</p>
      <p className="font-display text-4xl font-extrabold">KSh {fee}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate2">
        <li>Pay once, then apply to as many internships as you like.</li>
        <li>You approve an M-Pesa prompt on your phone with your PIN.</li>
        <li>Access activates only after Safaricom confirms the payment.</li>
        <li>Payment does not guarantee an interview, placement or employment.</li>
      </ul>
      <form onSubmit={pay} className="mt-6 space-y-4" noValidate>
        <Field label="M-Pesa phone number" name="phone" type="tel" inputMode="tel" autoComplete="tel" hint="The Safaricom number that will receive the prompt" value={phone} onChange={(e) => setPhone(e.target.value)} error={st.fields.phone} />
        {st.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{st.error}</p>}
        <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? 'Sending prompt…' : `Pay KSh ${fee} with M-Pesa`}</button>
      </form>
      <Link to={back} className="btn-outline mt-3 w-full">Not now</Link>
    </Shell>
  );
}
