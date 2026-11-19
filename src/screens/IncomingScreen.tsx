import { Blueprint } from '../components/Blueprint';
import { Note } from '../components/Note';
import { StatusTag } from '../components/StatusTag';
import type { Order } from '../data';

const steps = [
  { label: 'Submitted', when: 'placed' },
  { label: 'Confirmed', when: 'NetSuite' },
  { label: 'Shipped', when: 'UPS' },
  { label: 'Delivered', when: 'clinic' },
];

const tagFor: Record<Order['kind'], string> = {
  backorder: 'backorder',
  delivered: 'received',
  submitted: 'awaiting ack',
  transit: 'in transit',
};

function headline(o: Order) {
  if (o.kind === 'delivered') return `Received ${o.eta}`;
  if (o.kind === 'backorder') return `Partial · ETA ${o.eta}`;
  return `Arrives ${o.eta}`;
}

export function IncomingScreen({ orders }: { orders: Order[] }) {
  const open = orders.filter(o => o.kind !== 'delivered').length;
  const backorders = orders.filter(o => o.kind === 'backorder').length;

  return (
    <div className="screen screen--top-tight">
      <div className="screen-head">
        <h2 className="screen-title">Incoming</h2>
        <div className="sub-meta">{open} open · {backorders} backorder{backorders === 1 ? '' : 's'}</div>
      </div>

      {orders.map(o => (
        <Blueprint key={o.po} as="article" className="panel order">
          <div className="row-top">
            <div className="grow">
              <div className="mono-meta mono-meta--flush">{o.po} · placed {o.placed}</div>
              <div className="order__headline">{headline(o)}</div>
            </div>
            <StatusTag critical={o.kind === 'backorder'} className="status-tag--lg">{tagFor[o.kind]}</StatusTag>
          </div>

          <ol className="progress" aria-label={`Order progress: ${steps[o.step].label}`}>
            {steps.map((d, i) => (
              <li key={d.label} className={`progress__step${i <= o.step ? ' is-done' : ''}${i < o.step ? ' is-linked' : ''}`}>
                <div className="progress__track"><span className="progress__dot" /><span className="progress__line" /></div>
                <div className="progress__label">{d.label}</div>
                <div className="progress__when">{i === 0 ? o.placed : i <= o.step ? d.when : '—'}</div>
              </li>
            ))}
          </ol>

          <div className="order__lines">
            {o.lines.map((ln, i) => (
              <div key={i} className="order__line">
                <div className="grow order__line-name">{ln.name}</div>
                <div className="mono">×{ln.qty}</div>
                <div className={`order__line-state${ln.state === 'backorder' ? ' is-critical' : ''}`}>{ln.state}</div>
              </div>
            ))}
            {o.note && <Note small>{o.note}</Note>}
          </div>
        </Blueprint>
      ))}
    </div>
  );
}
