import { useReducer } from 'react';
import {
  config, seedCart, seedItems, seedOrders, stockStatus,
  type CaseLogEntry, type Item, type Order,
} from './data';

export type Screen = 'stock' | 'scan' | 'item' | 'cart' | 'incoming';
export type StockFilter = 'all' | 'low' | 'order';
export type ScanState = 'idle' | 'scanning' | 'found';

export interface AppState {
  items: Item[];
  screen: Screen;
  filter: StockFilter;
  query: string;
  activeId: string;
  cart: Record<string, number>;
  caseLog: CaseLogEntry[];
  useQty: number;
  scanState: ScanState;
  scannedId: string | null;
  lastScannedId: string | null;
  toast: string;
  poSeq: number;
  orders: Order[];
}

export type Action =
  | { type: 'navigate'; screen: Screen }
  | { type: 'openItem'; id: string }
  | { type: 'setFilter'; filter: StockFilter }
  | { type: 'setQuery'; query: string }
  | { type: 'addToCart'; id: string; delta: number }
  | { type: 'reorderAllLow' }
  | { type: 'scanStart' }
  | { type: 'scanFound'; id: string }
  | { type: 'setUseQty'; delta: number }
  | { type: 'logUse'; reorder: boolean }
  | { type: 'submitOrder' };

const initialState: AppState = {
  items: seedItems,
  screen: 'stock',
  filter: 'low',
  query: '',
  activeId: 'p3',
  cart: seedCart,
  caseLog: [],
  useQty: 1,
  scanState: 'idle',
  scannedId: null,
  lastScannedId: null,
  toast: '',
  poSeq: 2042,
  orders: seedOrders,
};

function withCartDelta(cart: Record<string, number>, id: string, delta: number) {
  const next = { ...cart };
  const qty = Math.max(0, (next[id] ?? 0) + delta);
  if (qty) next[id] = qty;
  else delete next[id];
  return next;
}

function reducer(s: AppState, a: Action): AppState {
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
    case 'reorderAllLow': {
      const cart = { ...s.cart };
      for (const it of s.items) {
        const st = stockStatus(it);
        if (st.critical) cart[it.id] = Math.max(cart[it.id] ?? 0, st.suggested);
      }
      return { ...s, cart, screen: 'cart' };
    }
    case 'scanStart':
      return { ...s, scanState: 'scanning', scannedId: null, toast: '' };
    case 'scanFound':
      return { ...s, scanState: 'found', scannedId: a.id, lastScannedId: a.id, useQty: 1 };
    case 'setUseQty':
      return { ...s, useQty: Math.min(20, Math.max(1, s.useQty + a.delta)) };
    case 'logUse': {
      const it = s.items.find(i => i.id === s.scannedId);
      if (!it) return s;
      const q = s.useQty;
      return {
        ...s,
        items: s.items.map(i => (i.id === it.id ? { ...i, onHand: Math.max(0, i.onHand - q) } : i)),
        caseLog: [{ name: it.name, qty: q }, ...s.caseLog],
        cart: a.reorder ? withCartDelta(s.cart, it.id, q) : s.cart,
        scanState: 'idle',
        scannedId: null,
        toast: a.reorder
          ? `✓ ${q} × ${it.name} logged to case ${config.caseId} in ezyVet · ${q} added to the reorder queue.`
          : `✓ ${q} × ${it.name} logged to case ${config.caseId} in ezyVet. Stock not reordered.`,
      };
    }
    case 'submitOrder': {
      const ids = Object.keys(s.cart);
      if (!ids.length) return s;
      const order: Order = {
        po: `PO-${s.poSeq}`,
        placed: config.today,
        step: 0,
        eta: 'Aug 3 (est.)',
        kind: 'submitted',
        lines: ids.map(id => ({ name: s.items.find(i => i.id === id)!.name, qty: s.cart[id], state: 'queued' })),
        note: 'Sent to Invictos · NetSuite acknowledgement usually lands within an hour.',
      };
      return {
        ...s,
        orders: [order, ...s.orders],
        items: s.items.map(i => (s.cart[i.id] ? { ...i, onOrder: i.onOrder + s.cart[i.id] } : i)),
        cart: {},
        poSeq: s.poSeq + 1,
        screen: 'incoming',
      };
    }
  }
}

export function useAppStore() {
  return useReducer(reducer, initialState);
}
