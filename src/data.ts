import type { StockLine } from '../shared/types';

export type StockTag = 'out' | 'low' | 'on order' | 'stocked';

/** Shelf status for one implant line: below half of par counts as low. */
export function stockStatus(it: StockLine) {
  const low = it.par > 0 && it.onHand < it.par * 0.5;
  const tag: StockTag = it.onHand === 0 && it.par > 0 ? 'out' : low ? 'low' : it.onOrder ? 'on order' : 'stocked';
  return {
    tag,
    critical: tag === 'out' || tag === 'low',
    pct: it.par > 0 ? Math.min(100, Math.round((it.onHand / it.par) * 100)) : 100,
    /** Units needed to get back to par, counting what's already on order. */
    suggested: Math.max(1, it.par - it.onHand - it.onOrder),
  };
}
