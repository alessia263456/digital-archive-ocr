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

function ArchiveHome({ user, onUpload, onQueue }) {
  return (
    <main className="archive-wrap">
      <div className="page-intro">
        <h1>Căutare în arhivă</h1>
        {(user.role === 'admin' || user.role === 'arhivar') && (
          <div className="home-actions">
            <button className="button secondary" type="button" onClick={onQueue}>Cozi de lucru</button>
            <button className="button" type="button" onClick={onUpload}>Încarcă documente</button>
          </div>
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

function DraftQueue({ onReview, onUpload, onBack }) {
  const [queue, setQueue] = useState({ review: [], quarantine: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const hasLoaded = useRef(false);
  const [activeTab, setActiveTab] = useState('review');
  const [status, setStatus] = useState('');
  const [busyDraft, setBusyDraft] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const dialogRef = useRef(null);
  const reviewTabRef = useRef(null);
  const quarantineTabRef = useRef(null);

  async function loadQueue(showLoading = false) {
    if (!hasLoaded.current || showLoading) setLoading(true);
    setError('');
    try {
      const result = await api.draftQueue();
      setQueue({ review: result.review || [], quarantine: result.quarantine || [] });
    } catch (requestError) {
      setError(requestError.message || 'Nu am putut încărca documentele.');
    } finally {
      hasLoaded.current = true;
      setLoading(false);
    }
  }

  useEffect(() => { loadQueue(); }, []);

  async function retry(item) {
    setBusyDraft(item.id);
    setStatus('Se trimite documentul la procesare…');
    setActionError('');
    try {
      await api.retryDraft(item.id);
      setStatus('Documentul a fost trimis din nou la procesare.');
      await loadQueue();
      quarantineTabRef.current?.focus();
    } catch (requestError) {
      setStatus('');
      setActionError(requestError.message || 'Nu am putut trimite documentul la procesare. Încearcă din nou.');
    } finally {
      setBusyDraft(null);
    }
  }

  async function markPermanentlyFailed() {
    if (!confirming) return;
    const item = confirming;
    setBusyDraft(item.id);
    setActionError('');
    try {
      await api.markDraftPermanentlyFailed(item.id);
      dialogRef.current?.close();
      setConfirming(null);
      setStatus('Stare actualizată: Eșuat definitiv. Fișierul rămâne păstrat.');
      await loadQueue();
      quarantineTabRef.current?.focus();
    } catch (requestError) {
      setActionError(requestError.message || 'Nu am putut actualiza starea documentului. Încercați din nou.');
    } finally {
      setBusyDraft(null);
    }
  }

  function changeTab(next) {
    setActiveTab(next);
    setStatus('');
    (next === 'review' ? reviewTabRef : quarantineTabRef).current?.focus();
  }

  function handleTabKey(event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      changeTab(activeTab === 'review' ? 'quarantine' : 'review');
    }
  }

  const rows = queue[activeTab];

  return (
    <main className="queue-wrap" aria-busy={loading}>
      <div className="queue-heading">
        <button className="button secondary" type="button" onClick={onBack}>Înapoi la arhivă</button>
        <h1>Cozi de lucru</h1>
      </div>
      <div className="queue-tabs" role="tablist" aria-label="Cozi de lucru" onKeyDown={handleTabKey}>
        <button ref={reviewTabRef} id="review-tab" className="queue-tab" type="button" role="tab" aria-controls="review-panel" aria-selected={activeTab === 'review'} tabIndex={activeTab === 'review' ? 0 : -1} onClick={() => setActiveTab('review')}>Revizuire ({queue.review.length})</button>
        <button ref={quarantineTabRef} id="quarantine-tab" className="queue-tab" type="button" role="tab" aria-controls="quarantine-panel" aria-selected={activeTab === 'quarantine'} tabIndex={activeTab === 'quarantine' ? 0 : -1} onClick={() => setActiveTab('quarantine')}>Carantină ({queue.quarantine.length})</button>
      </div>
      <section id={`${activeTab}-panel`} className="queue-panel" role="tabpanel" aria-labelledby={`${activeTab}-tab`} tabIndex="0">
        <h2>{activeTab === 'review' ? 'Documente pentru revizuire' : 'Documente în carantină'}</h2>
        {loading ? <div className="queue-message" role="status"><p>Se încarcă documentele…</p><div className="queue-skeleton" aria-hidden="true" /></div>
          : error ? <div className="queue-message queue-error"><p role="alert">{error}</p><button className="button secondary" type="button" onClick={() => loadQueue(true)}>Încearcă din nou</button></div>
            : rows.length === 0 ? <div className="queue-message"><p>{activeTab === 'review' ? 'Nu sunt documente pentru revizuire.' : 'Nu sunt documente în carantină.'}</p><p className="muted">{activeTab === 'review' ? 'Documentele procesate care așteaptă revizuirea vor apărea aici.' : 'Documentele apar aici după încercarea inițială de OCR și 3 reîncercări eșuate.'}</p>{activeTab === 'review' && <button className="button secondary" type="button" onClick={onUpload}>Încarcă documente</button>}</div>
              : <ul className="queue-rows">{rows.map((item) => (
                <li className="queue-row" key={item.id}>
                  <div className="queue-details">
                    <strong className="queue-filename" title={item.name}>{item.name}</strong>
                    <span className={`queue-badge${activeTab === 'quarantine' ? ' warning' : ''}`}>{activeTab === 'review' ? 'În așteptarea revizuirii' : 'În carantină'}</span>
                    {activeTab === 'review'
                      ? <><span className="muted">Revizuirea umană este obligatorie înainte de aprobare.</span><button className="queue-link" type="button" onClick={() => onReview(item)}>Începe revizuirea</button></>
                      : <><span className="muted">4 încercări de OCR eșuate: încercarea inițială și 3 reîncercări.</span><div className="queue-actions"><button className="button secondary" type="button" onClick={() => retry(item)} disabled={busyDraft === item.id}>{busyDraft === item.id ? 'Se trimite…' : 'Reîncearcă procesarea'}</button><button className="button secondary" type="button" onClick={() => { setConfirming(item); setActionError(''); dialogRef.current?.showModal(); }} disabled={busyDraft === item.id}>Marchează ca eșuat definitiv</button></div></>}
                  </div>
                </li>
              ))}</ul>}
        {status && <p className="queue-message" role="status" aria-live="polite">{status}</p>}
        {actionError && !confirming && <p className="queue-message queue-error" role="alert">{actionError}</p>}
      </section>
      <dialog ref={dialogRef} className="queue-dialog" aria-labelledby="queue-confirm-title" aria-describedby="queue-confirm-description" onClose={() => setConfirming(null)}>
        <h2 id="queue-confirm-title">Marchezi documentul ca eșuat definitiv?</h2>
        <p id="queue-confirm-description"><strong>{confirming?.name}</strong><br />Starea documentului devine „Eșuat definitiv”. Fișierul rămâne păstrat.</p>
        {actionError && confirming && <p className="queue-error" role="alert">{actionError}</p>}
        <div className="queue-actions"><button className="button secondary" type="button" onClick={() => dialogRef.current?.close()} disabled={busyDraft !== null}>Renunță</button><button className="button" type="button" onClick={markPermanentlyFailed} disabled={busyDraft !== null}>{busyDraft ? 'Se actualizează…' : 'Confirmă schimbarea stării'}</button></div>
      </dialog>
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

function DraftOcrResults({ item, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pages, setPages] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);

  async function renewPreview() {
    setRenewing(true);
    setPreviewError('');
    try {
      setPreview(await api.draftPreview(item.id));
    } catch (requestError) {
      setPreviewError(requestError.message || 'Previzualizarea nu a putut fi reîncărcată. Verificați sesiunea și încercați din nou.');
    } finally {
      setRenewing(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.draftOcr(item.id)
      .then((result) => {
        if (!active) return;
        setPages(result.pages || []);
        api.draftPreview(item.id)
          .then((issuedPreview) => { if (active) setPreview(issuedPreview); })
          .catch((requestError) => {
            if (active) setPreviewError(requestError.message || 'Previzualizarea nu a putut fi încărcată. Verificați sesiunea și încercați din nou.');
          })
          .finally(() => { if (active) setPreviewLoading(false); });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Rezultatele OCR nu au putut fi încărcate. Verificați sesiunea și încercați din nou.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [item.id]);

  useEffect(() => {
    if (!preview?.expires_at) return undefined;
    const remaining = new Date(preview.expires_at).getTime() - Date.now();
    const delay = Math.max(0, Math.min(remaining - 15000, 2147483647));
    const timeout = window.setTimeout(renewPreview, delay);
    return () => window.clearTimeout(timeout);
  }, [preview?.expires_at]);

  if (loading) {
    return <main className="ocr-results" aria-busy="true"><button className="button secondary" type="button" onClick={onBack}>Înapoi la încărcări</button><p className="state-message loading" role="status">Se încarcă rezultatele OCR și previzualizarea…</p></main>;
  }
  if (error) {
    return <main className="ocr-results"><button className="button secondary" type="button" onClick={onBack}>Înapoi la încărcări</button><p className="state-message error" role="alert">{error}</p></main>;
  }

  return (
    <main className="ocr-results" aria-busy={renewing}>
      <div className="upload-heading">
        <button className="button secondary" type="button" onClick={onBack}>Înapoi la încărcări</button>
        <h1>Rezultate OCR</h1>
      </div>
      <p className="ocr-private-note">Ciornă privată · OCR finalizat. Documentul așteaptă revizuirea umană și nu este aprobat sau indexat.</p>
      <div className="ocr-results-grid">
        <section className="ocr-pages" aria-label="Text extras">
          {pages.map((page) => {
            const words = Array.isArray(page.words) ? page.words : [];
            const confidence = words.length
              ? Math.round(words.reduce((sum, word) => sum + Number(word.confidence || 0), 0) / words.length)
              : null;
            return (
              <article className="ocr-page" key={page.page}>
                <h2>Pagina {page.page}</h2>
                <p className="ocr-page-meta">{page.width} × {page.height} px{confidence === null ? '' : ` · Încredere medie ${confidence}%`}</p>
                <pre className="ocr-text">{page.text || 'Nu a fost extras text pentru această pagină.'}</pre>
                <details className="ocr-boxes">
                  <summary>Casete de delimitare · {words.length} cuvinte</summary>
                  {words.length > 0 ? <ul>{words.map((word, index) => <li key={`${word.left}-${word.top}-${index}`}><span>{word.text}</span><code>{word.left}, {word.top} · {word.width} × {word.height} px · {word.confidence}%</code></li>)}</ul> : <p>Nu există casete de delimitare pentru această pagină.</p>}
                </details>
              </article>
            );
          })}
        </section>
        <section className="ocr-preview" aria-labelledby="ocr-preview-title">
          <h2 id="ocr-preview-title">Previzualizare document</h2>
          {previewError && <p className="state-message error" role="alert">{previewError}</p>}
          {previewLoading && <p className="state-message loading" role="status">Se încarcă previzualizarea…</p>}
          {preview?.pages?.length ? <div className="ocr-preview-pages">{preview.pages.map((page) => page.kind === 'image'
            ? <img key={page.page} src={page.url} alt={`Pagina ${page.page} din document`} />
            : <iframe key={page.page} title={`Previzualizare document · pagina ${page.page}`} src={page.url} />)}</div>
            : <p className="muted">Previzualizarea nu este disponibilă.</p>}
          <button className="button secondary" type="button" onClick={renewPreview} disabled={renewing}>
            {renewing ? 'Se reîncarcă…' : 'Reîncarcă previzualizarea'}
          </button>
        </section>
      </div>
    </main>
  );
}

function UploadScreen({ onBack }) {
  const fileInputRef = useRef(null);
  const [kind, setKind] = useState('documents');
  const [files, setFiles] = useState([]);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('');
  const [refreshing, setRefreshing] = useState(null);
  const [openedItem, setOpenedItem] = useState(null);

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

  if (openedItem) return <DraftOcrResults item={openedItem} onBack={() => setOpenedItem(null)} />;

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
              {item.id && <div className="draft-actions">
                {item.status === 'review_ready' && <button className="button" type="button" onClick={() => setOpenedItem(item)}>Vezi rezultatele OCR</button>}
                <button className="button secondary" type="button" onClick={() => refresh(item)} disabled={refreshing === item.key}>
                  {refreshing === item.key ? 'Se actualizează…' : 'Actualizează starea'}
                </button>
              </div>}
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
        ? ((user.role === 'admin' || user.role === 'arhivar') && screen === 'upload'
          ? <UploadScreen onBack={() => setScreen('home')} />
          : (user.role === 'admin' || user.role === 'arhivar') && screen === 'queue'
            ? <DraftQueue onUpload={() => setScreen('upload')} onBack={() => setScreen('home')} onReview={(item) => setScreen(`review:${item.id}`)} />
            : screen.startsWith('review:')
              ? <DraftOcrResults item={{ id: screen.slice('review:'.length) }} onBack={() => setScreen('queue')} />
              : <ArchiveHome user={user} onUpload={() => setScreen('upload')} onQueue={() => setScreen('queue')} />)
        : <LoginScreen onLogin={login} busy={busy || checking} message={message} messageKind={messageKind} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<Application />);
