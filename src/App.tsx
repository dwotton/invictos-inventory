import { useEffect, useRef } from 'react';
import { AppHeader } from './components/AppHeader';
import { PhoneFrame } from './components/PhoneFrame';
import { TabBar } from './components/TabBar';
import { config } from './data';
import { CartScreen } from './screens/CartScreen';
import { IncomingScreen } from './screens/IncomingScreen';
import { ItemScreen } from './screens/ItemScreen';
import { ScanScreen } from './screens/ScanScreen';
import { StockScreen } from './screens/StockScreen';
import { useAppStore } from './store';

export function App() {
  const [state, dispatch] = useAppStore();
  const cartCount = Object.values(state.cart).reduce((n, q) => n + q, 0);

  // Each screen starts at the top.
  const scroller = useRef<HTMLElement>(null);
  useEffect(() => { scroller.current?.scrollTo(0, 0); }, [state.screen]);

  return (
    <div className="showcase">
      <div className="showcase__intro">
        <div>
          <div className="eyebrow">Invictos Ortho · clinic app</div>
          <h1 className="showcase__title">Scan · Reorder · Track</h1>
        </div>
        <p className="showcase__lede">
          Point-of-use reordering for implants. Every scan in the surgery suite logs the implant to the case and puts
          the replacement on order — so nothing is discovered missing at the next surgery.
        </p>
      </div>

      <PhoneFrame>
        <div className="app">
          <AppHeader clinicName={config.clinicName} cartCount={cartCount}
            onCart={() => dispatch({ type: 'navigate', screen: 'cart' })} />
          <main className="app__body" ref={scroller}>
            {state.screen === 'stock' && <StockScreen state={state} dispatch={dispatch} />}
            {state.screen === 'scan' && <ScanScreen state={state} dispatch={dispatch} />}
            {state.screen === 'item' && <ItemScreen state={state} dispatch={dispatch} />}
            {state.screen === 'cart' && <CartScreen state={state} dispatch={dispatch} />}
            {state.screen === 'incoming' && <IncomingScreen orders={state.orders} />}
          </main>
          <TabBar current={state.screen} onNavigate={screen => dispatch({ type: 'navigate', screen })} />
        </div>
      </PhoneFrame>

      <p className="showcase__footnote">
        Try it: tap <strong>Scan</strong> and tap the viewfinder to simulate a barcode read → log the implant to the
        case → the replacement lands in the reorder queue → submit it and watch it appear under <strong>Incoming</strong>{' '}
        with a live ETA and backorder flags.
      </p>
    </div>
  );
}
