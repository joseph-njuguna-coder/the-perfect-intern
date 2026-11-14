import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Socials from './Socials.jsx';
import { BRAND } from '../content.js';

const links = [
  ['/', 'Home'], ['/internships', 'Browse Internships'], ['/for-companies', 'For Companies'],
  ['/how-it-works', 'How It Works'], ['/about', 'About Us'], ['/contact', 'Contact Us'],
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cls = ({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-brand' : 'text-ink hover:text-brand'}`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur print:hidden">
        <div className="container-x flex h-16 items-center justify-between">
          <Link to="/" onClick={() => setOpen(false)}><Logo /></Link>
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
            {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={cls}>{label}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <>
                <Link to="/dashboard" className="btn-outline py-2">Dashboard</Link>
                <button className="btn-primary py-2" onClick={async () => { await logout(); navigate('/'); }}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-ink hover:text-brand">Login</Link>
                <Link to="/register" className="btn-primary py-2">Register</Link>
              </>
            )}
          </div>
          <button className="rounded-lg p-2 lg:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        {open && (
          <nav className="border-t border-line bg-white lg:hidden" aria-label="Mobile">
            <div className="container-x flex flex-col gap-1 py-3">
              {links.map(([to, label]) => (
                <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand' : 'text-ink'}`}>{label}</NavLink>
              ))}
              <div className="mt-2 flex gap-3">
                {user ? (
                  <>
                    <Link to="/dashboard" onClick={() => setOpen(false)} className="btn-outline flex-1">Dashboard</Link>
                    <button className="btn-primary flex-1" onClick={async () => { setOpen(false); await logout(); navigate('/'); }}>Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)} className="btn-outline flex-1">Login</Link>
                    <Link to="/register" onClick={() => setOpen(false)} className="btn-primary flex-1">Register</Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="bg-ink text-ink-100 print:hidden">
        <div className="container-x grid gap-10 py-14 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm text-ink-300">{BRAND.tagline}. A Kenyan marketplace for internships and industrial attachments.</p>
            <div className="mt-5"><Socials dark /></div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="hover:text-white" to="/internships">Browse internships</Link></li>
              <li><Link className="hover:text-white" to="/for-companies">For companies</Link></li>
              <li><Link className="hover:text-white" to="/how-it-works">How it works</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Company</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="hover:text-white" to="/about">About us</Link></li>
              <li><Link className="hover:text-white" to="/contact">Contact us</Link></li>
              <li><Link className="hover:text-white" to="/privacy">Privacy and data protection</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-x flex flex-col items-center justify-between gap-4 py-5 text-xs text-ink-300 md:flex-row">
            <p className="text-center md:text-left">© {new Date().getFullYear()} The Perfect Intern. Payment activates application access and does not guarantee an interview or placement.</p>
            <img src="/powered-by-porous-light.png" alt="Powered by Porous Kenya" className="h-9 w-auto shrink-0" width="233" height="37" />
          </div>
        </div>
      </footer>
    </div>
  );
}
