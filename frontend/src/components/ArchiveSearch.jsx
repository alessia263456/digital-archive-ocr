import React, { useEffect, useMemo, useRef, useState } from 'react';
import { archiveSearchPageSize, loadArchiveCatalog, searchArchive } from './archiveSearchRepository.js';
import './ArchiveSearch.css';

const emptyFilters = { dossierId: 'all', type: 'all', year: 'all', tags: '', partyQuery: '' };
const initialResult = { items: [], total: 0, page: 1, pageCount: 1 };

function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ro');
}

function HighlightedText({ children, query }) {
  const text = String(children ?? '');
  const terms = [...new Set(query.trim().split(/\s+/).filter(Boolean))];
  if (!terms.length) return text;
  const normalizedText = normalize(text);
  const ranges = [];
  terms.forEach((term) => {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) return;
    let from = 0;
    while (from < normalizedText.length) {
      const start = normalizedText.indexOf(normalizedTerm, from);
      if (start < 0) break;
      ranges.push([start, start + normalizedTerm.length]);
      from = start + normalizedTerm.length;
    }
  });
  if (!ranges.length) return text;
  ranges.sort((left, right) => left[0] - right[0]);
  const merged = ranges.reduce((result, range) => {
    const previous = result[result.length - 1];
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else result.push([...range]);
    return result;
  }, []);
  return <>{merged.map(([start, end], index) => <React.Fragment key={`${start}-${index}`}>
    {index === 0 && start > 0 ? text.slice(0, start) : index > 0 && merged[index - 1][1] < start ? text.slice(merged[index - 1][1], start) : null}
    <mark>{text.slice(start, end)}</mark>
    {index === merged.length - 1 && end < text.length ? text.slice(end) : null}
  </React.Fragment>)}</>;
}

function FolderIcon() {
  return <svg className="archive-folder-icon" viewBox="0 0 40 32" aria-hidden="true" fill="none">
    <path d="M3 8.5a3 3 0 0 1 3-3h10l3.5 4H34a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" />
    <path d="M3.5 13h33" />
  </svg>;
}

function dateLabel(value) {
  if (!value) return 'Nespecificată';
  return new Intl.DateTimeFormat('ro-RO').format(new Date(`${value}T00:00:00`));
}

