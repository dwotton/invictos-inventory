import { useCallback, useEffect, useRef, useState } from 'react';
import type { Order, SessionInfo, StockLine } from '../shared/types';
import { ApiError, api } from './api';
import { AppHeader } from './components/AppHeader';
import { Note } from './components/Note';
import { PhoneFrame } from './components/PhoneFrame';
import { TabBar } from './components/TabBar';
import { AuthScreen } from './screens/AuthScreen';
import { CartScreen } from './screens/CartScreen';
import { IncomingScreen } from './screens/IncomingScreen';
import { ItemScreen } from './screens/ItemScreen';
import { LogUseScreen } from './screens/LogUseScreen';
import { StockScreen } from './screens/StockScreen';
import { useUiStore } from './store';

type SessionState = { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; info: SessionInfo };

export function App() {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });

  const loadSession = useCallback(async () => {
    try {
      setSession({ status: 'signed-in', info: await api.session() });
    } catch (e) {
      setSession({ status: 'signed-out' });
      if (!(e instanceof ApiError && e.status === 401)) console.error(e);
    }
  }, []);
  useEffect(() => { loadSession(); }, [loadSession]);

  return (
    <div className="showcase">
      <div className="showcase__intro">
        <div>
          <div className="eyebrow">Invictos Ortho · clinic app</div>
          <h1 className="showcase__title">Log use · Reorder · Track</h1>
        </div>
        <p className="showcase__lede">
          Point-of-use reordering for implants. Each implant used in surgery is logged against the case and its
          replacement goes into the reorder queue, so nothing is found missing at the next surgery.
        </p>
      </div>

      <PhoneFrame>
        {session.status === 'loading' && <div className="app app--center"><p className="empty">Loading…</p></div>}
        {session.status === 'signed-out' && <AuthScreen onSignedIn={loadSession} />}
        {session.status === 'signed-in' && (
          <ClinicApp info={session.info} onSignedOut={() => setSession({ status: 'signed-out' })} />
        )}
      </PhoneFrame>

      <p className="showcase__footnote">
        {session.status === 'signed-in' && session.info.netsuite.mode === 'sample'
          ? 'Showing sample data. Connect NetSuite in the server’s .env file to see real items and orders.'
          : 'Stock and orders come from Invictos NetSuite. Shelf counts are kept by the app.'}
      </p>
    </div>
  );
}

function ClinicApp({ info, onSignedOut }: { info: SessionInfo; onSignedOut: () => void }) {
  const [ui, dispatch] = useUiStore();
  const [stock, setStock] = useState<StockLine[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loadError, setLoadError] = useState('');

  const handleError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) return onSignedOut();
    setLoadError(e instanceof Error ? e.message : String(e));
  }, [onSignedOut]);

  const reload = useCallback(async () => {
    setLoadError('');
    try {
      const [s, o] = await Promise.all([api.stock(), api.orders()]);
      setStock(s);
      setOrders(o);
    } catch (e) {
      handleError(e);
    }
  }, [handleError]);
  useEffect(() => { reload(); }, [reload]);

  // Each screen starts at the top.
  const scroller = useRef<HTMLElement>(null);
  useEffect(() => { scroller.current?.scrollTo(0, 0); }, [ui.screen]);

  const cartCount = Object.values(ui.cart).reduce((n, q) => n + q, 0);

  const actions = {
    async logUse(reorder: boolean) {
      const it = stock?.find(i => i.id === ui.pickedId);
      if (!it) return;
      const qty = ui.useQty;
      try {
        await api.logUse(it.id, qty, ui.caseRef);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return onSignedOut();
        return dispatch({ type: 'toast', toast: e instanceof Error ? e.message : String(e) });
      }
      const caseText = ui.caseRef ? ' to case ' + ui.caseRef : '';
      dispatch({
        type: 'logged',
        entry: { name: it.name, qty, caseRef: ui.caseRef },
        toast: '✓ ' + qty + ' × ' + it.name + ' logged' + caseText + (reorder ? ' · ' + qty + ' added to the reorder queue.' : '. Not reordered.'),
      });
      if (reorder) dispatch({ type: 'addToCart', id: it.id, delta: qty });
      reload();
    },
    async submitOrder(note: string) {
      const lines = Object.entries(ui.cart).map(([id, qty]) => ({ itemId: Number(id), qty }));
      const order = await api.submitOrder(lines, note);
      dispatch({ type: 'clearCart' });
      dispatch({ type: 'navigate', screen: 'incoming' });
      reload();
      return order;
    },
    async signOut() {
      await api.logout().catch(() => undefined);
      onSignedOut();
    },
  };

  return (
    <div className="app">
      <AppHeader clinicName={info.clinic.name} cartCount={cartCount}
        onCart={() => dispatch({ type: 'navigate', screen: 'cart' })} onSignOut={actions.signOut} />
      <main className="app__body" ref={scroller}>
        {loadError && (
          <div className="screen screen--tight">
            <Note>{loadError}</Note>
            <button type="button" className="btn btn-secondary btn-caps btn-touch" onClick={reload}>Try again</button>
          </div>
        )}
        {!loadError && (!stock || !orders) && <p className="empty loading">Loading from NetSuite…</p>}
        {stock && orders && (
          <>
            {ui.screen === 'stock' && <StockScreen stock={stock} ui={ui} dispatch={dispatch} />}
            {ui.screen === 'use' && <LogUseScreen stock={stock} ui={ui} dispatch={dispatch} onLog={actions.logUse} />}
            {ui.screen === 'item' && <ItemScreen stock={stock} ui={ui} dispatch={dispatch} />}
            {ui.screen === 'cart' && (
              <CartScreen stock={stock} ui={ui} dispatch={dispatch} clinicName={info.clinic.name}
                ordersEnabled={info.netsuite.ordersEnabled} onSubmit={actions.submitOrder} />
            )}
            {ui.screen === 'incoming' && <IncomingScreen orders={orders} onRefresh={reload} />}
          </>
        )}
      </main>
      <TabBar current={ui.screen} onNavigate={screen => dispatch({ type: 'navigate', screen })} />
    </div>
  );
}
