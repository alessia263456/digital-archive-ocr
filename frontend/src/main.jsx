import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, ApiError } from './api.js';
import './theme.css';

function BrandHeader({ user, onLogout, busy }) {
  return (
    <header className="viewer-header">
      <div className="brand-mark" aria-hidden="true">AD</div>
      <div className="header-copy">
        <p className="header-kicker">Cabinet Individual Notarial</p>
        {user && <p className="header-title">Arhivă digitală</p>}
      </div>
      {user && (
        <div className="account-actions">
          <span className="account-label">{user.username} · {user.role}</span>
          <button className="button secondary" type="button" onClick={onLogout} disabled={busy}>
            Deconectare
          </button>
        </div>
      )}
    </header>
  );
}

function LoginScreen({ onLogin, busy, message, messageKind }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  async function submit(event) {
    event.preventDefault();
    await onLogin(username, password);
  }

  return (
    <main className="login-page" data-state={busy ? 'loading' : messageKind || 'default'} aria-busy={busy}>
      <section className="login-card" aria-labelledby="login-title">
        <h1 id="login-title">Autentificare</h1>
        <form className="login-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="username">Nume de utilizator</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={busy}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Parolă</label>
            <div className="password-row">
              <input
                id="password"
                name="password"
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
                required
              />
              <button
                className="button secondary"
                type="button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                aria-label={passwordVisible ? 'Ascunde parola' : 'Arată parola'}
                disabled={busy}
              >
                {passwordVisible ? 'Ascunde' : 'Arată'}
              </button>
            </div>
          </div>
          {message && (
            <p className={`state-message ${messageKind || ''}`} role="status" aria-live="polite">
              {message}
            </p>
          )}
          <button className="button submit" type="submit" disabled={busy}>
            {busy ? 'Se verifică…' : 'Autentificare'}
          </button>
        </form>
      </section>
    </main>
  );
}

function ArchiveHome({ user }) {
  return (
    <main className="archive-wrap">
      <div className="page-intro">
        <h1>Căutare în arhivă</h1>
      </div>
      <section className="empty-archive" aria-labelledby="empty-title">
        <div className="empty-mark" aria-hidden="true">AD</div>
        <h2 id="empty-title">Arhiva este goală</h2>
        <p>Documentele aprobate vor apărea aici după ce sunt adăugate în arhivă.</p>
      </section>
      <span className="screen-reader-only">Cont: {user.username}, rol {user.role}.</span>
    </main>
  );
}

function Application() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('');

  useEffect(() => {
    let active = true;
    api.currentUser()
      .then((result) => { if (active) setUser(result); })
      .catch((error) => {
        if (active && (error.status !== 401 || error.message.includes('Sesiunea a expirat'))) {
          setMessage(error.message || 'Sesiunea nu a putut fi verificată. Reîncărcați pagina.');
          setMessageKind('error');
        }
      })
      .finally(() => { if (active) setChecking(false); });

    return () => { active = false; };
  }, []);

  async function login(username, password) {
    setBusy(true);
    setMessage('Se verifică datele introduse…');
    setMessageKind('loading');
    try {
      const result = await api.login(username, password);
      setUser(result.user);
      setMessage('');
      setMessageKind('');
    } catch (error) {
      setMessage(error.message || 'Autentificarea nu a reușit. Încercați din nou.');
      setMessageKind('error');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await api.logout();
      setUser(null);
      setMessage('');
      setMessageKind('');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setMessage('Sesiunea a expirat. Autentificați-vă din nou.');
        setMessageKind('error');
      } else {
        setMessage(error.message || 'Deconectarea nu a reușit. Încercați din nou.');
        setMessageKind('error');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BrandHeader user={user} onLogout={logout} busy={busy} />
      {user
        ? <ArchiveHome user={user} />
        : <LoginScreen onLogin={login} busy={busy || checking} message={message} messageKind={messageKind} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<Application />);
