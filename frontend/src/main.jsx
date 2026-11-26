import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, ApiError } from './api.js';
import { AppShell } from './components/AppShell.jsx';
import './theme.css';

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
                      ? <><span className="muted">Revizuirea umană este obligatorie înainte de aprobare.</span><button className="queue-link" type="button" onClick={() => onReview(item)}>Deschide editorul</button></>
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
  failed_permanently: 'Eșuată definitiv',
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

const piiCategoryLabels = {
  cnp: 'Cod numeric personal', iban: 'Cont IBAN', email: 'Adresă de e-mail', phone: 'Număr de telefon',
  signatory_name: 'Nume semnatar', address: 'Adresă', identity_card: 'Date din actul de identitate',
  signatory_signature: 'Semnătura semnatarului', cadastral_identifier: 'Identificator cadastral',
  vehicle_identifier: 'Identificator vehicul', cui_cif: 'CUI / CIF',
};

function DraftEditor({ item, onBack }) {
  const [editor, setEditor] = useState(null);
  const [pages, setPages] = useState([]);
  const [manualMarks, setManualMarks] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [undoMarks, setUndoMarks] = useState(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewReady, setPreviewReady] = useState(false);
  const [markSaving, setMarkSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reloadRequired, setReloadRequired] = useState(false);
  const dirty = Boolean(editor && pages.some((page, index) => page.text !== editor.pages[index]?.corrected_text));
  const stale = dirty || editor?.detection_status !== 'ready' || editor?.detection_revision !== editor?.ocr_revision;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await api.draftEditor(item.id);
      setEditor(result);
      setPages(result.pages.map((page) => ({ page: page.page, text: page.corrected_text })));
      setManualMarks(result.manual_marks || []);
      setUndoMarks(null);
      setDrawing(false);
      setAnchor(null);
      setPreviewReady(false);
      setFeedback('');
      setReloadRequired(false);
    } catch (requestError) {
      setError(requestError.message || 'Editorul nu a putut fi încărcat. Verificați sesiunea și încercați din nou.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [item.id]);

  async function saveCorrections() {
    if (!editor || !dirty || saving) return;
    setSaving(true);
    setError('');
    setFeedback('Se salvează corecturile și se detectează din nou datele personale…');
    try {
      const result = await api.saveDraftEditorOcr(item.id, editor.ocr_revision, pages);
      setEditor(result);
      setPages(result.pages.map((page) => ({ page: page.page, text: page.corrected_text })));
      setManualMarks(result.manual_marks || []);
      setUndoMarks(null);
      setPreviewReady(false);
      setFeedback('Corecturile au fost salvate. Rezultatele PII sunt actualizate.');
    } catch (requestError) {
      if (requestError.body?.detection_status === 'failed') {
        setEditor((current) => ({ ...current, ocr_revision: requestError.body.ocr_revision, detection_status: 'failed', candidates: [] }));
        setManualMarks([]);
        setUndoMarks(null);
        setPreviewReady(false);
        setReloadRequired(true);
        setFeedback('Textul a fost salvat, dar detectarea PII a eșuat. Revizuirea este dezactivată.');
      } else {
        if (requestError.status === 409) {
          setEditor((current) => ({ ...current, detection_status: 'stale' }));
          setReloadRequired(true);
        }
        setFeedback('');
        setError(requestError.message || 'Corecturile nu au putut fi salvate. Încercați din nou.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function decide(candidate, reviewStatus) {
    if (!editor || stale) return;
    setError('');
    try {
      const result = await api.reviewDraftEditorPii(item.id, editor.ocr_revision, editor.detection_revision, [{ id: candidate.id, review_status: reviewStatus }]);
      setEditor((current) => ({ ...current, candidates: result.candidates }));
      setPreviewReady(false);
      setFeedback('Decizia de revizuire a fost salvată.');
    } catch (requestError) {
      if (requestError.status === 409) {
        setEditor((current) => ({ ...current, detection_status: 'stale' }));
        setReloadRequired(true);
      }
      setError(requestError.message || 'Decizia nu a putut fi salvată. Reîncărcați editorul și încercați din nou.');
    }
  }

  async function saveMarks(next, undo = null) {
    if (!editor || stale || markSaving) return;
    setMarkSaving(true);
    setError('');
    try {
      const result = await api.saveDraftRedactionMarks(item.id, editor.ocr_revision, editor.detection_revision, next);
      setManualMarks(result.marks);
      setUndoMarks(undo);
      setPreviewReady(false);
      setFeedback('Marcajele au fost salvate. Previzualizarea anterioară a fost invalidată.');
    } catch (requestError) {
      if (requestError.status === 409) { setReloadRequired(true); setEditor((current) => ({ ...current, detection_status: 'stale' })); }
      setError(requestError.message || 'Marcajele nu au putut fi salvate. Reîncărcați editorul și încercați din nou.');
    } finally { setMarkSaving(false); }
  }

  function pointFor(event, page) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(page.width - 1, Math.round((event.clientX - bounds.left) * page.width / bounds.width))),
      y: Math.max(0, Math.min(page.height - 1, Math.round((event.clientY - bounds.top) * page.height / bounds.height))),
    };
  }

  function completeMark(page, first, second) {
    if (!first || !second) return;
    const left = Math.min(first.x, second.x), top = Math.min(first.y, second.y);
    const width = Math.max(1, Math.min(page.width - left, Math.abs(first.x - second.x))), height = Math.max(1, Math.min(page.height - top, Math.abs(first.y - second.y)));
    const mark = { page: page.page, box: { left, top, width, height } };
    setDrawing(false); setAnchor(null); setCursor(null);
    saveMarks([...manualMarks, mark], manualMarks);
  }

  async function generatePreview() {
    if (stale || dirty || markSaving || generatingPreview) return;
    setGeneratingPreview(true);
    setPreviewError('');
    setError(''); setPreviewReady(false);
    try {
      await api.generateDraftRedaction(item.id);
      setPreviewReady(true);
      setFeedback('Previzualizarea anonimizării a fost generată. Verificați toate paginile.');
    } catch (requestError) {
      if (requestError.status === 409) { setReloadRequired(true); setEditor((current) => ({ ...current, detection_status: 'stale' })); }
      setPreviewError(requestError.message || 'Previzualizarea nu a putut fi generată. Verificați marcajele și încercați din nou.');
    } finally {
      setGeneratingPreview(false);
    }
  }

  return (
    <main className="editor-wrap" aria-busy={loading || saving}>
      <div className="editor-heading">
        <button className="button secondary" type="button" onClick={onBack}>Înapoi la cozi</button>
        <div><h1>Editor document</h1><p className="muted">Ciornă privată · corecturile și revizuirea PII nu aprobă documentul.</p></div>
      </div>
      <nav className="editor-steps" aria-label="Pașii revizuirii">
        <ol>
          <li><span>1</span><strong>Date document</strong><small>În așteptare</small></li>
          <li aria-current="step"><span>2</span><strong>Corectare OCR</strong><small>{dirty ? 'Corecturi nesalvate' : 'Text extras'}</small></li>
          <li><span>3</span><strong>Revizuire PII</strong><small>{stale ? 'Rezultate neactualizate' : 'De revizuit'}</small></li>
          <li><span>4</span><strong>Verificare finală</strong><small>În așteptare</small></li>
        </ol>
      </nav>
      {loading ? <p className="editor-state" role="status">Se încarcă editorul…</p>
        : error && !editor ? <section className="editor-state editor-error"><p role="alert">{error}</p><button className="button secondary" type="button" onClick={load}>Reîncearcă încărcarea</button></section>
          : editor && <>
            {error && <p className="editor-feedback error" role="alert">{error}</p>}
            {reloadRequired && <div className="editor-actions"><button className="button secondary" type="button" onClick={load}>Reîncarcă editorul</button></div>}
            {feedback && <p className="editor-feedback" role="status" aria-live="polite">{feedback}</p>}
            <div className="editor-grid">
              <section className="editor-card" aria-labelledby="editor-preview-title">
                <header><h2 id="editor-preview-title">Document original</h2><p className="muted">Trasați peste fiecare zonă care trebuie anonimizată. Marcajele sunt în coordonatele paginii originale.</p></header>
                <div className="editor-actions">
                  <button className="button secondary" type="button" aria-pressed={drawing} onClick={() => { setDrawing((value) => !value); setAnchor(null); setCursor(null); }} disabled={stale || saving || markSaving}>{drawing ? 'Renunță la marcaj' : 'Marchează o zonă'}</button>
                  <span className="editor-mark-count" aria-live="polite">Total: {manualMarks.length + editor.candidates.filter((candidate) => candidate.review_status === 'accepted').reduce((count, candidate) => count + candidate.bounding_boxes.length, 0)} marcaje · Automate: {editor.candidates.filter((candidate) => candidate.review_status === 'accepted').reduce((count, candidate) => count + candidate.bounding_boxes.length, 0)} · Manuale: {manualMarks.length}</span>
                  {undoMarks && <button className="button secondary" type="button" onClick={() => saveMarks(undoMarks, null)} disabled={markSaving}>Anulează eliminarea</button>}
                </div>
                {drawing && <p className="editor-warning" id="editor-drawing-help" role="status">Trasați zona pe pagină. De la tastatură, mutați cursorul cu săgețile și apăsați Enter pentru fiecare colț. Escape renunță.</p>}
                <div className="editor-preview-pages">
                  {editor.pages.map((page) => {
                    const boxes = [
                      ...editor.candidates.filter((candidate) => candidate.page === page.page && candidate.review_status === 'accepted').flatMap((candidate) => candidate.bounding_boxes.map((box) => ({ ...box, kind: 'automatic' }))),
                      ...manualMarks.filter((mark) => mark.page === page.page).map((mark) => ({ ...mark.box, kind: 'manual' })),
                    ];
                    const active = anchor?.page === page.page ? { left: Math.min(anchor.point.x, (cursor?.page === page.page ? cursor.point.x : anchor.point.x)), top: Math.min(anchor.point.y, (cursor?.page === page.page ? cursor.point.y : anchor.point.y)), width: Math.abs((cursor?.page === page.page ? cursor.point.x : anchor.point.x) - anchor.point.x), height: Math.abs((cursor?.page === page.page ? cursor.point.y : anchor.point.y) - anchor.point.y) } : null;
                    return <div className="editor-source-page" key={page.page}>
                      <h3>Pagina {page.page}</h3>
                      <div className={`editor-page-canvas${drawing ? ' drawing' : ''}`} style={{ aspectRatio: `${page.width} / ${page.height}` }}>
                        <img src={api.draftEditorPageImage(item.id, page.page)} alt={`Document original, pagina ${page.page}`} draggable="false" onError={() => setError('Imaginea paginii nu a putut fi încărcată. Reîncărcați editorul.')} />
                        <svg viewBox={`0 0 ${page.width} ${page.height}`} role="application" aria-label={`Document original, pagina ${page.page}`} aria-describedby={drawing ? 'editor-drawing-help' : undefined} tabIndex="0"
                          onPointerDown={(event) => { if (!drawing || stale || event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const point = pointFor(event, page); if (anchor?.page === page.page) completeMark(page, anchor.point, point); else { setAnchor({ page: page.page, point }); setCursor({ page: page.page, point }); } }}
                          onPointerMove={(event) => { if (drawing && anchor?.page === page.page) setCursor({ page: page.page, point: pointFor(event, page) }); }}
                          onPointerUp={(event) => { if (!drawing || !anchor || anchor.page !== page.page) return; const point = pointFor(event, page); if (anchor.point.x !== point.x || anchor.point.y !== point.y) completeMark(page, anchor.point, point); }}
                          onKeyDown={(event) => { if (!drawing) return; if (event.key === 'Escape') { setDrawing(false); setAnchor(null); setCursor(null); event.preventDefault(); return; } if (event.key.startsWith('Arrow')) { const step = Math.max(1, Math.round(Math.min(page.width, page.height) / 100)); const current = cursor?.page === page.page ? cursor.point : { x: Math.round(page.width / 2), y: Math.round(page.height / 2) }; const next = { x: Math.max(0, Math.min(page.width - 1, current.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0))), y: Math.max(0, Math.min(page.height - 1, current.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0))) }; setCursor({ page: page.page, point: next }); event.preventDefault(); } else if (event.key === 'Enter') { event.preventDefault(); const point = cursor?.page === page.page ? cursor.point : { x: Math.round(page.width / 2), y: Math.round(page.height / 2) }; if (anchor?.page === page.page) completeMark(page, anchor.point, point); else { setAnchor({ page: page.page, point }); setCursor({ page: page.page, point }); } } }}>
                          {boxes.map((box, index) => <rect key={`${box.kind}-${index}`} className={`editor-mark-rect ${box.kind}`} x={box.left} y={box.top} width={box.width} height={box.height} />)}
                          {active && <rect className="editor-mark-rect preview" x={active.left} y={active.top} width={Math.max(active.width, 1)} height={Math.max(active.height, 1)} />}
                          {cursor?.page === page.page && drawing && <circle className="editor-mark-cursor" cx={cursor.point.x} cy={cursor.point.y} r={Math.max(2, Math.round(Math.min(page.width, page.height) / 100))} />}
                        </svg>
                      </div>
                    </div>;
                  })}
                </div>
                {manualMarks.length > 0 && <ul className="editor-manual-mark-list" aria-label="Marcaje manuale">{manualMarks.map((mark, index) => <li key={`${mark.page}-${mark.box.left}-${mark.box.top}-${index}`}><span>Manual · Pagina {mark.page} · {mark.box.left}, {mark.box.top} · {mark.box.width} × {mark.box.height} px</span><button className="button secondary" type="button" aria-label={`Elimină marcajul manual ${index + 1}`} onClick={() => saveMarks(manualMarks.filter((_, position) => position !== index), manualMarks)} disabled={markSaving}>Elimină</button></li>)}</ul>}
                <div className="editor-actions"><button className="button" type="button" onClick={generatePreview} disabled={generatingPreview || stale || dirty || markSaving || (!manualMarks.length && !editor.candidates.some((candidate) => candidate.review_status === 'accepted'))}>{markSaving ? 'Se salvează marcajele…' : generatingPreview ? 'Se generează PDF-ul…' : 'Previzualizează anonimizarea'}</button></div>
                {previewError && <p className="editor-warning" role="alert">{previewError}</p>}
                {!stale && !manualMarks.length && !editor.candidates.some((candidate) => candidate.review_status === 'accepted') && <p className="muted">Pentru previzualizare, marcați o zonă sau acceptați o potrivire PII.</p>}
                {previewReady && !stale && <div className="editor-preview-pages"><h3>Previzualizare PDF anonimizat</h3><iframe title="Previzualizare PDF anonimizat" src={api.draftRedactedPdf(item.id)} /></div>}
              </section>
              <section className="editor-card" aria-labelledby="ocr-edit-title">
                <header><h2 id="ocr-edit-title">Corectare OCR</h2><p className="muted">Textul extras rămâne păstrat separat. Corectați textul folosind documentul original.</p></header>
                <div className="editor-pages">{pages.map((page, index) => {
                  const source = editor.pages[index];
                  return <article className="editor-page" key={page.page}>
                    <label htmlFor={`editor-ocr-${page.page}`}>Corectare OCR · Pagina {page.page}</label>
                    <textarea id={`editor-ocr-${page.page}`} rows="12" value={page.text} spellCheck="false" onChange={(event) => setPages((current) => current.map((entry, position) => position === index ? { ...entry, text: event.target.value } : entry))} />
                    <details><summary>Casete de delimitare · {source.words.length} cuvinte</summary>
                      {source.words.length ? <ul className="editor-word-list">{source.words.map((word, wordIndex) => <li key={`${word.left}-${word.top}-${wordIndex}`}><span>{word.text}</span><code>{word.left}, {word.top} · {word.width} × {word.height} px · {word.confidence}%</code></li>)}</ul> : <p className="muted">Nu există casete de delimitare pentru această pagină.</p>}
                    </details>
                  </article>;
                })}</div>
                {dirty && <p className="editor-warning" role="status">Rezultatele detectării sunt neactualizate.</p>}
                {editor.detection_status === 'failed' && <p className="editor-warning" role="alert">Detectarea PII a eșuat. Rezultatele anterioare nu pot fi revizuite.</p>}
                <div className="editor-actions"><button className="button" type="button" onClick={saveCorrections} disabled={!dirty || saving}>{saving ? 'Se salvează…' : 'Salvează corecturile'}</button></div>
              </section>
            </div>
            <section className="editor-card editor-review" aria-labelledby="pii-review-title">
              <header><h2 id="pii-review-title">Revizuire PII</h2><p className="muted">Verificați fiecare potrivire înainte de anonimizare.</p></header>
              {stale && <p className="editor-warning">Salvați textul și așteptați o detectare reușită înainte de a revizui potrivirile.</p>}
              {!stale && editor.candidates.length === 0 && <p className="editor-state">Nu au fost găsite potriviri PII.</p>}
              <ul className="editor-candidates">{editor.candidates.map((candidate) => {
                const page = editor.pages.find((entry) => entry.page === candidate.page);
                const span = candidate.corrected_text_span;
                const excerpt = page ? page.corrected_text.slice(span.start, span.start + span.length) : '';
                return <li key={candidate.id}>
                  <div className="editor-candidate-copy"><strong>{piiCategoryLabels[candidate.category] || candidate.category}</strong><span>{excerpt}</span><small>Pagina {candidate.page} · Încredere {Math.round(candidate.confidence)}%</small>
                    <small>{candidate.location_status === 'reliable' ? 'Casete de delimitare asociate' : 'Necesită verificarea manuală a localizării'}</small>
                    {candidate.bounding_boxes.length > 0 && <code>{candidate.bounding_boxes.map((box) => `${box.left}, ${box.top} · ${box.width} × ${box.height} px`).join(' | ')}</code>}
                    {candidate.location_status === 'manual_review_required' && <span className="editor-warning">Localizarea nu este sigură pentru anonimizare automată.</span>}
                    {candidate.review_status !== 'pending' && <span className="editor-review-status">{candidate.review_status === 'accepted' ? 'Acceptată' : 'Respinsă'}</span>}
                  </div>
                  <div className="editor-actions"><button className="button secondary" type="button" onClick={() => decide(candidate, 'accepted')} disabled={stale || candidate.review_status === 'accepted'}>Acceptă potrivirea</button><button className="button secondary" type="button" onClick={() => decide(candidate, 'rejected')} disabled={stale || candidate.review_status === 'rejected'}>Respinge potrivirea</button></div>
                </li>;
              })}</ul>
            </section>
          </>}
    </main>
  );
}

