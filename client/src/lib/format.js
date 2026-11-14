export const STATUS = {
  submitted: ['Submitted', 'bg-ink-100 text-ink'],
  under_review: ['Under review', 'bg-gold-50 text-gold-700'],
  shortlisted: ['Shortlisted', 'bg-brand-50 text-brand-700'],
  interview_scheduled: ['Interview scheduled', 'bg-brand-50 text-brand-700'],
  selected: ['Selected', 'bg-brand text-white'],
  rejected: ['Rejected', 'bg-red-50 text-red-700'],
  withdrawn: ['Withdrawn', 'bg-paper text-slate2'],
};
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDateTime = (d) => new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
