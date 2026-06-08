import type { ReactElement, SVGProps } from 'react';

export type IconName = 'pin' | 'building' | 'search' | 'chevron' | 'x' | 'star' | 'sliders';

const PATHS: Record<IconName, ReactElement> = {
  pin: (
    <path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
  ),
  building: (
    <path d="M4 21V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v16 M9 9h0 M9 13h0 M9 17h0 M15 9h0 M15 13h0 M15 17h0" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  x: <path d="M6 6l12 12 M18 6 6 18" />,
  star: <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21l1.1-6.5L2.6 9.8l6.5-.9L12 3Z" />,
  sliders: <path d="M4 8h10 M18 8h2 M4 16h2 M10 16h10 M14 6v4 M6 14v4" />,
};

type IconProps = SVGProps<SVGSVGElement> & { name: IconName; size?: number; title?: string };

export function Icon({ name, size = 20, title, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === 'star' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
