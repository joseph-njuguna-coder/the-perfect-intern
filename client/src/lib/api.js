export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || 'Something went wrong. Please try again.');
    this.status = status;
    this.code = body?.error?.code;
    this.fields = body?.error?.fields || {};
  }
}

let csrf = null;
export const setCsrf = (t) => { csrf = t; };
export const clearCsrf = () => { csrf = null; };

async function getCsrf(force = false) {
  if (!csrf || force) {
    const res = await fetch('/api/csrf', { credentials: 'include' });
    csrf = (await res.json()).token;
  }
  return csrf;
}

export async function api(path, { method = 'GET', body, query } = {}) {
  const qs = query
    ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null))}`
    : '';
  const write = method !== 'GET';
  const send = async (force) => {
    const headers = body ? { 'Content-Type': 'application/json' } : {};
    if (write) headers['x-csrf-token'] = await getCsrf(force);
    return fetch(`/api${path}${qs}`, { method, headers, credentials: 'include', body: body ? JSON.stringify(body) : undefined });
  };
  let res = await send(false);
  if (write && res.status === 403) {
    const peek = await res.clone().json().catch(() => null);
    if (peek?.error?.code === 'CSRF_INVALID') res = await send(true);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

/** Multipart upload of a single file under the field name "file". */
export async function upload(path, file) {
  const send = async (force) => {
    const body = new FormData();
    body.append('file', file);
    return fetch(`/api${path}`, { method: 'POST', credentials: 'include', headers: { 'x-csrf-token': await getCsrf(force) }, body });
  };
  let res = await send(false);
  if (res.status === 403) {
    const peek = await res.clone().json().catch(() => null);
    if (peek?.error?.code === 'CSRF_INVALID') res = await send(true);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
