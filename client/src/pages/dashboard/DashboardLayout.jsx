import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const INTERN_ONLY = ['/dashboard/profile', '/dashboard/saved', '/dashboard/applications'];
const isInternPath = (p) => INTERN_ONLY.includes(p) || p.startsWith('/dashboard/payments');
const isAdminPath = (p) => p.startsWith('/dashboard/admin');
const isCompanyPath = (p) => p.startsWith('/dashboard/listings') || p.startsWith('/dashboard/applicants') || p === '/dashboard/company';

export default function DashboardLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if ((user.role !== 'intern' && isInternPath(pathname)) || (user.role !== 'company' && isCompanyPath(pathname)) || (user.role !== 'admin' && isAdminPath(pathname))) return <Navigate to="/dashboard" replace />;

  const nav = [
    ['/dashboard', 'Overview', true],
    ...(user.role === 'intern' ? [['/dashboard/profile', 'My profile'], ['/dashboard/saved', 'Saved internships'], ['/dashboard/applications', 'My applications'], ['/dashboard/payments', 'Payments']] : []),
    ...(user.role === 'company' ? [['/dashboard/listings', 'My internships'], ['/dashboard/applicants', 'Applicants'], ['/dashboard/listings/new', 'Post an internship'], ['/dashboard/company', 'Company profile']] : []),
    ...(user.role === 'admin' ? [['/dashboard/admin/companies', 'Companies'], ['/dashboard/admin/internships', 'Internships'], ['/dashboard/admin/interns', 'Interns'], ['/dashboard/admin/finance', 'Finance'], ['/dashboard/admin/analytics', 'Analytics'], ['/dashboard/admin/settings', 'Platform settings'], ['/dashboard/admin/audit', 'Audit log']] : []),
    ['/dashboard/notifications', 'Notifications'],
    ['/dashboard/settings', 'Account settings'],
  ];
  return (
    <div className="container-x grid gap-8 py-10 lg:grid-cols-[220px_1fr] print:block print:py-0">
      <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible print:hidden">
        {nav.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-white'}`}>{label}</NavLink>
        ))}
      </nav>
      <div className="min-w-0"><Outlet /></div>
    </div>
  );
}
