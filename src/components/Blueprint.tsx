import type { ElementType, ReactNode } from 'react';

/** The design system's `.blueprint` frame: hairline border + "+" registration marks. */
export function Blueprint({ as: Tag = 'div', className = '', children }: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={`blueprint ${className}`.trim()}>
      <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
      {children}
    </Tag>
  );
}
