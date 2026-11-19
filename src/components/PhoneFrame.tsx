import type { ReactNode } from 'react';

/**
 * On wide screens the app is presented inside a phone bezel (as in the design);
 * on a real phone the bezel disappears and the app fills the viewport.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone">
      <div className="phone__island" aria-hidden="true" />
      <div className="phone__status" aria-hidden="true">9:41</div>
      <div className="phone__screen">{children}</div>
      <div className="phone__home" aria-hidden="true" />
    </div>
  );
}
