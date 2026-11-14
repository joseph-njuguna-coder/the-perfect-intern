/** "Name <a@b.com>" -> { name, email }. Pure helper (no imports) so it is easy to unit test. */
export function parseFrom(from) {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from || '');
  return m ? { name: m[1].trim(), email: m[2].trim() } : { name: '', email: String(from || '').trim() };
}
