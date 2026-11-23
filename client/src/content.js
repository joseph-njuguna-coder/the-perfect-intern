// PLACEHOLDER CONTENT: replace these with real, consented testimonials before launch.
export const TESTIMONIALS = [
  { quote: 'I filled in my profile once and applied to several companies without retyping anything.', name: 'james mwangi', role: 'intern Tech savannah' },
  { quote: 'Having applicants arrive with a CV, cover letter and a clear status made shortlisting much quicker.', name: 'Judy kyalo', role: 'Hiring Manager' },
  { quote: 'Knowing exactly where each application stood took the guesswork out of waiting.', name: 'stephen mwikya]', role: 'Data analyst intern' },
];

export const FAQS = (fee) => [
  ['Is it free to register and browse?', 'Yes. Registering, building your profile and browsing every approved internship is free.'],
  ['Is The Perfect Intern a Kenyan company?', 'Yes. The Perfect Intern is a Kenyan company based in Kenya.'],
  ['Is The Perfect Intern legit?', 'Yes. The Perfect Intern is a legitimate business that links companies with people looking for internships or attachments, and the other way round.'],
  ['Does The Perfect Intern only target university students?', 'No. Everyone in a tertiary institution (universities, colleges, polytechnics and vocational training institutions) who needs an internship or attachment can use The Perfect Intern.'],
  ['What does the KSh ' + fee + ' fee cover?', `A one-time payment of KSh ${fee} activates application access on your account. After that you can apply to as many internships as you like without paying again.`],
  ['Why does The Perfect Intern ask students for money?', 'The fee helps the team maintain the website and carry out research that makes the pool of opportunities wider and easier to reach. It also supports the marketing team that works to convince companies to share their internship and attachment opportunities with us.'],
  ['Does The Perfect Intern select students for internships?', 'No. Students apply from the pool of opportunities that companies share. The decision to accept or decline an application lies solely with the company looking for interns.'],
  ['Does paying guarantee an interview or placement?', 'No. Payment unlocks the ability to apply. Companies decide who they shortlist, interview and select.'],
  ['Does The Perfect Intern refund the fee if I do not get an internship?', 'No. The access fee is not refunded, because the decision to accept or decline an application lies solely with the company looking for interns.'],
  ['How do I pay?', 'You pay by M-Pesa. When you apply, you enter your number, approve the prompt on your phone with your PIN, and access activates once the payment is confirmed.'],
  ['How are companies checked?', 'Every company is reviewed by our team before its internships become visible to interns.'],
  ['How is my personal data protected?', 'We handle your data in line with the Kenya Data Protection Act, 2019. Your CV and profile are only shared with the companies you apply to. Read our Privacy Policy for the details.'],
];

export const BRAND = { tagline: 'Your professional journey starts here', poweredBy: 'Porous Kenya' };

// Official channels. Tracking parameters were removed from the links you supplied.
export const SOCIALS = [
  { name: 'Instagram', handle: '@theperfect_intern', url: 'https://www.instagram.com/theperfect_intern' },
  { name: 'LinkedIn', handle: 'The Perfect Intern', url: 'https://www.linkedin.com/company/the-perfect-intern/' },
  { name: 'Facebook', handle: 'Follow our page', url: 'https://www.facebook.com/share/14iPzRmNkKF/' },
  { name: 'TikTok', handle: '@phenomenal.chapterz', url: 'https://www.tiktok.com/@phenomenal.chapterz' },
  { name: 'Threads', handle: '@theperfect_intern', url: 'https://www.threads.net/@theperfect_intern' },
  { name: 'Google', handle: 'Find us on Google', url: 'https://share.google/YKqxktD3gfLgluoo2' },
];

// Shown on the Privacy Policy page. Add your official privacy/support email here once you have one.
export const PRIVACY_CONTACT_EMAIL = '';