export function ArchiveSearch({ user, onUpload, onQueue }) {
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState('relevance');
  const [view, setView] = useState('home');
  const [browse, setBrowse] = useState(null);
  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const sequence = useRef(0);
  const staff = user.role === 'admin' || user.role === 'arhivar';

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadArchiveCatalog(user.role)
      .then((data) => { if (active) { setCatalog(data); setError(''); } })
      .catch(() => { if (active) setError('Arhiva nu a putut fi încărcată. Încearcă din nou.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.role]);

  const recentDocuments = useMemo(() => catalog?.documents || [], [catalog]);
  const hasFilters = Object.entries(filters).some(([key, value]) => key === 'dossierId' || key === 'type' || key === 'year'
    ? value !== 'all' : Boolean(value.trim()));

  async function runSearch(nextQuery = query, nextFilters = filters, options = {}) {
    const nextSort = options.sort || sort;
    const nextBrowse = Object.hasOwn(options, 'browse') ? options.browse : browse;
    const requestedPage = options.page || 1;
    setQuery(nextQuery);
    setFilters(nextFilters);
    setSort(nextSort);
    setBrowse(nextBrowse);
    const requestSequence = ++sequence.current;
    if (!nextQuery.trim() && !hasActiveFilters(nextFilters) && !nextBrowse) {
      setView('home');
      setResult(initialResult);
      setError('');
      setLoading(false);
      return;
    }
    setView('search');
    setLoading(true);
    setError('');
    try {
      const nextResult = await searchArchive({ role: user.role, query: nextQuery, filters: nextFilters, sort: nextSort, page: requestedPage, browse: nextBrowse });
      if (sequence.current === requestSequence) setResult(nextResult);
    } catch {
      if (sequence.current === requestSequence) setError('Căutarea nu a putut fi finalizată. Încearcă din nou.');
    } finally {
      if (sequence.current === requestSequence) setLoading(false);
    }
  }

  function hasActiveFilters(value) {
    return value.dossierId !== 'all' || value.type !== 'all' || value.year !== 'all' || Boolean(value.tags.trim()) || Boolean(value.partyQuery.trim());
  }

  function updateFilter(key, value) {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    void runSearch(query, nextFilters, { browse: null });
  }

  function goHome() {
    setQuery('');
    setFilters(emptyFilters);
    setSort('relevance');
    setBrowse(null);
    setResult(initialResult);
    setError('');
    setView('home');
  }

  function clearFilters() {
    setFilters(emptyFilters);
    void runSearch(query, emptyFilters, { browse: null });
  }

  function browseFolder(kind, item) {
    const nextBrowse = kind === 'type' ? { type: item.type, title: item.type, caption: 'Documente după tip' }
      : kind === 'dossier' ? { dossierId: item.id, title: item.number, caption: item.context }
        : { year: item.year, title: item.year, caption: `Documente cu data actului din ${item.year}` };
    void runSearch('', filters, { browse: nextBrowse, sort: 'newest' });
  }

  function toggleExpanded(key) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function changePage(page) {
    void runSearch(query, filters, { page });
  }

  function renderBrowseItems(key, items, renderItem, initialCount = 4) {
    const isExpanded = expanded.has(key);
    return <>
      <div className={`archive-browse-grid ${key === 'recent' ? 'archive-browse-list' : ''}`} data-testid={key === 'recent' ? 'recent-documents' : undefined}>
        {items.map((item, index) => <div key={item.id} hidden={!isExpanded && index >= initialCount}>{renderItem(item)}</div>)}
      </div>
      {items.length > initialCount && <button className="archive-expand" type="button" aria-expanded={isExpanded} onClick={() => toggleExpanded(key)}>
        {isExpanded ? 'Vezi mai puține' : 'Vezi toate'} <span aria-hidden="true">{isExpanded ? '⌃' : '⌄'}</span>
      </button>}
    </>;
  }

  function renderFolderButton(item, kind) {
    const title = kind === 'dossier' ? item.number : kind === 'year' ? item.year : item.type;
    const caption = kind === 'dossier' ? item.context : '';
    return <button className="archive-folder-card" type="button" onClick={() => browseFolder(kind, item)} aria-label={caption ? `${title} · ${caption}` : title}>
      <FolderIcon /><span className="archive-folder-copy"><strong>{title}</strong>{caption && <small>{caption}</small>}</span>
    </button>;
  }

  function renderRecentItem(document) {
    return <article className="archive-recent-row" data-testid="browse-document">
      <span className="archive-recent-icon" aria-hidden="true">▤</span>
      <span className="archive-recent-copy"><strong>{document.title}</strong><small>{document.type} · {document.actNumber} · {document.dossierNumber}</small></span>
      <time dateTime={document.addedDate || undefined} data-added-date={document.addedDate}>{dateLabel(document.addedDate)}</time>
    </article>;
  }

  function renderResultCard(document) {
    const excerpt = document.highlight;
    return <li className="archive-result-card" data-testid="search-result" data-act-date={document.actDate || ''} key={document.id}>
      <article>
        <div className="archive-result-heading"><h3><HighlightedText query={query}>{document.title}</HighlightedText></h3><span>{document.type}</span></div>
        <div className="archive-result-meta"><span>{document.actNumber}</span><span>Data actului: {dateLabel(document.actDate)}</span><span>{document.inventory}</span><strong>{document.dossierNumber}</strong></div>
        <p className="archive-result-excerpt"><HighlightedText query={query}>{excerpt}</HighlightedText></p>
        {staff && document.tags.length > 0 && <div className="archive-result-tags" aria-label="Etichete ale documentului">{document.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
      </article>
    </li>;
  }

  if (loading && !catalog) return <main className="archive-search" aria-busy="true"><div className="archive-loading" role="status"><span className="archive-spinner" aria-hidden="true" />Se încarcă arhiva…</div></main>;

  if (error && !catalog) return <main className="archive-search"><div className="archive-state archive-state-error" role="alert"><p>{error}</p><button className="archive-button" type="button" onClick={() => { setError(''); setLoading(true); loadArchiveCatalog(user.role).then(setCatalog).catch(() => setError('Arhiva nu a putut fi încărcată. Încearcă din nou.')).finally(() => setLoading(false)); }}>Reîncearcă</button></div></main>;

  const browseTitle = browse?.title;
  const currentHeading = browseTitle || (query.trim() ? 'Rezultatele căutării' : 'Documente din arhivă');

  return <main className="archive-search" aria-busy={loading}>
    <div className="archive-page-heading">
      <h1>Căutare în arhivă</h1>
      {staff && <div className="archive-home-actions">
        <button className="archive-button archive-button-secondary" type="button" onClick={onQueue}>Cozi de lucru</button>
        <button className="archive-button" type="button" onClick={onUpload}>Încarcă documente</button>
      </div>}
    </div>

    <form className="archive-search-form" role="search" onSubmit={(event) => { event.preventDefault(); void runSearch(query, filters, { browse: null }); }}>
      <label className="screen-reader-only" htmlFor="archive-query">Text de căutare</label>
      <input id="archive-query" type="search" aria-label="Text de căutare" placeholder="Caută după text sau număr de dosar" value={query} onChange={(event) => setQuery(event.target.value)} />
      <button className="archive-button" type="submit">Caută</button>
    </form>

    <div className="archive-search-layout">
      <aside className="archive-filter-panel" aria-label="Filtre de arhivă">
        <div className="archive-filter-heading"><h2>Filtre</h2><button className="archive-link-button" type="button" onClick={clearFilters} disabled={!hasFilters}>Șterge filtrele</button></div>
        <label className="archive-field"><span>Dosar fizic</span><select aria-label="Dosar fizic" value={filters.dossierId} onChange={(event) => updateFilter('dossierId', event.target.value)}><option value="all">Toate dosarele</option>{catalog?.dossiers.map((item) => <option key={item.id} value={item.id}>{item.number} · {item.context}</option>)}</select></label>
        <label className="archive-field"><span>Tipul documentului</span><select aria-label="Tipul documentului" value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}><option value="all">Toate tipurile</option>{catalog?.types.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="archive-field"><span>Anul actului</span><select aria-label="Anul actului" value={filters.year} onChange={(event) => updateFilter('year', event.target.value)}><option value="all">Toți anii</option>{catalog?.years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        {staff && <>
          <label className="archive-field"><span>Etichete</span><input aria-label="Etichete" placeholder="Filtrează după etichetă" value={filters.tags} onChange={(event) => updateFilter('tags', event.target.value)} /></label>
          <label className="archive-field"><span>Nume din acte</span><input aria-label="Nume din acte" placeholder="Caută un nume din act" value={filters.partyQuery} onChange={(event) => updateFilter('partyQuery', event.target.value)} /></label>
        </>}
      </aside>

      <section className="archive-content" aria-label="Documente arhivă">
        {view === 'home' && catalog?.documents.length === 0 && <section className="archive-empty" role="status"><h2>Arhiva este goală</h2><p>Documentele aprobate vor apărea aici după ce sunt adăugate în arhivă.</p></section>}
        {view === 'home' && catalog?.documents.length > 0 && <div className="archive-home-sections">
          <section className="archive-browse-section" aria-labelledby="browse-type-title">
            <div className="archive-section-heading"><h2 id="browse-type-title">După tipul documentului</h2>{catalog?.types.length > 4 && <span>{catalog.types.length} tipuri</span>}</div>
            {renderBrowseItems('types', catalog?.types.map((type) => ({ id: type, type })) || [], (item) => renderFolderButton(item, 'type'))}
          </section>
          <section className="archive-browse-section" aria-labelledby="browse-dossier-title">
            <div className="archive-section-heading"><h2 id="browse-dossier-title">După dosar fizic</h2></div>
            {renderBrowseItems('dossiers', catalog?.dossiers || [], (item) => renderFolderButton(item, 'dossier'))}
          </section>
          <section className="archive-browse-section" aria-labelledby="browse-year-title">
            <div className="archive-section-heading"><h2 id="browse-year-title">După an</h2></div>
            {renderBrowseItems('years', catalog?.years.map((year) => ({ id: year, year })) || [], (item) => renderFolderButton(item, 'year'))}
          </section>
          <section className="archive-browse-section" aria-labelledby="browse-recent-title">
            <div className="archive-section-heading"><h2 id="browse-recent-title">Adăugate recent</h2></div>
            {renderBrowseItems('recent', recentDocuments, renderRecentItem)}
          </section>
        </div>}

        {view === 'search' && <section className="archive-results-view" aria-labelledby="archive-results-title">
          <div className="archive-results-heading">
            <div><h2 id="archive-results-title">{currentHeading}</h2>{browse?.caption && <p>{browse.caption}</p>}</div>
            <button className="archive-button archive-button-secondary" type="button" onClick={goHome}>Șterge căutarea</button>
          </div>
          <div className="archive-results-toolbar">
            <p data-testid="total-result-count" aria-label="Numărul total de rezultate">Total: {result.total} {result.total === 1 ? 'document' : 'documente'}</p>
            <label>Ordonează rezultatele<select aria-label="Ordonează rezultatele" value={sort} onChange={(event) => void runSearch(query, filters, { sort: event.target.value, browse })}>
              <option value="relevance">Relevanță</option><option value="newest">Cele mai noi</option><option value="oldest">Cele mai vechi</option>
            </select></label>
          </div>
          {loading && <div className="archive-loading archive-results-loading" role="status"><span className="archive-spinner" aria-hidden="true" />Se caută în arhivă…</div>}
          {error && <div className="archive-state archive-state-error" role="alert"><p>{error}</p><button className="archive-button" type="button" onClick={() => void runSearch(query, filters)}>Reîncearcă</button></div>}
          {!loading && !error && result.total === 0 && <p className="archive-state" role="status">Nu au fost găsite documente. Încearcă să schimbi termenii sau filtrele.</p>}
          {!loading && !error && result.items.length > 0 && <>
            <ul className="archive-results" data-testid="search-results">{result.items.map(renderResultCard)}</ul>
            <nav className="archive-pagination" aria-label="Pagini rezultate">
              <span>Pagina {result.page} din {result.pageCount}</span>
              <div><button className="archive-page-button" type="button" aria-label="Pagina anterioară" onClick={() => changePage(result.page - 1)} disabled={result.page <= 1}>Înapoi</button>
                <button className="archive-page-button" type="button" aria-label="Pagina următoare" onClick={() => changePage(result.page + 1)} disabled={result.page >= result.pageCount}>Înainte</button></div>
            </nav>
            <span className="screen-reader-only">{archiveSearchPageSize} rezultate afișate pe pagină.</span>
          </>}
        </section>}
      </section>
    </div>
  </main>;
}
