import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Internships from './pages/Internships.jsx';
import InternshipDetail from './pages/InternshipDetail.jsx';
import Pay from './pages/Pay.jsx';
import { ForCompanies, HowItWorks, About, Contact, Privacy, NotFound } from './pages/Static.jsx';
import { Login, Register, VerifyEmail, ForgotPassword, ResetPassword } from './pages/Auth.jsx';
import DashboardLayout from './pages/dashboard/DashboardLayout.jsx';
import Overview from './pages/dashboard/Overview.jsx';
import Profile from './pages/dashboard/Profile.jsx';
import CompanyProfile from './pages/dashboard/CompanyProfile.jsx';
import { Listings, ListingForm } from './pages/dashboard/Listings.jsx';
import { Payments, Receipt } from './pages/dashboard/Payments.jsx';
import { AdminCompanies, AdminCompanyDetail } from './pages/dashboard/admin/Companies.jsx';
import AdminInternships from './pages/dashboard/admin/Internships.jsx';
import { AdminInterns, AdminInternDetail } from './pages/dashboard/admin/Interns.jsx';
import AdminFinance from './pages/dashboard/admin/Finance.jsx';
import AdminAnalytics from './pages/dashboard/admin/Analytics.jsx';
import AdminSettings, { AdminAudit } from './pages/dashboard/admin/Settings.jsx';
import { Applicants, ApplicantDetail } from './pages/dashboard/Applicants.jsx';
import { Saved, Applications, Notifications, Settings } from './pages/dashboard/Others.jsx';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container-x py-24 text-slate2">Loading your account…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="internships" element={<Internships />} />
          <Route path="internships/:id" element={<InternshipDetail />} />
          <Route path="pay" element={<Pay />} />
          <Route path="for-companies" element={<ForCompanies />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="dashboard" element={<Protected><DashboardLayout /></Protected>}>
            <Route index element={<Overview />} />
            <Route path="profile" element={<Profile />} />
            <Route path="saved" element={<Saved />} />
            <Route path="applications" element={<Applications />} />
            <Route path="company" element={<CompanyProfile />} />
            <Route path="listings" element={<Listings />} />
            <Route path="listings/new" element={<ListingForm />} />
            <Route path="listings/:id/edit" element={<ListingForm />} />
            <Route path="applicants" element={<Applicants />} />
            <Route path="applicants/:id" element={<ApplicantDetail />} />
            <Route path="payments" element={<Payments />} />
            <Route path="payments/:id" element={<Receipt />} />
            <Route path="admin/companies" element={<AdminCompanies />} />
            <Route path="admin/companies/:id" element={<AdminCompanyDetail />} />
            <Route path="admin/internships" element={<AdminInternships />} />
            <Route path="admin/internships/:id/edit" element={<ListingForm admin />} />
            <Route path="admin/interns" element={<AdminInterns />} />
            <Route path="admin/interns/:id" element={<AdminInternDetail />} />
            <Route path="admin/finance" element={<AdminFinance />} />
            <Route path="admin/finance/:id" element={<Receipt admin />} />
            <Route path="admin/analytics" element={<AdminAnalytics />} />
            <Route path="admin/settings" element={<AdminSettings />} />
            <Route path="admin/audit" element={<AdminAudit />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
