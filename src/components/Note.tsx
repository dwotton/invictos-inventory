import type { ReactNode } from 'react';

/** Accent-railed callout, used for toasts and order notes. */
export function Note({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return <div className={`note${small ? ' note--small' : ''}`} role="status">{children}</div>;
}
