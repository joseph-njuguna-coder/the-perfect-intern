/** Emblem from the supplied logo plus a live-text wordmark (navy "THE PERFECT", orange "INTERN").
 *  `light` is for dark backgrounds: the emblem sits on a white rounded chip so its navy parts stay visible. */
export default function Logo({ light = false, size = 40 }) {
  const mark = <img src="/logo-mark.png" alt="" width={size} height={size} className="block shrink-0" style={{ width: size, height: size }} />;
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="The Perfect Intern">
      {light ? <span className="rounded-xl bg-white p-1">{mark}</span> : mark}
      <span className="font-display leading-none">
        <span className={`block text-[10px] font-bold tracking-[0.22em] ${light ? 'text-ink-100' : 'text-ink'}`}>THE</span>
        <span className="block text-[16px] font-extrabold tracking-tight">
          <span className={light ? 'text-white' : 'text-ink'}>PERFECT </span><span className="text-gold">INTERN</span>
        </span>
      </span>
    </span>
  );
}
