import React, { useState, useEffect, useCallback, createContext, useContext, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import htm from 'htm';

const html = htm.bind(React.createElement);
const CGI = '__CGI_BIN__';
const API = `${CGI}/api.py`;

// ===== DATA =====

const RACES = [
  { id: 1, round: 1, name: "Australian Grand Prix", location: "Melbourne", date: "Mar 8", sprint: false },
  { id: 2, round: 2, name: "Chinese Grand Prix", location: "Shanghai", date: "Mar 15", sprint: true },
  { id: 3, round: 3, name: "Japanese Grand Prix", location: "Suzuka", date: "Mar 29", sprint: false },
  { id: 4, round: 4, name: "Bahrain Grand Prix", location: "Sakhir", date: "Apr 12", sprint: false },
  { id: 5, round: 5, name: "Saudi Arabian Grand Prix", location: "Jeddah", date: "Apr 19", sprint: false },
  { id: 6, round: 6, name: "Miami Grand Prix", location: "Miami", date: "May 3", sprint: true },
  { id: 7, round: 7, name: "Canadian Grand Prix", location: "Montréal", date: "May 24", sprint: true },
  { id: 8, round: 8, name: "Monaco Grand Prix", location: "Monte Carlo", date: "Jun 7", sprint: false },
  { id: 9, round: 9, name: "Barcelona-Catalunya Grand Prix", location: "Barcelona", date: "Jun 14", sprint: false },
  { id: 10, round: 10, name: "Austrian Grand Prix", location: "Spielberg", date: "Jun 28", sprint: false },
  { id: 11, round: 11, name: "British Grand Prix", location: "Silverstone", date: "Jul 5", sprint: true },
  { id: 12, round: 12, name: "Belgian Grand Prix", location: "Spa-Francorchamps", date: "Jul 19", sprint: false },
  { id: 13, round: 13, name: "Hungarian Grand Prix", location: "Budapest", date: "Jul 26", sprint: false },
  { id: 14, round: 14, name: "Dutch Grand Prix", location: "Zandvoort", date: "Aug 23", sprint: true },
  { id: 15, round: 15, name: "Italian Grand Prix", location: "Monza", date: "Sep 6", sprint: false },
  { id: 16, round: 16, name: "Spanish Grand Prix", location: "Madrid", date: "Sep 13", sprint: false },
  { id: 17, round: 17, name: "Azerbaijan Grand Prix", location: "Baku", date: "Sep 26", sprint: false },
  { id: 18, round: 18, name: "Singapore Grand Prix", location: "Marina Bay", date: "Oct 11", sprint: true },
  { id: 19, round: 19, name: "United States Grand Prix", location: "Austin", date: "Oct 25", sprint: false },
  { id: 20, round: 20, name: "Mexico City Grand Prix", location: "Mexico City", date: "Nov 1", sprint: false },
  { id: 21, round: 21, name: "São Paulo Grand Prix", location: "Interlagos", date: "Nov 8", sprint: false },
  { id: 22, round: 22, name: "Las Vegas Grand Prix", location: "Las Vegas", date: "Nov 21", sprint: false },
  { id: 23, round: 23, name: "Qatar Grand Prix", location: "Doha", date: "Nov 29", sprint: false },
  { id: 24, round: 24, name: "Abu Dhabi Grand Prix", location: "Yas Marina", date: "Dec 6", sprint: false }
];

const TEAMS = [
  { id: "mclaren", name: "McLaren", color: "#FF8000" },
  { id: "ferrari", name: "Ferrari", color: "#E8002D" },
  { id: "redbull", name: "Red Bull", color: "#3671C6" },
  { id: "mercedes", name: "Mercedes", color: "#27F4D2" },
  { id: "astonmartin", name: "Aston Martin", color: "#229971" },
  { id: "alpine", name: "Alpine", color: "#0093CC" },
  { id: "williams", name: "Williams", color: "#64C4FF" },
  { id: "racingbulls", name: "Racing Bulls", color: "#6692FF" },
  { id: "haas", name: "Haas", color: "#B6BABD" },
  { id: "audi", name: "Audi", color: "#FF5733" },
  { id: "cadillac", name: "Cadillac", color: "#1E6B4A" }
];

const DRIVERS = [
  { id: 1, number: 1, name: "Lando Norris", team: "mclaren" },
  { id: 81, number: 81, name: "Oscar Piastri", team: "mclaren" },
  { id: 16, number: 16, name: "Charles Leclerc", team: "ferrari" },
  { id: 44, number: 44, name: "Lewis Hamilton", team: "ferrari" },
  { id: 3, number: 3, name: "Max Verstappen", team: "redbull" },
  { id: 6, number: 6, name: "Isack Hadjar", team: "redbull" },
  { id: 12, number: 12, name: "Kimi Antonelli", team: "mercedes" },
  { id: 63, number: 63, name: "George Russell", team: "mercedes" },
  { id: 14, number: 14, name: "Fernando Alonso", team: "astonmartin" },
  { id: 18, number: 18, name: "Lance Stroll", team: "astonmartin" },
  { id: 10, number: 10, name: "Pierre Gasly", team: "alpine" },
  { id: 43, number: 43, name: "Franco Colapinto", team: "alpine" },
  { id: 23, number: 23, name: "Alex Albon", team: "williams" },
  { id: 55, number: 55, name: "Carlos Sainz", team: "williams" },
  { id: 30, number: 30, name: "Liam Lawson", team: "racingbulls" },
  { id: 41, number: 41, name: "Arvid Lindblad", team: "racingbulls" },
  { id: 31, number: 31, name: "Esteban Ocon", team: "haas" },
  { id: 87, number: 87, name: "Oliver Bearman", team: "haas" },
  { id: 5, number: 5, name: "Gabriel Bortoleto", team: "audi" },
  { id: 27, number: 27, name: "Nico Hülkenberg", team: "audi" },
  { id: 11, number: 11, name: "Sergio Pérez", team: "cadillac" },
  { id: 77, number: 77, name: "Valtteri Bottas", team: "cadillac" }
];

function getTeam(teamId) {
  return TEAMS.find(t => t.id === teamId) || { name: '?', color: '#555', id: '' };
}

function getDriver(driverId) {
  return DRIVERS.find(d => d.id === driverId) || null;
}

function getDriverByNumber(num) {
  return DRIVERS.find(d => d.number === num) || null;
}

// ===== CONTEXTS =====

const AuthContext = createContext(null);
function useAuth() { return useContext(AuthContext); }

const ToastContext = createContext(null);
function useToast() { return useContext(ToastContext); }

const ProfileContext = createContext(null);
function useProfile() { return useContext(ProfileContext); }

// ===== API HELPERS =====

async function apiCall(path, options = {}) {
  const { method = 'GET', body, token } = options;
  const headers = { 'Content-Type': 'application/json' };
  // CGI proxy strips Authorization header, so pass token via query param
  let url = `${API}${path}`;
  if (token) {
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}_token=${encodeURIComponent(token)}`;
  }
  const fetchOpts = { method, headers };
  if (body) fetchOpts.body = JSON.stringify(body);
  const res = await fetch(url, fetchOpts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// ===== SVG ICONS =====

function LocationIcon() {
  return html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>`;
}

function CalendarIcon() {
  return html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>`;
}

function MenuIcon() {
  return html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`;
}

function CloseIcon() {
  return html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;
}

function TrophyIcon({ size = 40 }) {
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style=${{ display: 'inline-block' }}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>`;
}

function FlagIcon() {
  return html`<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style=${{ display: 'inline-block' }}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>`;
}

function RefreshIcon() {
  return html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>`;
}

function UserIcon({ size = 16 }) {
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`;
}

function NewsIcon() {
  return html`<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style=${{ display: 'inline-block' }}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2z"/>
    <path d="M2 6h4"/>
    <path d="M2 10h4"/>
    <path d="M2 14h4"/>
    <path d="M2 18h4"/>
    <rect x="10" y="6" width="8" height="4" rx="1"/>
    <path d="M10 14h8"/>
    <path d="M10 18h5"/>
  </svg>`;
}

// ===== TEAM DOT =====

function TeamDot({ teamId, size = 10 }) {
  const team = getTeam(teamId);
  return html`<span class="team-dot" style=${{ backgroundColor: team.color, width: size, height: size }}></span>`;
}

// ===== CUSTOM DRIVER SELECT =====

function ChevronDownIcon() {
  return html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 9l6 6 6-6"/>
  </svg>`;
}

function DriverSelect({ value, onChange, disabledIds = [], placeholder = 'Select driver...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, flipped: false });
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Position dropdown when open — with smart flip
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const DROPDOWN_HEIGHT = 280; // approximate: 220px list + search + padding
    function updatePos() {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const flipped = spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow;
      if (flipped) {
        setDropdownPos({ top: rect.top, left: rect.left, width: rect.width, flipped: true });
      } else {
        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width, flipped: false });
      }
    }
    updatePos();
    const modal = triggerRef.current.closest('.modal-card');
    const handler = () => updatePos();
    window.addEventListener('resize', handler);
    if (modal) modal.addEventListener('scroll', handler);
    return () => {
      window.removeEventListener('resize', handler);
      if (modal) modal.removeEventListener('scroll', handler);
    };
  }, [isOpen]);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view on open
  useEffect(() => {
    if (isOpen && listRef.current && value) {
      const el = listRef.current.querySelector(`[data-value="${value}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, value]);

  const selectedDriver = value ? DRIVERS.find(d => String(d.id) === value) : null;
  const selectedTeam = selectedDriver ? getTeam(selectedDriver.team) : null;

  const filteredDrivers = search.trim()
    ? DRIVERS.filter(d => {
        const t = getTeam(d.team);
        const q = search.toLowerCase();
        return d.name.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || String(d.number).includes(q);
      })
    : DRIVERS;

  const handleSelect = (driverId) => {
    onChange(driverId);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  const dropdownStyle = dropdownPos.flipped
    ? { bottom: (window.innerHeight - dropdownPos.top + 4) + 'px', left: dropdownPos.left + 'px', width: dropdownPos.width + 'px', top: 'auto' }
    : { top: dropdownPos.top + 'px', left: dropdownPos.left + 'px', width: dropdownPos.width + 'px' };

  const dropdownContent = isOpen && createPortal(html`
    <div class=${`ds-dropdown ds-dropdown--portal ${dropdownPos.flipped ? 'ds-dropdown--flipped' : ''}`} ref=${dropdownRef}
      style=${dropdownStyle}>
      <div class="ds-search-wrap">
        <input
          ref=${searchRef}
          class="ds-search"
          type="text"
          placeholder="Search drivers..."
          value=${search}
          onInput=${(e) => setSearch(e.target.value)}
          onKeyDown=${handleKeyDown}
        />
      </div>
      <div class="ds-list" ref=${listRef} role="listbox">
        ${filteredDrivers.length === 0 ? html`
          <div class="ds-empty">No drivers found</div>
        ` : filteredDrivers.map(driver => {
          const team = getTeam(driver.team);
          const isDisabled = disabledIds.includes(String(driver.id)) && value !== String(driver.id);
          const isActive = value === String(driver.id);
          return html`
            <button
              key=${driver.id}
              type="button"
              data-value=${String(driver.id)}
              class=${`ds-option ${isActive ? 'ds-option--active' : ''} ${isDisabled ? 'ds-option--disabled' : ''}`}
              onClick=${() => !isDisabled && handleSelect(String(driver.id))}
              disabled=${isDisabled}
              role="option"
              aria-selected=${isActive}
            >
              <span class="ds-option-left">
                <span class="ds-color-dot" style=${{ backgroundColor: team.color }}></span>
                <span class="ds-option-name">${driver.name}</span>
              </span>
              <span class="ds-option-right">
                <span class="ds-option-team">${team.name}</span>
                <span class="ds-option-number">#${driver.number}</span>
              </span>
            </button>
          `;
        })}
      </div>
    </div>
  `, document.body);

  return html`
    <div class="ds-container" ref=${containerRef}>
      <button
        type="button"
        ref=${triggerRef}
        class=${`ds-trigger ${isOpen ? 'ds-trigger--open' : ''} ${value ? 'ds-trigger--filled' : ''}`}
        onClick=${() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded=${isOpen}
      >
        ${selectedDriver ? html`
          <span class="ds-trigger-value">
            <span class="ds-color-dot" style=${{ backgroundColor: selectedTeam.color }}></span>
            <span class="ds-trigger-name">${selectedDriver.name}</span>
            <span class="ds-trigger-team">${selectedTeam.name}</span>
          </span>
        ` : html`
          <span class="ds-trigger-placeholder">${placeholder}</span>
        `}
        <span class="ds-trigger-icons">
          ${value && html`
            <span class="ds-clear" onClick=${handleClear} role="button" aria-label="Clear selection">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </span>
          `}
          <span class=${`ds-chevron ${isOpen ? 'ds-chevron--open' : ''}`}>
            <${ChevronDownIcon} />
          </span>
        </span>
      </button>
      ${dropdownContent}
    </div>
  `;
}

// ===== CUSTOM RACE SELECT =====

function RaceSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, flipped: false });
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Position dropdown when open — with smart flip
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const DROPDOWN_HEIGHT = 320;
    function updatePos() {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const flipped = spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow;
      if (flipped) {
        setDropdownPos({ top: rect.top, left: rect.left, width: rect.width, flipped: true });
      } else {
        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width, flipped: false });
      }
    }
    updatePos();
    window.addEventListener('resize', updatePos);
    return () => window.removeEventListener('resize', updatePos);
  }, [isOpen]);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view on open
  useEffect(() => {
    if (isOpen && listRef.current && value) {
      const el = listRef.current.querySelector(`[data-value="${value}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, value]);

  const selectedRace = value ? RACES.find(r => r.id === value) : null;

  const filteredRaces = useMemo(() => {
    if (!search.trim()) return RACES;
    const q = search.toLowerCase();
    return RACES.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      String(r.round).includes(q)
    );
  }, [search]);

  const handleSelect = (raceId) => {
    onChange(raceId);
    setIsOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  const dropdownStyle = dropdownPos.flipped
    ? { bottom: (window.innerHeight - dropdownPos.top + 4) + 'px', left: dropdownPos.left + 'px', width: Math.max(dropdownPos.width, 320) + 'px', top: 'auto' }
    : { top: dropdownPos.top + 'px', left: dropdownPos.left + 'px', width: Math.max(dropdownPos.width, 320) + 'px' };

  const dropdownContent = isOpen && createPortal(html`
    <div class=${`rs-dropdown ${dropdownPos.flipped ? 'rs-dropdown--flipped' : ''}`} ref=${dropdownRef}
      style=${dropdownStyle}>
      <div class="rs-search-wrap">
        <input
          ref=${searchRef}
          class="rs-search"
          type="text"
          placeholder="Search races..."
          value=${search}
          onInput=${(e) => setSearch(e.target.value)}
          onKeyDown=${handleKeyDown}
        />
      </div>
      <div class="rs-list" ref=${listRef} role="listbox">
        ${filteredRaces.length === 0 ? html`
          <div class="rs-empty">No races found</div>
        ` : filteredRaces.map(race => {
          const isActive = value === race.id;
          return html`
            <button
              key=${race.id}
              type="button"
              data-value=${race.id}
              class=${`rs-option ${isActive ? 'rs-option--active' : ''}`}
              onClick=${() => handleSelect(race.id)}
              role="option"
              aria-selected=${isActive}
            >
              <span class="rs-option-round">R${String(race.round).padStart(2, '0')}</span>
              <span class="rs-option-name">${race.name}</span>
              ${race.sprint && html`<span class="rs-option-sprint"><span class="sprint-badge">Sprint</span></span>`}
            </button>
          `;
        })}
      </div>
    </div>
  `, document.body);

  return html`
    <div class="rs-container" ref=${containerRef}>
      <button
        type="button"
        ref=${triggerRef}
        class=${`rs-trigger ${isOpen ? 'rs-trigger--open' : ''}`}
        onClick=${() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded=${isOpen}
      >
        ${selectedRace ? html`
          <span class="rs-trigger-value">
            <span class="rs-trigger-round">R${String(selectedRace.round).padStart(2, '0')}</span>
            <span class="rs-trigger-name">${selectedRace.name}</span>
            ${selectedRace.sprint && html`<span class="sprint-badge" style=${{ flexShrink: 0 }}>Sprint</span>`}
          </span>
        ` : html`
          <span class="rs-trigger-placeholder">Select race...</span>
        `}
        <span class="rs-trigger-icons">
          <span class=${`rs-chevron ${isOpen ? 'rs-chevron--open' : ''}`}>
            <${ChevronDownIcon} />
          </span>
        </span>
      </button>
      ${dropdownContent}
    </div>
  `;
}

// ===== TOAST COMPONENT =====

function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, show: true });
    timerRef.current = setTimeout(() => {
      setToast(prev => prev ? { ...prev, show: false } : null);
      setTimeout(() => setToast(null), 300);
    }, 3000);
  }, []);

  return html`
    <${ToastContext.Provider} value=${showToast}>
      ${children}
      ${toast && html`<div class=${`toast toast-${toast.type} ${toast.show ? 'show' : ''}`}>${toast.message}</div>`}
    <//>
  `;
}