// ---------- Resources page ----------
// Links were collected by your team and cleaned (tracking parameters and Google AMP wrappers removed). They have NOT been
// checked one by one, so open each before launch and delete any that no longer work.
const L = (title, url) => ({ title, url });
export const RESOURCES = {
  paid: [
    L('9 reasons internships should be paid (Prosple)', 'https://ph.prosple.com/campus/9-reasons-why-internships-should-be-paid'),
    L('Why your company needs to start paying interns (TechnologyAdvice)', 'https://technologyadvice.com/blog/human-resources/company-needs-start-paying-interns/'),
    L('5 reasons why companies should pay interns (LinkedIn)', 'https://www.linkedin.com/pulse/5-reasons-why-companies-should-pay-interns-caroline-schwarm'),
    L('Interns: to pay or not to pay (The Standard)', 'https://www.standardmedia.co.ke/amp/article/2001322677/interns-to-pay-or-not-to-pay'),
    L('Paid vs unpaid internships (Capital Placement)', 'https://capital-placement.com/blog/paid-internships-vs-unpaid-internships/'),
    L('Considering a paid internship? Read this first (Handshake)', 'https://joinhandshake.com/blog/students/considering-a-paid-internship-read-this-first/'),
    L('Unpaid internships and the law (Lexology)', 'https://www.lexology.com/library/detail.aspx?g=19dc520d-6343-435f-8d4e-d6b82c995243'),
    L('Should interns be paid? The KOT debate (The Star)', 'https://www.the-star.co.ke/news/2019-04-03-should-interns-be-paid-kot-debate/'),
    L('Are unpaid internships legal? (Business News Daily)', 'https://www.businessnewsdaily.com/15161-are-unpaid-internships-legal.html'),
    L('Why you should pay your interns (Give a Grad a Go)', 'https://giveagradago.com/resources/blog/should-internships-be-paid-or-unpaid-why-you-should-pay-your-interns/'),
    L('Law and unpaid internships: know your rights (TARGETjobs)', 'https://targetjobs.co.uk/careers-advice/internships/law-unpaid-internships-know-your-rights'),
    L('A guide to paying interns (Justworks)', 'https://www.justworks.com/blog/so-you-want-to-pay-your-interns-a-guide-to-paid-internships'),
    L('Employment rights for interns (GOV.UK)', 'https://www.gov.uk/employment-rights-for-interns'),
    L('Law and unpaid internships: know your rights (gradireland)', 'https://gradireland.com/careers-advice/internships/law-unpaid-internships-know-your-rights'),
  ],
  history: [
    L('A brief history of the internship (Taylor Research Group)', 'https://www.taylorresearchgroup.com/news/2017/4/5/a-brief-history-of-the-internship'),
    L('The history of internships (Forbes)', 'https://www.forbes.com/2009/04/27/intern-history-apprenticeship-leadership-careers-jobs.html'),
    L('The weird history of how internships came to be (Business Insider)', 'https://www.businessinsider.com/the-weird-history-of-how-internships-came-to-be-2016-6'),
    L('The history of interns and internships (TIME)', 'https://time.com/5342599/history-of-interns-internships/'),
    L('Internships in Africa (Go Overseas)', 'https://www.gooverseas.com/internships-abroad/africa'),
    L('Internship projects (African Impact)', 'https://africanimpact.com/internship-projects/'),
    L('Interning in Africa (GoAbroad)', 'https://www.goabroad.com/articles/intern-abroad/africa-internships'),
  ],
  movies: [
    L('Top internship movies to watch before you graduate (Medium)', 'https://medium.com/@switchidea/top-internship-movies-you-should-watch-before-you-graduate-7a235e9745ff'),
    L('Internship films and series (BestSimilar)', 'https://bestsimilar.com/tag/36055-internship'),
    L('Intern movies to watch in the holidays (Prosple)', 'https://au.prosple.com/campus/intern-movies-to-watch-in-the-holidays'),
    L('Movies about internships (Stars Insider)', 'https://www.starsinsider.com/amp/454260'),
    L('10 movies and shows that give a glimpse of internship life (BYU)', 'https://universe.byu.edu/2019/09/13/10-movies-and-tv-shows-that-give-you-a-glimpse-of-the-internship-life/'),
    L('Movies like The Intern (Ready Steady Cut)', 'https://readysteadycut.com/2023/05/03/movies-like-the-intern/'),
  ],
  books: [
    L('Best internship books (BookAuthority)', 'https://bookauthority.org/books/best-internship-books'),
    L('Internship publications (ILO)', 'https://www.ilo.org/global/publications/books/WCMS_799773/lang--en/index.htm'),
    L('New internship books (BookAuthority)', 'https://bookauthority.org/books/new-internship-books'),
    L('The Ultimate Guide to Internships (Amazon)', 'https://www.amazon.com/Ultimate-Guide-Internships-Internship-Thrive/dp/1621534383'),
    L('Open textbook on internships (University of Minnesota)', 'https://open.umn.edu/opentextbooks/textbooks/902'),
    L('Internship books (Goodreads)', 'https://www.goodreads.com/shelf/show/internships'),
    L('Internship guide (CUNY Library)', 'https://mec.cuny.libguides.com/Internships/InternshipsHome'),
    L('10 books to get you through your internship (Bustle)', 'https://www.bustle.com/articles/164727-10-books-to-get-you-through-your-summer-internship'),
    L('5 books every intern should read (Medium)', 'https://medium.com/illumination/5-books-every-intern-should-read-1faaa9f9f27f'),
    L('The Ultimate Guide to Internships (Scribd)', 'https://www.scribd.com/book/396707657/The-Ultimate-Guide-to-Internships-100-Steps-to-Get-a-Great-Internship-and-Thrive-in-It'),
    L('Best intern books (College Fashion)', 'https://www.collegefashion.net/college-life/best-intern-books/'),
    L('4 books every intern needs on their shelf (Glints)', 'https://glints.com/sg/hired/4-books-every-intern-needs-on-their-shelf-2/'),
    L('Internship books (APA)', 'https://www.apa.org/pubs/books/4313052'),
    L('Internship guide book (Academia)', 'https://www.academia.edu/36611395/INTERNSHIP_GUIDE_BOOK'),
  ],
  inspiration: [
    L('Inspiring interns (University of Tulsa)', 'https://utulsa.edu/inspire-interns/'),
    L('Internship quotes (AZQuotes)', 'https://www.azquotes.com/quotes/topics/internships.html'),
    L('50 inspirational career quotes (The Muse)', 'https://www.themuse.com/advice/50-inspirational-career-quotes'),
    L('Internship quotes (SearchQuotes)', 'https://www.searchquotes.com/search/Fun_Internship/'),
    L('Internship picture quotes (PictureQuotes)', 'http://www.picturequotes.com/internship-quotes'),
    L('Internship success tips (US Department of Education)', 'https://www2.ed.gov/students/prep/job/intern/success.html'),
    L('Internship quotes (QuoteMaster)', 'https://www.quotemaster.org/Internships'),
    L('Internship jokes (Bored Panda)', 'https://www.boredpanda.com/internship-jokes/'),
  ],
  // Written in our own words from guidance published by the UMBC Career Center.
  whyHire: [
    'Take routine work off your regular team so they can focus on higher-level tasks.',
    'Cover short-term staffing needs and finish defined projects or backlog work.',
    'Use a cost-effective way to add capacity.',
    'Work with motivated students who are keen to learn.',
    'Build a pipeline of future employees and help prepare tomorrow\'s workforce.',
    'Bring in fresh ideas, enthusiasm and comfort with new technology and social media.',
    'Give students practical learning that classrooms cannot.',
  ],
  quality: [
    'A part-time or full-time schedule where clerical or administrative work is no more than about a quarter of the role.',
    'A clear description of the job or project.',
    'An orientation to the organisation, its culture and the intern\'s assignments.',
    'Learning goals the intern can work towards and achieve.',
    'Regular feedback from a supervisor.',
  ],
  expect: [
    'Real work and meaningful contribution, not only errands.',
    'A mentor who gives guidance and feedback and models professionalism.',
    'New experience and skills in a particular field.',
    'Professional contacts and exposure to senior managers.',
    'An orientation covering the company\'s mission, rules and procedures, and an introduction to colleagues who can answer questions.',
  ],
};
