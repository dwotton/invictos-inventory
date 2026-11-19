import type { Dispatch } from 'react';
import { Blueprint } from '../components/Blueprint';
import { SearchIcon } from '../components/icons';
import { SectionLabel } from '../components/SectionLabel';
import { StatusTag } from '../components/StatusTag';
import { stockStatus } from '../data';
import type { Action, AppState, StockFilter } from '../store';

const filters: { key: StockFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Below par' },
  { key: 'order', label: 'On order' },
];

export function StockScreen({ state, dispatch }: { state: AppState; dispatch: Dispatch<Action> }) {
  const rows = state.items.map(it => ({ it, st: stockStatus(it) }));
  const low = rows.filter(r => r.st.critical);
  const q = state.query.trim().toLowerCase();
  const shown = rows
    .filter(r => (state.filter === 'low' ? r.st.critical : state.filter === 'order' ? r.it.onOrder > 0 : true))
    .filter(r => !q || [r.it.part, r.it.name, r.it.lot].some(f => f.toLowerCase().includes(q)));

  const lowSummary = low.slice(0, 2).map(r => r.it.name.split(' · ')[0]).join(' · ')
    + (low.length > 2 ? ` +${low.length - 2} more` : '');

  return (
    <div className="screen">
      <label className="search">
        <SearchIcon className="search__icon" />
        <span className="visually-hidden">Search stock</span>
        <input className="input search__input" type="search" placeholder="Part #, size or lot"
          value={state.query} onChange={e => dispatch({ type: 'setQuery', query: e.target.value })} />
      </label>

      <div className="filter-bar" role="group" aria-label="Filter stock">
        {filters.map(f => (
          <button key={f.key} type="button" aria-pressed={state.filter === f.key}
            className={`filter-bar__opt${state.filter === f.key ? ' is-active' : ''}`}
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
            onClick={() => dispatch({ type: 'reorderAllLow' })}>
            Reorder all
          </button>
        </Blueprint>
      )}

      <div className="stack-9">
        <SectionLabel>Implant stock · {shown.length} lines</SectionLabel>
        {shown.map(({ it, st }) => (
          <button key={it.id} type="button" className={`stock-row${st.critical ? ' is-critical' : ''}`}
            onClick={() => dispatch({ type: 'openItem', id: it.id })}>
            <div className="row-top">
              <div className="grow">
                <div className="item-name">{it.name}</div>
                <div className="mono-meta">{it.part} · lot {it.lot} · {it.loc}</div>
              </div>
              <div className="qty-figure">
                <div className="qty-figure__num">{it.onHand}</div>
                <div className="qty-figure__label">of {it.par}</div>
              </div>
            </div>
            <div className="row-bottom">
              <div className="level-bar" aria-hidden="true">
                <div className="level-bar__fill" style={{ width: `${st.pct}%` }} />
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
