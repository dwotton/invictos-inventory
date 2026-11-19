// Types shared by the clinic app (src/) and the server (server/).

/** One implant line on a clinic's shelf: NetSuite item details plus the clinic's own counts. */
export interface StockLine {
  /** NetSuite internal item id. */
  id: number;
  /** NetSuite item number, e.g. "002716". */
  itemNumber: string;
  name: string;
  lotTracked: boolean;
  /** Units on the clinic's shelf (kept by the app, not NetSuite). */
  onHand: number;
  /** Target shelf level (kept by the app). */
  par: number;
  /** Units on open NetSuite orders for this clinic, not yet shipped. */
  onOrder: number;
  /** Where it lives in the clinic, e.g. "Bin A2". */
  loc: string;
  /** Units used per logged use, oldest first (up to the last 6). */
  usage: number[];
}

export type OrderStatus =
  | 'pending_approval'
  | 'approved'
  | 'partially_shipped'
  | 'shipped'
  | 'cancelled'
  | 'closed';

export interface OrderLine {
  itemId: number;
  itemNumber: string;
  name: string;
  qty: number;
  shipped: number;
  backordered: number;
}

export interface Shipment {
  number: string;
  date: string;
  service: string | null;
  tracking: string | null;
  estDelivery: string | null;
}

export interface Order {
  /** NetSuite internal id. */
  id: number;
  /** NetSuite sales order number, e.g. "SO17906". */
  number: string;
  date: string;
  status: OrderStatus;
  /** Placed from the clinic app (vs. web store or Invictos staff). */
  fromApp: boolean;
  lines: OrderLine[];
  shipments: Shipment[];
}

export interface SessionInfo {
  clinic: { name: string };
  netsuite: {
    /** "sample" uses built-in sample data; "live" talks to NetSuite. */
    mode: 'sample' | 'live';
    /** False when submitting orders is switched off on the server. */
    ordersEnabled: boolean;
  };
}

export interface UsageResult {
  line: StockLine;
}
