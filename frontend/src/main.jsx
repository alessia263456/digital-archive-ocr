import React, { useEffect, useRef, useState } from 'react';
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

function ArchiveHome({ user, onUpload }) {
  return (
    <main className="archive-wrap">
      <div className="page-intro">
        <h1>Căutare în arhivă</h1>
        {(user.role === 'admin' || user.role === 'arhivar') && (
          <button className="button" type="button" onClick={onUpload}>Încarcă documente</button>
        )}
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

const statusLabels = {
  queued: 'OCR în așteptare',
  processing: 'OCR în curs',
  failed: 'OCR eșuat · reîncercare programată',
  review_ready: 'Gata de revizuit',
  quarantined: 'Trimisă în carantină',
};

function UploadScreen({ onBack }) {
  const fileInputRef = useRef(null);
  const [kind, setKind] = useState('documents');
  const [files, setFiles] = useState([]);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('');
  const [refreshing, setRefreshing] = useState(null);

  function selectFiles(selection) {
    const selected = Array.from(selection || []);
    setFiles(selected);
    setMessage('');
    setMessageKind('');
    if (kind === 'documents' && selected.length > 1) {
      setMessage('Selectați un singur document pentru fiecare încărcare.');
      setMessageKind('error');
      return;
    }
    if (kind === 'documents' && selected.some((file) => !/\.(pdf|docx)$/i.test(file.name))) {
      setMessage('Sunt acceptate doar documentele PDF și DOCX.');
      setMessageKind('error');
      return;
    }
    if (kind === 'images' && selected.some((file) => !/\.(jpe?g|png)$/i.test(file.name))) {
      setMessage('Colecția acceptă numai imagini JPG și PNG.');
      setMessageKind('error');
    }
  }

  async function upload(event) {
    event.preventDefault();
    if (!files.length) {
      setMessage(kind === 'images'
        ? 'Selectați cel puțin o imagine JPG sau PNG.'
        : 'Selectați un document PDF sau DOCX pentru încărcare.');
      setMessageKind('error');
      return;
    }
    if (kind === 'documents' && files.length !== 1) {
      setMessage('Selectați un singur document pentru fiecare încărcare.');
      setMessageKind('error');
      return;
    }
    setBusy(true);
    setMessage('Se transferă documentul către arhivă…');
    setMessageKind('loading');
    try {
      const result = await api.uploadDraft(files, kind);
      const received = (result.items || []).map((entry, index) => ({
        key: entry.id || `invalid-${Date.now()}-${index}`,
        id: entry.id,
        name: entry.group === 'images' ? `${files.length} imagini` : files[0].name,
        status: entry.status,
        error: entry.error || '',
        refreshError: '',
      }));
      setItems((previous) => [...received, ...previous]);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const failed = received.some((entry) => entry.status === 'invalid');
      setMessage(failed
        ? (received.find((entry) => entry.error)?.error || 'Documentul nu a putut fi încărcat. Verificați selecția și încercați din nou.')
        : 'Transfer finalizat. Documentul este o ciornă privată; OCR-ul poate fi încă în așteptare.');
      setMessageKind(failed ? 'error' : 'success');
    } catch (error) {
      setMessage(error instanceof ApiError
        ? error.message
        : 'Conexiunea a eșuat. Verificați conexiunea și încercați din nou.');
      setMessageKind('error');
    } finally {
      setBusy(false);
    }
  }

  async function refresh(item) {
    setRefreshing(item.key);
    setItems((previous) => previous.map((entry) => entry.key === item.key ? { ...entry, refreshError: '' } : entry));
    try {
      const result = await api.draftStatus(item.id);
      setItems((previous) => previous.map((entry) => entry.key === item.key
        ? { ...entry, status: result.status, refreshError: '' }
        : entry));
    } catch (error) {
      setItems((previous) => previous.map((entry) => entry.key === item.key
        ? { ...entry, refreshError: error.message || 'Starea nu a putut fi actualizată. Încercați din nou.' }
        : entry));
    } finally {
      setRefreshing(null);
    }
  }

  const validSelection = files.length > 0
    && !(kind === 'documents' && (files.length !== 1 || files.some((file) => !/\.(pdf|docx)$/i.test(file.name))))
    && !(kind === 'images' && files.some((file) => !/\.(jpe?g|png)$/i.test(file.name)));

  return (
    <main className="upload-wrap" aria-busy={busy}>
      <div className="upload-heading">
        <button className="button secondary" type="button" onClick={onBack} disabled={busy}>Înapoi la arhivă</button>
        <h1>Încărcare documente</h1>
      </div>
      <section className="upload-panel" aria-labelledby="upload-title">
        <h2 id="upload-title">Adaugă documente</h2>
        <div className="upload-modes" role="group" aria-label="Tipul documentului">
          <button className={`button secondary${kind === 'documents' ? ' selected' : ''}`} type="button" aria-pressed={kind === 'documents'} disabled={busy} onClick={() => { setKind('documents'); setFiles([]); setMessage(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>PDF / DOCX</button>
          <button className={`button secondary${kind === 'images' ? ' selected' : ''}`} type="button" aria-pressed={kind === 'images'} disabled={busy} onClick={() => { setKind('images'); setFiles([]); setMessage(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Colecție de imagini JPG și PNG</button>
        </div>
        <form className="upload-form" onSubmit={upload}>
          <div className="file-picker">
            <label className="button secondary" htmlFor="draft-files">Alege fișiere</label>
            <span className="muted">{kind === 'images' ? 'Ordinea selecției devine ordinea paginilor.' : 'Un singur PDF sau DOCX per încărcare.'}</span>
          </div>
          <input
            id="draft-files"
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept={kind === 'images' ? '.jpg,.jpeg,.png,image/jpeg,image/png' : '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
            multiple={kind === 'images'}
            disabled={busy}
            aria-label={kind === 'images' ? 'Imagini în ordinea paginilor' : 'Document PDF sau DOCX'}
            onChange={(event) => selectFiles(event.target.files)}
          />
          {files.length > 0 && <ul className="selected-files" aria-label="Fișiere selectate">{files.map((file, index) => <li key={`${file.name}-${index}`} title={file.name}>{file.name}</li>)}</ul>}
          {message && <p className={`state-message ${messageKind}`} role="status" aria-live="polite">{message}</p>}
          <button className="button submit" type="submit" disabled={busy || !validSelection}>
            {busy ? 'Se încarcă…' : 'Încarcă documentul'}
          </button>
        </form>
      </section>
      <section className="draft-list" aria-labelledby="draft-list-title">
        <div className="page-intro"><h2 id="draft-list-title">Încărcate în această sesiune</h2><p>Starea nu se actualizează automat. Folosiți butonul de actualizare pentru a verifica procesarea OCR.</p></div>
        {items.length === 0
          ? <p className="empty-archive">Documentele încărcate în această sesiune vor apărea aici.</p>
          : <ul className="draft-items">{items.map((item) => (
            <li className="draft-item" key={item.key}>
              <div className="draft-copy">
                <strong title={item.name}>{item.name}</strong>
                <span className={`draft-status ${item.status === 'invalid' ? 'error' : item.status === 'review_ready' ? 'ready' : ''}`}>
                  {item.status === 'invalid' ? 'Încărcarea nu a reușit' : statusLabels[item.status] || 'Stare necunoscută'}
                </span>
                {item.id && <span className="draft-id">Ciornă privată · ID {item.id}</span>}
                {item.id && <span>Transferul sau finalizarea OCR nu aprobă și nu indexează documentul.</span>}
                {item.status === 'review_ready' && <span>OCR finalizat. Documentul așteaptă revizuirea umană și nu este aprobat sau indexat.</span>}
                {item.status === 'failed' && <span>Procesarea a eșuat. Verificați din nou starea după reîncercare.</span>}
                {item.status === 'quarantined' && <span>Documentul a ajuns în Carantină Queue după încercările OCR eșuate.</span>}
                {item.error && <span className="draft-error">{item.error}</span>}
                {item.refreshError && <span className="draft-error" role="alert">{item.refreshError}</span>}
              </div>
              {item.id && <button className="button secondary" type="button" onClick={() => refresh(item)} disabled={refreshing === item.key}>
                {refreshing === item.key ? 'Se actualizează…' : 'Actualizează starea'}
              </button>}
            </li>
          ))}</ul>}
      </section>
    </main>
  );
}

function Application() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('');
  const [screen, setScreen] = useState('home');

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
        ? (screen === 'upload' && (user.role === 'admin' || user.role === 'arhivar')
          ? <UploadScreen onBack={() => setScreen('home')} />
          : <ArchiveHome user={user} onUpload={() => setScreen('upload')} />)
        : <LoginScreen onLogin={login} busy={busy || checking} message={message} messageKind={messageKind} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<Application />);
