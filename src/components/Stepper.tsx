/** Square –/+ quantity control. */
export function Stepper({ value, label, onDec, onInc, compact = false }: {
  value: number;
  label: string;
  onDec: () => void;
  onInc: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`stepper${compact ? ' stepper--compact' : ''}`} role="group" aria-label={label}>
      <button type="button" className="stepper__btn" onClick={onDec} aria-label={`Decrease ${label}`}>–</button>
      <output className="stepper__value" aria-live="polite">{value}</output>
      <button type="button" className="stepper__btn" onClick={onInc} aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}
