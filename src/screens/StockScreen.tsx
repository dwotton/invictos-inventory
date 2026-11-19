import type { Dispatch } from 'react';
import type { StockLine } from '../../shared/types';
import { Blueprint } from '../components/Blueprint';
import { SearchIcon } from '../components/icons';
import { SectionLabel } from '../components/SectionLabel';
import { StatusTag } from '../components/StatusTag';
import { stockStatus } from '../data';
import type { Action, StockFilter, UiState } from '../store';

const filters: { key: StockFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Below par' },
  { key: 'order', label: 'On order' },
];

export function matchesQuery(it: StockLine, query: string) {
  const q = query.trim().toLowerCase();
  return !q || [it.itemNumber, it.name, it.loc].some(f => f.toLowerCase().includes(q));
}

export function StockScreen({ stock, ui, dispatch }: { stock: StockLine[]; ui: UiState; dispatch: Dispatch<Action> }) {
  const rows = stock.map(it => ({ it, st: stockStatus(it) }));
  const low = rows.filter(r => r.st.critical);
  const shown = rows
    .filter(r => (ui.filter === 'low' ? r.st.critical : ui.filter === 'order' ? r.it.onOrder > 0 : true))
    .filter(r => matchesQuery(r.it, ui.query));

  const lowSummary = low.slice(0, 2).map(r => r.it.name).join(' · ')
    + (low.length > 2 ? ' +' + (low.length - 2) + ' more' : '');

  if (!stock.length) {
    return (
      <div className="screen">
        <h2 className="screen-title">No implants listed yet</h2>
        <p className="empty empty--lg">Invictos sets up the implants your clinic keeps on the shelf. Contact your Invictos rep to add them.</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <label className="search">
        <SearchIcon className="search__icon" />
        <span className="visually-hidden">Search stock</span>
        <input className="input search__input" type="search" placeholder="Item #, name or location"
          value={ui.query} onChange={e => dispatch({ type: 'setQuery', query: e.target.value })} />
      </label>

      <div className="filter-bar" role="group" aria-label="Filter stock">
        {filters.map(f => (
          <button key={f.key} type="button" aria-pressed={ui.filter === f.key}
            className={'filter-bar__opt' + (ui.filter === f.key ? ' is-active' : '')}
            onClick={() => dispatch({ type: 'setFilter', filter: f.key })}>
            {f.label}
          </button>
        ))}
      </div>

      {low.length > 0 && (
        <Blueprint className="par-alert">
          <div className="grow">
            <div className="par-alert__title">{low.length} below par</div>
            <div className="par-alert__summary">{lowSummary}</div>
          </div>
          <button type="button" className="btn btn-primary btn-caps par-alert__btn"
            onClick={() => dispatch({
              type: 'fillCart',
              quantities: Object.fromEntries(low.map(r => [r.it.id, r.st.suggested])),
            })}>
            Reorder all
          </button>
        </Blueprint>
      )}

      <div className="stack-9">
        <SectionLabel>Implant stock · {shown.length} lines</SectionLabel>
        {shown.map(({ it, st }) => (
          <button key={it.id} type="button" className={'stock-row' + (st.critical ? ' is-critical' : '')}
            onClick={() => dispatch({ type: 'openItem', id: it.id })}>
            <div className="row-top">
              <div className="grow">
                <div className="item-name">{it.name}</div>
                <div className="mono-meta">{[it.itemNumber, it.loc].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="qty-figure">
                <div className="qty-figure__num">{it.onHand}</div>
                <div className="qty-figure__label">of {it.par}</div>
              </div>
            </div>
            <div className="row-bottom">
              <div className="level-bar" aria-hidden="true">
                <div className="level-bar__fill" style={{ width: st.pct + '%' }} />
              </div>
              <StatusTag critical={st.critical}>{st.tag}</StatusTag>
            </div>
          </button>
        ))}
        {shown.length === 0 && <p className="empty">No implant lines match.</p>}
      </div>
    </div>
  );
}
