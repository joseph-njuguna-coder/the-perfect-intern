/** RFC 4180 CSV with protection against spreadsheet formula injection. */
export function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const toCsv = (headers, rows) => [headers.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n');
