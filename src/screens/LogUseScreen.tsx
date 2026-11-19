import { useState, type Dispatch } from 'react';
import type { StockLine } from '../../shared/types';
import { Blueprint } from '../components/Blueprint';
import { SearchIcon } from '../components/icons';
import { Note } from '../components/Note';
import { SectionLabel } from '../components/SectionLabel';
import { Stepper } from '../components/Stepper';
import type { Action, UiState } from '../store';
import { matchesQuery } from './StockScreen';

export function LogUseScreen({ stock, ui, dispatch, onLog }: {
  stock: StockLine[];
  ui: UiState;
  dispatch: Dispatch<Action>;
  onLog: (reorder: boolean) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const picked = stock.find(i => i.id === ui.pickedId);
  const matches = stock.filter(it => matchesQuery(it, query));

  const log = async (reorder: boolean) => {
    setBusy(true);
    await onLog(reorder);
    setBusy(false);
    setQuery('');
  };

  return (
    <div className="screen">
      <div>
        <h2 className="screen-title">Log implant use</h2>
        <p className="sub-meta">Pick the implant as its pouch is opened.</p>
      </div>

      <div className="field">
        <label htmlFor="case-ref">Case or patient</label>
        <input id="case-ref" className="input" placeholder="e.g. #4471 · Mabel · TPLO" maxLength={80}
          value={ui.caseRef} onChange={e => dispatch({ type: 'setCaseRef', caseRef: e.target.value })} />
      </div>

      {picked ? (
        <Blueprint className="panel scan-match">
          <div className="row-top">
            <div className="grow">
              <div className="kicker">Selected implant</div>
              <div className="scan-match__name">{picked.name}</div>
              <div className="mono-meta">{[picked.itemNumber, picked.loc].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="qty-figure">
              <div className="qty-figure__num qty-figure__num--lg">{picked.onHand}</div>
              <div className="qty-figure__label">on hand</div>
            </div>
          </div>

          <div className="scan-match__qty">
            <div>
              <div className="field-label">Quantity used</div>
              <div className="sub-meta">{ui.caseRef ? 'Case ' + ui.caseRef : 'No case entered'}</div>
            </div>
            <Stepper label="quantity used" value={ui.useQty}
              onDec={() => dispatch({ type: 'setUseQty', delta: -1 })}
              onInc={() => dispatch({ type: 'setUseQty', delta: 1 })} />
          </div>

          <button type="button" className="btn btn-primary btn-block btn-caps btn-tall" disabled={busy}
            onClick={() => log(true)}>
            Log use + reorder {ui.useQty}
          </button>
          <button type="button" className="btn btn-secondary btn-block btn-caps btn-touch" disabled={busy}
            onClick={() => log(false)}>
            Log use only
          </button>
          <button type="button" className="btn btn-ghost btn-caps btn-touch back-btn" onClick={() => dispatch({ type: 'pick', id: null })}>
            ← Pick a different implant
          </button>
        </Blueprint>
      ) : (
        <div className="stack-9">
          <label className="search">
            <SearchIcon className="search__icon" />
            <span className="visually-hidden">Find implant</span>
            <input className="input search__input" type="search" placeholder="Item #, name or location"
              value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          {matches.map(it => (
            <button key={it.id} type="button" className="pick-row" onClick={() => dispatch({ type: 'pick', id: it.id })}>
              <div className="grow">
                <div className="item-name item-name--sm">{it.name}</div>
                <div className="mono-meta">{[it.itemNumber, it.loc].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="qty-figure">
                <div className="qty-figure__num">{it.onHand}</div>
                <div className="qty-figure__label">on hand</div>
              </div>
            </button>
          ))}
          {matches.length === 0 && <p className="empty">No implants match.</p>}
        </div>
      )}

      {ui.toast && <Note>{ui.toast}</Note>}

      <div>
        <SectionLabel>Logged this session</SectionLabel>
        {ui.caseLog.length > 0 ? (
          <table className="table">
            <tbody>
              {ui.caseLog.map((l, i) => (
                <tr key={i}>
                  <td className="cell-text">{l.name}{l.caseRef && <div className="sub-meta">{l.caseRef}</div>}</td>
                  <td className="cell-mono cell-right">×{l.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">Nothing logged yet.</p>
        )}
      </div>
    </div>
  );
}
