/** Small uppercase status chip. `critical` reverses it onto the deep steel field. */
export function StatusTag({ critical, children, className = '' }: {
  critical: boolean;
  children: string;
  className?: string;
}) {
  return <span className={`status-tag${critical ? ' status-tag--critical' : ''} ${className}`.trim()}>{children}</span>;
}
