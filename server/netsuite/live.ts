// Talks to NetSuite's REST web services with token-based authentication (OAuth 1.0, HMAC-SHA256).
// Reads use SuiteQL; the only write is creating a sales order saved as Pending Approval.
import { createHmac, randomBytes } from 'node:crypto';
import type { Order, Shipment } from '../../shared/types';
import { config, ordersEnabled } from '../config';
import {
  APP_REFERENCE_PREFIX, NetSuiteError, mapOrderStatus,
  type NetSuiteGateway, type NsItem,
} from './gateway';

const ns = config.netsuite;

function baseUrl() {
  // Account "1234567_SB1" → host "1234567-sb1.suitetalk.api.netsuite.com"
  return 'https://' + ns.accountId.toLowerCase().replace(/_/g, '-') + '.suitetalk.api.netsuite.com';
}

const enc = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

function authHeader(method: string, url: string) {
  const u = new URL(url);
  const oauth: Record<string, string> = {
    oauth_consumer_key: ns.consumerKey,
    oauth_token: ns.tokenId,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_signature_method: 'HMAC-SHA256',
    oauth_version: '1.0',
  };
  const params = [...Object.entries(oauth), ...u.searchParams.entries()]
    .map(([k, v]) => [enc(k), enc(v)])
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => k + '=' + v)
    .join('&');
  const base = [method.toUpperCase(), enc(u.origin + u.pathname), enc(params)].join('&');
  const key = enc(ns.consumerSecret) + '&' + enc(ns.tokenSecret);
  const signature = createHmac('sha256', key).update(base).digest('base64');
  const fields = { ...oauth, oauth_signature: signature };
  return 'OAuth realm="' + ns.accountId.toUpperCase() + '", ' +
    Object.entries(fields).map(([k, v]) => k + '="' + enc(v) + '"').join(', ');
}

async function request(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}) {
  const url = baseUrl() + path;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(method, url),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json() as { 'o:errorDetails'?: { detail: string }[] };
      detail = j['o:errorDetails']?.map(d => d.detail).join(' ') ?? '';
    } catch { /* not JSON */ }
    throw new NetSuiteError('NetSuite returned ' + res.status + (detail ? ': ' + detail : ''));
  }
  return res;
}

type Row = Record<string, string | number | null>;

/** Runs a SuiteQL query and returns every row (follows paging). */
async function suiteql(q: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await request('POST', '/services/rest/query/v1/suiteql?limit=1000&offset=' + offset, { q }, { Prefer: 'transient' });
    const j = await res.json() as { items: Row[]; hasMore: boolean };
    rows.push(...j.items.map(({ links: _links, ...r }) => r as Row));
    if (!j.hasMore) return rows;
  }
}

// SuiteQL over REST has no bind parameters, so every value put into a query is checked first.
function int(n: number) {
  if (!Number.isSafeInteger(n) || n < 0) throw new NetSuiteError('Invalid id');
  return String(n);
}
const intList = (ids: number[]) => ids.map(int).join(',');
function itemNumberLiteral(s: string) {
  if (!/^[A-Za-z0-9._-]{1,60}$/.test(s)) throw new NetSuiteError('Invalid item number');
  return "'" + s + "'";
}
const str = (v: Row[string]) => (v === null || v === undefined ? null : String(v));

const toItem = (r: Row): NsItem => ({
  id: Number(r.id),
  itemNumber: String(r.itemid),
  name: String(r.displayname ?? r.itemid),
  lotTracked: r.islotitem === 'T',
});

const ITEM_FIELDS = 'id, itemid, displayname, islotitem';
const ITEM_TYPES = "('InvtPart', 'Kit', 'Assembly', 'NonInvtPart')";

