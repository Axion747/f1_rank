import React, { useState, useEffect, useCallback, createContext, useContext, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import htm from 'htm';
import { createClient } from '@supabase/supabase-js';

const html = htm.bind(React.createElement);
const supabase = createClient('https://uuygkrlkmgjoxgmvzxmj.supabase.co', 'sb_publishable_b7BH7vMDILpV7xOppEJRrQ_2E-45ojh');

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

// ===== POINTS TABLES =====

const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

// ===== ACCURACY HELPERS =====

function computeAccuracy(userRankings, actualResults) {
  // userRankings: array of { race_id, position, driver_id, race_type }
  // actualResults: array of { race_id, position, driver_id, race_type }
  if (!userRankings.length || !actualResults.length) return null;

  // Build lookup: race_id|race_type|position -> driver_id (actual)
  const actualMap = {};
  actualResults.forEach(r => {
    actualMap[`${r.race_id}|${r.race_type}|${r.position}`] = r.driver_id;
  });

  // Build lookup: actual race_id|race_type|driver_id -> position
  const actualDriverPosMap = {};
  actualResults.forEach(r => {
    actualDriverPosMap[`${r.race_id}|${r.race_type}|${r.driver_id}`] = r.position;
  });

  // Find races that have actual results
  const actualRaceKeys = new Set(actualResults.map(r => `${r.race_id}|${r.race_type}`));

  let totalCorrect = 0;
  let totalPredictions = 0;
  let totalPosDiff = 0;
  let racesWithResults = new Set();

  userRankings.forEach(pred => {
    const key = `${pred.race_id}|${pred.race_type}`;
    if (!actualRaceKeys.has(key)) return;

    racesWithResults.add(key);
    totalPredictions++;

    const actualDriverAtPos = actualMap[`${pred.race_id}|${pred.race_type}|${pred.position}`];
    if (actualDriverAtPos === pred.driver_id) {
      totalCorrect++;
    }

    const actualPos = actualDriverPosMap[`${pred.race_id}|${pred.race_type}|${pred.driver_id}`];
    if (actualPos !== undefined) {
      totalPosDiff += Math.abs(pred.position - actualPos);
    } else {
      totalPosDiff += 10; // penalty if driver not in actual results
    }
  });

  if (totalPredictions === 0) return null;

  const accuracy = Math.round((totalCorrect / totalPredictions) * 100);
  const position_diff_avg = (totalPosDiff / totalPredictions).toFixed(1);

  return {
    accuracy,
    total_correct: totalCorrect,
    total_predictions: totalPredictions,
    position_diff_avg,
    races_with_results: racesWithResults.size
  };
}

// ===== CONTEXTS =====

const AuthContext = createContext(null);
function useAuth() { return useContext(AuthContext); }

const ToastContext = createContext(null);
function useToast() { return useContext(ToastContext); }

const ProfileContext = createContext(null);
function useProfile() { return useContext(ProfileContext); }

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

function UserIcon({ size = 16 }) {
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
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
    const DROPDOWN_HEIGHT = 280;
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
          ${auth.session && auth.profile ? html`
            <div class="navbar-user">
              <span class="navbar-username" onClick=${() => openProfile(auth.profile.username)}>${auth.profile.display_name || auth.profile.username}</span>
              <button class="btn btn-ghost btn-sm" onClick=${auth.logout}>Logout</button>
            </div>
          ` : auth.session && !auth.profile ? html`
            <div class="navbar-user">
              <span class="navbar-username" style=${{ opacity: 0.5 }}>Loading...</span>
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
          ${auth.session && auth.profile ? html`
            <div style=${{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Logged in as <strong style=${{ color: 'var(--color-text)' }}>${auth.profile.display_name || auth.profile.username}</strong>
            </div>
            <button class="mobile-nav-link" onClick=${() => { openProfile(auth.profile.username); setMobileOpen(false); }}>My Profile</button>
            <button class="mobile-nav-link" onClick=${() => { auth.logout(); setMobileOpen(false); }}>Logout</button>
          ` : auth.session && !auth.profile ? html`
            <div style=${{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Loading profile...
            </div>
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
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in email and password');
      return;
    }
    if (mode === 'register' && !username.trim()) {
      setError('Please pick a username');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });
        if (authErr) throw authErr;
        showToast(`Welcome back!`);
        onClose();
      } else {
        const { data, error: authErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: { data: { username: username.trim(), display_name: displayName.trim() || username.trim() } }
        });
        if (authErr) throw authErr;
        // If email confirmation is required, user won't have a session yet
        if (data.user && !data.session) {
          showToast('Account created! Check your email to confirm, then sign in.', 'info');
        } else {
          showToast(`Account created! Welcome, ${displayName.trim() || username.trim()}!`);
        }
        onClose();
      }
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
            <label class="form-label">Email</label>
            <input class="form-input" type="email" placeholder="you@example.com" 
              value=${email} onInput=${(e) => setEmail(e.target.value)} 
              autoFocus autocomplete="email" />
          </div>
          ${mode === 'register' && html`
            <div class="form-group">
              <label class="form-label">Username</label>
              <input class="form-input" type="text" placeholder="Pick a username" 
                value=${username} onInput=${(e) => setUsername(e.target.value)} 
                autocomplete="username" />
            </div>
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
  const [accuracyData, setAccuracyData] = useState(null);
  const [racesRanked, setRacesRanked] = useState(0);

  const isOwnProfile = auth.session && auth.profile && auth.profile.username === username;

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        // Fetch profile
        const { data: profileData, error: profileErr } = await supabase.from('profiles')
          .select('*')
          .eq('username', username)
          .single();
        if (profileErr) throw profileErr;
        setProfile(profileData);
        setEditData({
          display_name: profileData.display_name || '',
          bio: profileData.bio || '',
          favorite_team: profileData.favorite_team || '',
          favorite_driver: profileData.favorite_driver || ''
        });

        // Fetch user rankings for accuracy
        const { data: userRankings } = await supabase.from('rankings')
          .select('race_id, position, driver_id, race_type')
          .eq('user_id', profileData.id);

        // Count distinct races
        const raceKeys = new Set((userRankings || []).map(r => `${r.race_id}|${r.race_type}`));
        setRacesRanked(raceKeys.size);

        // Fetch actual results
        const { data: actualResults } = await supabase.from('actual_results')
          .select('race_id, position, driver_id, race_type');

        const acc = computeAccuracy(userRankings || [], actualResults || []);
        setAccuracyData(acc);
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
      const { error: updateErr } = await supabase.from('profiles')
        .update({
          display_name: editData.display_name,
          bio: editData.bio,
          favorite_team: editData.favorite_team,
          favorite_driver: editData.favorite_driver
        })
        .eq('id', auth.session.user.id);
      if (updateErr) throw updateErr;
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
  const hasAccuracy = accuracyData && accuracyData.accuracy !== null;

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
            ${profile.created_at && html`<div class="profile-member-since">Member since ${new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>`}
          </div>

          <div class="accuracy-gauge">
            <div class="accuracy-circle" style=${{ borderColor: hasAccuracy ? teamColor : 'var(--color-border)' }}>
              <span class="accuracy-value">${hasAccuracy ? `${accuracyData.accuracy}%` : '—'}</span>
            </div>
            <div class="accuracy-label">${hasAccuracy ? 'Prediction Accuracy' : 'No races completed yet'}</div>
          </div>

          <div class="profile-stats-grid">
            <div class="profile-stat">
              <div class="profile-stat-value">${racesRanked || 0}</div>
              <div class="profile-stat-label">Races Ranked</div>
            </div>
            <div class="profile-stat">
              <div class="profile-stat-value">${hasAccuracy ? accuracyData.total_correct : '—'}</div>
              <div class="profile-stat-label">Correct Picks</div>
            </div>
            <div class="profile-stat">
              <div class="profile-stat-value">${hasAccuracy ? accuracyData.position_diff_avg : '—'}</div>
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

// ===== RACE DETAIL MODAL =====

function RaceDetailModal({ race, onClose }) {
  const auth = useAuth();
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState('predict');
  const [sprintTab, setSprintTab] = useState('race');

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
    if (activeTab !== 'predict' || !auth.session) return;
    async function loadPredictions() {
      setLoadingPredictions(true);
      try {
        // Load GP predictions
        const { data: gpData } = await supabase.from('rankings')
          .select('position, driver_id')
          .eq('user_id', auth.session.user.id)
          .eq('race_id', race.id)
          .eq('race_type', 'race')
          .order('position');
        if (gpData && gpData.length > 0) {
          const existing = Array(10).fill('');
          gpData.forEach(r => {
            if (r.position >= 1 && r.position <= 10) existing[r.position - 1] = String(r.driver_id);
          });
          setGpSelections(existing);
        }
        // Load Sprint predictions if sprint weekend
        if (race.sprint) {
          const { data: spData } = await supabase.from('rankings')
            .select('position, driver_id')
            .eq('user_id', auth.session.user.id)
            .eq('race_id', race.id)
            .eq('race_type', 'sprint')
            .order('position');
          if (spData && spData.length > 0) {
            const existing = Array(8).fill('');
            spData.forEach(r => {
              if (r.position >= 1 && r.position <= 8) existing[r.position - 1] = String(r.driver_id);
            });
            setSprintSelections(existing);
          }
        }
      } catch (e) { /* no existing predictions */ }
      finally { setLoadingPredictions(false); }
    }
    loadPredictions();
  }, [activeTab, auth.session, race.id, race.sprint]);

  // Load sessions when sessions tab active
  useEffect(() => {
    if (activeTab !== 'sessions') return;
    async function loadSessions() {
      setLoadingSessions(true);
      try {
        let data = [];
        const country = race.location;
        try {
          data = await openF1Fetch('sessions', { year: 2026, location: country });
          if (!data || data.length === 0) {
            data = await openF1Fetch('sessions', { year: 2026, meeting_name: race.name.replace(' Grand Prix', '') });
          }
        } catch { data = []; }
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
      // Delete existing predictions for this race/type
      await supabase.from('rankings')
        .delete()
        .eq('user_id', auth.session.user.id)
        .eq('race_id', race.id)
        .eq('race_type', raceType);

      // Insert new predictions
      const { error: insertErr } = await supabase.from('rankings')
        .insert(rankings.map(r => ({
          user_id: auth.session.user.id,
          race_id: race.id,
          position: r.position,
          driver_id: r.driver_id,
          race_type: raceType
        })));
      if (insertErr) throw insertErr;

      showToast(`${isGP ? 'Grand Prix' : 'Sprint'} predictions saved for ${race.name}!`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally { setSavingPredictions(false); }
  };

  // Sessions tab helpers
  const SESSION_TYPE_ORDER = ['Practice 1', 'Practice 2', 'Practice 3', 'Sprint Qualifying', 'Qualifying', 'Sprint', 'Race'];

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

    if (!auth.session) {
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

// ===== HELPERS =====

function formatLapTime(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
}

// ===== RANKINGS VIEW =====

function RankingsView() {
  const [selectedRace, setSelectedRace] = useState(RACES[0].id);
  const [raceType, setRaceType] = useState('race');
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
        // Fetch rankings for this race
        const { data: rankData } = await supabase.from('rankings')
          .select('position, driver_id, user_id')
          .eq('race_id', selectedRace)
          .eq('race_type', raceType)
          .order('position');

        // Get unique user IDs and fetch their profiles
        const userIds = [...new Set((rankData || []).map(r => r.user_id))];
        let profileMap = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles')
            .select('id, username, display_name')
            .in('id', userIds);
          (profiles || []).forEach(p => { profileMap[p.id] = p; });
        }

        // Attach profile info to each ranking
        const enriched = (rankData || []).map(r => ({
          ...r,
          _username: profileMap[r.user_id]?.username || r.user_id.slice(0, 8),
          _display_name: profileMap[r.user_id]?.display_name || profileMap[r.user_id]?.username || 'Unknown'
        }));
        setRankings(enriched);
      } catch (e) { setRankings([]); }
      finally { setLoading(false); }
    }
    fetchRankings();
  }, [selectedRace, raceType]);

  // Group rankings by user
  const userRankings = {};
  const userDisplayNames = {};
  rankings.forEach(r => {
    const username = r._username;
    const displayName = r._display_name;
    if (!userRankings[username]) userRankings[username] = {};
    userRankings[username][r.position] = r.driver_id;
    userDisplayNames[username] = displayName;
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
        <div class="table-wrapper rankings-user-table">
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
        // Fetch all profiles
        const { data: profiles } = await supabase.from('profiles')
          .select('id, username, display_name, favorite_team');

        // Fetch all rankings
        const { data: allRankings } = await supabase.from('rankings')
          .select('user_id, race_id, position, driver_id, race_type');

        // Fetch all actual results
        const { data: actualResults } = await supabase.from('actual_results')
          .select('race_id, position, driver_id, race_type');

        // Build leaderboard
        const board = (profiles || []).map(profile => {
          const userRankings = (allRankings || []).filter(r => r.user_id === profile.id);
          const raceKeys = new Set(userRankings.map(r => `${r.race_id}|${r.race_type}`));
          const racesRanked = raceKeys.size;
          const acc = computeAccuracy(userRankings, actualResults || []);

          return {
            username: profile.username,
            display_name: profile.display_name,
            favorite_team: profile.favorite_team,
            races_ranked: racesRanked,
            accuracy: acc
          };
        }).filter(e => e.races_ranked > 0);

        // Sort: users with accuracy first (by accuracy desc), then users without accuracy (by races_ranked desc)
        board.sort((a, b) => {
          const aHas = a.accuracy && a.accuracy.accuracy !== null;
          const bHas = b.accuracy && b.accuracy.accuracy !== null;
          if (aHas && bHas) return b.accuracy.accuracy - a.accuracy.accuracy;
          if (aHas) return -1;
          if (bHas) return 1;
          return b.races_ranked - a.races_ranked;
        });

        setLeaderboard(board);
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
        // Fetch all rankings
        const { data: allRankings } = await supabase.from('rankings')
          .select('position, driver_id, race_id, user_id, race_type');

        // Compute driver standings
        const driverPoints = {};
        (allRankings || []).forEach(r => {
          const pts = r.race_type === 'sprint'
            ? (SPRINT_POINTS[r.position - 1] || 0)
            : (POINTS[r.position - 1] || 0);
          driverPoints[r.driver_id] = (driverPoints[r.driver_id] || 0) + pts;
        });

        const drivers = Object.entries(driverPoints)
          .map(([driver_id, points]) => ({ driver_id: Number(driver_id), points }))
          .sort((a, b) => b.points - a.points);

        // Compute constructor standings
        const constructorPoints = {};
        drivers.forEach(d => {
          const driver = getDriver(d.driver_id);
          if (driver) {
            constructorPoints[driver.team] = (constructorPoints[driver.team] || 0) + d.points;
          }
        });

        const constructors = Object.entries(constructorPoints)
          .map(([team_id, points]) => ({ team_id, points }))
          .sort((a, b) => b.points - a.points);

        setData({ drivers, constructors });
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
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Load profile from Supabase — auto-create if missing (fallback for trigger failure)
  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) {
        setProfile(data);
        return;
      }
      // Profile missing — auto-create from user metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setProfile(null); return; }
      const meta = user.user_metadata || {};
      const username = meta.username || user.email?.split('@')[0] || `user_${userId.slice(0, 8)}`;
      const display_name = meta.display_name || meta.username || user.email?.split('@')[0] || 'User';
      const { data: newProfile, error: insertErr } = await supabase.from('profiles')
        .insert({ id: userId, username, display_name })
        .select()
        .single();
      if (insertErr) {
        // If insert fails due to duplicate username, try with suffix
        if (insertErr.message?.includes('duplicate') || insertErr.code === '23505') {
          const fallbackUsername = `${username}_${userId.slice(0, 6)}`;
          const { data: retryProfile } = await supabase.from('profiles')
            .insert({ id: userId, username: fallbackUsername, display_name })
            .select()
            .single();
          setProfile(retryProfile || null);
        } else {
          console.error('Profile creation failed:', insertErr);
          setProfile(null);
        }
      } else {
        setProfile(newProfile);
      }
    } catch (e) {
      console.error('loadProfile error:', e);
      setProfile(null);
    }
  }, []);

  // Initialize session and listen for auth changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        loadProfile(s.user.id);
      }
      setAuthLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s) {
        loadProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const authValue = { session, profile, logout, loading: authLoading };

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
              F1 RANK 2026 — Not affiliated with Formula 1.
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
