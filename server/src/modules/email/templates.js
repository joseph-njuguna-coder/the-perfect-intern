import { env } from '../../config/env.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout(title, bodyHtml, cta) {
  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Arial,sans-serif;color:#02205F">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <p style="margin:0 0 24px"><img src="${env.appUrl}/logo-mark.png" width="40" height="40" alt="" style="vertical-align:middle;border:0"> <span style="font-weight:800;font-size:18px;vertical-align:middle;color:#02205F">THE PERFECT <span style="color:#F7941D">INTERN</span></span></p>
    <div style="background:#fff;border-radius:12px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
      ${bodyHtml}
      ${cta ? `<p style="margin:24px 0 0"><a href="${cta.url}" style="background:#0A56B5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">${esc(cta.label)}</a></p>` : ''}
    </div>
    <p style="font-size:12px;color:#6b7686;margin-top:16px">Your professional journey starts here. Powered by Porous Kenya.<br/>Payment on The Perfect Intern activates application access; it does not guarantee an interview or placement.</p>
  </div></body></html>`;
}

export function verificationEmail(name, token) {
  const url = `${env.appUrl}/verify-email?token=${token}`;
  return {
    subject: 'Verify your email address',
    html: layout('Confirm your email', `<p>Hi ${esc(name)}, confirm your email to activate your account. This link expires in 24 hours.</p>`, { url, label: 'Verify email' }),
    text: `Hi ${name}, verify your email (valid 24 hours): ${url}`,
  };
}

export function resetEmail(name, token) {
  const url = `${env.appUrl}/reset-password?token=${token}`;
  return {
    subject: 'Reset your password',
    html: layout('Reset your password', `<p>Hi ${esc(name)}, we received a request to reset your password. This link expires in 1 hour. If you did not ask for this, ignore this email.</p>`, { url, label: 'Choose a new password' }),
    text: `Hi ${name}, reset your password (valid 1 hour): ${url}`,
  };
}

export function welcomeEmail(name, role) {
  const url = `${env.appUrl}/login`;
  const body = role === 'company'
    ? '<p>Your email is verified. Our team will review your company before listings go public; we will email you once it is approved.</p>'
    : '<p>Your email is verified. Complete your profile, browse internships for free, and activate application access when you are ready to apply.</p>';
  return {
    subject: 'Welcome to The Perfect Intern',
    html: layout(`Welcome, ${name}`, body, { url, label: 'Sign in' }),
    text: `Welcome ${name}! Sign in: ${url}`,
  };
}

export function notificationEmail({ name, title, body, ctaPath, ctaLabel }) {
  const url = ctaPath ? `${env.appUrl}${ctaPath}` : null;
  const paras = String(body).split('\n').filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('');
  return {
    subject: title,
    html: layout(title, `<p>Hi ${esc(name)},</p>${paras}`, url ? { url, label: ctaLabel || 'Open dashboard' } : null),
    text: `Hi ${name},\n\n${body}${url ? `\n\n${url}` : ''}`,
  };
}

export function duplicateRegistrationEmail(name) {
  const url = `${env.appUrl}/forgot-password`;
  return {
    subject: 'Someone tried to register with your email',
    html: layout('You already have an account', `<p>Hi ${esc(name)}, someone tried to create a new account with this email address. You already have one, so nothing was changed. If it was you, sign in or reset your password. If not, you can ignore this email.</p>`, { url, label: 'Reset password' }),
    text: `Hi ${name}, someone tried to register with your email, but you already have an account. Sign in, or reset your password: ${url}`,
  };
}

export function passwordChangedEmail(name) {
  const url = `${env.appUrl}/forgot-password`;
  return {
    subject: 'Your password was changed',
    html: layout('Password changed', `<p>Hi ${esc(name)}, your password was just changed. If you did this, no action is needed. If not, reset it immediately and contact support.</p>`, { url, label: 'Reset password' }),
    text: `Hi ${name}, your password was changed. If this was not you, reset it now: ${url}`,
  };
}