export const liveGateway: NetSuiteGateway = {
  async getCustomer(id) {
    const [r] = await suiteql(
      'SELECT id, companyname, BUILTIN.DF(terms) AS terms, BUILTIN.DF(pricelevel) AS pricelevel FROM customer WHERE id = ' + int(id));
    return r ? { id: Number(r.id), name: String(r.companyname), terms: str(r.terms), priceLevel: str(r.pricelevel) } : null;
  },

  async getItems(ids) {
    if (!ids.length) return [];
    const out: NsItem[] = [];
    for (let i = 0; i < ids.length; i += 500) {
      const rows = await suiteql('SELECT ' + ITEM_FIELDS + ' FROM item WHERE id IN (' + intList(ids.slice(i, i + 500)) + ')');
      out.push(...rows.map(toItem));
    }
    return out;
  },

  async findItem(itemNumber) {
    const [r] = await suiteql('SELECT ' + ITEM_FIELDS + ' FROM item WHERE itemid = ' + itemNumberLiteral(itemNumber));
    return r ? toItem(r) : null;
  },

  async recentItems(customerId) {
    const rows = await suiteql(
      'SELECT tl.item AS item, MAX(-tl.quantity) AS maxqty FROM transactionline tl ' +
      'JOIN transaction t ON t.id = tl.transaction ' +
      "WHERE t.type = 'SalesOrd' AND t.entity = " + int(customerId) + ' ' +
      'AND t.trandate >= ADD_MONTHS(SYSDATE, -12) AND tl.mainline = \'F\' AND tl.itemtype IN ' + ITEM_TYPES + ' ' +
      'GROUP BY tl.item');
    const items = await this.getItems(rows.map(r => Number(r.item)));
    return rows.flatMap(r => {
      const item = items.find(i => i.id === Number(r.item));
      return item ? [{ item, maxQty: Math.max(1, Number(r.maxqty)) }] : [];
    });
  },

  async getOrders(customerId, days) {
    const headers = await suiteql(
      'SELECT t.id, t.tranid, t.trandate, t.status, t.otherrefnum FROM transaction t ' +
      "WHERE t.type = 'SalesOrd' AND t.entity = " + int(customerId) + ' ' +
      'AND t.trandate >= SYSDATE - ' + int(days) + ' ORDER BY t.id DESC');
    if (!headers.length) return [];
    const ids = intList(headers.map(h => Number(h.id)));

    const lines = await suiteql(
      'SELECT tl.transaction AS so, tl.item AS item, BUILTIN.DF(tl.item) AS itemnumber, i.displayname AS name, ' +
      'tl.quantity, tl.quantityshiprecv, tl.quantitybackordered FROM transactionline tl ' +
      'JOIN item i ON i.id = tl.item ' +
      'WHERE tl.transaction IN (' + ids + ") AND tl.mainline = 'F' AND tl.itemtype IN " + ITEM_TYPES +
      ' ORDER BY tl.linesequencenumber');

    const ships = await suiteql(
      'SELECT DISTINCT ptl.previousdoc AS so, t.id, t.tranid, t.trandate, BUILTIN.DF(t.trackingnumberlist) AS tracking, ' +
      't.custbody_carrier_service AS service, t.custbody_estimated_delivery_date AS est ' +
      'FROM previoustransactionlinelink ptl JOIN transaction t ON t.id = ptl.nextdoc ' +
      'WHERE ptl.previousdoc IN (' + ids + ") AND t.type = 'ItemShip'");

    return headers.map((h): Order => {
      const id = Number(h.id);
      const shipments: Shipment[] = ships
        .filter(s => Number(s.so) === id)
        .map(s => ({ number: String(s.tranid), date: String(s.trandate), service: str(s.service), tracking: str(s.tracking), estDelivery: str(s.est) }));
      return {
        id,
        number: String(h.tranid),
        date: String(h.trandate),
        status: mapOrderStatus(String(h.status)),
        fromApp: String(h.otherrefnum ?? '').startsWith(APP_REFERENCE_PREFIX),
        lines: lines.filter(l => Number(l.so) === id).map(l => ({
          itemId: Number(l.item),
          itemNumber: String(l.itemnumber),
          name: String(l.name ?? l.itemnumber),
          qty: Math.abs(Number(l.quantity)),
          shipped: Number(l.quantityshiprecv ?? 0),
          backordered: Number(l.quantitybackordered ?? 0),
        })),
        shipments,
      };
    });
  },

  async createOrder(o) {
    if (!ordersEnabled()) {
      throw new NetSuiteError('Submitting orders is switched off for this NetSuite account.');
    }
    const res = await request('POST', '/services/rest/record/v1/salesOrder', {
      entity: { id: int(o.customerId) },
      orderStatus: { id: 'A' }, // Pending Approval
      location: { id: int(ns.locationId) },
      otherRefNum: o.reference.slice(0, 45),
      memo: 'Placed from the Invictos clinic app',
      // Terms, price level and ship-to are left to default from the customer record.
      item: { items: o.lines.map(l => ({ item: { id: int(l.itemId) }, quantity: l.qty })) },
    });
    const id = Number((res.headers.get('location') ?? '').split('/').pop());
    const [r] = await suiteql('SELECT tranid FROM transaction WHERE id = ' + int(id));
    return { id, number: r ? String(r.tranid) : 'SO ' + id };
  },
};
