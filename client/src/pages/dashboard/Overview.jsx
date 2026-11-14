import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApi } from '../../lib/useApi.js';
import { STATUS, fmtDate } from '../../lib/format.js';
import InternshipCard from '../../components/InternshipCard.jsx';
import AdminOverview from './admin/Overview.jsx';

const Stat = ({ label, value, to }) => (
  <Link to={to || '#'} className="rounded-xl border border-line bg-white p-4 hover:border-brand">
    <p className="font-display text-3xl font-extrabold">{value}</p>
    <p className="mt-0.5 text-sm text-slate2">{label}</p>
  </Link>
);

function InternOverview({ user }) {
  const { data, loading, error } = useApi('/intern/dashboard');
  const settings = useApi('/public/settings');
  const fee = settings.data?.accessFee ?? 199;
  if (loading) return <p className="text-slate2">Loading your dashboard…</p>;
  if (error) return <p role="alert" className="text-red-600">{error.message}</p>;
  const { completion: c, stats, recommended, recent, accessActivated } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Welcome, {user.fullName.split(' ')[0]}</h1>
        <p className="mt-1 text-slate2">Here is where your internship search stands.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-5" aria-label="Profile completion">
          <div className="flex items-center justify-between text-sm font-semibold"><span>Profile completion</span><span>{c.pct}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={c.pct} aria-valuemin="0" aria-valuemax="100"><div className="h-full bg-brand" style={{ width: `${c.pct}%` }} /></div>
          {c.missing.length > 0 ? (
            <p className="mt-3 text-sm text-slate2">Still to add: {c.missing.join(', ')}.</p>
          ) : <p className="mt-3 text-sm text-brand-700">Your profile is complete.</p>}
          <Link to="/dashboard/profile" className="btn-outline mt-4 py-2">{c.pct === 100 ? 'View profile' : 'Complete profile'}</Link>
        </section>
        <section className="rounded-xl border border-line bg-white p-5" aria-label="Application access">
          <p className="text-sm font-semibold">Application access</p>
          <p className={`mt-1 font-display text-2xl font-extrabold ${accessActivated ? 'text-brand' : ''}`}>{accessActivated ? 'Active' : 'Not activated'}</p>
          <p className="mt-2 text-sm text-slate2">{accessActivated ? 'You can apply to as many internships as you like.' : `Activate once for KSh ${fee} by M-Pesa when you apply. Browsing and saving stay free. Payment does not guarantee an interview or placement.`}</p>
          {!accessActivated && <Link to="/internships" className="btn-primary mt-4 py-2">Browse internships</Link>}
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total applications" value={stats.total} to="/dashboard/applications" />
        <Stat label="Pending" value={stats.pending} to="/dashboard/applications" />
        <Stat label="Shortlisted" value={stats.shortlisted} to="/dashboard/applications" />
        <Stat label="Interview invitations" value={stats.interviews} to="/dashboard/applications" />
        <Stat label="Saved internships" value={stats.saved} to="/dashboard/saved" />
        <Stat label="Unread notifications" value={stats.unread} to="/dashboard/notifications" />
      </div>

      <section>
        <h2 className="text-xl font-bold">Recommended for you</h2>
        <p className="text-sm text-slate2">{c.pct < 50 ? 'Add your interests and preferred location to improve these matches.' : 'Matched to your interests, location and work style.'}</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {recommended.map((it) => <InternshipCard key={it.id} item={it} compact />)}
        </div>
        {!recommended.length && <p className="mt-4 text-sm text-slate2">No open internships to recommend right now.</p>}
      </section>

      <section>
        <h2 className="text-xl font-bold">Recent applications</h2>
        {recent.length ? (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-white">
            {recent.map((a) => (
              <li key={a.reference} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span><strong>{a.title}</strong> <span className="text-slate2">at {a.companyName}</span></span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[a.status][1]}`}>{STATUS[a.status][0]}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm text-slate2">You have not applied to any internships yet.</p>}
      </section>
    </div>
  );
}

const BADGE = {
  pending: ['Awaiting approval', 'bg-gold-50 text-gold-700'], approved: ['Approved', 'bg-brand-50 text-brand-700'],
  rejected: ['Rejected', 'bg-red-50 text-red-700'], suspended: ['Suspended', 'bg-red-50 text-red-700'],
};

function CompanyOverview({ user }) {
  const { data, loading, error } = useApi('/company/dashboard');
  if (loading) return <p className="text-slate2">Loading your dashboard…</p>;
  if (error) return <p role="alert" className="text-red-600">{error.message}</p>;
  const { company, internships: l, applications: a, documents } = data;
  const [label, cls] = BADGE[company.approvalStatus];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">{company.companyName}</h1>
        <p className="mt-1 text-slate2">Welcome, {user.fullName.split(' ')[0]}.</p>
      </div>
      <section className="rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold">Company approval</p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>
        </div>
        <p className="mt-2 text-sm text-slate2">
          {company.approvalStatus === 'pending' && 'An administrator reviews every company before its internships become visible to interns. Upload your verification documents to speed this up.'}
          {company.approvalStatus === 'approved' && 'Your approved listings are visible to interns.'}
          {company.approvalStatus === 'rejected' && `Your company was not approved.${company.rejectionReason ? ` Reason: ${company.rejectionReason}` : ''} Update your details and contact support.`}
          {company.approvalStatus === 'suspended' && 'Your listings are hidden while the account is suspended. Contact support.'}
        </p>
        {(!company.description || !company.address || documents === 0) && (
          <p className="mt-3 text-sm">Next step: <Link to="/dashboard/company" className="font-semibold text-brand underline">{!company.description || !company.address ? 'complete your company profile' : 'upload verification documents'}</Link>.</p>
        )}
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Internships posted" value={l.total} to="/dashboard/listings" />
        <Stat label="Active internships" value={l.active} to="/dashboard/listings" />
        <Stat label="Pending approval" value={l.pending} to="/dashboard/listings" />
        <Stat label="Applications received" value={a.total} />
        <Stat label="Shortlisted candidates" value={a.shortlisted} />
        <Stat label="Interview invitations" value={a.interviews} />
        <Stat label="Selected interns" value={a.selected} />
      </div>
      <Link to="/dashboard/listings/new" className="btn-primary">Post an internship</Link>
    </div>
  );
}

export default function Overview() {
  const { user } = useAuth();
  if (user.role === 'intern') return <InternOverview user={user} />;
  if (user.role === 'company') return <CompanyOverview user={user} />;
  return <AdminOverview />;
}
