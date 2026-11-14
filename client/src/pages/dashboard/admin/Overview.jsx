import { Link } from 'react-router-dom';
import { useApi } from '../../../lib/useApi.js';
import { Heading } from '../../../components/ui.jsx';

const kes = (n) => `KSh ${Number(n).toLocaleString('en-KE')}`;

export default function AdminOverview() {
  const { data, loading, error } = useApi('/admin/stats');
  if (loading) return <p className="text-slate2">Loading…</p>;
  if (error) return <p role="alert" className="text-red-600">{error.message}</p>;
  const s = data.stats;
  const cards = [
    ['Registered interns', s.interns, '/dashboard/admin/interns'], ['Registered companies', s.companies, '/dashboard/admin/companies'],
    ['Approved companies', s.approvedCompanies, '/dashboard/admin/companies?approvalStatus=approved'], ['Total internships', s.internships, '/dashboard/admin/internships'],
    ['Active internships', s.activeInternships, '/dashboard/admin/internships?status=approved'], ['Total applications', s.applications, null],
    ['Successful payments', s.successfulPayments, '/dashboard/admin/finance?status=success'], ['Total revenue', kes(s.revenue), '/dashboard/admin/finance'],
  ];
  const attention = [
    [s.pendingCompanies, 'companies awaiting approval', '/dashboard/admin/companies?approvalStatus=pending'],
    [s.pendingInternships, 'internships awaiting approval', '/dashboard/admin/internships?status=pending_approval'],
    [s.pendingPayments, 'payments pending confirmation', '/dashboard/admin/finance?status=pending'],
    [s.paymentFlags, 'payment anomalies in the last 30 days', '/dashboard/admin/audit?action=payment.'],
  ];
  return (
    <>
      <Heading sub="Platform health at a glance.">Administration</Heading>
      <section className="mb-8 rounded-xl border border-line bg-white p-5" aria-label="Needs attention">
        <h2 className="font-bold">Needs attention</h2>
        <ul className="mt-3 divide-y divide-line">
          {attention.map(([n, label, to]) => (
            <li key={label} className="flex items-center justify-between py-2.5 text-sm">
              <span><strong className={n > 0 ? 'text-gold-700' : ''}>{n}</strong> {label}</span>
              {n > 0 ? <Link to={to} className="font-semibold text-brand underline">Review</Link> : <span className="text-xs text-slate2">All clear</span>}
            </li>
          ))}
        </ul>
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([label, value, to]) => {
          const inner = <><p className="font-display text-2xl font-extrabold">{typeof value === 'number' ? value.toLocaleString('en-KE') : value}</p><p className="mt-0.5 text-sm text-slate2">{label}</p></>;
          return to ? <Link key={label} to={to} className="rounded-xl border border-line bg-white p-4 hover:border-brand">{inner}</Link> : <div key={label} className="rounded-xl border border-line bg-white p-4">{inner}</div>;
        })}
      </div>
    </>
  );
}
