import type { Dispatch } from 'react';
import { Stepper } from '../components/Stepper';
import { config } from '../data';
import type { Action, AppState } from '../store';

export function CartScreen({ state, dispatch }: { state: AppState; dispatch: Dispatch<Action> }) {
  const ids = Object.keys(state.cart);
  const units = ids.reduce((n, id) => n + state.cart[id], 0);

  return (
    <div className="screen screen--top-tight">
      <div className="screen-head">
        <h2 className="screen-title">Reorder</h2>
        <div className="sub-meta">to Invictos · NetSuite</div>
      </div>

      {units > 0 ? (
        <>
          <div className="stack-9">
            {ids.map(id => {
              const it = state.items.find(i => i.id === id)!;
              const reason = it.onHand < it.par * 0.5
                ? `below par (${it.onHand} of ${it.par})`
                : 'replacing implants used';
              return (
                <div key={id} className="line-card">
                  <div className="grow">
                    <div className="item-name item-name--sm">{it.name}</div>
                    <div className="mono-meta">{it.part} · {reason}</div>
                  </div>
                  <Stepper compact label={`${it.name} quantity`} value={state.cart[id]}
                    onDec={() => dispatch({ type: 'addToCart', id, delta: -1 })}
                    onInc={() => dispatch({ type: 'addToCart', id, delta: 1 })} />
                </div>
              );
            })}
          </div>

          <div className="summary">
            <div className="summary__row"><span>Lines / units</span><span className="mono">{ids.length} / {units}</span></div>
            <div className="summary__row"><span>Ship to</span><span>{config.clinicName}</span></div>
            <div className="summary__row"><span>Est. arrival</span><span>{config.estArrival}</span></div>
            <button type="button" className="btn btn-primary btn-block btn-caps btn-tall"
              onClick={() => dispatch({ type: 'submitOrder' })}>
              Submit reorder
            </button>
            <p className="fine-print">Goes straight into Invictos NetSuite — confirmation and ETA post back here.</p>
          </div>
        </>
      ) : (
        <p className="empty empty--lg">Nothing queued. Scan an implant as it is used, or add from an item page.</p>
      )}
    </div>
  );
}
