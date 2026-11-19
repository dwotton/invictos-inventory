export interface Lot {
  lot: string;
  exp: string;
  qty: number;
}

export interface Item {
  id: string;
  part: string;
  name: string;
  lot: string;
  exp: string;
  onHand: number;
  par: number;
  onOrder: number;
  loc: string;
  /** Units used in each of the last six procedures, oldest first. */
  usage: number[];
  lots: Lot[];
}

export type OrderKind = 'submitted' | 'transit' | 'backorder' | 'delivered';
export type LineState = 'queued' | 'shipped' | 'backorder' | 'received';

export interface OrderLine {
  name: string;
  qty: number;
  state: LineState;
}

export interface Order {
  po: string;
  placed: string;
  /** Index of the last completed step: 0 submitted … 3 delivered. */
  step: number;
  eta: string;
  kind: OrderKind;
  lines: OrderLine[];
  note?: string;
}

export interface CaseLogEntry {
  name: string;
  qty: number;
}

export const config = {
  clinicName: 'Riverbend Veterinary Surgery',
  /** When on, logging a scanned implant also queues its replacement. */
  autoReorder: true,
  caseId: '#4471',
  patient: 'Mabel · 8 yr Lab · TPLO',
  estArrival: 'Mon Aug 3 · ground',
  today: 'Jul 29',
};

export const seedItems: Item[] = [
  { id: 'p1', part: 'IV-P2760', name: 'LCP 2.7 mm · 6-hole, 60 mm', lot: 'A4471', exp: '08/2028', onHand: 1, par: 4, onOrder: 0, loc: 'Bin A2', usage: [1, 0, 2, 1, 0, 1], lots: [{ lot: 'A4471', exp: 'Aug 2028', qty: 1 }] },
  { id: 'p2', part: 'IV-S2716', name: 'Cortical screw 2.7 × 16 mm', lot: 'C8820', exp: '01/2029', onHand: 12, par: 30, onOrder: 20, loc: 'Screw caddy 2.7', usage: [6, 4, 8, 5, 7, 6], lots: [{ lot: 'C8820', exp: 'Jan 2029', qty: 8 }, { lot: 'C8104', exp: 'Mar 2028', qty: 4 }] },
  { id: 'p3', part: 'IV-S2720', name: 'Cortical screw 2.7 × 20 mm', lot: 'C8821', exp: '01/2029', onHand: 4, par: 24, onOrder: 0, loc: 'Screw caddy 2.7', usage: [5, 3, 6, 4, 5, 4], lots: [{ lot: 'C8821', exp: 'Jan 2029', qty: 4 }] },
  { id: 'p4', part: 'IV-T35ML', name: 'TPLO plate 3.5 mm · left, medium', lot: 'T2209', exp: '11/2029', onHand: 2, par: 3, onOrder: 2, loc: 'Bin B1', usage: [1, 1, 0, 2, 1, 1], lots: [{ lot: 'T2209', exp: 'Nov 2029', qty: 2 }] },
  { id: 'p5', part: 'IV-L3524', name: 'Locking screw 3.5 × 24 mm', lot: 'L5510', exp: '06/2029', onHand: 22, par: 24, onOrder: 0, loc: 'Screw caddy 3.5', usage: [4, 2, 5, 3, 4, 3], lots: [{ lot: 'L5510', exp: 'Jun 2029', qty: 22 }] },
  { id: 'p6', part: 'IV-K16', name: 'Kirschner wire 1.6 mm', lot: 'K1160', exp: '02/2030', onHand: 0, par: 10, onOrder: 10, loc: 'Drawer C', usage: [3, 2, 4, 2, 3, 4], lots: [] },
  { id: 'p7', part: 'IV-K20150', name: 'IM pin 2.0 mm × 150 mm', lot: 'K2015', exp: '05/2030', onHand: 9, par: 12, onOrder: 0, loc: 'Drawer C', usage: [2, 1, 2, 0, 1, 2], lots: [{ lot: 'K2015', exp: 'May 2030', qty: 9 }] },
  { id: 'p8', part: 'IV-W10', name: 'Cerclage wire 1.0 mm · spool', lot: 'W1002', exp: '09/2029', onHand: 3, par: 4, onOrder: 0, loc: 'Drawer C', usage: [1, 0, 1, 1, 0, 0], lots: [{ lot: 'W1002', exp: 'Sep 2029', qty: 3 }] },
];

export const seedOrders: Order[] = [
  { po: 'PO-2041', placed: 'Jul 27', step: 2, eta: 'Thu Jul 31', kind: 'transit',
    lines: [{ name: 'Cortical screw 2.7 × 16 mm', qty: 20, state: 'shipped' }, { name: 'LCP 2.7 mm 6-hole', qty: 2, state: 'shipped' }] },
  { po: 'PO-2038', placed: 'Jul 22', step: 1, eta: 'Aug 12', kind: 'backorder',
    lines: [{ name: 'Kirschner wire 1.6 mm', qty: 10, state: 'backorder' }, { name: 'TPLO plate 3.5 mm left, med', qty: 2, state: 'shipped' }],
    note: '1.6 mm K-wire is on factory backorder to Aug 12. 1.4 mm is in stock — tap to swap the line.' },
  { po: 'PO-2030', placed: 'Jul 14', step: 3, eta: 'Jul 18', kind: 'delivered',
    lines: [{ name: 'Locking screw 3.5 × 24 mm', qty: 12, state: 'received' }] },
];

export const seedCart: Record<string, number> = { p2: 12, p3: 20 };

/** Barcodes the simulated scanner cycles through. */
export const scanPool = ['p3', 'p2', 'p1', 'p4'];

// ── Derived stock status ────────────────────────────────────────

export type StockTag = 'out' | 'low' | 'on order' | 'stocked';

export function stockStatus(it: Item) {
  const low = it.onHand < it.par * 0.5;
  const tag: StockTag = it.onHand === 0 ? 'out' : low ? 'low' : it.onOrder ? 'on order' : 'stocked';
  return {
    tag,
    critical: tag === 'out' || tag === 'low',
    pct: Math.min(100, Math.round((it.onHand / it.par) * 100)),
    suggested: Math.max(1, it.par - it.onHand - it.onOrder),
  };
}
