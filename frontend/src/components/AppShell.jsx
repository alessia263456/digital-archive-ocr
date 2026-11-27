import React, { useEffect, useState } from 'react';
import './AppShell.css';

const navigationItems = [
  {
    id: 'home', label: 'Căutare în arhivă', roles: ['admin', 'arhivar', 'cititor'],
    icon: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  },
  {
    id: 'upload', label: 'Încărcare documente', roles: ['admin', 'arhivar'],
    icon: <><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></>,
  },
  {
    id: 'queue', label: 'Cozi de lucru', roles: ['admin', 'arhivar'],
    icon: <><path d="M4 5h16M4 12h16M4 19h16" /><circle cx="7" cy="5" r="1" /><circle cx="7" cy="12" r="1" /><circle cx="7" cy="19" r="1" /></>,
  },
];

function Icon({ children, className = '' }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

export function AppShell({ user, screen, onNavigate, onLogout, busy, children }) {
  const [minimized, setMinimized] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleItems = navigationItems.filter((item) => item.roles.includes(user.role));
  const activeScreen = screen.startsWith('review:') || screen.startsWith('editor:') ? 'queue' : screen;

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') setMobileOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  function navigate(id) {
    onNavigate(id);
    setMobileOpen(false);
  }

  return (
    <div className={`app-shell${screen.startsWith('editor:') ? ' editor-mode' : ''}`} data-sidebar={minimized ? 'minimized' : 'expanded'} role="application" aria-label="Arhivă digitală">
      <header className="app-header">
        <button className="app-icon-button desktop-sidebar-toggle" type="button"
          aria-label={minimized ? 'Extinde meniul' : 'Minimizează meniul'} aria-expanded={!minimized}
          aria-controls="app-sidebar" title={minimized ? 'Extinde meniul' : 'Minimizează meniul'}
          onClick={() => setMinimized((value) => !value)}>
          <Icon><path d="m7 6 6 6-6 6m6-12 6 6-6 6" /></Icon>
        </button>
        <button className="app-icon-button mobile-menu-button" type="button" aria-label="Deschide meniul"
          aria-controls="app-sidebar" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
          <Icon><path d="M4 6h16M4 12h16M4 18h16" /></Icon>
        </button>
        <span className="app-brand-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32"><path d="M3 11 16 4l13 7H3Zm2 2h4v11H5zm9 0h4v11h-4zm9 0h4v11h-4zM3 27h26v2H3zm2-2h22v2H5z" fill="currentColor" /></svg>
        </span>
        <span className="app-brand-divider" aria-hidden="true" />
        <span className="app-brand-name">Arhivă digitală</span>
        <span className="app-cabinet-name">Cabinet Individual Notarial&nbsp; · &nbsp;Gestionare, căutare și procesare documente</span>
        <div className="app-account-actions">
          <span className="app-account-label">{user.username} · {user.role}</span>
          <span className="screen-reader-only">Cont: {user.username}, rol {user.role}.</span>
          <button className="app-logout" type="button" aria-label="Deconectare" title="Deconectare" onClick={onLogout} disabled={busy}>
            <Icon><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></Icon>
            <span className="app-logout-label">Deconectare</span>
          </button>
        </div>
      </header>
      <div className="app-shell-body">
        <aside id="app-sidebar" className="app-sidebar" hidden={mobileOpen ? undefined : true}>
          <div className="app-nav-toggle">
            <button className="app-mobile-close" type="button" aria-label="Închide meniul" onClick={() => setMobileOpen(false)}>
              <Icon><path d="m6 6 12 12M18 6 6 18" /></Icon>
            </button>
          </div>
          <nav aria-label="Navigare principală">
            <ul className="app-nav-list">
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <button className="app-nav-link" type="button" onClick={() => navigate(item.id)}
                    aria-current={activeScreen === item.id ? 'page' : undefined} title={minimized ? item.label : undefined}>
                    <span className="app-nav-icon"><Icon>{item.icon}</Icon></span>
                    <span className="app-nav-label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        {mobileOpen && <button className="app-mobile-backdrop" type="button" aria-label="Închide meniul" onClick={() => setMobileOpen(false)} />}
        <section className={`app-workspace${screen.startsWith('editor:') ? ' editor-workspace' : ''}`} key={screen}>{children}</section>
      </div>
    </div>
  );
}
