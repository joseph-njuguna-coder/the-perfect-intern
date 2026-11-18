import { IMAGES } from '../images.js';

/** Responsive photo: WebP srcset, intrinsic size (no layout shift), focal-point cropping, lazy loading unless `priority`. */
export default function Img({ name, sizes = '100vw', priority = false, alt, className = '', style, ...rest }) {
  const m = IMAGES[name];
  const largest = m.widths[m.widths.length - 1];
  return (
    <img
      src={`/images/${name}-${largest}.webp`}
      srcSet={m.widths.map((w) => `/images/${name}-${w}.webp ${w}w`).join(', ')}
      sizes={sizes} width={m.w} height={m.h} alt={alt ?? m.alt}
      loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : undefined}
      className={`object-cover ${className}`} style={{ objectPosition: m.pos, ...style }} {...rest}
    />
  );
}
