import { Link } from 'react-router-dom';
import { PRIVACY_CONTACT_EMAIL } from '../content.js';

const EFFECTIVE = '10 November 2026';

// Based on the policy text supplied by The Perfect Intern. Passages that did not match how this platform works
// (a leftover reference to another company, advertising and analytics claims, a California-style rights section) were corrected.
const SECTIONS = [
  { id: 'intro', title: 'About this policy', body: [
    { p: 'This Privacy Policy (the "Policy") describes the information THE PERFECT INTERN ("THE PERFECT INTERN", "we" or "us") collects from or about you through this website (the "Site"). It also describes how we may use, share and handle the information we collect.' },
  ] },
  { id: 'consent', title: 'Terms and Conditions and your consent', body: [
    { p: 'Before using this Site, you should review this Policy, the Terms and Conditions, and any Privacy Notice shown on the Site. By using this Site you consent to the collection, processing, use and disclosure of your information as set out in this Policy. If you do not agree to be bound by this Policy, you are not authorised to access or use this Site. This Policy forms part of the Terms and Conditions that govern your use of the Site.' },
    { p: 'Where the Data Protection Act, 2019 requires your specific consent (for example, to use your information for marketing), we ask for it separately, and you can withdraw it at any time.' },
    { p: 'THE PERFECT INTERN may revise this Policy at any time. Revisions take effect when posted on this Site. Whenever the Policy changes we will update the effective date at the top of this page, so please check it from time to time. By continuing to use the Site you accept the revised Policy.' },
  ] },
  { id: 'collect', title: 'What information we collect', body: [
    { h: 'Information you provide' },
    { p: 'When you use the Site or our services we may collect personal information, meaning information that identifies you alone or together with other information we hold. For example, we may collect your name, contact information and date of birth. You may give us this information directly, for example through a form on the Site. Consent to receive communications is required to submit a form. Not every field in a form is required, but fields we need to provide a service are mandatory.' },
    { p: 'Depending on how you use the Site, this includes:' },
    { ul: ['Account details: name, email address, phone number, county, password (stored only in scrambled, hashed form), and optional gender and date of birth.', 'Interns: profile details, education, skills, career interests, experience, links, profile photograph, CV and cover letters, saved internships and applications.', 'Companies: company and contact details, business registration details, verification documents, internship listings and your decisions about applicants.', 'Payments: the M-Pesa phone number used, the amount, the M-Pesa transaction code, receipt number, status and time. We never see or store your M-Pesa PIN.', 'Messages you send us and your communication with companies through the Site.'] },
    { h: 'Information from your mobile or tablet device' },
    { p: 'If you access the Site through a mobile or tablet device, we may automatically collect information about it, such as the type of device, its operating system, the type of browser, its IP address and how you use the Site.' },
    { h: 'More about IP addresses' },
    { p: 'Your IP address is the identifier assigned to your device when you access the internet. It may stay the same or change each time you connect. IP addresses do not include your name or email address, but in some cases they can be used to identify you. If we suspect inappropriate or criminal activity, or a threat to the Site or its users, we may share our server logs, which contain IP addresses, with the appropriate investigative authorities.' },
    { h: 'Cookies and other technologies' },
    { p: 'A "cookie" is a small file placed on your device when you visit a site. A "session cookie" expires when you close your browser. A "persistent cookie" stays on your device so the information is available when you return. Our essential cookie keeps you signed in securely. Our webpages and emails may also contain small electronic files known as "web beacons" (clear gifs, pixel tags) that let us gather usage statistics.' },
    { p: 'We use cookies and similar technologies to improve and support the Site, for example to:' },
    { ul: ['collect information about how visitors use the Site, such as which pages they visit, for how long, and which functions they use most; and', 'support the features of the Site and make it more personal, for example by filling in information you have already provided.'] },
    { p: 'We do not collect directly identifying information through cookies, but we or a service provider may link it to personal information you give us. Most browsers accept cookies by default. You can control cookies in your browser settings and may be able to receive an alert when a cookie is placed. If you reject cookies, some features of the Site may not work.' },
  ] },
  { id: 'third-party-cookies', title: 'Third-party cookies and advertising', body: [
    { p: 'We do not currently show advertising on the Site. If we add analytics tools (for example Google Analytics, which helps us understand how visitors use the Site) or any advertising, we will say so here and give you a choice. Third parties, including advertisers, ad networks and content providers, may place their own cookies if you follow links to their services. We do not control their tracking technologies. If you have questions about an advertisement or targeted content, contact the provider directly. If you do not configure your browser or opt out, you will accept cookies provided by this Site.' },
  ] },
  { id: 'use', title: 'How we use your information', body: [
    { p: 'In general, we use the personal information we collect through this Site:' },
    { ul: ['to provide the information and services you request, including creating your account, matching you with internships and processing applications;', 'to process your application-access payment, activate access and issue receipts;', 'to contact you as needed for your use of the Site, including service emails about verification, applications and payments;', 'to connect you with the companies you choose to apply to; and', 'to enhance our security and prevent fraud.'] },
    { p: 'See "Your choices" below for the choices you have about how we use your personal information.' },
  ] },
  { id: 'click-through', title: 'Click-through agreements', body: [
    { p: 'When you sign up for special features of the Site you may be asked to agree to special terms, for example by ticking a box or clicking "I agree". This is a "click-through" agreement. If its terms differ from this Policy, the click-through terms supplement or amend this Policy and bind you, but only for the matters they cover.' },
  ] },
  { id: 'choices', title: 'Your choices', body: [
    { p: 'We respect your right to make choices about how we collect, use and disclose your personal information. In most cases we ask you to indicate your choices when we collect your information.' },
    { h: 'Information access, correction and removal' },
    { p: 'On request, we will remove your personal information from our records related to the Site. Removing it may prevent you from using the Site. Signed-in users can update their details, download a copy of their data and, for intern accounts, delete their account from Account settings. To correct or remove information in another way, contact us through the Contact page' + (PRIVACY_CONTACT_EMAIL ? ` or at ${PRIVACY_CONTACT_EMAIL}` : '') + '.' },
    { h: 'Opting out of email marketing' },
    { p: 'You may opt out of marketing emails at any time by contacting us, or by using the unsubscribe option in the emails. Service emails, such as password resets and payment receipts, are not marketing.' },
    { h: 'Disclosure for direct marketing' },
    { p: 'We do not sell your personal information. We will only share it with service providers or third parties so that they can market or advertise to you if you have given your separate, express consent.' },
    { h: 'Do Not Track' },
    { p: 'Because of the changing state of technology and the lack of industry agreement on what "Do Not Track" (DNT) signals mean, we do not currently guarantee that we will honour DNT signals.' },
  ] },
  { id: 'safeguards', title: 'Safeguarding your information', body: [
    { p: 'We maintain reasonable administrative, physical and technical measures to protect the confidentiality and security of your personal information. Passwords are stored hashed, uploaded files are kept private and only shown to people who are allowed to see them, and payment confirmations are verified on our servers. Unfortunately no website is completely secure, so we cannot guarantee that your personal information will never be disclosed, misused or lost by accident or by the unauthorised acts of others.' },
  ] },
  { id: 'sharing', title: 'How we share your information', body: [
    { h: 'Companies you apply to' },
    { p: 'When you apply for an internship, we share your profile, cover letter and CV with the company that posted it, so it can consider your application. We do not share your application with other companies. The decision to accept or decline an application lies solely with the company.' },
    { h: 'Third-party service providers' },
    { p: 'We share personal information collected through the Site with service providers who act for or on our behalf. For example, we use vendors to design, operate and host the Site, store data, send email and process M-Pesa payments (including Safaricom). They may need information about you to perform their functions.' },
    { h: 'Affiliates and partners' },
    { p: 'We may share personal information with affiliates and partners whose services complement ours and may be useful to you, such as companies seeking interns, to help you with the services you request. This is limited to what is needed for the service you asked for.' },
    { h: 'Business negotiations and transfers' },
    { p: 'We may consider selling, buying, merging or otherwise reorganising one or more of our businesses. In negotiating such an arrangement we may need to disclose your personal information, and we will take reasonable measures to protect it, for example by requiring a prospective purchaser to sign a non-disclosure agreement. We may transfer the personal information you submit through the Site to any organisation that acquires or merges with us.' },
    { h: 'Compliance with laws and protection of rights' },
    { p: 'We may disclose your personal information when we believe in good faith that disclosure is appropriate to comply with the law, a court order or a subpoena; to prevent or investigate a possible crime such as fraud or identity theft; to protect the security of the Site; to enforce our Terms and Conditions or other agreements; or to protect our rights, property or safety, or those of our users or others.' },
    { h: 'Third-party social media platforms' },
    { p: 'If we offer functionality that lets you post information to a third-party social media platform, people with access to your profile there will be able to see your post, so you should have no expectation of privacy in those actions. If you link your profile on our Site with an account on such a platform, we may share the information in your profile with it. We may also use social media platforms to offer you interest-based ads, only where you have consented. To do so we may convert your email address into a unique value that a platform can match with its own users. We do not give personal information to these platforms, although they may gain insights about people who respond to our ads.' },
    { h: 'Aggregate or de-identified information' },
    { p: 'We use information collected through the Site to create a combined view of usage patterns and may share aggregate information with third parties so that we and they can better understand our users. We may also share information about how particular individuals use the Site, but only on a de-identified basis. This is not directly identifying, but it does reflect the usage pattern of a particular user. We may provide basic demographic information (such as gender and age) with it. Third parties typically use it for analysis and to market their own products and services.' },
    { h: 'As described in a privacy notice' },
    { p: 'We may disclose your personal information as described in any privacy notice posted on a page of the Site where you provide it. By giving us your information on that page you consent to that disclosure.' },
  ] },
  { id: 'retention', title: 'How long we keep information', body: [
    { p: 'We keep your personal information as needed to run the Site and provide services; to comply with legal obligations and regulatory requirements; to resolve disputes; to enforce this Policy; and to prevent fraud and abuse. If requested by law enforcement, we may also retain it for a period of time. When an intern deletes their account we remove their profile, files, saved items and notifications and withdraw open applications. Payment and audit records are kept, without personal details, for as long as the law requires.' },
  ] },
  { id: 'children', title: "Children's online privacy", body: [
    { p: 'This Site is not intended for children or minors under 18 years without the permission of a parent or guardian. If you are a parent or guardian and believe your child has submitted personal information through this Site without your consent, please contact us.' },
  ] },
  { id: 'links', title: 'Links to other sites', body: [
    { p: 'The Site may contain links to websites controlled or offered by third parties. THE PERFECT INTERN does not control or operate them, is not responsible for their content, accuracy or opinions, and does not investigate, monitor or check them. We disclaim any liability for their privacy practices and for any information, materials, products or services posted or offered there. We do not endorse any products or services offered or information contained on those sites, nor are we liable for any failure of products and services offered or advertised there. Information you give to third parties on their websites is covered by their privacy policies, not this Policy. We urge you to read the privacy policy of any site before using it or giving it personal information.' },
  ] },
  { id: 'rights', title: 'Your rights under the Kenya Data Protection Act, 2019', body: [
    { p: 'As a data subject in Kenya you have the right to:' },
    { ul: ['be informed about how your personal data is used;', 'access your personal data (signed-in users can download a copy from Account settings);', 'object to the processing of your personal data;', 'have inaccurate or misleading data corrected;', 'have your data deleted (intern accounts can be deleted from Account settings);', 'receive your data in a structured format; and', 'withdraw consent you have given us.'] },
    { p: 'You can also lodge a complaint with the Office of the Data Protection Commissioner of Kenya. If you are under 18, you may ask us to remove content or information you have posted to the Site by contacting us.' },
  ] },
  { id: 'jurisdiction', title: 'Jurisdiction and transfers', body: [
    { p: 'This Site is operated in Nairobi (and environs), Kenya. If you access it from outside Kenya, you are responsible for complying with any laws that apply to you. The data protection laws of the country where you live may be stricter than Kenyan law. Your personal information may be subject to disclosure under Kenyan law, or the laws of other countries to which it is transferred, and may be accessible to law enforcement and national security authorities there. By using this Site you consent to the collection, processing, use and transfer of your personal information in Kenya or any other country, subject to this Policy.' },
  ] },
  { id: 'contact', title: 'Contact us', body: [
    { p: 'For any privacy question or request, use the Contact page' + (PRIVACY_CONTACT_EMAIL ? ` or write to ${PRIVACY_CONTACT_EMAIL}` : '') + '.' },
  ] },
];

