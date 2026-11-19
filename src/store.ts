import { useReducer } from 'react';

// UI state only. Stock and orders come from the server (see App.tsx).

export type Screen = 'stock' | 'use' | 'item' | 'cart' | 'incoming';
export type StockFilter = 'all' | 'low' | 'order';

export interface CaseLogEntry {
  name: string;
  qty: number;
  caseRef: string;
}

export interface UiState {
  screen: Screen;
  filter: StockFilter;
  query: string;
  activeId: number | null;
  /** Reorder queue: NetSuite item id → quantity. */
  cart: Record<number, number>;
  /** Item picked on the Log use screen. */
  pickedId: number | null;
  useQty: number;
  caseRef: string;
  caseLog: CaseLogEntry[];
  toast: string;
}

export type Action =
  | { type: 'navigate'; screen: Screen }
  | { type: 'openItem'; id: number }
  | { type: 'setFilter'; filter: StockFilter }
  | { type: 'setQuery'; query: string }
  | { type: 'addToCart'; id: number; delta: number }
  | { type: 'fillCart'; quantities: Record<number, number> }
  | { type: 'clearCart' }
  | { type: 'pick'; id: number | null }
  | { type: 'setUseQty'; delta: number }
  | { type: 'setCaseRef'; caseRef: string }
  | { type: 'logged'; entry: CaseLogEntry; toast: string }
  | { type: 'toast'; toast: string };

const initial: UiState = {
  screen: 'stock',
  filter: 'low',
  query: '',
  activeId: null,
  cart: {},
  pickedId: null,
  useQty: 1,
  caseRef: '',
  caseLog: [],
  toast: '',
};

function withCartDelta(cart: Record<number, number>, id: number, delta: number) {
  const next = { ...cart };
  const qty = Math.max(0, (next[id] ?? 0) + delta);
  if (qty) next[id] = qty;
  else delete next[id];
  return next;
}

function reducer(s: UiState, a: Action): UiState {
  switch (a.type) {
    case 'navigate':
      return { ...s, screen: a.screen };
    case 'openItem':
      return { ...s, screen: 'item', activeId: a.id };
    case 'setFilter':
      return { ...s, filter: a.filter };
    case 'setQuery':
      return { ...s, query: a.query };
    case 'addToCart':
      return { ...s, cart: withCartDelta(s.cart, a.id, a.delta) };
    case 'fillCart': {
      const cart = { ...s.cart };
      for (const [id, q] of Object.entries(a.quantities)) cart[Number(id)] = Math.max(cart[Number(id)] ?? 0, q);
      return { ...s, cart, screen: 'cart' };
    }
    case 'clearCart':
      return { ...s, cart: {} };
    case 'pick':
      return { ...s, pickedId: a.id, useQty: 1, toast: '' };
    case 'setUseQty':
      return { ...s, useQty: Math.min(50, Math.max(1, s.useQty + a.delta)) };
    case 'setCaseRef':
      return { ...s, caseRef: a.caseRef };
    case 'logged':
      return { ...s, caseLog: [a.entry, ...s.caseLog], pickedId: null, useQty: 1, toast: a.toast };
    case 'toast':
      return { ...s, toast: a.toast };
  }
}

export function useUiStore() {
  return useReducer(reducer, initial);
}
