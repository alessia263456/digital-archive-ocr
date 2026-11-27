import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, ApiError } from './api.js';
import { AppShell } from './components/AppShell.jsx';
import { ArchiveSearch } from './components/ArchiveSearch.jsx';
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

function EditorGlyph({ name }) {
  const paths = {
    back: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
    previous: <><path d="m15 18-6-6 6-6" /><path d="M20 12H9" /></>,
    next: <><path d="m9 18 6-6-6-6" /><path d="M4 12h11" /></>,
    minus: <path d="M5 12h14" />,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    fitWidth: <><path d="M4 7V4h3M20 7V4h-3M4 17v3h3m13-3v3h-3" /><path d="M7 12h10m-3-3 3 3-3 3" /></>,
    fitPage: <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M8 7h8M8 17h8M8 12h8" /></>,
    redact: <><path d="M4 20h4l11-11-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
    preview: <><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function DraftEditor({ item, onBack, role }) {
  const [activeTab, setActiveTab] = useState('metadata');
  const [zoom, setZoom] = useState(100);
  const [fitMode, setFitMode] = useState('page');
  const [currentPage, setCurrentPage] = useState(1);
  const viewerRef = useRef(null);
  const dossierLookupSequence = useRef(0);
  const [editor, setEditor] = useState(null);
  const [metadataState, setMetadataState] = useState(null);
  const [metadataValues, setMetadataValues] = useState(null);
  const [dossiers, setDossiers] = useState([]);
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [metadataConfirming, setMetadataConfirming] = useState(false);
  const [metadataDirty, setMetadataDirty] = useState(false);
  const [metadataConfirmed, setMetadataConfirmed] = useState(false);
  const [dossierDialog, setDossierDialog] = useState(false);
  const [dossierForm, setDossierForm] = useState({ physical_dossier_number: '', inventory_number: '', description: '' });
  const [finalSnapshot, setFinalSnapshot] = useState('');
  const [finalReviewSaving, setFinalReviewSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [possibleMatches, setPossibleMatches] = useState([]);
  const [pages, setPages] = useState([]);
  const [manualMarks, setManualMarks] = useState([]);
  const [excludedCandidateIds, setExcludedCandidateIds] = useState([]);
  const [viewerMode, setViewerMode] = useState('original');
  const [highlightedRegion, setHighlightedRegion] = useState(null);
  const [pageImageStatus, setPageImageStatus] = useState({});
  const [drawing, setDrawing] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [undoMarks, setUndoMarks] = useState(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [markSaving, setMarkSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [error, setEditorError] = useState('');
  const [errorToasts, setErrorToasts] = useState([]);
  const errorToastTimers = useRef(new Map());
  const errorToastSequence = useRef(0);
  const [reloadRequired, setReloadRequired] = useState(false);
  const dirty = Boolean(editor && pages.some((page, index) => page.text !== editor.pages[index]?.corrected_text));
  const stale = dirty || editor?.detection_status !== 'ready' || editor?.detection_revision !== editor?.ocr_revision;

  function addToast(message, type = 'status') {
    if (!message) return;
    const id = ++errorToastSequence.current;
    setErrorToasts((current) => [...current, { id, message, type }]);
    const timer = window.setTimeout(() => {
      setErrorToasts((current) => current.filter((toast) => toast.id !== id));
      errorToastTimers.current.delete(id);
    }, 6000);
    errorToastTimers.current.set(id, timer);
  }

  function setError(message) {
    setEditorError(message || '');
    addToast(message, 'error');
  }

  function setFeedback(message) {
    addToast(message, 'status');
  }

  function setPublicationMessage(message) {
    addToast(message, 'status');
  }

  useEffect(() => () => {
    errorToastTimers.current.forEach((timer) => window.clearTimeout(timer));
    errorToastTimers.current.clear();
  }, []);

  function fitToWidth() {
    setFitMode('width');
    setZoom(100);
  }

  function fitToPage() {
    const viewer = viewerRef.current;
    const page = editor?.pages.find((entry) => entry.page === currentPage) || editor?.pages[0];
    if (!viewer || !page || !viewer.clientWidth || !viewer.clientHeight) return;
    const style = getComputedStyle(viewer);
    const paddingBlock = parseFloat(style.paddingBlockStart) + parseFloat(style.paddingBlockEnd);
    const paddingInline = parseFloat(style.paddingInlineStart) + parseFloat(style.paddingInlineEnd);
    const heading = viewer.querySelector(`[data-page="${page.page}"] h3`);
    const labelHeight = heading?.getBoundingClientRect().height || 0;
    const rowGap = parseFloat(style.rowGap) || 0;
    const availableWidth = Math.max(1, viewer.clientWidth - paddingInline);
    const pageGap = parseFloat(getComputedStyle(viewer.querySelector('.editor-source-page') || viewer).rowGap) || 0;
    const availableHeight = Math.max(1, viewer.clientHeight - paddingBlock - labelHeight - rowGap - pageGap - 16);
    const pageHeightAtWidth = availableWidth * page.height / page.width;
    setFitMode('page');
    setZoom(Math.max(10, Math.min(100, Math.floor(availableHeight / pageHeightAtWidth * 100))));
  }

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!editor || !viewer) return undefined;
    const updateFit = () => {
      if (fitMode === 'page') fitToPage();
      else if (fitMode === 'width') setZoom(100);
    };
    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(viewer);
    window.addEventListener('resize', updateFit);
    return () => { observer.disconnect(); window.removeEventListener('resize', updateFit); };
  }, [editor, currentPage, fitMode]);

  function goToPage(pageNumber) {
    const target = document.getElementById(`editor-source-page-${pageNumber}`);
    const viewer = target?.closest('.editor-preview-pages');
    if (target && viewer) {
      const delta = target.getBoundingClientRect().top - viewer.getBoundingClientRect().top;
      viewer.scrollTop += delta;
    }
    setCurrentPage(Number(pageNumber));
  }

  async function saveDraft() {
    if (draftSaving || loading || metadataSaving || saving) return;
    setDraftSaving(true);
    setError('');
    setFeedback('Se salvează ciorna…');
    try {
      if (metadataDirty && metadataValues && metadataState && !metadataSaving && !(await saveMetadata())) throw new Error('Metadatele nu au putut fi salvate.');
      if (dirty && !(await saveCorrections())) throw new Error('Corecturile nu au putut fi salvate.');
      setFeedback('Ciorna a fost salvată. Metadatele, verificarea finală și publicarea rămân neconfirmate.');
    } catch (requestError) {
      setFeedback('');
      setError(requestError.message || 'Ciorna nu a putut fi salvată. Încercați din nou.');
    } finally { setDraftSaving(false); }
  }

  function recordTextEdit(before, after) {
    const oldChars = Array.from(before);
    const newChars = Array.from(after);
    let prefix = 0;
    while (prefix < oldChars.length && prefix < newChars.length && oldChars[prefix] === newChars[prefix]) prefix++;
    let suffix = 0;
    while (suffix < oldChars.length - prefix && suffix < newChars.length - prefix
      && oldChars[oldChars.length - 1 - suffix] === newChars[newChars.length - 1 - suffix]) suffix++;
    return {
      start: oldChars.slice(0, prefix).join('').length,
      deleted: oldChars.slice(prefix, oldChars.length - suffix).join(''),
      inserted: newChars.slice(prefix, newChars.length - suffix).join(''),
    };
  }

  function updatePageText(index, value) {
    setPages(current => current.map((entry, position) => position === index
      ? { ...entry, text: value, operations: [...entry.operations, recordTextEdit(entry.text, value)] }
      : entry));
  }

  function drawOnPage(page) {
    setDrawing(true);
    setAnchor(null);
    setCursor(null);
    document.getElementById(`editor-canvas-${page}`)?.focus();
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [result, metadata] = await Promise.all([api.draftEditor(item.id), api.draftMetadata(item.id)]);
      setEditor(result);
      setMetadataState(metadata);
      setMetadataValues({
        act_date: '', act_number: '', physical_dossier_id: null, physical_dossier_number: '', inventory_number: '',
        amount: '', contract_expiry: '', dossier_resolution_date: '', deposit_date: '', deposit_release_date: '', tags: [],
        document_type: metadata.classification?.document_type || '', subtype: metadata.classification?.subtype || '', storage_context: metadata.classification?.storage_context || '',
        nomenclature_entry_id: metadata.classification?.id || null,
        ...(metadata.metadata || {}),
      });
      setMetadataConfirmed(Boolean(metadata.metadata_confirmed));
      setMetadataDirty(false);
      setDossiers(metadata.classification?.id ? (await api.physicalDossiers(metadata.classification.id)).dossiers : []);
      setPages(result.pages.map((page) => ({ page: page.page, text: page.corrected_text, operations: [] })));
      setPageImageStatus(Object.fromEntries(result.pages.map((page) => [page.page, 'loading'])));
      setManualMarks(result.manual_marks || []);
      setExcludedCandidateIds(result.excluded_candidate_ids || []);
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

  const classificationOptions = metadataState?.classification_options || [];
  const selectedClassification = classificationOptions.find((entry) => String(entry.id) === String(metadataState?.classification?.id ?? metadataValues?.nomenclature_entry_id ?? '')) || null;
  const documentTypes = [...new Set(classificationOptions.map((entry) => entry.document_type))];
  const subtypes = [...new Set(classificationOptions.filter((entry) => !metadataValues?.document_type || entry.document_type === metadataValues.document_type).map((entry) => entry.subtype))];
  const contexts = [...new Set(classificationOptions.filter((entry) => (!metadataValues?.document_type || entry.document_type === metadataValues.document_type) && (!metadataValues?.subtype || entry.subtype === metadataValues.subtype)).map((entry) => entry.storage_context))];
  const chosenEntry = classificationOptions.find((entry) => entry.document_type === metadataValues?.document_type && entry.subtype === metadataValues?.subtype && entry.storage_context === metadataValues?.storage_context);
  const retention = metadataState?.retention;
  const retentionBase = String(retention?.computation_base || '').toLowerCase();
  const retentionDateKey = retentionBase.includes('contract') ? 'contract_expiry'
    : retentionBase.includes('soluțion') ? 'dossier_resolution_date'
      : retentionBase.includes('depun') ? 'deposit_date'
        : retentionBase.includes('eliber') ? 'deposit_release_date' : 'act_date';

  function changeMetadata(update) {
    setMetadataValues((current) => ({ ...current, ...update }));
    setMetadataDirty(true);
    setMetadataConfirmed(false); setFinalSnapshot('');
  }

  async function chooseClassification(field, value) {
    const lookupSequence = ++dossierLookupSequence.current;
    const next = { ...metadataValues, [field]: value };
    const row = classificationOptions.find((entry) => entry.document_type === (field === 'document_type' ? value : next.document_type)
      && entry.subtype === (field === 'subtype' ? value : next.subtype)
      && entry.storage_context === (field === 'storage_context' ? value : next.storage_context));
    if (row) {
      next.nomenclature_entry_id = row.id;
      setMetadataState((current) => ({ ...current, classification: row, retention: null }));
      setMetadataValues(next); setMetadataConfirmed(false); setFinalSnapshot('');
      setMetadataDirty(true);
      try {
        const matching = (await api.physicalDossiers(row.id)).dossiers;
        if (lookupSequence === dossierLookupSequence.current) setDossiers(matching);
        setMetadataValues((current) => current.physical_dossier_id && !matching.some((entry) => String(entry.id) === String(current.physical_dossier_id))
          ? { ...current, physical_dossier_id: null, physical_dossier_number: '', inventory_number: '' }
          : current);
      } catch (requestError) { setError(requestError.message); }
    } else {
      delete next.nomenclature_entry_id;
      setMetadataState((current) => ({ ...current, classification: null, retention: null }));
      setDossiers([]);
      setMetadataValues(next); setMetadataConfirmed(false); setFinalSnapshot('');
      setMetadataDirty(true);
    }
  }

  async function saveMetadata() {
    if (!metadataValues || metadataSaving) return false;
    setMetadataSaving(true); setError('');
    try {
      const entry = chosenEntry || classificationOptions.find((row) => String(row.id) === String(metadataValues.nomenclature_entry_id));
      const metadata = Object.fromEntries(['act_date', 'act_number', 'physical_dossier_id', 'inventory_number', 'amount', 'contract_expiry', 'dossier_resolution_date', 'deposit_date', 'deposit_release_date', 'tags'].map((key) => [key, key === 'tags' ? (metadataValues.tags || []).filter(Boolean) : (metadataValues[key] ?? null)]));
      const result = await api.updateDraftMetadata(item.id, metadata, entry?.id);
      setMetadataState((current) => ({ ...current, metadata: result.metadata, metadata_confirmed: false, metadata_revision: result.metadata_revision, ocr_revision: result.ocr_revision, classification: result.classification, retention: result.retention }));
      setMetadataValues((current) => ({ ...current, ...result.metadata }));
      setMetadataDirty(false); setMetadataConfirmed(false); setFinalSnapshot(''); setFeedback('Metadatele au fost salvate. Confirmați-le înainte de aprobarea finală.');
      return true;
    } catch (requestError) { setError(requestError.message || 'Metadatele nu au putut fi salvate.'); return false; }
    finally { setMetadataSaving(false); }
  }

  async function toggleMetadataConfirmation(checked) {
    setMetadataConfirmed(checked);
    if (!checked || !metadataState) return;
    setMetadataConfirming(true);
    try {
      const saved = metadataDirty ? await saveMetadata() : true;
      if (!saved) throw new Error('Metadatele nu au putut fi salvate.');
      setMetadataConfirmed(true);
      await api.confirmDraftMetadata(item.id, metadataState.metadata_revision + (metadataDirty ? 1 : 0), editor.ocr_revision);
      setMetadataState((current) => ({ ...current, metadata_confirmed: true }));
      setFeedback('Metadatele au fost confirmate.');
    } catch (requestError) { setMetadataConfirmed(false); setError(requestError.message || 'Metadatele nu au putut fi confirmate.'); }
    finally { setMetadataConfirming(false); }
  }

  async function createDossier(event) {
    event.preventDefault();
    setError('');
    try {
      const result = await api.createPhysicalDossier({ nomenclature_entry_id: selectedClassification.id, ...dossierForm });
      dossierLookupSequence.current += 1;
      setDossiers((current) => [...current.filter((entry) => String(entry.id) !== String(result.dossier.id)), result.dossier]
        .sort((a, b) => a.physical_dossier_number.localeCompare(b.physical_dossier_number)));
      setMetadataValues((current) => ({ ...current, physical_dossier_id: result.dossier.id, physical_dossier_number: result.dossier.physical_dossier_number, inventory_number: result.dossier.inventory_number }));
      setMetadataDirty(true);
      setFinalSnapshot(''); setMetadataConfirmed(false);
      setDossierDialog(false); setDossierForm({ physical_dossier_number: '', inventory_number: '', description: '' });
      setFeedback('Dosarul fizic a fost creat și selectat.');
    } catch (requestError) { setError(requestError.message || 'Dosarul fizic nu a putut fi creat.'); }
  }

  async function confirmFinalReview() {
    if (!editor || !metadataState || !metadataConfirmed || dirty || stale || finalReviewSaving) return;
    setFinalReviewSaving(true);
    try {
      if (!previewReady && !(await generatePreview())) return;
      const result = await api.confirmDraftReview(item.id, {
        metadata_revision: metadataState.metadata_revision, ocr_revision: editor.ocr_revision,
        detection_revision: editor.detection_revision, redaction_ocr_revision: editor.ocr_revision,
        redaction_detection_revision: editor.detection_revision,
      });
      setFinalSnapshot(result.review_snapshot); setFeedback('Revizuirea finală a fost confirmată.');
    } catch (requestError) { setError(requestError.message || 'Revizuirea finală nu a putut fi confirmată.'); }
    finally { setFinalReviewSaving(false); }
  }

  async function publishDocument(duplicateAction = null) {
    if (!finalSnapshot || publishing) return;
    setPublishing(true);
    try {
      const result = await api.publishDraft(item.id, finalSnapshot, duplicateAction);
      setPublicationMessage(`Documentul a fost aprobat. Versiunea ${result.version_number || result.version?.version_number || ''} este disponibilă.`);
      setFinalSnapshot('');
    } catch (requestError) {
      if (requestError.body?.cod === 'possible_duplicate') { setPossibleMatches(requestError.body.matches || []); setPublicationMessage('Există documente cu același număr și aceeași dată sau o colecție de imagini reordonată. Verificați rezultatele înainte de alegere.'); }
      else if (requestError.body?.cod === 'exact_duplicate') setPublicationMessage('Documentul este identic cu o versiune publicată. Publicarea este blocată.');
      else setError(requestError.message || 'Documentul nu a putut fi aprobat.');
    } finally { setPublishing(false); }
  }

  async function saveCorrections() {
    if (!editor || !dirty || saving) return !dirty;
    setSaving(true);
    setError('');
    setFeedback('Se salvează corecturile și se detectează din nou datele personale…');
    try {
      const result = await api.saveDraftEditorOcr(item.id, editor.ocr_revision, pages);
      setEditor(result);
      setPages(result.pages.map((page) => ({ page: page.page, text: page.corrected_text, operations: [] })));
      setManualMarks(result.manual_marks || []);
      setExcludedCandidateIds(result.excluded_candidate_ids || []);
      setUndoMarks(null);
      setPreviewReady(false);
      setFeedback('Corecturile au fost salvate. Rezultatele PII sunt actualizate.');
      return true;
    } catch (requestError) {
      if (requestError.body?.detection_status === 'failed') {
        setEditor((current) => ({ ...current, ocr_revision: requestError.body.ocr_revision, detection_status: 'failed', candidates: [] }));
        setManualMarks([]);
        setExcludedCandidateIds([]);
        setUndoMarks(null);
        setPreviewReady(false);
        setReloadRequired(true);
        setFeedback('Textul a fost salvat, dar detectarea PII a eșuat. Revizuirea este dezactivată.');
        return false;
      } else {
        if (requestError.status === 409) {
          setEditor((current) => ({ ...current, detection_status: 'stale' }));
          setReloadRequired(true);
        }
        setFeedback('');
        setError(requestError.message || 'Corecturile nu au putut fi salvate. Încercați din nou.');
        return false;
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveMarks(next, nextExcluded = excludedCandidateIds, undo = null) {
    if (!editor || stale || markSaving) return;
    setMarkSaving(true);
    setError('');
    try {
      const result = await api.saveDraftRedactionMarks(item.id, editor.ocr_revision, editor.detection_revision, next, nextExcluded);
      setManualMarks(result.marks);
      setExcludedCandidateIds(result.excluded_candidate_ids || []);
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
    saveMarks([...manualMarks, mark], excludedCandidateIds, { marks: manualMarks, excluded: excludedCandidateIds });
  }

  function appliedRedactions() {
    const included = (editor?.candidates || []).filter((candidate) => !excludedCandidateIds.includes(candidate.id)
      && candidate.location_status === 'reliable' && Array.isArray(candidate.bounding_boxes) && candidate.bounding_boxes.length > 0);
    return [
      ...included.map((candidate) => ({ key: candidate.id, candidate, page: candidate.page,
        type: 'automatic', boxes: candidate.bounding_boxes })),
      ...manualMarks.map((mark, index) => ({ key: `manual-${index}`, page: mark.page, type: 'manual', boxes: [mark.box], index })),
    ];
  }

  async function removeApplied(itemToRemove) {
    const prior = { marks: manualMarks, excluded: excludedCandidateIds };
    if (itemToRemove.type === 'manual') {
      await saveMarks(manualMarks.filter((_, index) => index !== itemToRemove.index), excludedCandidateIds, prior);
    } else {
      await saveMarks(manualMarks, [...new Set([...excludedCandidateIds, itemToRemove.candidate.id])], prior);
    }
  }

  function inspectApplied(entry) {
    setHighlightedRegion(entry.key);
    goToPage(entry.page);
    setTimeout(() => setHighlightedRegion((current) => current === entry.key ? null : current), 1800);
  }

  async function generatePreview(showAnonymizedWhenReady = false) {
    if (stale || dirty || markSaving || generatingPreview) return;
    setGeneratingPreview(true);
    setError(''); setPreviewReady(false);
    try {
      await api.generateDraftRedaction(item.id);
      setPreviewReady(true);
      if (showAnonymizedWhenReady) setViewerMode('anonymized');
      setFeedback('Previzualizarea anonimizării a fost generată. Verificați toate paginile.');
      return true;
    } catch (requestError) {
      if (requestError.status === 409) { setReloadRequired(true); setEditor((current) => ({ ...current, detection_status: 'stale' })); }
      setError(requestError.message || 'Previzualizarea nu a putut fi generată. Verificați marcajele și încercați din nou.');
      return false;
    } finally {
      setGeneratingPreview(false);
    }
  }

  return (
    <main className="editor-wrap" data-step={activeTab} aria-busy={loading || saving || draftSaving || publishing}>
      <div className="editor-heading">
        <button className="button secondary editor-back" type="button" aria-label="Înapoi la cozi" title="Înapoi la cozi" onClick={onBack}><EditorGlyph name="back" /></button>
        <div className="editor-title"><h1 title={item.name}>{item.name}</h1><p className="muted">{metadataValues?.physical_dossier_number || 'Dosar fizic necompletat'} · Ciornă privată</p></div>
        <button className="button editor-save-draft" type="button" onClick={saveDraft} disabled={loading || metadataSaving || saving || draftSaving} aria-busy={draftSaving}>{draftSaving && <span className="editor-spinner" aria-hidden="true" />}{draftSaving ? 'Se salvează ciorna…' : 'Salvează ciorna'}</button>
      </div>
      <nav className="editor-steps" role="tablist" aria-label="Etapele editorului">
        {[
          ['metadata', 'Date document', metadataConfirmed ? 'Confirmate' : 'În așteptare'],
          ['ocr', 'Corectare OCR', dirty ? 'Corecturi nesalvate' : 'Text extras'],
          ['pii', 'Anonimizare', stale ? 'Rezultate neactualizate' : 'Incluse implicit'],
          ['final', 'Verificare finală', finalSnapshot ? 'Confirmată' : 'În așteptare'],
        ].map(([key, label, status], index, tabs) => <button key={key} id={`editor-tab-${key}`} className="editor-tab" type="button" role="tab" aria-selected={activeTab === key} aria-controls={`editor-panel-${key}`} tabIndex={activeTab === key ? 0 : -1} onClick={() => setActiveTab(key)} onKeyDown={(event) => { if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? tabs[0][0] : event.key === 'End' ? tabs[tabs.length - 1][0] : tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length][0]; setActiveTab(next); document.getElementById(`editor-tab-${next}`)?.focus(); }}>{label}<small>{status}</small></button>)}
      </nav>
      {loading ? <p className="editor-state" role="status"><span className="editor-spinner" aria-hidden="true" />Se încarcă documentul…</p>
        : error && !editor ? <section className="editor-state editor-error"><button className="button secondary" type="button" onClick={load}>Reîncearcă încărcarea</button></section>
          : editor && <>
            {reloadRequired && <div className="editor-actions"><button className="button secondary" type="button" onClick={load}>Reîncarcă editorul</button></div>}
            {metadataState && metadataValues && <section id="editor-panel-metadata" role="tabpanel" aria-labelledby="editor-tab-metadata" hidden={activeTab !== 'metadata'} className="editor-card metadata-workflow">
              <header><h2 id="metadata-workflow-title">Date document</h2><p className="muted">Completați clasificarea și identificarea înainte de continuarea revizuirii.</p></header>
              <div className="metadata-form">
                <section className="metadata-section">
                  <h3>Clasificare arhivistică</h3>
                  <div className="metadata-fields">
                    <label>Tip document<select value={metadataValues.document_type || ''} onChange={(event) => chooseClassification('document_type', event.target.value)}><option value="">Selectați tipul</option>{documentTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
                    <label>Subtip<select value={metadataValues.subtype || ''} onChange={(event) => chooseClassification('subtype', event.target.value)}><option value="">Selectați subtipul</option>{subtypes.map((value) => <option key={value}>{value}</option>)}</select></label>
                    <label>Context de arhivare<select value={metadataValues.storage_context || ''} onChange={(event) => chooseClassification('storage_context', event.target.value)}><option value="">Selectați contextul</option>{contexts.map((value) => <option key={value}>{value}</option>)}</select></label>
                    <label>Indicativ arhivistic<input value={selectedClassification?.archival_indicator || ''} readOnly /></label>
                  </div>
                  <div className="metadata-retention"><h3>Retenție</h3>{retention ? <>
                    <p>{retention.status === 'permanent' ? 'Păstrare permanentă' : retention.status === 'pending' ? 'Dată de retenție în așteptare' : `Prima dată eligibilă: ${retention.first_eligible_date}`}</p>
                    <p className="muted">{selectedClassification?.retention_term || ''} · {retention.computation_base}</p>
                    <p className="muted">Data indică eligibilitatea pentru analiză, nu autorizează distrugerea. Distrugerea necesită confirmarea separată a Adminului.</p>
                  </> : <p className="muted">Alegeți tipul, subtipul și contextul pentru a vedea termenul de păstrare.</p>}</div>
                  {retention?.status === 'pending' && retentionDateKey !== 'act_date' && <label className="metadata-event-date">{retention.computation_base}<input type="date" value={metadataValues[retentionDateKey] || ''} onChange={(event) => {
                    changeMetadata({ [retentionDateKey]: event.target.value });
                  }} /></label>}
                </section>
                <section className="metadata-section"><h3>Identificarea actului</h3><div className="metadata-fields metadata-identification">
                  <label>Data actului<input type="date" value={metadataValues.act_date || ''} onChange={(event) => changeMetadata({ act_date: event.target.value })} /></label>
                  <label>Numărul actului<input value={metadataValues.act_number || ''} onChange={(event) => changeMetadata({ act_number: event.target.value })} /></label>
                </div></section>
                <section className="metadata-section"><h3>Dosar fizic</h3>
                  <label>Dosar fizic<select value={metadataValues.physical_dossier_id || ''} onChange={(event) => {
                    const dossier = dossiers.find((entry) => String(entry.id) === event.target.value);
                    changeMetadata({ physical_dossier_id: dossier?.id || null, physical_dossier_number: dossier?.physical_dossier_number || '', inventory_number: dossier?.inventory_number || '' });
                  }}><option value="">Selectați dosarul fizic</option>{dossiers.map((dossier) => <option key={dossier.id} value={dossier.id}>{dossier.physical_dossier_number}</option>)}</select></label>
                  {!dossiers.length && selectedClassification && (role === 'admin' || role === 'arhivar' ? <button className="button secondary" type="button" onClick={() => setDossierDialog(true)}>Creează dosarul fizic</button> : <p className="muted">Solicitați crearea dosarului fizic.</p>)}
                  <label>Număr de inventar<input value={metadataValues.inventory_number || ''} readOnly={Boolean(metadataValues.physical_dossier_id)} onChange={(event) => changeMetadata({ inventory_number: event.target.value })} /></label>
                </section>
                <section className="metadata-section"><h3>Etichete</h3>{(metadataValues.tags || []).map((tag, index) => <label key={index}>Etichetă {index + 1}<select value={tag} onChange={(event) => changeMetadata({ tags: metadataValues.tags.map((item, position) => position === index ? event.target.value : item) })}><option value="">Selectați eticheta</option>{documentTypes.map((value) => <option key={value}>{value}</option>)}</select></label>)}
                  <button className="button secondary" type="button" onClick={() => changeMetadata({ tags: [...(metadataValues.tags || []), ''] })}>Adaugă etichetă</button>
                </section>
                {metadataState.suggestions && <p className="muted metadata-suggestions">Sugestii OCR: {[metadataState.suggestions.act_date && `Data ${metadataState.suggestions.act_date}`, metadataState.suggestions.act_number && `Număr ${metadataState.suggestions.act_number}`, ...(metadataState.suggestions.tags || [])].filter(Boolean).join(' · ') || 'Nu există sugestii.'}</p>}
                {metadataDirty && <p className="muted" role="status">Modificările se păstrează la salvarea ciornei.</p>}
                <label className="metadata-confirmation"><input type="checkbox" checked={metadataConfirmed} disabled={!metadataState.metadata_revision || metadataSaving || metadataConfirming} onChange={(event) => toggleMetadataConfirmation(event.target.checked)} />{metadataConfirming && <span className="editor-spinner" aria-hidden="true" />}Confirmă metadatele</label>
                {metadataState.metadata_confirmed && <p className="muted">Metadate confirmate</p>}
              </div>
              {dossierDialog && <dialog open className="dossier-dialog"><form onSubmit={createDossier}><h3>Creează dosarul fizic</h3><label>Numărul dosarului fizic<input required value={dossierForm.physical_dossier_number} onChange={(event) => setDossierForm((current) => ({ ...current, physical_dossier_number: event.target.value }))} /></label><label>Număr inventar dosar<input required value={dossierForm.inventory_number} onChange={(event) => setDossierForm((current) => ({ ...current, inventory_number: event.target.value }))} /></label><label>Descriere scurtă (opțional)<input value={dossierForm.description} onChange={(event) => setDossierForm((current) => ({ ...current, description: event.target.value }))} /></label><p className="muted">Indicativul și termenul de păstrare sunt preluate din clasificare.</p><div className="editor-actions"><button className="button secondary" type="button" onClick={() => setDossierDialog(false)}>Renunță</button><button className="button" type="submit">Creează dosarul</button></div></form></dialog>}
            </section>}
            <div className="editor-grid">
              <section className="editor-card" aria-labelledby="editor-preview-title">
                <header className="editor-viewer-heading"><h2 id="editor-preview-title">Document {viewerMode === 'original' ? 'original' : 'anonimizat'}</h2><div className="editor-viewer-modes" role="group" aria-label="Previzualizare document"><button type="button" className="button secondary" aria-pressed={viewerMode === 'original'} onClick={() => setViewerMode('original')}>Original</button><button type="button" className="button secondary" aria-pressed={viewerMode === 'anonymized'} onClick={() => previewReady ? setViewerMode('anonymized') : generatePreview(true)} disabled={generatingPreview || stale || dirty || markSaving}>{generatingPreview && <span className="editor-spinner" aria-hidden="true" />}{generatingPreview ? 'Se generează…' : 'Anonimizat'}</button></div></header>
                <div className="editor-viewer-toolbar">
                  <button className="editor-icon-button" type="button" aria-pressed={drawing} onClick={() => { setDrawing((value) => !value); setAnchor(null); setCursor(null); }} disabled={stale || saving || markSaving} aria-label={drawing ? 'Renunță la marcaj' : 'Marchează o zonă'} title={drawing ? 'Renunță la marcaj' : 'Marchează o zonă'}><EditorGlyph name="redact" /></button>
                  <span className="editor-mark-count" aria-live="polite">Marcaje aplicate {appliedRedactions().length}</span>
                  <span className="editor-toolbar-divider" aria-hidden="true" />
                  <button className="editor-icon-button" type="button" onClick={() => goToPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} aria-label="Pagina anterioară" title="Pagina anterioară"><EditorGlyph name="previous" /></button>
                  <label className="editor-page-picker"><span className="screen-reader-only">Pagina documentului</span><select aria-label="Pagina documentului" value={currentPage} onChange={(event) => goToPage(event.target.value)}>{editor.pages.map((page) => <option key={page.page} value={page.page}>{page.page}</option>)}</select><span aria-hidden="true">/ {editor.pages.length}</span></label>
                  <button className="editor-icon-button" type="button" onClick={() => goToPage(Math.min(editor.pages.length, currentPage + 1))} disabled={currentPage >= editor.pages.length} aria-label="Pagina următoare" title="Pagina următoare"><EditorGlyph name="next" /></button>
                  <span className="editor-toolbar-divider" aria-hidden="true" />
                  <button className="editor-icon-button" type="button" onClick={() => { setFitMode('custom'); setZoom((value) => Math.max(25, value - 10)); }} aria-label="Micșorează" title="Micșorează"><EditorGlyph name="minus" /></button>
                  <output className="editor-zoom-value" aria-live="polite">{zoom}%</output>
                  <button className="editor-icon-button" type="button" onClick={() => { setFitMode('custom'); setZoom((value) => Math.min(200, value + 10)); }} aria-label="Mărește" title="Mărește"><EditorGlyph name="plus" /></button>
                  <button className="editor-icon-button" type="button" onClick={fitToWidth} aria-label="Potrivire la lățime" title="Potrivire la lățime"><EditorGlyph name="fitWidth" /></button>
                  <button className="editor-icon-button" type="button" onClick={fitToPage} aria-label="Potrivire la pagină" title="Potrivire la pagină"><EditorGlyph name="fitPage" /></button>
                  <button className="editor-icon-button editor-preview-action" type="button" onClick={generatePreview} disabled={generatingPreview || stale || dirty || markSaving} aria-label="Previzualizează anonimizarea" title="Generează previzualizarea anonimizată"><EditorGlyph name="preview" />{generatingPreview && <span className="editor-spinner" aria-hidden="true" />}</button>
                  {markSaving && <span className="editor-toolbar-status" role="status"><span className="editor-spinner" aria-hidden="true" />Se salvează marcajele…</span>}
                  {generatingPreview && <span className="editor-toolbar-status" role="status"><span className="editor-spinner" aria-hidden="true" />Se generează previzualizarea…</span>}
                </div>
                {drawing && viewerMode === 'original' && <p className="editor-drawing-state" id="editor-drawing-help" role="status">Trasați zona pe pagină. Folosiți săgețile și Enter pentru tastatură.</p>}
                <iframe className="editor-continuous-redacted" title="Document anonimizat" src={previewReady ? api.draftRedactedPdf(item.id) : undefined} hidden={viewerMode !== 'anonymized' || !previewReady} />
                <div hidden={viewerMode !== 'original'} className="editor-preview-pages editor-source-pages" ref={viewerRef} aria-label="Pagini documentului" onScroll={(event) => {
                  const viewport = event.currentTarget.getBoundingClientRect();
                  const visiblePages = [...event.currentTarget.querySelectorAll('.editor-source-page')].filter((node) => { const rect = node.getBoundingClientRect(); return rect.bottom > viewport.top && rect.top < viewport.bottom; });
                  const center = viewport.top + viewport.height / 2;
                  const current = visiblePages.sort((left, right) => {
                    const leftRect = left.getBoundingClientRect(), rightRect = right.getBoundingClientRect();
                    return Math.abs((leftRect.top + leftRect.bottom) / 2 - center) - Math.abs((rightRect.top + rightRect.bottom) / 2 - center);
                  })[0];
                  if (current) setCurrentPage(Number(current.dataset.page));
                }}>
                  {editor.pages.map((page) => {
                    const boxes = [
                      ...appliedRedactions().filter((entry) => entry.page === page.page).flatMap((entry) => entry.boxes.map((box) => ({ ...box, kind: `${entry.type}${highlightedRegion === entry.key ? ' highlighted' : ''}` }))),
                    ];
                    const active = anchor?.page === page.page ? { left: Math.min(anchor.point.x, (cursor?.page === page.page ? cursor.point.x : anchor.point.x)), top: Math.min(anchor.point.y, (cursor?.page === page.page ? cursor.point.y : anchor.point.y)), width: Math.abs((cursor?.page === page.page ? cursor.point.x : anchor.point.x) - anchor.point.x), height: Math.abs((cursor?.page === page.page ? cursor.point.y : anchor.point.y) - anchor.point.y) } : null;
                    return <div id={`editor-source-page-${page.page}`} data-page={page.page} className="editor-source-page" key={page.page}>
                      <h3>Pagina {page.page}</h3>
                      <div className={`editor-page-canvas${drawing ? ' drawing' : ''}`} style={{ aspectRatio: `${page.width} / ${page.height}`, inlineSize: `${zoom}%` }}
                        onPointerDown={(event) => { if (!drawing || stale || event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const point = pointFor(event, page); if (anchor?.page === page.page) completeMark(page, anchor.point, point); else { setAnchor({ page: page.page, point }); setCursor({ page: page.page, point }); } }}
                        onPointerMove={(event) => { if (drawing && anchor?.page === page.page) setCursor({ page: page.page, point: pointFor(event, page) }); }}
                        onPointerUp={(event) => { if (!drawing || !anchor || anchor.page !== page.page) return; const point = pointFor(event, page); if (anchor.point.x !== point.x || anchor.point.y !== point.y) completeMark(page, anchor.point, point); }}>
                        <img src={api.draftEditorPageImage(item.id, page.page)} alt={`Document original, pagina ${page.page}`} draggable="false" onLoad={() => setPageImageStatus((current) => ({ ...current, [page.page]: 'loaded' }))} onError={() => { setPageImageStatus((current) => ({ ...current, [page.page]: 'error' })); setError('Imaginea paginii nu a putut fi încărcată. Reîncărcați editorul.'); }} />
                        {pageImageStatus[page.page] === 'loading' && <span className="editor-page-loading" role="status"><span className="editor-spinner" aria-hidden="true" />Se încarcă pagina {page.page}…</span>}
                        <svg id={`editor-canvas-${page.page}`} viewBox={`0 0 ${page.width} ${page.height}`} role="application" aria-label={`Document original, pagina ${page.page}`} aria-describedby={drawing ? 'editor-drawing-help' : undefined} tabIndex="0"
                          onKeyDown={(event) => { if (!drawing) return; if (event.key === 'Escape') { setDrawing(false); setAnchor(null); setCursor(null); event.preventDefault(); return; } if (event.key.startsWith('Arrow')) { const step = Math.max(1, Math.round(Math.min(page.width, page.height) / 100)); const current = cursor?.page === page.page ? cursor.point : { x: Math.round(page.width / 2), y: Math.round(page.height / 2) }; const next = { x: Math.max(0, Math.min(page.width - 1, current.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0))), y: Math.max(0, Math.min(page.height - 1, current.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0))) }; setCursor({ page: page.page, point: next }); event.preventDefault(); } else if (event.key === 'Enter') { event.preventDefault(); const point = cursor?.page === page.page ? cursor.point : { x: Math.round(page.width / 2), y: Math.round(page.height / 2) }; if (anchor?.page === page.page) completeMark(page, anchor.point, point); else { setAnchor({ page: page.page, point }); setCursor({ page: page.page, point }); } } }}>
                          {boxes.map((box, index) => <rect key={`${box.kind}-${index}`} className={`editor-mark-rect ${box.kind}`} x={box.left} y={box.top} width={box.width} height={box.height} />)}
                          {active && <rect className="editor-mark-rect preview" x={active.left} y={active.top} width={Math.max(active.width, 1)} height={Math.max(active.height, 1)} />}
                          {cursor?.page === page.page && drawing && <circle className="editor-mark-cursor" cx={cursor.point.x} cy={cursor.point.y} r={Math.max(2, Math.round(Math.min(page.width, page.height) / 100))} />}
                        </svg>
                      </div>
                    </div>;
                  })}
                </div>
                {undoMarks && <button type="button" className="button secondary editor-undo-mark" onClick={() => saveMarks(undoMarks.marks, undoMarks.excluded)} disabled={markSaving}>{markSaving && <span className="editor-spinner" aria-hidden="true" />}Anulează eliminarea</button>}
                {!stale && !appliedRedactions().length && <p className="screen-reader-only">Previzualizarea poate fi generată și fără anonimizări aplicate.</p>}
              </section>
              <section id="editor-panel-ocr" role="tabpanel" aria-labelledby="editor-tab-ocr" hidden={activeTab !== 'ocr'} className="editor-card">
                <header><h2 id="ocr-edit-title">Corectare OCR</h2><p className="muted">Textul extras rămâne păstrat separat. Corectați textul folosind documentul original.</p></header>
                <div className="editor-pages">{pages.map((page, index) => {
                  const source = editor.pages[index];
                  return <article className="editor-page" key={page.page}>
                    <label htmlFor={`editor-ocr-${page.page}`}>Corectare OCR · Pagina {page.page}</label>
                    <textarea id={`editor-ocr-${page.page}`} rows="12" value={page.text} spellCheck="false" onChange={(event) => updatePageText(index, event.target.value)} />
                  </article>;
                })}</div>
                <div className="editor-actions"><button className="button" type="button" onClick={saveCorrections} disabled={!dirty || saving}>{saving && <span className="editor-spinner" aria-hidden="true" />}{saving ? 'Se salvează…' : 'Salvează corecturile'}</button></div>
              </section>
            </div>
            <section id="editor-panel-pii" role="tabpanel" aria-labelledby="editor-tab-pii" hidden={activeTab !== 'pii'} className="editor-card editor-review">
              <header><h2 id="pii-review-title">Anonimizări aplicate</h2><p className="muted">Potrivirile cu localizare sigură sunt incluse implicit; cele fără localizare sigură sunt omise automat. Eliminați rezultatele incorecte sau marcați suplimentar zone manual.</p></header>
              <section className="editor-applied-list" aria-labelledby="editor-applied-title">
                <h3 id="editor-applied-title">Anonimizări aplicate</h3>
                <p className="muted">Total: {appliedRedactions().length} · Detectate: {appliedRedactions().filter((entry) => entry.candidate).length} · Manuale: {appliedRedactions().filter((entry) => entry.type === 'manual').length}</p>
                {appliedRedactions().length ? <ul>{appliedRedactions().map((entry) => {
                  const candidate = entry.candidate;
                  const page = editor.pages.find((itemPage) => itemPage.page === entry.page);
                  const span = candidate?.corrected_text_span;
                  const value = page && span ? page.corrected_text.slice(span.start, span.start + span.length) : 'Zonă marcată manual';
                  const category = candidate ? (piiCategoryLabels[candidate.category] || candidate.category) : 'Zonă manuală';
                  return <li key={entry.key}><div><strong>{category}</strong><span>{value}</span><small>{entry.type === 'automatic' ? 'Automată' : 'Manuală'} · Pagina {entry.page}</small></div><div className="editor-actions"><button className="button secondary" type="button" onClick={() => inspectApplied(entry)}>Vezi</button><button className="button secondary" type="button" aria-label={`Elimină anonimizarea: ${category}, pagina ${entry.page}`} onClick={() => removeApplied(entry)} disabled={markSaving}>×</button></div></li>;
                })}</ul> : <p className="muted">Nu există anonimizări aplicate.</p>}
                {undoMarks && <button className="button secondary" type="button" onClick={() => saveMarks(undoMarks.marks, undoMarks.excluded)} disabled={markSaving}>Anulează eliminarea</button>}
                <button className="button secondary" type="button" onClick={() => { setDrawing(true); setViewerMode('original'); }}>Marchează o zonă</button>
              </section>
              {!stale && editor.candidates.length === 0 && <p className="editor-state">Nu au fost găsite potriviri PII.</p>}
            </section>
            <section id="editor-panel-final" role="tabpanel" aria-labelledby="editor-tab-final" hidden={activeTab !== 'final'} className="editor-card editor-final-review">
              <header><h2 id="final-review-title">Verificare finală</h2><p className="muted">Metadatele confirmate, OCR-ul și anonimizarea trebuie să corespundă revizuirii curente.</p></header>
              <section className="editor-final-summary">
                <h3>Sumarul revizuirii</h3>
                <p><strong>Metadate:</strong> {metadataConfirmed ? 'Confirmate' : 'De confirmat'} · {metadataValues?.act_number ? `Act nr. ${metadataValues.act_number}` : 'Număr act necompletat'} · {metadataValues?.physical_dossier_number || 'Dosar fizic neales'}</p>
                <p><strong>Clasificare și retenție:</strong> {selectedClassification ? `${selectedClassification.document_type} · ${selectedClassification.subtype} · ${selectedClassification.archival_indicator}` : 'De completat'} · {retention?.status === 'permanent' ? 'Păstrare permanentă' : retention?.first_eligible_date ? `Prima dată eligibilă ${retention.first_eligible_date}` : 'Dată în așteptare'}</p>
                <label>Text OCR corectat<textarea readOnly rows="5" value={pages.map((page) => page.text).join('\n\n')} /></label>
                <p><strong>Anonimizări:</strong> {appliedRedactions().filter((entry) => entry.candidate).length} potriviri detectate incluse și {appliedRedactions().filter((entry) => entry.type === 'manual').length} zone marcate manual.</p>
                <div className="editor-actions"><button type="button" className="button secondary" onClick={() => setActiveTab('metadata')}>Verifică metadatele</button><button type="button" className="button secondary" onClick={() => setActiveTab('ocr')}>Verifică textul OCR</button><button type="button" className="button secondary" onClick={() => setActiveTab('pii')}>Verifică anonimizarea</button></div>
              </section>
              {!finalSnapshot ? <div className="editor-actions"><button className="button" type="button" onClick={confirmFinalReview} disabled={!metadataConfirmed || dirty || stale || finalReviewSaving}>{finalReviewSaving && <span className="editor-spinner" aria-hidden="true" />}{finalReviewSaving ? 'Se generează și se confirmă…' : 'Confirmă revizuirea finală'}</button></div>
                : <div className="editor-actions"><button className="button" type="button" onClick={() => publishDocument()} disabled={publishing}>{publishing && <span className="editor-spinner" aria-hidden="true" />}{publishing ? 'Se publică…' : 'Aprobă și publică'}</button></div>}
              {possibleMatches.length > 0 && <div className="editor-duplicate-options"><h3>Posibil document duplicat</h3><ul>{possibleMatches.map((match) => <li key={match.id}>Document existent · {match.reason === 'reordered_image_collection' ? 'colecție de imagini reordonată' : 'număr și dată identice'}</li>)}</ul><p className="muted">O versiune nouă necesită selectarea explicită a documentului și versiunii curente. Puteți publica separat documentul sau anula.</p><div className="editor-actions"><button className="button secondary" type="button" onClick={() => publishDocument('separate')} disabled={publishing}>{publishing && <span className="editor-spinner" aria-hidden="true" />}Publică separat</button><button className="button secondary" type="button" onClick={() => { setPossibleMatches([]); setFinalSnapshot(''); setPublicationMessage('Publicarea a fost anulată.'); }} disabled={publishing}>Anulează publicarea</button></div></div>}
            </section>
          </>}
      <div className="editor-error-toasts" aria-live="assertive" aria-relevant="additions">
        {errorToasts.map((toast) => <p className={`editor-error-toast editor-toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'} key={toast.id}>{toast.message}</p>)}
      </div>
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
  const [selectedDraft, setSelectedDraft] = useState(null);

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
      ? <DraftQueue onUpload={() => setScreen('upload')} onBack={() => setScreen('home')} onReview={(item) => { setSelectedDraft(item); setScreen(`editor:${item.id}`); }} />
      : staffRole && screen.startsWith('review:')
        ? <DraftOcrResults item={{ id: screen.slice('review:'.length) }} onBack={() => setScreen('queue')} />
        : staffRole && screen.startsWith('editor:')
          ? <DraftEditor item={selectedDraft?.id === screen.slice('editor:'.length) ? selectedDraft : { id: screen.slice('editor:'.length) }} onBack={() => setScreen('queue')} role={user.role} />
        : <ArchiveSearch user={user} onUpload={() => setScreen('upload')} onQueue={() => setScreen('queue')} />;

  return <AppShell user={user} screen={screen} onNavigate={setScreen} onLogout={logout} busy={busy}>{content}</AppShell>;
}

createRoot(document.getElementById('root')).render(<Application />);
