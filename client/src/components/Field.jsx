export default function Field({ label, error, hint, as = 'input', children, ...props }) {
  const id = props.id || props.name;
  const Tag = as;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>
      <Tag id={id} className="input" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...props}>{children}</Tag>
      {hint && !error && <p className="mt-1 text-xs text-slate2">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