// ===== PROFILE PROVIDER =====

function ProfileProvider({ children }) {
  const [profileUsername, setProfileUsername] = useState(null);

  const openProfile = useCallback((username) => {
    setProfileUsername(username);
  }, []);

  const closeProfile = useCallback(() => {
    setProfileUsername(null);
  }, []);

  return html`
    <${ProfileContext.Provider} value=${{ openProfile, closeProfile, profileUsername }}>
      ${children}
      ${profileUsername && html`<${ProfileModal} username=${profileUsername} onClose=${closeProfile} />`}
    <//>
  `;
}

// ===== USERNAME LINK =====

function UsernameLink({ username, displayName }) {
  const { openProfile } = useProfile();
  return html`<button class="username-link" onClick=${() => openProfile(username)}>${displayName || username}</button>`;
}

// ===== NAVBAR =====

function Navbar({ route }) {
  const auth = useAuth();
  const { openProfile } = useProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const navItems = [
    { path: '/', label: 'Calendar' },
    { path: '/rankings', label: 'Rankings' },
    { path: '/leaderboard', label: 'Leaderboard' },
    { path: '/championships', label: 'Standings' }
  ];

  const isActive = (path) => {
    if (path === '/' && (route === '/' || route === '/calendar')) return true;
    return route === path || route.startsWith(path + '/');
  };

  const navigate = (path) => {
    window.location.hash = path;
    setMobileOpen(false);
  };

  return html`
    <nav class="navbar">
      <div class="navbar-inner">
        <a class="navbar-brand" href="#/" onClick=${(e) => { e.preventDefault(); navigate('/'); }}>
          <img src="./assets/logo-sm.png" width="36" height="36" alt="F1 Rank" />
          <span class="navbar-brand-text">F1 Rank 2026</span>
        </a>
        
        <div class="navbar-links">
          ${navItems.map(item => html`
            <button key=${item.path} class=${`nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick=${() => navigate(item.path)}>
              ${item.label}
            </button>
          `)}
        </div>
        
        <div class="navbar-actions">
          ${auth.user ? html`
            <div class="navbar-user">
              <span class="navbar-username" onClick=${() => openProfile(auth.user.username)}>${auth.user.display_name || auth.user.username}</span>
              <button class="btn btn-ghost btn-sm" onClick=${auth.logout}>Logout</button>
            </div>
          ` : html`
            <button class="btn btn-primary btn-sm" onClick=${() => setShowAuth(true)}>Sign In</button>
          `}
          <button class="hamburger-btn" onClick=${() => setMobileOpen(true)} aria-label="Open menu">
            <${MenuIcon} />
          </button>
        </div>
      </div>
    </nav>

    <div class=${`mobile-overlay ${mobileOpen ? 'open' : ''}`} onClick=${(e) => { if (e.target === e.currentTarget) setMobileOpen(false); }}>
      <div class="mobile-menu">
        <button class="mobile-menu-close" onClick=${() => setMobileOpen(false)} aria-label="Close menu">
          <${CloseIcon} />
        </button>
        ${navItems.map(item => html`
          <button key=${item.path} class=${`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
            onClick=${() => navigate(item.path)}>
            ${item.label}
          </button>
        `)}
        <div style=${{ marginTop: 'auto', paddingTop: 'var(--space-6)' }}>
          ${auth.user ? html`
            <div style=${{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Logged in as <strong style=${{ color: 'var(--color-text)' }}>${auth.user.display_name || auth.user.username}</strong>
            </div>
            <button class="mobile-nav-link" onClick=${() => { openProfile(auth.user.username); setMobileOpen(false); }}>My Profile</button>
            <button class="mobile-nav-link" onClick=${() => { auth.logout(); setMobileOpen(false); }}>Logout</button>
          ` : html`
            <button class="btn btn-primary" style=${{ width: '100%' }} onClick=${() => { setShowAuth(true); setMobileOpen(false); }}>Sign In</button>
          `}
        </div>
      </div>
    </div>

    ${showAuth && html`<${AuthModal} onClose=${() => setShowAuth(false)} />`}
  `;
}

// ===== AUTH MODAL =====

function AuthModal({ onClose }) {
  const auth = useAuth();
  const showToast = useToast();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in both fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/login' : '/register';
      const body = { username: username.trim(), password };
      if (mode === 'register' && displayName.trim()) {
        body.display_name = displayName.trim();
      }
      const data = await apiCall(endpoint, { method: 'POST', body });
      auth.login(data.token, data.username, data.display_name);
      showToast(mode === 'login' ? `Welcome back, ${data.display_name || data.username}!` : `Account created! Welcome, ${data.display_name || data.username}!`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div class="modal-overlay open" onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal-card">
        <div class="auth-logo">
          <img src="./assets/logo.png" width="80" height="80" alt="F1 Rank 2026" style=${{ borderRadius: '12px' }} />
        </div>
        <div class="modal-header">
          <h2 class="modal-title">${mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
          <button class="modal-close" onClick=${onClose} aria-label="Close">
            <${CloseIcon} />
          </button>
        </div>
        
        <form onSubmit=${handleSubmit}>
          <div class="form-group">
            <label class="form-label">Username</label>
            <input class="form-input" type="text" placeholder="Pick a username" 
              value=${username} onInput=${(e) => setUsername(e.target.value)} 
              autoFocus autocomplete="username" />
          </div>
          ${mode === 'register' && html`
            <div class="form-group">
              <label class="form-label">Display Name <span style=${{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
              <input class="form-input" type="text" placeholder="How you want to be shown" 
                value=${displayName} onInput=${(e) => setDisplayName(e.target.value)} />
            </div>
          `}
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" type="password" placeholder="Your password" 
              value=${password} onInput=${(e) => setPassword(e.target.value)} 
              autocomplete=${mode === 'login' ? 'current-password' : 'new-password'} />
          </div>
          
          ${error && html`<p class="form-error" style=${{ marginBottom: 'var(--space-4)' }}>${error}</p>`}
          
          <button class="btn btn-primary btn-lg" type="submit" style=${{ width: '100%' }} disabled=${loading}>
            ${loading ? 'Hold tight...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        
        <div class="auth-toggle">
          ${mode === 'login' ? html`
            Don't have an account? <button class="auth-toggle-link" onClick=${() => { setMode('register'); setError(''); }}>Create one</button>
          ` : html`
            Already have an account? <button class="auth-toggle-link" onClick=${() => { setMode('login'); setError(''); }}>Sign in</button>
          `}
        </div>
      </div>
    </div>
  `;
}

// ===== PROFILE MODAL =====

function ProfileModal({ username, onClose }) {
  const auth = useAuth();
  const showToast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const isOwnProfile = auth.user && auth.user.username === username;

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const data = await apiCall(`/profile?username=${encodeURIComponent(username)}`);
        setProfile(data);
        setEditData({
          display_name: data.display_name || '',
          bio: data.bio || '',
          favorite_team: data.favorite_team || '',
          favorite_driver: data.favorite_driver || ''
        });
      } catch (e) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [username]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiCall('/profile', {
        method: 'POST',
        body: editData,
        token: auth.token
      });
      setProfile(prev => ({ ...prev, ...editData }));
      setEditing(false);
      showToast('Profile updated!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const teamColor = profile && profile.favorite_team ? getTeam(profile.favorite_team).color : 'var(--color-primary)';
  const accuracy = profile && profile.accuracy;
  const hasAccuracy = accuracy && accuracy.accuracy !== null;

  return html`
    <div class="modal-overlay open" onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal-card profile-modal">
        <div class="modal-header">
          <h2 class="modal-title">Profile</h2>
          <button class="modal-close" onClick=${onClose} aria-label="Close">
            <${CloseIcon} />
          </button>
        </div>
        
        ${loading ? html`<div class="spinner"></div>` : !profile ? html`
          <div class="empty-state" style=${{ padding: 'var(--space-6)' }}>
            <h3 class="empty-state-title">User not found</h3>
          </div>
        ` : editing ? html`
          <div>
            <div class="form-group">
              <label class="form-label">Display Name</label>
              <input class="form-input" type="text" value=${editData.display_name} maxlength="30"
                onInput=${(e) => setEditData(d => ({ ...d, display_name: e.target.value }))} />
            </div>
            <div class="form-group">
              <label class="form-label">Bio <span style=${{ fontWeight: 400, opacity: 0.6 }}>(${(editData.bio || '').length}/200)</span></label>
              <textarea class="form-textarea" value=${editData.bio} maxlength="200" placeholder="Tell us about yourself..."
                onInput=${(e) => setEditData(d => ({ ...d, bio: e.target.value }))}></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Favorite Team</label>
              <select class="form-select" value=${editData.favorite_team}
                onChange=${(e) => setEditData(d => ({ ...d, favorite_team: e.target.value }))}>
                <option value="">Select a team...</option>
                ${TEAMS.map(t => html`<option key=${t.id} value=${t.id}>${t.name}</option>`)}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Favorite Driver</label>
              <select class="form-select" value=${editData.favorite_driver}
                onChange=${(e) => setEditData(d => ({ ...d, favorite_driver: e.target.value }))}>
                <option value="">Select a driver...</option>
                ${DRIVERS.map(d => html`<option key=${d.id} value=${String(d.id)}>${d.name} — ${getTeam(d.team).name}</option>`)}
              </select>
            </div>
            <div style=${{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
              <button class="btn btn-secondary" onClick=${() => setEditing(false)}>Cancel</button>
              <button class="btn btn-primary" onClick=${handleSave} disabled=${saving}>${saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        ` : html`
          <div class="profile-header">
            <div class="profile-avatar" style=${{ backgroundColor: teamColor }}>
              ${(profile.display_name || profile.username || '?')[0].toUpperCase()}
            </div>
            <div class="profile-display-name">${profile.display_name || profile.username}</div>
            <div class="profile-username">@${profile.username}</div>
            ${profile.bio && html`<div class="profile-bio">${profile.bio}</div>`}
            ${profile.member_since && html`<div class="profile-member-since">Member since ${new Date(profile.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>`}
          </div>

          <div class="accuracy-gauge">
            <div class="accuracy-circle" style=${{ borderColor: hasAccuracy ? teamColor : 'var(--color-border)' }}>
              <span class="accuracy-value">${hasAccuracy ? `${accuracy.accuracy}%` : '—'}</span>
            </div>
            <div class="accuracy-label">${hasAccuracy ? 'Prediction Accuracy' : 'No races completed yet'}</div>
          </div>

          <div class="profile-stats-grid">
            <div class="profile-stat">
              <div class="profile-stat-value">${profile.races_ranked || 0}</div>
              <div class="profile-stat-label">Races Ranked</div>
            </div>
            <div class="profile-stat">
              <div class="profile-stat-value">${hasAccuracy ? accuracy.total_correct : '—'}</div>
              <div class="profile-stat-label">Correct Picks</div>
            </div>
            <div class="profile-stat">
              <div class="profile-stat-value">${hasAccuracy ? accuracy.position_diff_avg : '—'}</div>
              <div class="profile-stat-label">Avg Pos Diff</div>
            </div>
          </div>

          ${(profile.favorite_team || profile.favorite_driver) && html`
            <div class="profile-favorites">
              ${profile.favorite_team && html`
                <div class="profile-fav-item">
                  <${TeamDot} teamId=${profile.favorite_team} />
                  <strong>${getTeam(profile.favorite_team).name}</strong>
                </div>
              `}
              ${profile.favorite_driver && html`
                <div class="profile-fav-item">
                  <${UserIcon} size=${14} />
                  <strong>${(() => { const d = getDriver(Number(profile.favorite_driver)); return d ? d.name : 'Unknown'; })()}</strong>
                </div>
              `}
            </div>
          `}

          ${isOwnProfile && html`
            <button class="btn btn-secondary" style=${{ width: '100%' }} onClick=${() => setEditing(true)}>Edit Profile</button>
          `}
        `}
      </div>
    </div>
  `;
}

// ===== CALENDAR VIEW =====

function CalendarView() {
  const [activeRace, setActiveRace] = useState(null);

  return html`
    <div>
      <div class="page-header">
        <h1 class="page-title">2026 Race Calendar</h1>
        <p class="page-subtitle">24 races across the globe. Click a race to view sessions and submit predictions.</p>
      </div>
      <div class="card-grid">
        ${RACES.map(race => html`
          <${RaceCard} key=${race.id} race=${race} 
            onOpen=${() => setActiveRace(race)} />
        `)}
      </div>
      ${activeRace && html`<${RaceDetailModal} race=${activeRace} onClose=${() => setActiveRace(null)} />`}
    </div>
  `;
}

function RaceCard({ race, onOpen }) {
  return html`
    <div class="race-card race-card--clickable" onClick=${onOpen} role="button" tabIndex="0"
      onKeyDown=${(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      aria-label="Open ${race.name} details">
      <div class="race-card-header">
        <span class="race-round">R${String(race.round).padStart(2, '0')}</span>
        ${race.sprint && html`<span class="sprint-badge">Sprint</span>`}
      </div>
      <h3 class="race-name">${race.name}</h3>
      <div class="race-details">
        <span class="race-detail"><${LocationIcon} /> ${race.location}</span>
        <span class="race-detail"><${CalendarIcon} /> ${race.date}</span>
      </div>
    </div>
  `;
}

// ===== RANKING MODAL =====

function RankingModal({ race, onClose }) {
  const auth = useAuth();
  const showToast = useToast();
  const [selections, setSelections] = useState(Array(10).fill(''));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadExisting() {
      try {
        const data = await apiCall(`/rankings/user?race_id=${race.id}`, { token: auth.token });
        if (data.rankings && data.rankings.length > 0) {
          const existing = Array(10).fill('');
          data.rankings.forEach(r => {
            if (r.position >= 1 && r.position <= 10) {
              existing[r.position - 1] = String(r.driver_id);
            }
          });
          setSelections(existing);
        }
      } catch (e) { /* No existing rankings */ }
      finally { setLoading(false); }
    }
    loadExisting();
  }, [race.id, auth.token]);

  const handleSelect = (index, value) => {
    const newSelections = [...selections];
    newSelections[index] = value;
    setSelections(newSelections);
  };

  const selectedIds = selections.filter(Boolean);

  const handleSave = async () => {
    const rankings = selections
      .map((driverId, i) => driverId ? { position: i + 1, driver_id: Number(driverId) } : null)
      .filter(Boolean);
    if (rankings.length === 0) {
      showToast('Select at least one driver!', 'error');
      return;
    }
    setSaving(true);
    try {
      await apiCall('/rankings', {
        method: 'POST',
        body: { race_id: race.id, rankings },
        token: auth.token
      });
      showToast(`Rankings saved for ${race.name}!`);
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally { setSaving(false); }
  };

  return html`
    <div class="modal-overlay open" onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal-card modal-card-wide">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">${race.name}</h2>
            <p style=${{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
              ${race.location} · ${race.date} ${race.sprint ? '· Sprint Weekend' : ''}
            </p>
          </div>
          <button class="modal-close" onClick=${onClose} aria-label="Close">
            <${CloseIcon} />
          </button>
        </div>
        
        ${loading ? html`<div class="spinner"></div>` : html`
          <div class="ranking-grid">
            ${Array.from({ length: 10 }, (_, i) => html`
              <div class="ranking-row" key=${i}>
                <span class=${`ranking-position ${i < 3 ? `pos-${i + 1}` : ''}`}>P${i + 1}</span>
                <${DriverSelect}
                  value=${selections[i]}
                  onChange=${(val) => handleSelect(i, val)}
                  disabledIds=${selectedIds}
                  placeholder="Select driver..."
                />
              </div>
            `)}
          </div>
          <div style=${{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button class="btn btn-secondary" onClick=${onClose}>Cancel</button>
            <button class="btn btn-primary" onClick=${handleSave} disabled=${saving}>
              ${saving ? 'Saving...' : 'Save Rankings'}
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

// ===== RACE DETAIL MODAL =====

function RaceDetailModal({ race, onClose }) {
  const auth = useAuth();
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState('predict');
  const [sprintTab, setSprintTab] = useState('race'); // 'race' or 'sprint'

  // Predict tab state
  const [gpSelections, setGpSelections] = useState(Array(10).fill(''));
  const [sprintSelections, setSprintSelections] = useState(Array(8).fill(''));
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [savingPredictions, setSavingPredictions] = useState(false);

  // Sessions tab state
  const [sessions, setSessions] = useState([]);
  const [sessionTab, setSessionTab] = useState(null);
  const [sessionLaps, setSessionLaps] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsAvailable, setSessionsAvailable] = useState(false);

  // Load user predictions when predict tab is active and user is logged in
  useEffect(() => {
    if (activeTab !== 'predict' || !auth.user) return;
    async function loadPredictions() {
      setLoadingPredictions(true);
      try {
        // Load GP predictions
        const gpData = await apiCall(`/rankings/user?race_id=${race.id}&race_type=race`, { token: auth.token });
        if (gpData.rankings && gpData.rankings.length > 0) {
          const existing = Array(10).fill('');
          gpData.rankings.forEach(r => {
            if (r.position >= 1 && r.position <= 10) existing[r.position - 1] = String(r.driver_id);
          });
          setGpSelections(existing);
        }
        // Load Sprint predictions if sprint weekend
        if (race.sprint) {
          const spData = await apiCall(`/rankings/user?race_id=${race.id}&race_type=sprint`, { token: auth.token });
          if (spData.rankings && spData.rankings.length > 0) {
            const existing = Array(8).fill('');
            spData.rankings.forEach(r => {
              if (r.position >= 1 && r.position <= 8) existing[r.position - 1] = String(r.driver_id);
            });
            setSprintSelections(existing);
          }
        }
      } catch (e) { /* no existing predictions */ }
      finally { setLoadingPredictions(false); }
    }
    loadPredictions();
  }, [activeTab, auth.user, race.id, auth.token, race.sprint]);

  // Load sessions when sessions tab active
  useEffect(() => {
    if (activeTab !== 'sessions') return;
    async function loadSessions() {
      setLoadingSessions(true);
      try {
        // Try 2026 first, then 2025 with matching country
        let data = [];
        const country = race.location; // e.g. "Melbourne", "Shanghai"
        try {
          data = await openF1Fetch('sessions', { year: 2026, location: country });
          if (!data || data.length === 0) {
            data = await openF1Fetch('sessions', { year: 2026, meeting_name: race.name.replace(' Grand Prix', '') });
          }
        } catch { data = []; }
        // Fallback: try 2025 with matching country
        if (!data || data.length === 0) {
          try {
            data = await openF1Fetch('sessions', { year: 2025, location: country });
          } catch { data = []; }
          if (!data || data.length === 0) {
            try {
              data = await openF1Fetch('sessions', { year: 2025, country_name: country });
            } catch { data = []; }
          }
        }
        // Filter out Race/Sprint sessions — keep practice & qualifying only
        const practiceAndQuali = (data || []).filter(s => {
          const name = (s.session_name || s.session_type || '').toLowerCase();
          return name.includes('practice') || name.includes('qualifying') || name.includes('quali');
        });
        if (practiceAndQuali.length > 0) {
          setSessions(practiceAndQuali);
          setSessionsAvailable(true);
          if (!sessionTab) {
            setSessionTab(practiceAndQuali[0].session_key);
          }
        } else {
          setSessionsAvailable(false);
        }
      } catch { setSessionsAvailable(false); }
      finally { setLoadingSessions(false); }
    }
    loadSessions();
  }, [activeTab, race.location, race.name]);

  // Load laps for selected session
  useEffect(() => {
    if (!sessionTab) return;
    async function loadLaps() {
      try {
        const laps = await openF1Fetch('laps', { session_key: sessionTab });
        setSessionLaps(laps || []);
      } catch { setSessionLaps([]); }
    }
    loadLaps();
  }, [sessionTab]);

  const handleSavePredictions = async (raceType) => {
    const isGP = raceType === 'race';
    const sels = isGP ? gpSelections : sprintSelections;
    const rankings = sels
      .map((driverId, i) => driverId ? { position: i + 1, driver_id: Number(driverId) } : null)
      .filter(Boolean);

    if (rankings.length === 0) {
      showToast('Select at least one driver!', 'error');
      return;
    }
    setSavingPredictions(true);
    try {
      await apiCall('/rankings', {
        method: 'POST',
        body: { race_id: race.id, rankings, race_type: raceType },
        token: auth.token
      });
      showToast(`${isGP ? 'Grand Prix' : 'Sprint'} predictions saved for ${race.name}!`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally { setSavingPredictions(false); }
  };

  // Sessions tab helpers
  const SESSION_TYPE_ORDER = ['Practice 1', 'Practice 2', 'Practice 3', 'Sprint Qualifying', 'Qualifying', 'Sprint', 'Race'];
  const uniqueSessionTypes = sessions.length > 0
    ? [...new Set(sessions.map(s => s.session_name || s.session_type || 'Session'))]
        .sort((a, b) => {
          const ai = SESSION_TYPE_ORDER.indexOf(a);
          const bi = SESSION_TYPE_ORDER.indexOf(b);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        })
    : [];

  const currentSessionObj = sessionTab ? sessions.find(s => s.session_key === sessionTab) : null;

  // Build per-driver best lap time table
  const driverBestLaps = useMemo(() => {
    if (!sessionLaps.length) return [];
    const best = {};
    sessionLaps.forEach(lap => {
      if (!lap.lap_duration || lap.lap_duration <= 0) return;
      const dn = lap.driver_number;
      if (!best[dn] || lap.lap_duration < best[dn]) best[dn] = lap.lap_duration;
    });
    return Object.entries(best)
      .sort((a, b) => a[1] - b[1])
      .map(([dn, t]) => ({ driver_number: Number(dn), lap_duration: t }));
  }, [sessionLaps]);

  const fastestTime = driverBestLaps.length > 0 ? driverBestLaps[0].lap_duration : null;

  const renderPredictPanel = (raceType) => {
    const isGP = raceType === 'race';
    const positions = isGP ? 10 : 8;
    const selections = isGP ? gpSelections : sprintSelections;
    const setSelections = isGP ? setGpSelections : setSprintSelections;
    const selectedIds = selections.filter(Boolean);

    if (!auth.user) {
      return html`
        <div class="rdm-signin-prompt">
          <p class="rdm-signin-prompt-text">Sign in to submit your predictions for this race.</p>
          <${AuthGate} />
        </div>
      `;
    }

    if (loadingPredictions) return html`<div class="spinner"></div>`;

    return html`
      <div class="ranking-grid">
        ${Array.from({ length: positions }, (_, i) => html`
          <div class="ranking-row" key=${i}>
            <span class=${`ranking-position ${i < 3 ? `pos-${i + 1}` : ''}`}>P${i + 1}</span>
            <${DriverSelect}
              value=${selections[i]}
              onChange=${(val) => {
                const newSels = [...selections];
                newSels[i] = val;
                setSelections(newSels);
              }}
              disabledIds=${selectedIds}
              placeholder="Select driver..."
            />
          </div>
        `)}
      </div>
      <div style=${{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
        <button class="btn btn-secondary" onClick=${onClose}>Cancel</button>
        <button class="btn btn-primary" onClick=${() => handleSavePredictions(raceType)} disabled=${savingPredictions}>
          ${savingPredictions ? 'Saving...' : `Save ${isGP ? 'GP' : 'Sprint'} Predictions`}
        </button>
      </div>
    `;
  };

  const renderSessionsPanel = () => {
    if (loadingSessions) return html`<div class="spinner"></div>`;

    if (!sessionsAvailable || sessions.length === 0) {
      return html`
        <div class="rdm-sessions-unavailable">
          <div class="rdm-sessions-unavailable-title">Session data not yet available</div>
          <p class="rdm-sessions-unavailable-note">
            Lap times and session data will appear here once the race weekend begins.
            Data is sourced from the OpenF1 API.
          </p>
        </div>
      `;
    }

    return html`
      <div class="rdm-session-tabs">
        ${sessions.slice(-6).map(s => html`
          <button
            key=${s.session_key}
            class=${`rdm-session-tab ${sessionTab === s.session_key ? 'active' : ''}`}
            onClick=${() => setSessionTab(s.session_key)}
          >
            ${s.session_name || s.session_type || 'Session'}
          </button>
        `)}
      </div>
      ${currentSessionObj && html`
        <div style=${{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          ${currentSessionObj.location || ''} · ${currentSessionObj.date_start ? currentSessionObj.date_start.slice(0,10) : ''}
          ${currentSessionObj.status ? ` · ${currentSessionObj.status}` : ''}
        </div>
      `}
      ${driverBestLaps.length > 0 ? html`
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th style=${{ width: '50px' }}>Pos</th>
                <th>Driver</th>
                <th>Team</th>
                <th style=${{ textAlign: 'right' }}>Best Lap</th>
                <th style=${{ textAlign: 'right' }}>Gap</th>
              </tr>
            </thead>
            <tbody>
              ${driverBestLaps.slice(0, 20).map((entry, i) => {
                const driver = getDriverByNumber(entry.driver_number);
                const team = driver ? getTeam(driver.team) : null;
                const gap = fastestTime ? entry.lap_duration - fastestTime : 0;
                return html`<tr key=${entry.driver_number}>
                  <td class=${`pos-cell ${i < 3 ? `pos-${i + 1}` : ''}`}>${i + 1}</td>
                  <td>
                    ${driver ? html`<span class="driver-cell"><${TeamDot} teamId=${driver.team} /> ${driver.name}</span>` : `#${entry.driver_number}`}
                  </td>
                  <td style=${{ color: team ? team.color : 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                    ${team ? team.name : '—'}
                  </td>
                  <td class="timing-value" style=${{ textAlign: 'right' }}>${formatLapTime(entry.lap_duration)}</td>
                  <td class="timing-value" style=${{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                    ${i === 0 ? 'Leader' : '+' + formatLapTime(gap)}
                  </td>
                </tr>`;
              })}
            </tbody>
          </table>
        </div>
      ` : html`
        <div class="empty-state" style=${{ padding: 'var(--space-8) var(--space-4)' }}>
          <p class="empty-state-text">No lap time data available for this session.</p>
        </div>
      `}
    `;
  };

  return html`
    <div class="modal-overlay open" onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal-card race-detail-modal">
        <div class="rdm-header">
          <div class="rdm-header-info">
            <h2 class="rdm-race-name">${race.name}</h2>
            <div class="rdm-race-meta">
              <span><${LocationIcon} /> ${race.location}</span>
              <span>·</span>
              <span><${CalendarIcon} /> ${race.date}</span>
              ${race.sprint && html`<span>·</span><span class="sprint-badge">Sprint Weekend</span>`}
            </div>
          </div>
          <button class="modal-close" onClick=${onClose} aria-label="Close">
            <${CloseIcon} />
          </button>
        </div>

        <div class="rdm-tab-bar">
          <button class=${`rdm-tab ${activeTab === 'sessions' ? 'active' : ''}`} onClick=${() => setActiveTab('sessions')}>Sessions</button>
          <button class=${`rdm-tab ${activeTab === 'predict' ? 'active' : ''}`} onClick=${() => setActiveTab('predict')}>Predict</button>
        </div>

        ${activeTab === 'sessions' ? renderSessionsPanel() : html`
          <div>
            ${race.sprint && html`
              <div class="rdm-inner-tabs">
                <button class=${`rdm-inner-tab ${sprintTab === 'sprint' ? 'active' : ''}`} onClick=${() => setSprintTab('sprint')}>Sprint</button>
                <button class=${`rdm-inner-tab ${sprintTab === 'race' ? 'active' : ''}`} onClick=${() => setSprintTab('race')}>Grand Prix</button>
              </div>
            `}
            ${renderPredictPanel(race.sprint ? sprintTab : 'race')}
          </div>
        `}
      </div>
    </div>
  `;
}

// Auth gate component used inside Race Detail Modal
function AuthGate() {
  const [showAuth, setShowAuth] = useState(false);
  return html`
    <div>
      <button class="btn btn-primary" onClick=${() => setShowAuth(true)}>Sign In</button>
      ${showAuth && html`<${AuthModal} onClose=${() => setShowAuth(false)} />`}
    </div>
  `;
}

// ===== OPENF1 DIRECT FETCH =====

const OPENF1_BASE = 'https://api.openf1.org/v1';

async function openF1Fetch(endpoint, params = {}) {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = `${OPENF1_BASE}/${endpoint}${qs ? '?' + qs : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenF1 ${endpoint}: ${res.status}`);
  return res.json();
}

// ===== LIVE DATA VIEW =====

function LiveView() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [positions, setPositions] = useState([]);
  const [laps, setLaps] = useState([]);
  const [weather, setWeather] = useState([]);
  const [raceControl, setRaceControl] = useState([]);
  const [pitStops, setPitStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchLiveData = useCallback(async (showRefresh) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Fetch sessions directly from OpenF1
      let sessData = [];
      try {
        sessData = await openF1Fetch('sessions', { year: 2026 });
      } catch {
        // If 2026 has no data yet, try latest from 2025 as demo
        try {
          sessData = await openF1Fetch('sessions', { year: 2025 });
        } catch { sessData = []; }
      }
      setSessions(sessData);

      if (sessData.length === 0) {
        setCurrentSession(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Use the latest session
      const latest = sessData[sessData.length - 1];
      setCurrentSession(latest);
      const sk = latest.session_key;

      // Fetch additional data in parallel directly from OpenF1
      const [posRes, lapRes, weatherRes, rcRes, pitRes] = await Promise.allSettled([
        openF1Fetch('position', { session_key: sk }),
        openF1Fetch('laps', { session_key: sk }),
        openF1Fetch('weather', { session_key: sk }),
        openF1Fetch('race_control', { session_key: sk }),
        openF1Fetch('pit', { session_key: sk })
      ]);

      if (posRes.status === 'fulfilled') setPositions(posRes.value || []);
      if (lapRes.status === 'fulfilled') setLaps(lapRes.value || []);
      if (weatherRes.status === 'fulfilled') setWeather(weatherRes.value || []);
      if (rcRes.status === 'fulfilled') setRaceControl(rcRes.value || []);
      if (pitRes.status === 'fulfilled') setPitStops(pitRes.value || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLiveData(false); }, [fetchLiveData]);

  // Find next race for empty state
  const now = new Date();
  const nextRace = RACES.find(r => {
    const raceDate = new Date(`${r.date}, 2026`);
    return raceDate > now;
  }) || RACES[0];

  if (loading) return html`<div><div class="page-header"><h1 class="page-title">Live Data</h1></div><div class="spinner"></div></div>`;

  if (error) return html`
    <div>
      <div class="page-header"><h1 class="page-title">Live Data</h1></div>
      <div class="empty-state">
        <h3 class="empty-state-title">Couldn't load live data</h3>
        <p class="empty-state-text">${error}</p>
        <button class="btn btn-primary" style=${{ marginTop: 'var(--space-4)' }} onClick=${() => fetchLiveData(false)}>Try Again</button>
      </div>
    </div>
  `;

  if (!currentSession) return html`
    <div>
      <div class="page-header"><h1 class="page-title">Live Data</h1></div>
      <div class="empty-state">
        <div class="empty-state-icon"><${FlagIcon} /></div>
        <h3 class="empty-state-title">No live session right now</h3>
        <p class="empty-state-text">The next race is ${nextRace.name} on ${nextRace.date}.</p>
      </div>
    </div>
  `;

  // Get latest positions (last position entry per driver)
  const latestPositions = {};
  positions.forEach(p => {
    latestPositions[p.driver_number] = p;
  });
  const sortedPositions = Object.values(latestPositions).sort((a, b) => (a.position || 99) - (b.position || 99));

  // Get latest laps (last few laps for display)
  const recentLaps = laps.slice(-30);

  // Fastest lap
  const validLaps = laps.filter(l => l.lap_duration && l.lap_duration > 0);
  const fastestLap = validLaps.length > 0 ? validLaps.reduce((f, l) => l.lap_duration < f.lap_duration ? l : f) : null;

  // Latest weather
  const latestWeather = weather.length > 0 ? weather[weather.length - 1] : null;

  // Recent race control (last 10)
  const recentRC = raceControl.slice(-10).reverse();

  // Recent pit stops (last 10)
  const recentPits = pitStops.slice(-10).reverse();

  const isLive = currentSession.status === 'Started' || currentSession.status === 'Active';

  return html`
    <div>
      <div class="page-header" style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 class="page-title">Live Data</h1>
          <p class="page-subtitle">Latest session info from OpenF1.</p>
        </div>
        <button class="btn btn-secondary refresh-btn" onClick=${() => fetchLiveData(true)} disabled=${refreshing}>
          <${RefreshIcon} />
          ${refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div class="session-status-card">
        <div class="session-info">
          <div class="session-name">
            ${isLive && html`<span class="live-dot"></span>`}
            ${currentSession.session_name || 'Session'} — ${currentSession.location || ''}
          </div>
          <div class="session-detail">
            ${currentSession.circuit_short_name || ''} · ${currentSession.date_start ? currentSession.date_start.slice(0, 10) : ''}
            ${currentSession.status ? ` · ${currentSession.status}` : ''}
          </div>
        </div>
      </div>

      ${sortedPositions.length > 0 && html`
        <div class="live-section">
          <div class="live-section-title">
            Positions
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th style=${{ width: '50px' }}>Pos</th>
                  <th>Driver</th>
                  <th>Number</th>
                </tr>
              </thead>
              <tbody>
                ${sortedPositions.slice(0, 22).map((p, i) => {
                  const driver = getDriverByNumber(p.driver_number);
                  return html`<tr key=${p.driver_number}>
                    <td class=${`pos-cell ${i < 3 ? `pos-${i + 1}` : ''}`}>${p.position || '—'}</td>
                    <td>
                      ${driver ? html`<span class="driver-cell"><${TeamDot} teamId=${driver.team} /> ${driver.name}</span>` : `#${p.driver_number}`}
                    </td>
                    <td class="timing-value">${p.driver_number}</td>
                  </tr>`;
                })}
              </tbody>
            </table>
          </div>
        </div>
      `}

      ${fastestLap && html`
        <div class="live-section">
          <div class="live-section-title">Fastest Lap</div>
          <div style=${{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            ${(() => {
              const driver = getDriverByNumber(fastestLap.driver_number);
              return html`
                <div>
                  <div style=${{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    ${driver ? driver.name : `#${fastestLap.driver_number}`}
                  </div>
                  <div class="timing-value sector-fastest" style=${{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                    ${formatLapTime(fastestLap.lap_duration)}
                  </div>
                  <div style=${{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 'var(--space-1)' }}>
                    Lap ${fastestLap.lap_number || '?'}
                  </div>
                </div>
              `;
            })()}
          </div>
        </div>
      `}

      ${recentLaps.length > 0 && html`
        <div class="live-section">
          <div class="live-section-title">Latest Lap Times</div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Lap</th>
                  <th>Time</th>
                  <th>S1</th>
                  <th>S2</th>
                  <th>S3</th>
                </tr>
              </thead>
              <tbody>
                ${recentLaps.slice(-15).reverse().map((lap, i) => {
                  const driver = getDriverByNumber(lap.driver_number);
                  return html`<tr key=${i}>
                    <td>${driver ? html`<span class="driver-cell"><${TeamDot} teamId=${driver.team} size=${8} /> <span style=${{ fontSize: 'var(--text-xs)' }}>${driver.name.split(' ').pop()}</span></span>` : `#${lap.driver_number}`}</td>
                    <td class="timing-value">${lap.lap_number || '—'}</td>
                    <td class="timing-value">${lap.lap_duration ? formatLapTime(lap.lap_duration) : '—'}</td>
                    <td class="timing-value ${getSectorClass(lap, 'duration_sector_1')}">${lap.duration_sector_1 ? lap.duration_sector_1.toFixed(3) : '—'}</td>
                    <td class="timing-value ${getSectorClass(lap, 'duration_sector_2')}">${lap.duration_sector_2 ? lap.duration_sector_2.toFixed(3) : '—'}</td>
                    <td class="timing-value ${getSectorClass(lap, 'duration_sector_3')}">${lap.duration_sector_3 ? lap.duration_sector_3.toFixed(3) : '—'}</td>
                  </tr>`;
                })}
              </tbody>
            </table>
          </div>
        </div>
      `}

      ${recentPits.length > 0 && html`
        <div class="live-section">
          <div class="live-section-title">Pit Stops</div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Lap</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                ${recentPits.map((pit, i) => {
                  const driver = getDriverByNumber(pit.driver_number);
                  return html`<tr key=${i}>
                    <td>${driver ? html`<span class="driver-cell"><${TeamDot} teamId=${driver.team} size=${8} /> ${driver.name}</span>` : `#${pit.driver_number}`}</td>
                    <td class="timing-value">${pit.lap_number || '—'}</td>
                    <td class="pit-duration">${pit.pit_duration ? `${pit.pit_duration.toFixed(1)}s` : '—'}</td>
                  </tr>`;
                })}
              </tbody>
            </table>
          </div>
        </div>
      `}

      ${latestWeather && html`
        <div class="live-section">
          <div class="live-section-title">Weather</div>
          <div class="weather-grid">
            <div class="weather-item">
              <div class="weather-item-value">${latestWeather.air_temperature != null ? `${latestWeather.air_temperature}°C` : '—'}</div>
              <div class="weather-item-label">Air Temp</div>
            </div>
            <div class="weather-item">
              <div class="weather-item-value">${latestWeather.track_temperature != null ? `${latestWeather.track_temperature}°C` : '—'}</div>
              <div class="weather-item-label">Track Temp</div>
            </div>
            <div class="weather-item">
              <div class="weather-item-value">${latestWeather.humidity != null ? `${latestWeather.humidity}%` : '—'}</div>
              <div class="weather-item-label">Humidity</div>
            </div>
            <div class="weather-item">
              <div class="weather-item-value">${latestWeather.wind_speed != null ? `${latestWeather.wind_speed} m/s` : '—'}</div>
              <div class="weather-item-label">Wind</div>
            </div>
            <div class="weather-item">
              <div class="weather-item-value">${latestWeather.rainfall != null ? (latestWeather.rainfall > 0 ? 'Yes' : 'No') : '—'}</div>
              <div class="weather-item-label">Rain</div>
            </div>
            <div class="weather-item">
              <div class="weather-item-value">${latestWeather.pressure != null ? `${latestWeather.pressure} mbar` : '—'}</div>
              <div class="weather-item-label">Pressure</div>
            </div>
          </div>
        </div>
      `}

      ${recentRC.length > 0 && html`
        <div class="live-section">
          <div class="live-section-title">Race Control</div>
          ${recentRC.map((msg, i) => html`
            <div key=${i} class=${`rc-message ${getRCClass(msg)}`}>
              ${msg.message || JSON.stringify(msg)}
            </div>
          `)}
        </div>
      `}
    </div>
  `;
}

function formatLapTime(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
}

function getSectorClass(lap, sectorKey) {
  if (lap.is_pit_out_lap) return '';
  const val = lap[sectorKey];
  if (!val) return '';
  // Simple heuristic: we don't have full session context for purple/green/yellow,
  // but we can style them with defaults
  return '';
}

function getRCClass(msg) {
  const text = (msg.message || '').toLowerCase();
  const flag = (msg.flag || '').toLowerCase();
  if (flag === 'red' || text.includes('red flag')) return 'rc-red';
  if (flag === 'yellow' || text.includes('yellow') || text.includes('safety car') || text.includes('vsc')) return 'rc-yellow';
  if (flag === 'green' || text.includes('green') || text.includes('clear')) return 'rc-green';
  return 'rc-default';
}

// ===== NEWS VIEW =====

// Parse simple XML tags from RSS text
function extractXmlTag(xml, tag) {
  const start = xml.indexOf(`<${tag}>`);
  const altStart = xml.indexOf(`<${tag} `);
  const s = start !== -1 ? start : altStart;
  if (s === -1) return '';
  const bracketEnd = xml.indexOf('>', s);
  if (bracketEnd === -1) return '';
  const contentStart = bracketEnd + 1;
  const end = xml.indexOf(`</${tag}>`, contentStart);
  if (end === -1) return '';
  let content = xml.slice(contentStart, end).trim();
  if (content.startsWith('<![CDATA[')) {
    content = content.slice(9);
    if (content.endsWith(']]>')) content = content.slice(0, -3);
  }
  return content;
}

function NewsView() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchNews() {
      const newsItems = [];

      // Strategy 1: Fetch OpenF1 latest sessions as "results news"
      try {
        let sessData = [];
        try {
          sessData = await openF1Fetch('sessions', { year: 2026 });
        } catch {
          try { sessData = await openF1Fetch('sessions', { year: 2025 }); } catch { sessData = []; }
        }
        if (sessData && sessData.length > 0) {
          sessData.slice(-8).reverse().forEach(session => {
            newsItems.push({
              title: `${session.session_name || 'Session'} — ${session.location || session.circuit_short_name || ''}`,
              link: '',
              description: `${session.session_type || ''} at ${session.circuit_short_name || session.location || ''} on ${(session.date_start || '').slice(0, 10)}`,
              date: session.date_start || '',
              source: 'OpenF1'
            });
          });
        }
      } catch { /* ignore */ }

      // Strategy 2: Fetch F1 RSS via a public CORS proxy
      try {
        const rssUrl = 'https://www.formula1.com/content/fom-website/en/latest/all.xml';
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const rssText = await res.text();
          const items = rssText.split('<item>');
          for (let i = 1; i < Math.min(items.length, 16); i++) {
            const title = extractXmlTag(items[i], 'title');
            const link = extractXmlTag(items[i], 'link');
            const description = extractXmlTag(items[i], 'description');
            const pubDate = extractXmlTag(items[i], 'pubDate');
            if (title) {
              newsItems.push({
                title,
                link,
                description: description ? description.slice(0, 200) : '',
                date: pubDate,
                source: 'Formula1.com'
              });
            }
          }
        }
      } catch { /* CORS proxy timeout or failure — just show OpenF1 data */ }

      // Strategy 3: Fallback — try F1 TV RSS via allorigins
      if (newsItems.filter(n => n.source !== 'OpenF1').length === 0) {
        try {
          const rssUrl2 = 'https://f1tv-rss.vercel.app/api/rss';
          const proxyUrl2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl2)}`;
          const res2 = await fetch(proxyUrl2, { signal: AbortSignal.timeout(8000) });
          if (res2.ok) {
            const rssText2 = await res2.text();
            const items2 = rssText2.split('<item>');
            for (let i = 1; i < Math.min(items2.length, 16); i++) {
              const title = extractXmlTag(items2[i], 'title');
              const link = extractXmlTag(items2[i], 'link');
              const description = extractXmlTag(items2[i], 'description');
              const pubDate = extractXmlTag(items2[i], 'pubDate');
              if (title) {
                newsItems.push({ title, link, description: description ? description.slice(0, 200) : '', date: pubDate, source: 'F1 TV' });
              }
            }
          }
        } catch { /* fallback also failed */ }
      }

      if (newsItems.length === 0) {
        setError('No news sources available right now. Try again later.');
      } else {
        setNews(newsItems);
      }
      setLoading(false);
    }
    fetchNews();
  }, []);

  if (loading) return html`<div><div class="page-header"><h1 class="page-title">F1 News</h1></div><div class="spinner"></div></div>`;

  return html`
    <div>
      <div class="page-header">
        <h1 class="page-title">F1 News</h1>
        <p class="page-subtitle">Latest from the world of Formula 1.</p>
      </div>

      ${error ? html`
        <div class="empty-state">
          <h3 class="empty-state-title">Couldn't load news</h3>
          <p class="empty-state-text">${error}</p>
        </div>
      ` : news.length === 0 ? html`
        <div class="empty-state">
          <div class="empty-state-icon"><${NewsIcon} /></div>
          <h3 class="empty-state-title">No news yet</h3>
          <p class="empty-state-text">Check back later for the latest F1 updates.</p>
        </div>
      ` : html`
        <div class="news-grid">
          ${news.map((item, i) => html`
            <${NewsCard} key=${i} item=${item} />
          `)}
        </div>
      `}
    </div>
  `;
}

function NewsCard({ item }) {
  const isF1 = item.source === 'Formula1.com' || item.source === 'F1 TV';
  const isOpenF1 = item.source === 'OpenF1';
  const sourceClass = isF1 ? 'f1tv' : isOpenF1 ? 'openf1' : '';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  };

  return html`
    <div class=${`news-card news-card-${sourceClass}`}>
      <h3 class="news-card-title">
        ${item.link ? html`<a href=${item.link} target="_blank" rel="noopener noreferrer">${item.title}</a>` : item.title}
      </h3>
      ${item.description && html`<p class="news-card-desc">${item.description}</p>`}
      <div class="news-card-meta">
        <span class="news-card-date">${formatDate(item.date)}</span>
        <span class=${`news-source-badge news-source-${sourceClass}`}>${item.source || 'News'}</span>
      </div>
    </div>
  `;
}

// ===== RANKINGS VIEW =====

function RankingsView() {
  const [selectedRace, setSelectedRace] = useState(RACES[0].id);
  const [raceType, setRaceType] = useState('race'); // 'race' or 'sprint'
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);

  const race = RACES.find(r => r.id === selectedRace);

  // Reset raceType to 'race' when switching to a non-sprint race
  useEffect(() => {
    if (race && !race.sprint) setRaceType('race');
  }, [selectedRace, race]);

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true);
      try {
        const data = await apiCall(`/rankings?race_id=${selectedRace}&race_type=${raceType}`);
        setRankings(data.rankings || []);
      } catch (e) { setRankings([]); }
      finally { setLoading(false); }
    }
    fetchRankings();
  }, [selectedRace, raceType]);

  // Group rankings by user
  const userRankings = {};
  const userDisplayNames = {};
  rankings.forEach(r => {
    if (!userRankings[r.username]) userRankings[r.username] = {};
    userRankings[r.username][r.position] = r.driver_id;
    userDisplayNames[r.username] = r.display_name || r.username;
  });
  const users = Object.keys(userRankings);

  // Number of positions depends on race type
  const numPositions = raceType === 'sprint' ? 8 : 10;

  // Consensus
  const consensus = {};
  if (users.length > 0) {
    for (let pos = 1; pos <= numPositions; pos++) {
      const counts = {};
      users.forEach(u => {
        const did = userRankings[u][pos];
        if (did) counts[did] = (counts[did] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) consensus[pos] = Number(sorted[0][0]);
    }
  }

  return html`
    <div>
      <div class="page-header">
        <h1 class="page-title">Rankings</h1>
        <p class="page-subtitle">See how everyone's predicting each race.</p>
      </div>
      
      <div class="race-select-header">
        <${RaceSelect} value=${selectedRace} onChange=${(id) => setSelectedRace(id)} />
      </div>

      ${race && race.sprint && html`
        <div class="race-type-toggle">
          <span class="race-type-toggle-label">View:</span>
          <div class="pill-tabs">
            <button class=${`pill-tab ${raceType === 'race' ? 'active' : ''}`} onClick=${() => setRaceType('race')}>Grand Prix</button>
            <button class=${`pill-tab ${raceType === 'sprint' ? 'active' : ''}`} onClick=${() => setRaceType('sprint')}>Sprint</button>
          </div>
        </div>
      `}
      
      ${loading ? html`<div class="spinner"></div>` : users.length === 0 ? html`
        <div class="empty-state">
          <div class="empty-state-icon"><${FlagIcon} /></div>
          <h3 class="empty-state-title">No rankings yet</h3>
          <p class="empty-state-text">Be the first to submit your predicted ${raceType === 'sprint' ? 'top 8' : 'top 10'} for this ${raceType === 'sprint' ? 'sprint' : 'race'}! Click a race card on the Calendar.</p>
        </div>
      ` : html`
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                ${Array.from({ length: numPositions }, (_, i) => html`<th key=${i}>P${i + 1}</th>`)}
              </tr>
            </thead>
            <tbody>
              ${users.map(user => html`
                <tr key=${user}>
                  <td><${UsernameLink} username=${user} displayName=${userDisplayNames[user]} /></td>
                  ${Array.from({ length: numPositions }, (_, i) => {
                    const dId = userRankings[user][i + 1];
                    const driver = dId ? getDriver(dId) : null;
                    return html`<td key=${i}>
                      ${driver ? html`
                        <span class="driver-cell">
                          <${TeamDot} teamId=${driver.team} size=${8} />
                          <span style=${{ fontSize: 'var(--text-xs)' }}>${driver.name.split(' ').pop()}</span>
                        </span>
                      ` : html`<span style=${{ color: 'var(--color-text-faint)' }}>—</span>`}
                    </td>`;
                  })}
                </tr>
              `)}
            </tbody>
          </table>
        </div>
        
        ${Object.keys(consensus).length > 0 && html`
          <div class="consensus-section">
            <h3 class="consensus-title">Consensus Ranking${raceType === 'sprint' ? ' — Sprint' : ''}</h3>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style=${{ width: '60px' }}>Pos</th>
                    <th>Driver</th>
                    <th>Team</th>
                  </tr>
                </thead>
                <tbody>
                  ${Array.from({ length: numPositions }, (_, i) => {
                    const dId = consensus[i + 1];
                    const driver = dId ? getDriver(dId) : null;
                    const team = driver ? getTeam(driver.team) : null;
                    return html`<tr key=${i}>
                      <td class=${`pos-cell ${i < 3 ? `pos-${i + 1}` : ''}`}>P${i + 1}</td>
                      <td>${driver ? html`<span class="driver-cell"><${TeamDot} teamId=${driver.team} /> ${driver.name}</span>` : '—'}</td>
                      <td style=${{ color: 'var(--color-text-muted)' }}>${team ? team.name : '—'}</td>
                    </tr>`;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        `}
      `}
    </div>
  `;
}

// ===== LEADERBOARD VIEW =====

function LeaderboardView() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const data = await apiCall('/leaderboard');
        setLeaderboard(data.leaderboard || []);
      } catch (e) { setLeaderboard([]); }
      finally { setLoading(false); }
    }
    fetchLeaderboard();
  }, []);

  if (loading) return html`<div><div class="page-header"><h1 class="page-title">Leaderboard</h1></div><div class="spinner"></div></div>`;

  return html`
    <div>
      <div class="page-header">
        <h1 class="page-title">Leaderboard</h1>
        <p class="page-subtitle">Who's the best F1 predictor? Rankings based on accuracy against actual race results.</p>
      </div>

      ${leaderboard.length === 0 ? html`
        <div class="empty-state">
          <div class="empty-state-icon"><${TrophyIcon} /></div>
          <h3 class="empty-state-title">No leaderboard data yet</h3>
          <p class="empty-state-text">Submit rankings and wait for race results to see the leaderboard come alive!</p>
        </div>
      ` : html`
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th style=${{ width: '60px' }}>Rank</th>
                <th>User</th>
                <th>Team</th>
                <th>Races</th>
                <th>Accuracy</th>
                <th style=${{ textAlign: 'right' }}>Avg Diff</th>
              </tr>
            </thead>
            <tbody>
              ${leaderboard.map((entry, i) => {
                const rank = i + 1;
                const acc = entry.accuracy;
                const hasAcc = acc && acc.accuracy !== null;
                const favTeam = entry.favorite_team ? getTeam(entry.favorite_team) : null;
                
                return html`<tr key=${entry.username}>
                  <td style=${{ textAlign: 'center' }}>
                    ${rank <= 3 ? html`
                      <span class=${`leaderboard-rank-badge leaderboard-rank-${rank}`}>${rank}</span>
                    ` : html`
                      <span class="pos-cell">${rank}</span>
                    `}
                  </td>
                  <td>
                    <${UsernameLink} username=${entry.username} displayName=${entry.display_name} />
                  </td>
                  <td>
                    ${favTeam ? html`
                      <span class="driver-cell">
                        <${TeamDot} teamId=${entry.favorite_team} size=${8} />
                        <span style=${{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>${favTeam.name}</span>
                      </span>
                    ` : html`<span style=${{ color: 'var(--color-text-faint)' }}>—</span>`}
                  </td>
                  <td style=${{ color: 'var(--color-text-muted)' }}>${entry.races_ranked}</td>
                  <td>
                    ${hasAcc ? html`
                      <div class="accuracy-bar-wrapper">
                        <div class="accuracy-bar">
                          <div class="accuracy-bar-fill" style=${{ width: `${Math.min(acc.accuracy, 100)}%` }}></div>
                        </div>
                        <span class="accuracy-bar-text">${acc.accuracy}%</span>
                      </div>
                    ` : html`<span style=${{ color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)' }}>Pending</span>`}
                  </td>
                  <td style=${{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    ${hasAcc ? acc.position_diff_avg : '—'}
                  </td>
                </tr>`;
              })}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ===== CHAMPIONSHIPS VIEW =====

function ChampionshipsView() {
  const [tab, setTab] = useState('drivers');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChampionships() {
      try {
        const result = await apiCall('/championships');
        setData(result);
      } catch (e) {
        setData({ drivers: [], constructors: [] });
      } finally { setLoading(false); }
    }
    fetchChampionships();
  }, []);

  const hasData = data && ((tab === 'drivers' && data.drivers && data.drivers.length > 0) || 
                            (tab === 'constructors' && data.constructors && data.constructors.length > 0));

  return html`
    <div>
      <div class="page-header">
        <h1 class="page-title">Championship Standings</h1>
        <p class="page-subtitle">Aggregated from everyone's predicted rankings. Points: 25-18-15-12-10-8-6-4-2-1.</p>
      </div>
      
      <div style=${{ marginBottom: 'var(--space-6)' }}>
        <div class="pill-tabs">
          <button class=${`pill-tab ${tab === 'drivers' ? 'active' : ''}`} onClick=${() => setTab('drivers')}>Drivers</button>
          <button class=${`pill-tab ${tab === 'constructors' ? 'active' : ''}`} onClick=${() => setTab('constructors')}>Constructors</button>
        </div>
      </div>
      
      ${loading ? html`<div class="spinner"></div>` : !hasData ? html`
        <div class="empty-state">
          <div class="empty-state-icon"><${TrophyIcon} /></div>
          <h3 class="empty-state-title">No championship data yet</h3>
          <p class="empty-state-text">Submit some race rankings to see the championship standings come alive!</p>
        </div>
      ` : tab === 'drivers' ? html`
        <${DriversStandings} drivers=${data.drivers} />
      ` : html`
        <${ConstructorsStandings} constructors=${data.constructors} />
      `}
    </div>
  `;
}

function DriversStandings({ drivers }) {
  return html`
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th style=${{ width: '60px' }}>Pos</th>
            <th>Driver</th>
            <th>Team</th>
            <th style=${{ textAlign: 'right' }}>Points</th>
          </tr>
        </thead>
        <tbody>
          ${drivers.map((d, i) => {
            const driver = getDriver(d.driver_id);
            const team = driver ? getTeam(driver.team) : null;
            return html`<tr key=${d.driver_id} class="team-row">
              <td class=${`pos-cell ${i < 3 ? `pos-${i + 1}` : ''}`}>${i + 1}</td>
              <td>
                <span class="driver-cell">
                  ${team && html`<${TeamDot} teamId=${driver.team} />`}
                  <span>${driver ? driver.name : `Driver ${d.driver_id}`}</span>
                  ${driver && html`<span class="driver-number">#${driver.number}</span>`}
                </span>
              </td>
              <td style=${{ color: team ? team.color : 'var(--color-text-muted)' }}>
                ${team ? team.name : '—'}
              </td>
              <td class="points-cell" style=${{ textAlign: 'right' }}>${d.points}</td>
            </tr>`;
          })}
        </tbody>
      </table>
    </div>
  `;
}

function ConstructorsStandings({ constructors }) {
  return html`
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th style=${{ width: '60px' }}>Pos</th>
            <th>Team</th>
            <th style=${{ textAlign: 'right' }}>Points</th>
          </tr>
        </thead>
        <tbody>
          ${constructors.map((c, i) => {
            const team = TEAMS.find(t => t.id === c.team_id);
            return html`<tr key=${c.team_id}>
              <td class=${`pos-cell ${i < 3 ? `pos-${i + 1}` : ''}`}>${i + 1}</td>
              <td>
                <span class="driver-cell">
                  <span class="constructor-color-bar" style=${{ backgroundColor: team ? team.color : '#555' }}></span>
                  <span style=${{ fontWeight: 600 }}>${team ? team.name : c.team_id}</span>
                </span>
              </td>
              <td class="points-cell" style=${{ textAlign: 'right' }}>${c.points}</td>
            </tr>`;
          })}
        </tbody>
      </table>
    </div>
  `;
}

// ===== ROUTER =====

function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handler = () => {
      setRoute(window.location.hash.slice(1) || '/');
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  return [route, setRoute];
}

// ===== APP =====

function App() {
  const [route, setRoute] = useHashRoute();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const login = useCallback((t, username, display_name) => {
    setToken(t);
    setUser({ username, display_name });
  }, []);

  // Expose login for dev testing
  useEffect(() => {
    window.__devLogin = (t, username, display_name) => login(t, username, display_name);
    return () => { delete window.__devLogin; };
  }, [login]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const authValue = { token, user, login, logout };

  const renderPage = () => {
    const path = route === '/calendar' ? '/' : route;
    if (path === '/rankings') return html`<${RankingsView} />`;
    if (path === '/leaderboard') return html`<${LeaderboardView} />`;
    if (path === '/championships') return html`<${ChampionshipsView} />`;
    if (path.startsWith('/profile/')) {
      const username = path.slice(9);
      return html`<${ProfilePageRedirect} username=${username} />`;
    }
    return html`<${CalendarView} />`;
  };

  return html`
    <${AuthContext.Provider} value=${authValue}>
      <${ToastProvider}>
        <${ProfileProvider}>
          <div class="app-wrapper">
            <${Navbar} route=${route} />
            <main class="main-content">
              ${renderPage()}
            </main>
            <footer class="app-footer">
              F1 RANK 2026 — A casual prediction game for friends. Not affiliated with Formula 1.
            </footer>
          </div>
        <//>
      <//>
    <//>
  `;
}

// Profile page redirect (opens modal instead)
function ProfilePageRedirect({ username }) {
  const { openProfile } = useProfile();
  useEffect(() => {
    openProfile(username);
  }, [username, openProfile]);
  return html`<${CalendarView} />`;
}

// ===== MOUNT =====

const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
