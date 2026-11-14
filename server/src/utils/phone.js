/** Normalise Kenyan numbers (07xx, 01xx, +254..., 254...) to 2547XXXXXXXX / 2541XXXXXXXX. */
export function normaliseKenyanPhone(input) {
  const digits = String(input || '').replace(/[\s()+-]/g, '');
  let n = digits;
  if (/^0[17]\d{8}$/.test(n)) n = `254${n.slice(1)}`;
  else if (/^[17]\d{8}$/.test(n)) n = `254${n}`;
  return /^254[17]\d{8}$/.test(n) ? n : null;
}