export default function Privacy() {
  return (
    <div className="container-x py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-slate2">Effective and last reviewed: {EFFECTIVE}</p>
        <nav aria-label="On this page" className="mt-8 rounded-2xl border border-line bg-white p-5">
          <p className="text-sm font-bold">On this page</p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {SECTIONS.map((s, i) => <li key={s.id}><a href={`#${s.id}`} className="text-brand hover:underline">{i + 1}. {s.title}</a></li>)}
          </ol>
        </nav>
        <div className="mt-10 space-y-10">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl font-bold sm:text-2xl">{i + 1}. {s.title}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-slate2">
                {s.body.map((b, j) => b.h ? <h3 key={j} className="pt-2 text-base font-bold text-ink">{b.h}</h3>
                  : b.ul ? <ul key={j} className="list-disc space-y-1.5 pl-5">{b.ul.map((li) => <li key={li}>{li}</li>)}</ul>
                  : <p key={j}>{b.p}</p>)}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-12 rounded-xl bg-paper p-4 text-sm text-slate2">Questions? <Link to="/contact" className="font-semibold text-brand underline">Contact us</Link>. You can also read how the application fee works on the <Link to="/how-it-works" className="font-semibold text-brand underline">How it works</Link> page.</p>
      </div>
    </div>
  );
}