const documentExtension = /\.(pdf|docx)$/i;
const imageExtension = /\.(jpe?g|png)$/i;

function ImageThumbnail({ file }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);

  return <div className="image-thumbnail">
    {url && !failed && <img src={url} alt="" onError={() => setFailed(true)} />}
  </div>;
}

function ImagePageOrder({ pages, onChange, removed, onRemovedChange, disabled, inputRef }) {
  const [openPage, setOpenPage] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const options = useRef(new Map());
  const draggedPage = useRef(null);

  function finishAction(id, message) {
    setOpenPage(null);
    setAnnouncement(message);
    requestAnimationFrame(() => (options.current.get(id) || inputRef.current)?.focus());
  }

  function move(from, to) {
    if (from === to || from < 0 || to < 0 || to >= pages.length) return;
    const ordered = [...pages];
    const [page] = ordered.splice(from, 1);
    ordered.splice(to, 0, page);
    onChange(ordered);
    finishAction(page.id, `Pagina a fost mutată pe poziția ${to + 1}.`);
  }

  function remove(index) {
    const remaining = pages.filter((_, position) => position !== index);
    onRemovedChange({ page: pages[index], index });
    onChange(remaining);
    finishAction(remaining[Math.min(index, remaining.length - 1)]?.id, 'Pagina a fost eliminată.');
  }

  function undo() {
    const restored = [...pages];
    restored.splice(removed.index, 0, removed.page);
    onChange(restored);
    onRemovedChange(null);
    finishAction(removed.page.id, 'Pagina a fost restaurată.');
  }

  return (
    <section className="image-order" aria-labelledby="image-order-title">
      <h3 id="image-order-title">Ordinea paginilor</h3>
      <p className="muted">Folosiți mânerul sau meniul paginii pentru a schimba ordinea.</p>
      {pages.length === 0 && <p className="muted">Adăugați imagini pentru a stabili ordinea paginilor.</p>}
      <ol className="image-pages" aria-label="Ordinea paginilor">
        {pages.map((page, index) => (
          <li className="image-page" key={page.id}
            onDragOver={(event) => { if (!disabled && draggedPage.current !== null) event.preventDefault(); }}
            onDrop={(event) => {
              if (disabled || draggedPage.current === null) return;
              event.preventDefault();
              move(pages.findIndex((entry) => entry.id === draggedPage.current), index);
              draggedPage.current = null;
            }}
          >
            <ImageThumbnail file={page.file} />
            <strong title={page.file.name}>{page.file.name}</strong>
            <div className="image-page-tools">
              <span className="muted">Pagina {index + 1}</span>
              <span className="image-grip" aria-hidden="true" title="Trageți pentru a muta pagina"
                draggable={!disabled}
                onDragStart={(event) => {
                  draggedPage.current = page.id;
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(page.id));
                }}
                onDragEnd={() => { draggedPage.current = null; }}
              >⠿</span>
              <button className="button secondary image-options" type="button" disabled={disabled}
                aria-label={`Opțiuni pentru pagina ${index + 1}`} aria-expanded={openPage === page.id}
                ref={(element) => {
                  if (element) options.current.set(page.id, element);
                  else options.current.delete(page.id);
                }}
                onClick={() => setOpenPage(openPage === page.id ? null : page.id)}
              >⋯</button>
            </div>
            {openPage === page.id && <div className="image-page-menu" onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setOpenPage(null);
                options.current.get(page.id)?.focus();
              }
            }}>
              <button className="button secondary" type="button" disabled={disabled || index === 0} onClick={() => move(index, index - 1)}>Mută la stânga</button>
              <button className="button secondary" type="button" disabled={disabled || index === pages.length - 1} onClick={() => move(index, index + 1)}>Mută la dreapta</button>
              <button className="button secondary" type="button" disabled={disabled} onClick={() => remove(index)}>Elimină pagina</button>
            </div>}
          </li>
        ))}
      </ol>
      {removed && <button className="button secondary" type="button" disabled={disabled} onClick={undo}>Anulează eliminarea paginii</button>}
      <span className="screen-reader-only" aria-live="polite">{announcement}</span>
    </section>
  );
}

