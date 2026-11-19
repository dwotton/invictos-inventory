import { useState, type Dispatch } from 'react';
import type { StockLine } from '../../shared/types';
import { Note } from '../components/Note';
import { Stepper } from '../components/Stepper';
import type { Action, UiState } from '../store';

export function CartScreen({ stock, ui, dispatch, clinicName, ordersEnabled, onSubmit }: {
  stock: StockLine[];
  ui: UiState;
  dispatch: Dispatch<Action>;
  clinicName: string;
  ordersEnabled: boolean;
  onSubmit: (note: string) => Promise<{ number: string }>;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lines = Object.entries(ui.cart)
    .map(([id, qty]) => ({ it: stock.find(i => i.id === Number(id)), qty }))
    .filter((l): l is { it: StockLine; qty: number } => !!l.it);
  const units = lines.reduce((n, l) => n + l.qty, 0);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await onSubmit(note.trim());
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen screen--top-tight">
      <div className="screen-head">
        <h2 className="screen-title">Reorder</h2>
        <div className="sub-meta">to Invictos · NetSuite</div>
      </div>

      {units > 0 ? (
        <>
          <div className="stack-9">
            {lines.map(({ it, qty }) => {
              const reason = it.par > 0 && it.onHand < it.par * 0.5
                ? 'below par (' + it.onHand + ' of ' + it.par + ')'
                : 'replacing implants used';
              return (
                <div key={it.id} className="line-card">
                  <div className="grow">
                    <div className="item-name item-name--sm">{it.name}</div>
                    <div className="mono-meta">{it.itemNumber} · {reason}</div>
                  </div>
                  <Stepper compact label={it.name + ' quantity'} value={qty}
                    onDec={() => dispatch({ type: 'addToCart', id: it.id, delta: -1 })}
                    onInc={() => dispatch({ type: 'addToCart', id: it.id, delta: 1 })} />
                </div>
              );
            })}
          </div>

          <div className="summary">
            <div className="summary__row"><span>Lines / units</span><span className="mono">{lines.length} / {units}</span></div>
            <div className="summary__row"><span>Ship to</span><span>{clinicName}</span></div>
            <div className="summary__row"><span>Payment</span><span>Your account’s usual terms</span></div>
            <div className="field">
              <label htmlFor="order-note">Your reference (optional)</label>
              <input id="order-note" className="input" maxLength={30} placeholder="e.g. PO 2291 or case #4471"
                value={note} onChange={e => setNote(e.target.value)} />
            </div>
            {error && <Note>{error}</Note>}
            {!ordersEnabled && (
              <Note>Submitting orders is switched off while the app is being tested. Nothing will be sent to NetSuite.</Note>
            )}
            <button type="button" className="btn btn-primary btn-block btn-caps btn-tall"
              disabled={busy || !ordersEnabled} onClick={submit}>
              {busy ? 'Sending to NetSuite…' : 'Submit reorder for approval'}
            </button>
            <p className="fine-print">Invictos reviews each app order before it ships. Status and tracking show under Incoming.</p>
          </div>
        </>
      ) : (
        <p className="empty empty--lg">Nothing queued. Log an implant as it is used, or add from an item page.</p>
      )}
    </div>
  );
}
