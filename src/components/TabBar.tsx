import type { ReactNode } from 'react';
import type { Screen } from '../store';
import { BoxIcon, ScanIcon, TruckIcon } from './icons';

const tabs: { screen: Screen; label: string; icon: ReactNode; solid?: boolean }[] = [
  { screen: 'stock', label: 'Stock', icon: <BoxIcon /> },
  { screen: 'scan', label: 'Scan', icon: <ScanIcon />, solid: true },
  { screen: 'incoming', label: 'Incoming', icon: <TruckIcon /> },
];

export function TabBar({ current, onNavigate }: { current: Screen; onNavigate: (s: Screen) => void }) {
  return (
    <nav className="tab-bar" aria-label="Main">
      {tabs.map(t => {
        const active = current === t.screen;
        return (
          <button key={t.screen} type="button" onClick={() => onNavigate(t.screen)}
            className={`tab-bar__tab${active ? ' is-active' : ''}${t.solid ? ' tab-bar__tab--solid' : ''}`}
            aria-current={active ? 'page' : undefined}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
