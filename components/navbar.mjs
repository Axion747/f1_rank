import { html, useState } from '../lib/core.mjs';
import { navigateTo, useAuth } from '../lib/app-utils.mjs';
import { isLikelyLiveWindow } from '../lib/f1-utils.mjs';
import { CloseIcon, MenuIcon } from './app-components.mjs';
import { AuthModal } from './auth.mjs';

export function Navbar({ route }) {
  const auth = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const liveIsSecondary = !isLikelyLiveWindow();

  const navItems = [
    { path: '/', label: 'Calendar' },
    { path: '/leaderboard', label: 'Leaderboard' },
    { path: '/championships', label: 'Standings' },
    { path: '/rankings', label: 'Rankings', secondary: true },
    { path: '/live', label: 'Live', secondary: liveIsSecondary },
  ];

  const isActive = (path) => route === path || route.startsWith(`${path}/`);

  const navigate = (path) => {
    navigateTo(path);
    setMobileOpen(false);
  };

  return html`<nav class="navbar">
    <div class="navbar-inner">
      <a class="navbar-brand" href="#/" onClick=${() => navigate('/')}>
        <img src="./assets/logo-sm.png" width="36" height="36" alt="F1 Rank" />
        <span class="navbar-brand-text">F1 Rank 2026</span>
      </a>

      <div class="navbar-links">
        ${navItems.map((item) => html`<a
          key=${item.path}
          class=${`nav-link ${isActive(item.path) ? 'active' : ''} ${item.secondary ? 'nav-link-secondary' : ''}`}
          href=${`#${item.path}`}
          onClick=${() => navigate(item.path)}
        >
          ${item.label}
        </a>`)}
      </div>

      <div class="navbar-actions">
        ${auth.session && auth.profile
          ? html`<div class="navbar-user">
              <a
                class="navbar-username navbar-username-link"
                href=${`#/profile/${auth.profile.username}`}
                onClick=${() => navigate(`/profile/${auth.profile.username}`)}
              >
                ${auth.profile.display_name || auth.profile.username}
              </a>
              <button class="btn btn-ghost btn-sm" onClick=${auth.logout}>Logout</button>
            </div>`
          : auth.session && !auth.profile
            ? html`<div class="navbar-user">
                <span class="navbar-username" style=${{ opacity: 0.5 }}>Loading...</span>
                <button class="btn btn-ghost btn-sm" onClick=${auth.logout}>Logout</button>
              </div>`
            : html`<button class="btn btn-primary btn-sm" onClick=${() => setShowAuth(true)}>
                Sign In
              </button>`}
        <button
          class="hamburger-btn"
          onClick=${() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <${MenuIcon} />
        </button>
      </div>
    </div>

    <div
      class=${`mobile-overlay ${mobileOpen ? 'open' : ''}`}
      onClick=${(event) => {
        if (event.target === event.currentTarget) setMobileOpen(false);
      }}
    >
      <div class="mobile-menu">
        <button
          class="mobile-menu-close"
          onClick=${() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <${CloseIcon} />
        </button>
        ${navItems.map((item) => html`<a
          key=${item.path}
          class=${`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
          href=${`#${item.path}`}
          onClick=${() => navigate(item.path)}
        >
          ${item.label}
        </a>`)}
        <div class="mobile-menu-footer">
          ${auth.session && auth.profile
            ? html`<div class="mobile-user-summary">
                Logged in as
                <strong>${auth.profile.display_name || auth.profile.username}</strong>
              </div>
              <a
                class="mobile-nav-link"
                href=${`#/profile/${auth.profile.username}`}
                onClick=${() => navigate(`/profile/${auth.profile.username}`)}
              >
                My Profile
              </a>
              <button class="mobile-nav-link" onClick=${auth.logout}>Logout</button>`
            : html`<button
                class="btn btn-primary"
                style=${{ width: '100%' }}
                onClick=${() => {
                  setShowAuth(true);
                  setMobileOpen(false);
                }}
              >
                Sign In
              </button>`}
        </div>
      </div>
    </div>

    ${showAuth && html`<${AuthModal} onClose=${() => setShowAuth(false)} />`}
  </nav>`;
}
