import type { Order } from '../../shared/types';

export interface NsItem {
  id: number;
  itemNumber: string;
  name: string;
  lotTracked: boolean;
}

export interface NsCustomer {
  id: number;
  name: string;
  terms: string | null;
  priceLevel: string | null;
}

export interface NewOrder {
  customerId: number;
  lines: { itemId: number; qty: number }[];
  /** Goes in the order's PO # field so Invictos can see where it came from. */
  reference: string;
}

/** Everything the app needs from NetSuite. Sample and live versions both implement it. */
export interface NetSuiteGateway {
  getCustomer(customerId: number): Promise<NsCustomer | null>;
  getItems(ids: number[]): Promise<NsItem[]>;
  findItem(itemNumber: string): Promise<NsItem | null>;
  /** Items this customer bought in the last 12 months, with the largest single-order quantity. */
  recentItems(customerId: number): Promise<{ item: NsItem; maxQty: number }[]>;
  /** The customer's sales orders from the last `days` days, newest first. */
  getOrders(customerId: number, days: number): Promise<Order[]>;
  /** Creates a sales order saved as Pending Approval. */
  createOrder(order: NewOrder): Promise<{ id: number; number: string }>;
}

export class NetSuiteError extends Error {}

/** NetSuite sales order status letter → app status. */
export function mapOrderStatus(letter: string): Order['status'] {
  switch (letter) {
    case 'A': return 'pending_approval';
    case 'B': return 'approved';
    case 'C': return 'cancelled';
    case 'D':
    case 'E': return 'partially_shipped';
    case 'F':
    case 'G': return 'shipped';
    default: return 'closed';
  }
}

export const APP_REFERENCE_PREFIX = 'Clinic app';
