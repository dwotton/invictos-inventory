import { CartIcon, SignOutIcon } from './icons';

export function AppHeader({ clinicName, cartCount, onCart, onSignOut }: {
  clinicName: string;
  cartCount: number;
  onCart: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__wordmark">Invictos</div>
        <div className="app-header__sub">{clinicName}</div>
      </div>
      <button type="button" className="app-header__btn app-header__btn--quiet" onClick={onSignOut} aria-label="Sign out">
        <SignOutIcon />
      </button>
      <button type="button" className="app-header__btn" onClick={onCart}
        aria-label={cartCount ? 'Reorder queue, ' + cartCount + ' units' : 'Reorder queue, empty'}>
        <CartIcon />
        {cartCount > 0 && <span className="app-header__badge" aria-hidden="true">{cartCount}</span>}
      </button>
    </header>
  );
}
