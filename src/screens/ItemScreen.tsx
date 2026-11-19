import type { Dispatch } from 'react';
import { Blueprint } from '../components/Blueprint';
import { SectionLabel } from '../components/SectionLabel';
import { Stepper } from '../components/Stepper';
import { stockStatus } from '../data';
import type { Action, AppState } from '../store';

export function ItemScreen({ state, dispatch }: { state: AppState; dispatch: Dispatch<Action> }) {
  const it = state.items.find(i => i.id === state.activeId) ?? state.items[0];
  const st = stockStatus(it);
  const peak = Math.max(1, ...it.usage);
  const lots = it.lots.length ? it.lots : [{ lot: '—', exp: 'none on shelf', qty: 0 }];
  const cartQty = state.cart[it.id] ?? 0;

  return (
    <div className="screen screen--top-tight">
      <button type="button" className="btn btn-ghost btn-caps btn-touch back-btn"
        onClick={() => dispatch({ type: 'navigate', screen: 'stock' })}>
        ← Stock
      </button>

      <div>
        <div className="mono-meta mono-meta--accent">{it.part}</div>
        <h2 className="screen-title item-title">{it.name}</h2>
        <div className="sub-meta">{it.loc} · lot {it.lot} · exp {it.exp}</div>
      </div>

      <dl className="stat-grid">
        <div><dt>On hand</dt><dd>{it.onHand}</dd></div>
        <div><dt>Par level</dt><dd>{it.par}</dd></div>
        <div><dt>On order</dt><dd>{it.onOrder}</dd></div>
      </dl>

      <div>
        <SectionLabel>Used · last 6 procedures</SectionLabel>
        <div className="usage-chart" role="img"
          aria-label={`Units used per procedure: ${it.usage.join(', ')}`}>
          {it.usage.map((v, i) => (
            <div key={i} className="usage-chart__col">
              <div className={`usage-chart__bar${i === it.usage.length - 1 ? ' is-latest' : ''}`}
                style={{ height: Math.max(3, Math.round((v / peak) * 62)) }} />
              <div className="usage-chart__label">p{i + 1}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Lots on shelf</SectionLabel>
        <table className="table">
          <thead><tr><th>Lot</th><th>Expires</th><th className="cell-right">Qty</th></tr></thead>
          <tbody>
            {lots.map(l => (
              <tr key={l.lot}>
                <td className="cell-mono">{l.lot}</td>
                <td className="cell-text">{l.exp}</td>
                <td className="cell-mono cell-right">{l.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Blueprint className="panel add-reorder">
        <div className="grow">
          <div className="field-label">Add to reorder</div>
          <div className="sub-meta">Suggested {st.suggested} to reach par of {it.par}</div>
        </div>
        <Stepper label="reorder quantity" value={cartQty}
          onDec={() => dispatch({ type: 'addToCart', id: it.id, delta: -1 })}
          onInc={() => dispatch({ type: 'addToCart', id: it.id, delta: 1 })} />
      </Blueprint>
    </div>
  );
}
