import { useState } from 'react';
import type { Order } from '../../shared/types';
import { Blueprint } from '../components/Blueprint';
import { StatusTag } from '../components/StatusTag';

const tagFor: Record<Order['status'], string> = {
  pending_approval: 'awaiting approval',
  approved: 'approved',
  partially_shipped: 'part shipped',
  shipped: 'shipped',
  cancelled: 'cancelled',
  closed: 'closed',
};

const ACTIVE: Order['status'][] = ['pending_approval', 'approved', 'partially_shipped'];

/** Which of the four progress steps the order has reached (0–3). */
function stepOf(o: Order) {
  if (o.status === 'pending_approval') return 0;
  if (o.status === 'approved') return 1;
  const est = o.shipments.map(s => s.estDelivery).filter(Boolean).map(d => new Date(d!));
  const arrived = o.status === 'shipped' && est.length > 0 && est.every(d => d.getTime() < Date.now());
  return arrived ? 3 : 2;
}

function headline(o: Order) {
  const est = o.shipments.map(s => s.estDelivery).filter(Boolean).pop();
  switch (o.status) {
    case 'pending_approval': return 'Waiting for Invictos approval';
    case 'approved': return 'Approved · being packed';
    case 'partially_shipped': return 'Part shipped' + (est ? ' · due ' + est : '');
    case 'shipped': return est ? 'Due ' + est : 'Shipped';
    case 'cancelled': return 'Cancelled';
    default: return 'Closed';
  }
}

function trackingUrl(tracking: string, service: string | null) {
  const s = (service ?? '').toLowerCase();
  if (s.includes('ups') || tracking.startsWith('1Z')) return 'https://www.ups.com/track?tracknum=' + encodeURIComponent(tracking);
  if (s.includes('fedex')) return 'https://www.fedex.com/fedextrack/?trknbr=' + encodeURIComponent(tracking);
  if (s.includes('usps')) return 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' + encodeURIComponent(tracking);
  return null;
}

const steps = ['Submitted', 'Approved', 'Shipped', 'Arrived'];

export function IncomingScreen({ orders, onRefresh }: { orders: Order[]; onRefresh: () => Promise<void> }) {
  const [refreshing, setRefreshing] = useState(false);
  const active = orders.filter(o => ACTIVE.includes(o.status) || (o.status === 'shipped' && stepOf(o) < 3));
  const recent = orders.filter(o => !active.includes(o)).slice(0, 5);
  const backorders = active.filter(o => o.lines.some(l => l.backordered > 0)).length;

  const refresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <div className="screen screen--top-tight">
      <div className="screen-head">
        <h2 className="screen-title">Incoming</h2>
        <div className="sub-meta">{active.length} open{backorders ? ' · ' + backorders + ' with backorders' : ''}</div>
      </div>
      <button type="button" className="btn btn-ghost btn-caps btn-touch back-btn" onClick={refresh} disabled={refreshing}>
        {refreshing ? 'Refreshing…' : '↻ Refresh from NetSuite'}
      </button>

      {active.length === 0 && <p className="empty empty--lg">No orders on the way.</p>}
      {active.map(o => <OrderCard key={o.id} o={o} />)}

      {recent.length > 0 && (
        <>
          <div className="section-label">Recent orders</div>
          {recent.map(o => <OrderCard key={o.id} o={o} />)}
        </>
      )}
    </div>
  );
}

function OrderCard({ o }: { o: Order }) {
  const step = stepOf(o);
  const critical = o.lines.some(l => l.backordered > 0);
  return (
    <Blueprint as="article" className="panel order">
      <div className="row-top">
        <div className="grow">
          <div className="mono-meta mono-meta--flush">
            {o.number} · placed {o.date}{o.fromApp ? '' : ' · web/phone'}
          </div>
          <div className="order__headline">{headline(o)}</div>
        </div>
        <StatusTag critical={critical} className="status-tag--lg">{critical ? 'backorder' : tagFor[o.status]}</StatusTag>
      </div>

      {o.status !== 'cancelled' && (
        <ol className="progress" aria-label={'Order progress: ' + steps[step]}>
          {steps.map((label, i) => (
            <li key={label} className={'progress__step' + (i <= step ? ' is-done' : '') + (i < step ? ' is-linked' : '')}>
              <div className="progress__track"><span className="progress__dot" /><span className="progress__line" /></div>
              <div className="progress__label">{label}</div>
            </li>
          ))}
        </ol>
      )}

      <div className="order__lines">
        {o.lines.map((ln, i) => {
          const state = ln.backordered > 0 ? 'backorder ' + ln.backordered
            : ln.shipped >= ln.qty ? 'shipped' : ln.shipped > 0 ? ln.shipped + ' shipped' : 'queued';
          return (
            <div key={i} className="order__line">
              <div className="grow order__line-name">{ln.name}</div>
              <div className="mono">×{ln.qty}</div>
              <div className={'order__line-state' + (ln.backordered > 0 ? ' is-critical' : '')}>{state}</div>
            </div>
          );
        })}
        {o.shipments.map(s => {
          const url = s.tracking ? trackingUrl(s.tracking, s.service) : null;
          return (
            <div key={s.number} className="shipment">
              <div className="field-label">{s.service ?? 'Shipment'} · shipped {s.date}</div>
              {s.tracking ? (
                url ? <a className="mono" href={url} target="_blank" rel="noreferrer">{s.tracking}</a>
                  : <span className="mono">{s.tracking}</span>
              ) : (
                <span className="sub-meta">Awaiting tracking number</span>
              )}
            </div>
          );
        })}
      </div>
    </Blueprint>
  );
}