function DraftIntakeRow({ item, refreshing, onRefresh, onOpen }) {
  return (
    <li className="draft-item">
      <div className="draft-copy">
        <strong title={item.name}>{item.name}</strong>
        <span className={`draft-status ${item.status === 'invalid' || item.status === 'failed_permanently' ? 'error' : item.status === 'review_ready' ? 'ready' : ''}`}>
          {item.status === 'invalid' ? 'Încărcarea nu a reușit' : statusLabels[item.status] || 'Stare necunoscută'}
        </span>
        {item.id && <span className="draft-id">Ciornă privată · ID {item.id}</span>}
        {item.created_at && <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' })}</time>}
        {item.status === 'review_ready' && <span>OCR finalizat. Documentul așteaptă revizuirea umană.</span>}
        {item.status === 'failed' && <span>Verificați din nou starea după reîncercare.</span>}
        {item.error && <span className="draft-error">{item.error}</span>}
        {item.refreshError && <span className="draft-error" role="alert">{item.refreshError}</span>}
      </div>
      {item.id && <div className="draft-actions">
        {item.status === 'review_ready' && <button className="button" type="button" onClick={onOpen}>Vezi rezultatele OCR</button>}
        <button className="button secondary" type="button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Se actualizează…' : 'Actualizează starea'}
        </button>
      </div>}
    </li>
  );
}

function UploadScreen({ onBack }) {
  const fileInputRef = useRef(null);
  const fileSequence = useRef(0);
  const resultSequence = useRef(0);
  const [kind, setKind] = useState('documents');
  const [files, setFiles] = useState([]);
  const [removedPage, setRemovedPage] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('');
  const [refreshing, setRefreshing] = useState(new Set());
  const [openedItem, setOpenedItem] = useState(null);
  const [recentAttempt, setRecentAttempt] = useState(0);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState('');

  useEffect(() => {
    let active = true;
    api.recentDrafts().then(({ drafts }) => {
      if (!active) return;
      const recovered = drafts.map((draft) => ({
        ...draft,
        key: draft.id,
        name: draft.original_names?.join(', ') || 'Nume indisponibil',
      }));
      setItems((previous) => {
        const existing = new Set(previous.map((item) => item.id));
        return [...previous, ...recovered.filter((item) => !existing.has(item.id))];
      });
    }).catch((error) => {
      if (active) setRecentError(error instanceof ApiError
        ? error.message
        : 'Ciornele nu au putut fi încărcate. Verificați conexiunea și încercați din nou.');
    }).finally(() => { if (active) setRecentLoading(false); });

    return () => { active = false; };
  }, [recentAttempt]);

  function clearFiles() {
    setFiles([]);
    setRemovedPage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function chooseKind(next) {
    if (next === kind) return;
    setKind(next);
    clearFiles();
    setMessage('');
  }

  function selectFiles(selection) {
    const selected = Array.from(selection, (file) => ({ id: fileSequence.current++, file }));
    if (!selected.length) return;
    setFiles((previous) => kind === 'images' ? [...previous, ...selected] : selected);
    setMessage('');
    if (kind === 'documents' && selected.every(({ file }) => !documentExtension.test(file.name))) {
      setMessage('Sunt acceptate doar documentele PDF și DOCX.');
      setMessageKind('error');
    }
  }

  function recordResults(results) {
    const received = results.map((entry) => ({
      key: entry.id || `invalid-${resultSequence.current++}`,
      id: entry.id,
      name: entry.group === 'images'
        ? files.map(({ file }) => file.name).join(', ')
        : files[entry.index]?.file.name || 'Nume indisponibil',
      status: entry.status,
      error: entry.error || '',
    }));
    const ids = new Set(received.filter((entry) => entry.id).map((entry) => entry.id));
    setItems((previous) => [...received, ...previous.filter((entry) => !ids.has(entry.id))]);
    return received;
  }

  async function upload(event) {
    event.preventDefault();
    if (busy || !validSelection) return;

    setBusy(true);
    setMessage(kind === 'documents' && files.length > 1
      ? 'Se transferă documentele către arhivă…'
      : 'Se transferă documentul către arhivă…');
    setMessageKind('loading');
    try {
      const result = await api.uploadDraft(files.map(({ file }) => file), kind);
      const received = recordResults(result.items);
      clearFiles();
      const failed = received.some((entry) => entry.status === 'invalid');
      const accepted = received.some((entry) => entry.id);
      setMessage(failed
        ? (accepted ? 'Unele documente nu au fost încărcate. Verificați rezultatul fiecărui document.'
          : 'Verificați erorile afișate și încercați din nou.')
        : 'Transfer finalizat. Documentele încărcate rămân ciorne private.');
      setMessageKind(failed ? 'error' : 'success');
    } catch (error) {
      if (error instanceof ApiError && error.body?.items?.length) {
        recordResults(error.body.items);
        clearFiles();
      }
      setMessage(error instanceof ApiError
        ? error.message
        : 'Conexiunea a eșuat. Verificați conexiunea și încercați din nou.');
      setMessageKind('error');
    } finally {
      setBusy(false);
    }
  }

  async function refresh(item) {
    setRefreshing((previous) => new Set(previous).add(item.id));
    setItems((previous) => previous.map((entry) => entry.id === item.id ? { ...entry, refreshError: '' } : entry));
    try {
      const result = await api.draftStatus(item.id);
      setItems((previous) => previous.map((entry) => entry.id === item.id
        ? { ...entry, status: result.status, refreshError: '' }
        : entry));
    } catch (error) {
      const refreshError = error instanceof ApiError
        ? error.message
        : 'Starea nu a putut fi actualizată. Încercați din nou.';
      setItems((previous) => previous.map((entry) => entry.id === item.id ? { ...entry, refreshError } : entry));
    } finally {
      setRefreshing((previous) => {
        const active = new Set(previous);
        active.delete(item.id);
        return active;
      });
    }
  }

  const validSelection = files.length > 0 && (kind === 'documents'
    ? files.some(({ file }) => documentExtension.test(file.name))
    : files.every(({ file }) => imageExtension.test(file.name)));
  const rejected = items.filter((item) => !item.id);
  const drafts = items.filter((item) => item.id);

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
          <button className={`button secondary${kind === 'documents' ? ' selected' : ''}`} type="button" aria-pressed={kind === 'documents'} disabled={busy} onClick={() => chooseKind('documents')}>PDF / DOCX</button>
          <button className={`button secondary${kind === 'images' ? ' selected' : ''}`} type="button" aria-pressed={kind === 'images'} disabled={busy} onClick={() => chooseKind('images')}>Colecție de imagini JPG și PNG</button>
        </div>
        <form className="upload-form" onSubmit={upload}>
          <div className={`file-picker${dragOver ? ' drag-over' : ''}`}
            onDragOver={(event) => {
              if (!event.dataTransfer.types.includes('Files')) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
              if (!busy) setDragOver(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              if (!busy) selectFiles(event.dataTransfer.files);
            }}
          >
            <label className="button secondary" htmlFor="draft-files" aria-disabled={busy}>Alege fișiere</label>
            <span className="muted">{kind === 'images'
              ? 'Adăugați sau trageți imagini. Paginile formează un singur document.'
              : 'Alegeți sau trageți fișiere PDF sau DOCX. Fiecare document se procesează separat.'}</span>
          </div>
          <input
            id="draft-files"
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept={kind === 'images' ? '.jpg,.jpeg,.png,image/jpeg,image/png' : '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
            multiple
            disabled={busy}
            aria-label={kind === 'images' ? 'Imagini în ordinea paginilor' : 'Document PDF sau DOCX'}
            onChange={(event) => {
              selectFiles(event.currentTarget.files);
              event.currentTarget.value = '';
            }}
          />
          {kind === 'images'
            ? <ImagePageOrder pages={files} onChange={setFiles} removed={removedPage} onRemovedChange={setRemovedPage} disabled={busy} inputRef={fileInputRef} />
            : files.length > 0 && <ul className="selected-files" aria-label="Fișiere selectate">{files.map(({ file, id }) => (
              <li key={id} title={file.name}>{file.name}</li>
            ))}</ul>}
          {kind === 'images' && files.length > 0 && !validSelection
            && <p className="state-message error" role="alert">Colecția acceptă numai imagini JPG și PNG. Eliminați celelalte fișiere.</p>}
          {message && <p className={`state-message ${messageKind}`} role="status" aria-live="polite">{message}</p>}
          <button className="button submit" type="submit" disabled={busy || !validSelection}>
            {busy ? 'Se încarcă…' : kind === 'documents' && files.length > 1 ? 'Încarcă documentele' : 'Încarcă documentul'}
          </button>
        </form>
        {rejected.length > 0 && <ul className="draft-items" aria-label="Documente respinse">
          {rejected.map((item) => <DraftIntakeRow key={item.key} item={item} />)}
        </ul>}
      </section>
      <section className="draft-list" aria-labelledby="draft-list-title" aria-busy={recentLoading}>
        <div className="page-intro">
          <h2 id="draft-list-title">Ciorne recente</h2>
          <p>Folosiți butonul de actualizare pentru a verifica starea OCR.</p>
          {drafts.length > 0 && <p>Transferul sau finalizarea OCR nu aprobă și nu indexează documentul.</p>}
        </div>
        {recentLoading && <p className="state-message loading">Se încarcă ciornele…</p>}
        {recentError && <div className="recent-error">
          <p className="state-message error" role="alert">{recentError}</p>
          <button className="button secondary" type="button" onClick={() => {
            setRecentLoading(true);
            setRecentError('');
            setRecentAttempt((previous) => previous + 1);
          }}>Reîncarcă ciornele</button>
        </div>}
        {drafts.length === 0 && !recentLoading && !recentError && <p className="empty-archive">Ciornele private vor apărea aici după încărcare.</p>}
        {drafts.length > 0 && <ul className="draft-items">{drafts.map((item) => (
          <DraftIntakeRow key={item.key} item={item} refreshing={refreshing.has(item.id)}
            onRefresh={() => refresh(item)} onOpen={() => setOpenedItem(item)} />
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

  if (!user) return <LoginScreen onLogin={login} busy={busy || checking} message={message} messageKind={messageKind} />;

  const staffRole = user.role === 'admin' || user.role === 'arhivar';
  const content = staffRole && screen === 'upload'
    ? <UploadScreen onBack={() => setScreen('home')} />
    : staffRole && screen === 'queue'
      ? <DraftQueue onUpload={() => setScreen('upload')} onBack={() => setScreen('home')} onReview={(item) => setScreen(`editor:${item.id}`)} />
      : staffRole && screen.startsWith('review:')
        ? <DraftOcrResults item={{ id: screen.slice('review:'.length) }} onBack={() => setScreen('queue')} />
        : staffRole && screen.startsWith('editor:')
          ? <DraftEditor item={{ id: screen.slice('editor:'.length) }} onBack={() => setScreen('queue')} />
        : <ArchiveHome user={user} onUpload={() => setScreen('upload')} onQueue={() => setScreen('queue')} />;

  return <AppShell user={user} screen={screen} onNavigate={setScreen} onLogout={logout} busy={busy}>{content}</AppShell>;
}

createRoot(document.getElementById('root')).render(<Application />);
