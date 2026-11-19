// Built-in sample data so the app runs without NetSuite keys.
// Item numbers match real Invictos items; customers and orders are made up.
import type { Order } from '../../shared/types';
import { APP_REFERENCE_PREFIX, type NetSuiteGateway, type NsItem } from './gateway';

const items: NsItem[] = [
  { id: 1305, itemNumber: '002716', name: 'Locking Screw, 2.7mm x 16mm', lotTracked: true },
  { id: 1307, itemNumber: '002720', name: 'Locking Screw, 2.7mm x 20mm', lotTracked: true },
  { id: 1862, itemNumber: '072412', name: 'Ti Star Cortical Screw, 2.4mm x 12mm', lotTracked: true },
  { id: 1867, itemNumber: '072422', name: 'Ti Star Cortical Screw, 2.4mm x 22mm', lotTracked: true },
  { id: 1871, itemNumber: '392018', name: 'T-Plate, 1.5mm Locking Comp, 2+4 Hole 33mmL', lotTracked: true },
  { id: 1774, itemNumber: '971001', name: 'TPLO Plate Caddy, 3.5mm', lotTracked: false },
];

const SAMPLE_CUSTOMER = { id: 1001, name: 'Riverbend Veterinary Surgery (sample)', terms: 'Net 30', priceLevel: 'SURGE VET' };

const line = (id: number, qty: number, shipped = 0, backordered = 0) => {
  const it = items.find(i => i.id === id)!;
  return { itemId: id, itemNumber: it.itemNumber, name: it.name, qty, shipped, backordered };
};

const orders: Order[] = [
  { id: 900003, number: 'SO-SAMPLE-3', date: '11/18/2026', status: 'partially_shipped', fromApp: true,
    lines: [line(1305, 20, 20), line(1871, 2, 0, 2)],
    shipments: [{ number: 'IF-SAMPLE-2', date: '11/18/2026', service: 'FedEx 2 Day', tracking: '385100000000', estDelivery: '11/20/2026' }] },
  { id: 900002, number: 'SO-SAMPLE-2', date: '11/12/2026', status: 'shipped', fromApp: false,
    lines: [line(1862, 10, 10)],
    shipments: [{ number: 'IF-SAMPLE-1', date: '11/12/2026', service: 'UPS Ground', tracking: '1Z0000000000000000', estDelivery: '11/15/2026' }] },
];
let seq = 4;

export const sampleGateway: NetSuiteGateway = {
  async getCustomer(id) {
    return id === SAMPLE_CUSTOMER.id ? SAMPLE_CUSTOMER : null;
  },
  async getItems(ids) {
    return items.filter(i => ids.includes(i.id));
  },
  async findItem(itemNumber) {
    return items.find(i => i.itemNumber === itemNumber) ?? null;
  },
  async recentItems() {
    return items.map((item, i) => ({ item, maxQty: [20, 24, 10, 10, 3, 1][i] }));
  },
  async getOrders(customerId) {
    return customerId === SAMPLE_CUSTOMER.id ? orders : [];
  },
  async createOrder(o) {
    const id = 900000 + seq;
    const number = 'SO-SAMPLE-' + seq++;
    orders.unshift({
      id, number, date: new Date().toLocaleDateString('en-US'), status: 'pending_approval',
      fromApp: o.reference.startsWith(APP_REFERENCE_PREFIX),
      lines: o.lines.map(l => line(l.itemId, l.qty)), shipments: [],
    });
    return { id, number };
  },
};
