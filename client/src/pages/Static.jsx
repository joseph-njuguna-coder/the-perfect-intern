import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import ContactForm from '../components/ContactForm.jsx';
import Socials from '../components/Socials.jsx';

const Page = ({ title, intro, children }) => (
  <div className="container-x max-w-3xl py-14">
    <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
    {intro && <p className="mt-3 text-lg text-slate2">{intro}</p>}
    <div className="mt-8 space-y-6 leading-relaxed">{children}</div>
  </div>
);
const H = ({ children }) => <h2 className="text-xl font-bold">{children}</h2>;

export function ForCompanies() {
  return (
    <Page title="Hire interns who are ready to learn" intro="Post internships and attachments, review applicants and select candidates in one place.">
      <H>What you can do</H>
      <ul className="list-disc space-y-2 pl-5 text-slate2">
        <li>Create listings with responsibilities, required skills, stipend, duration and deadline.</li>
        <li>Review applicant profiles, download CVs and read cover letters.</li>
        <li>Shortlist, reject, schedule interviews and select candidates.</li>
        <li>See applications for your own listings only.</li>
      </ul>
      <H>How approval works</H>
      <p className="text-slate2">Register your company and verify your email. Our team reviews your company before any of your listings become visible to interns, and each new listing is approved before it goes live. Posting is free for companies.</p>
      <Link to="/register?role=company" className="btn-primary">Register your company</Link>
    </Page>
  );
}

export function HowItWorks() {
  const { data } = useApi('/public/settings');
  const fee = data?.accessFee ?? 199;
  return (
    <Page title="How it works" intro="Free to register and browse. Pay once when you are ready to apply.">
      <H>For interns</H>
      <ol className="list-decimal space-y-2 pl-5 text-slate2">
        <li>Register and verify your email.</li>
        <li>Complete your profile and upload your CV as a PDF.</li>
        <li>Browse internships and save the ones you like.</li>
        <li>Choose Apply Now. The first time, you pay a one-time access fee of KSh {fee} by M-Pesa.</li>
        <li>Submit your application with a cover letter and track its status.</li>
      </ol>
      <p className="rounded-lg bg-gold-50 p-4 text-sm">Payment activates application access. It does not guarantee an interview, placement or employment.</p>
      <H>For companies</H>
      <ol className="list-decimal space-y-2 pl-5 text-slate2">
        <li>Register your company and submit verification documents.</li>
        <li>Wait for administrator approval.</li>
        <li>Publish internships. Each listing is reviewed before it goes live.</li>
        <li>Review applicants, shortlist, interview and select.</li>
      </ol>
    </Page>
  );
}

export function About() {
  return (
    <Page title="About The Perfect Intern" intro="Your Career. Your Opportunity. Your Future.">
      <p className="text-slate2">The Perfect Intern is a Kenyan marketplace that connects students, college graduates and young professionals with companies offering internships and industrial attachments. Practical experience is often the missing step between graduating and getting hired. We make it easier to find, apply for and track those opportunities.</p>
      <p className="text-slate2">We review every company and every listing before interns see it, because trust is what makes a marketplace work.</p>
    </Page>
  );
}

export function Contact() {
  return (
    <Page title="Contact us" intro="Send a message and we will reply by email.">
      <div className="rounded-2xl border border-line bg-white p-6"><ContactForm /></div>
      <H>Follow The Perfect Intern</H>
      <Socials showHandles />
    </Page>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy and data protection" intro="How we handle your personal data under the Kenya Data Protection Act, 2019.">
      <H>What we collect</H>
      <p className="text-slate2">Account details (name, email, phone, county), your profile and CV, application content, and payment records (amount, M-Pesa receipt number and timestamps). We never see your M-Pesa PIN.</p>
      <H>Why we collect it</H>
      <p className="text-slate2">To run your account, match you with internships, let companies review the applications you submit, process the application-access payment and keep an auditable record of transactions.</p>
      <H>Who sees it</H>
      <p className="text-slate2">Companies can see your profile and CV only when you apply to one of their listings. Administrators can access data needed to operate and secure the platform.</p>
      <H>Your rights</H>
      <p className="text-slate2">Under the Data Protection Act you can see, correct and delete your personal data and withdraw your consent. Signed-in users can download a copy of their data and delete an intern account themselves from Account settings. Company and administrator accounts are closed through support. You can also contact us about any request.</p>
      <H>What we keep after deletion</H>
      <p className="text-slate2">When you delete your account we remove your profile, CV, photo, saved internships and notifications, and withdraw open applications. We keep payment and audit records, stripped of your personal details, for as long as the law requires. Companies you applied to keep the outcome of your application but not your CV or cover letter.</p>
      <H>Security</H>
      <p className="text-slate2">Passwords are stored hashed, files are private and only available to the people allowed to see them, and all payment confirmations are verified on our servers. We never see your M-Pesa PIN.</p>
    </Page>
  );
}

export function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-4xl font-extrabold">Page not found</h1>
      <p className="mt-3 text-slate2">The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
