// Lucide-style thin-stroke icons (stroke-width 1.5), per the Industry design system.
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.5} aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const CartIcon = (p: IconProps) => (
  <Icon size={19} {...p}><path d="M3 4h2l2.4 11h10.2L20 7H6.5" /><circle cx="9" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></Icon>
);
export const SearchIcon = (p: IconProps) => (
  <Icon size={15} {...p}><circle cx="11" cy="11" r="7" /><path d="M16 16l5 5" /></Icon>
);
export const BoxIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></Icon>
);
export const ScanIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 8V4h4M21 8V4h-4M3 16v4h4M21 16v4h-4" /><path d="M7 12h10" /></Icon>
);
export const TruckIcon = (p: IconProps) => (
  <Icon {...p}><path d="M2 6h11v10H2zM13 9h4l4 3v4h-8z" /><circle cx="6" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></Icon>
);
