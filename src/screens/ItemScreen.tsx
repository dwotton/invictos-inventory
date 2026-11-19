import type { Dispatch } from 'react';
import type { StockLine } from '../../shared/types';
import { Blueprint } from '../components/Blueprint';
import { SectionLabel } from '../components/SectionLabel';
import { Stepper } from '../components/Stepper';
import { stockStatus } from '../data';
import type { Action, UiState } from '../store';

export function ItemScreen({ stock, ui, dispatch }: { stock: StockLine[]; ui: UiState; dispatch: Dispatch<Action> }) {
  const it = stock.find(i => i.id === ui.activeId) ?? stock[0];
  if (!it) return null;
  const st = stockStatus(it);
  const peak = Math.max(1, ...it.usage);
  const cartQty = ui.cart[it.id] ?? 0;

  return (
    <div className="screen screen--top-tight">
      <button type="button" className="btn btn-ghost btn-caps btn-touch back-btn"
        onClick={() => dispatch({ type: 'navigate', screen: 'stock' })}>
        ← Stock
      </button>

      <div>
        <div className="mono-meta mono-meta--accent">{it.itemNumber}</div>
        <h2 className="screen-title item-title">{it.name}</h2>
        <div className="sub-meta">
          {[it.loc, it.lotTracked ? 'Lot tracked' : 'Not lot tracked'].filter(Boolean).join(' · ')}
        </div>
      </div>

      <dl className="stat-grid">
        <div><dt>On hand</dt><dd>{it.onHand}</dd></div>
        <div><dt>Par level</dt><dd>{it.par}</dd></div>
        <div><dt>On order</dt><dd>{it.onOrder}</dd></div>
      </dl>

      <div>
        <SectionLabel>Used · last {it.usage.length || 6} logged uses</SectionLabel>
        {it.usage.length ? (
          <div className="usage-chart" role="img" aria-label={'Units used per logged use: ' + it.usage.join(', ')}>
            {it.usage.map((v, i) => (
              <div key={i} className="usage-chart__col">
                <div className={'usage-chart__bar' + (i === it.usage.length - 1 ? ' is-latest' : '')}
                  style={{ height: Math.max(3, Math.round((v / peak) * 62)) }} />
                <div className="usage-chart__label">×{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">No uses logged in the app yet.</p>
        )}
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
