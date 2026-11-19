import { CartIcon } from './icons';

export function AppHeader({ clinicName, cartCount, onCart }: {
  clinicName: string;
  cartCount: number;
  onCart: () => void;
}) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__wordmark">Invictos</div>
        <div className="app-header__sub">{clinicName} · ezyVet linked</div>
      </div>
      <button type="button" className="app-header__cart" onClick={onCart}
        aria-label={cartCount ? `Reorder queue, ${cartCount} units` : 'Reorder queue, empty'}>
        <CartIcon />
        {cartCount > 0 && <span className="app-header__badge" aria-hidden="true">{cartCount}</span>}
      </button>
    </header>
  );
}
