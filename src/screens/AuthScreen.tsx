import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { Blueprint } from '../components/Blueprint';
import { Note } from '../components/Note';

const MIN_PASSWORD = 10;

export function AuthScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [clinicName, setClinicName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (m: 'login' | 'setup') => {
    setMode(m);
    setError('');
    setPassword('');
    setConfirm('');
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (mode === 'setup') {
      if (password.length < MIN_PASSWORD) return setError('Choose a password of at least ' + MIN_PASSWORD + ' characters.');
      if (password !== confirm) return setError('The two passwords don’t match.');
    }
    setBusy(true);
    try {
      if (mode === 'login') await api.login(clinicName, password);
      else await api.setup(clinicName, code, password);
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__wordmark">Invictos</div>
          <div className="app-header__sub">Clinic implant reordering</div>
        </div>
      </header>
      <main className="app__body">
        <form className="screen auth" onSubmit={submit} noValidate>
          <div>
            <h2 className="screen-title">{mode === 'login' ? 'Sign in' : 'Set up your clinic'}</h2>
            <p className="sub-meta auth__lede">
              {mode === 'login'
                ? 'Use your clinic name and the password your clinic chose.'
                : 'Enter the setup code from Invictos, then choose a password for your clinic.'}
            </p>
          </div>

          <div className="field">
            <label htmlFor="clinic-name">Clinic name</label>
            <input id="clinic-name" className="input" autoComplete="username" value={clinicName}
              onChange={e => setClinicName(e.target.value)} required />
          </div>

          {mode === 'setup' && (
            <div className="field">
              <label htmlFor="setup-code">Setup code</label>
              <input id="setup-code" className="input input--code" autoComplete="one-time-code" placeholder="XXXXX-XXXXX"
                value={code} onChange={e => setCode(e.target.value.toUpperCase())} required />
            </div>
          )}

          <div className="field">
            <label htmlFor="password">{mode === 'login' ? 'Password' : 'New password'}</label>
            <input id="password" className="input" type="password" value={password} required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={e => setPassword(e.target.value)} />
            {mode === 'setup' && <div className="field__hint">At least {MIN_PASSWORD} characters.</div>}
          </div>

          {mode === 'setup' && (
            <div className="field">
              <label htmlFor="confirm">Confirm new password</label>
              <input id="confirm" className="input" type="password" autoComplete="new-password" value={confirm}
                onChange={e => setConfirm(e.target.value)} required />
            </div>
          )}

          {error && <Note>{error}</Note>}

          <button type="submit" className="btn btn-primary btn-block btn-caps btn-tall" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Set password and sign in'}
          </button>

          <Blueprint className="panel auth__switch">
            {mode === 'login' ? (
              <>
                <div className="field-label">First time here?</div>
                <p className="sub-meta">Invictos gives each clinic a one-time setup code.</p>
                <button type="button" className="btn btn-secondary btn-block btn-caps btn-touch" onClick={() => switchMode('setup')}>
                  Use a setup code
                </button>
              </>
            ) : (
              <>
                <div className="field-label">Already set up?</div>
                <p className="sub-meta">Forgot the password? Ask Invictos for a new setup code.</p>
                <button type="button" className="btn btn-secondary btn-block btn-caps btn-touch" onClick={() => switchMode('login')}>
                  Back to sign in
                </button>
              </>
            )}
          </Blueprint>
        </form>
      </main>
    </div>
  );
}
