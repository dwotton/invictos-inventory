import { useEffect, useRef, type Dispatch } from 'react';
import { Blueprint } from '../components/Blueprint';
import { Note } from '../components/Note';
import { SectionLabel } from '../components/SectionLabel';
import { Stepper } from '../components/Stepper';
import { config, scanPool } from '../data';
import type { Action, AppState } from '../store';

const barWidths = [3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 1, 2];

export function ScanScreen({ state, dispatch }: { state: AppState; dispatch: Dispatch<Action> }) {
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const startScan = () => {
    if (state.scanState === 'scanning') return;
    const next = scanPool[(scanPool.indexOf(state.lastScannedId ?? '') + 1) % scanPool.length];
    dispatch({ type: 'scanStart' });
    window.clearTimeout(timer.current);
    // Simulated barcode read; swap for a real camera/GS1 decoder.
    timer.current = window.setTimeout(() => dispatch({ type: 'scanFound', id: next }), 900);
  };

  const scanned = state.items.find(i => i.id === state.scannedId);
  const hint = state.scanState === 'scanning' ? 'Reading label…'
    : state.scanState === 'found' ? 'Match found' : 'Tap to scan implant label';

  return (
    <div>
      <button type="button" className="viewfinder" onClick={startScan} aria-label={hint}>
        <div className="viewfinder__grid" aria-hidden="true" />
        <div className="viewfinder__frame" aria-hidden="true">
          <i className="viewfinder__corner tl" /><i className="viewfinder__corner tr" />
          <i className="viewfinder__corner bl" /><i className="viewfinder__corner br" />
          <div className="viewfinder__sweep" />
          <div className="viewfinder__bars">
            {barWidths.map((w, i) => <i key={i} style={{ width: w }} />)}
          </div>
        </div>
        <div className="viewfinder__hint" aria-live="polite">{hint}</div>
      </button>

      <div className="screen screen--tight">
        {scanned && (
          <Blueprint className="panel scan-match">
            <div className="row-top">
              <div className="grow">
                <div className="kicker">Matched · GS1 barcode</div>
                <div className="scan-match__name">{scanned.name}</div>
                <div className="mono-meta">{scanned.part} · lot {scanned.lot} · exp {scanned.exp}</div>
              </div>
              <div className="qty-figure">
                <div className="qty-figure__num qty-figure__num--lg">{scanned.onHand}</div>
                <div className="qty-figure__label">on hand</div>
              </div>
            </div>

            <div className="scan-match__qty">
              <div>
                <div className="field-label">Quantity used</div>
                <div className="sub-meta">Case {config.caseId} · {config.patient}</div>
              </div>
              <Stepper label="quantity used" value={state.useQty}
                onDec={() => dispatch({ type: 'setUseQty', delta: -1 })}
                onInc={() => dispatch({ type: 'setUseQty', delta: 1 })} />
            </div>

            <button type="button" className="btn btn-primary btn-block btn-caps btn-tall"
              onClick={() => dispatch({ type: 'logUse', reorder: config.autoReorder })}>
              {config.autoReorder ? `Log use + reorder ${state.useQty}` : 'Log use to case'}
            </button>
            <button type="button" className="btn btn-secondary btn-block btn-caps btn-touch"
              onClick={() => dispatch({ type: 'logUse', reorder: false })}>
              Log use only
            </button>
          </Blueprint>
        )}

        {state.toast && <Note>{state.toast}</Note>}

        <div>
          <SectionLabel>This case · {config.caseId}</SectionLabel>
          {state.caseLog.length > 0 ? (
            <table className="table">
              <tbody>
                {state.caseLog.map((l, i) => (
                  <tr key={i}>
                    <td className="cell-text">{l.name}</td>
                    <td className="cell-mono cell-right">×{l.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty">Nothing logged yet. Scan the implant pouch as it opens.</p>
          )}
        </div>
      </div>
    </div>
  );
}
