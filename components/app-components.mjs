import {
  createPortal,
  html,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from '../lib/core.mjs';
import { RACES, DRIVERS } from '../data/f1-data.mjs';
import { ToastContext } from '../lib/app-utils.mjs';
import { getTeam } from '../lib/f1-utils.mjs';

function LocationIcon() {
  return html`<svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>`;
}

function CalendarIcon() {
  return html`<svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>`;
}

function MenuIcon() {
  return html`<svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
  >
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>`;
}

function CloseIcon() {
  return html`<svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;
}

function TrophyIcon({ size = 40 }) {
  return html`<svg
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    style=${{ display: 'inline-block' }}
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
  </svg>`;
}

function FlagIcon() {
  return html`<svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    style=${{ display: 'inline-block' }}
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
    <line x1="4" y1="22" x2="4" y2="15"></line>
  </svg>`;
}

function UserIcon({ size = 16 }) {
  return html`<svg
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>`;
}

function ChevronDownIcon() {
  return html`<svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M6 9l6 6 6-6"></path>
  </svg>`;
}

function TeamDot({ teamId, size = 10 }) {
  const team = getTeam(teamId);
  return html`<span
    class="team-dot"
    style=${{ backgroundColor: team.color, width: size, height: size }}
  ></span>`;
}

function Spinner() {
  return html`<div class="spinner" aria-label="Loading"></div>`;
}

function InlineMessage({ title, text, action }) {
  return html`<div class="inline-message">
    <h3 class="inline-message-title">${title}</h3>
    ${text && html`<p class="inline-message-text">${text}</p>`}
    ${action || null}
  </div>`;
}

function getDropdownPosition(triggerNode, dropdownHeight = 320, minWidth = 320) {
  const rect = triggerNode.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const flipped = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

  if (flipped) {
    return {
      bottom: `${window.innerHeight - rect.top + 4}px`,
      left: `${rect.left}px`,
      width: `${Math.max(rect.width, minWidth)}px`,
      top: 'auto',
      flipped: true,
    };
  }

  return {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, minWidth)}px`,
    flipped: false,
  };
}

function findNavigableIndex(items, startIndex, direction, isDisabled) {
  if (!items.length) return -1;

  let index = startIndex;
  for (let count = 0; count < items.length; count += 1) {
    index =
      index < 0
        ? direction > 0
          ? 0
          : items.length - 1
        : (index + direction + items.length) % items.length;

    if (!isDisabled(items[index], index)) return index;
  }

  return -1;
}

function usePortalDropdown({
  isOpen,
  triggerRef,
  dropdownHeight,
  minWidth = 320,
  onClose,
}) {
  const [dropdownPos, setDropdownPos] = useState({
    top: '0px',
    left: '0px',
    width: `${minWidth}px`,
    flipped: false,
  });
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return undefined;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      setDropdownPos(
        getDropdownPosition(triggerRef.current, dropdownHeight, minWidth),
      );
    };

    const handleClick = (event) => {
      const target = event.target;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handleClick);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [dropdownHeight, isOpen, minWidth, onClose, triggerRef]);

  return { dropdownPos, dropdownRef };
}

function DriverSelect({
  value,
  onChange,
  disabledIds = [],
  placeholder = 'Select driver...',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const listIdRef = useRef(`driver-select-${Math.random().toString(36).slice(2)}`);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setActiveIndex(-1);
  }, []);

  const { dropdownPos, dropdownRef } = usePortalDropdown({
    isOpen,
    triggerRef,
    dropdownHeight: 280,
    minWidth: 280,
    onClose: close,
  });

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return DRIVERS;
    const query = search.toLowerCase();
    return DRIVERS.filter((driver) => {
      const team = getTeam(driver.team);
      return (
        driver.name.toLowerCase().includes(query) ||
        team.name.toLowerCase().includes(query) ||
        String(driver.number).includes(query)
      );
    });
  }, [search]);

  const isOptionDisabled = useCallback(
    (driver) =>
      disabledIds.includes(String(driver.id)) && String(driver.id) !== String(value),
    [disabledIds, value],
  );

  const selectedDriver = value
    ? DRIVERS.find((driver) => String(driver.id) === String(value))
    : null;
  const selectedTeam = selectedDriver ? getTeam(selectedDriver.team) : null;

  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = filteredDrivers.findIndex(
      (driver) => String(driver.id) === String(value) && !isOptionDisabled(driver),
    );
    const initialIndex =
      selectedIndex >= 0
        ? selectedIndex
        : findNavigableIndex(filteredDrivers, -1, 1, isOptionDisabled);
    setActiveIndex(initialIndex);
  }, [filteredDrivers, isOpen, isOptionDisabled, value]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listRef.current) return;
    listRef.current
      .querySelector(`#driver-option-${filteredDrivers[activeIndex]?.id}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, filteredDrivers, isOpen]);

  const handleSelect = useCallback(
    (driverId) => {
      if (disabled) return;
      onChange(driverId);
      close();
    },
    [close, disabled, onChange],
  );

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      triggerRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) =>
        findNavigableIndex(filteredDrivers, current, 1, isOptionDisabled),
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        findNavigableIndex(filteredDrivers, current, -1, isOptionDisabled),
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const driver = filteredDrivers[activeIndex];
      if (driver && !isOptionDisabled(driver)) {
        handleSelect(String(driver.id));
      }
    }
  };

  const dropdownContent =
    isOpen &&
    createPortal(
      html`<div
        class=${`ds-dropdown ds-dropdown--portal ${dropdownPos.flipped ? 'ds-dropdown--flipped' : ''}`}
        ref=${dropdownRef}
        style=${dropdownPos}
      >
        <div class="ds-search-wrap">
          <input
            ref=${searchRef}
            class="ds-search"
            type="text"
            placeholder="Search drivers..."
            value=${search}
            onInput=${(event) => setSearch(event.target.value)}
            onKeyDown=${handleSearchKeyDown}
            aria-controls=${listIdRef.current}
          />
        </div>
        <div class="ds-list" id=${listIdRef.current} ref=${listRef} role="listbox">
          ${filteredDrivers.length === 0
            ? html`<div class="ds-empty">No drivers found</div>`
            : filteredDrivers.map((driver, index) => {
                const team = getTeam(driver.team);
                const disabledOption = isOptionDisabled(driver);
                const isSelected = String(value) === String(driver.id);
                const isHighlighted = activeIndex === index;

                return html`<button
                  key=${driver.id}
                  id=${`driver-option-${driver.id}`}
                  type="button"
                  class=${`ds-option ${isSelected ? 'ds-option--active' : ''} ${disabledOption ? 'ds-option--disabled' : ''} ${isHighlighted ? 'ds-option--highlighted' : ''}`}
                  onMouseEnter=${() => setActiveIndex(index)}
                  onClick=${() => !disabledOption && handleSelect(String(driver.id))}
                  disabled=${disabledOption}
                  role="option"
                  aria-selected=${isSelected}
                >
                  <span class="ds-option-left">
                    <span
                      class="ds-color-dot"
                      style=${{ backgroundColor: team.color }}
                    ></span>
                    <span class="ds-option-name">${driver.name}</span>
                  </span>
                  <span class="ds-option-right">
                    <span class="ds-option-team">${team.name}</span>
                    <span class="ds-option-number">#${driver.number}</span>
                  </span>
                </button>`;
              })}
        </div>
      </div>`,
      document.body,
    );

  return html`<div class="ds-container">
    <button
      type="button"
      ref=${triggerRef}
      class=${`ds-trigger ${isOpen ? 'ds-trigger--open' : ''} ${value ? 'ds-trigger--filled' : ''}`}
      onClick=${() => !disabled && setIsOpen((current) => !current)}
      onKeyDown=${(event) => {
        if (disabled) return;
        if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
          event.preventDefault();
          setIsOpen(true);
        }
      }}
      aria-haspopup="listbox"
      aria-expanded=${isOpen}
      aria-controls=${listIdRef.current}
      disabled=${disabled}
    >
      ${selectedDriver
        ? html`<span class="ds-trigger-value">
            <span
              class="ds-color-dot"
              style=${{ backgroundColor: selectedTeam.color }}
            ></span>
            <span class="ds-trigger-name">${selectedDriver.name}</span>
            <span class="ds-trigger-team">${selectedTeam.name}</span>
          </span>`
        : html`<span class="ds-trigger-placeholder">${placeholder}</span>`}
      <span class="ds-trigger-icons">
        ${value &&
        !disabled &&
        html`<button
          type="button"
          class="ds-clear-btn"
          onClick=${(event) => {
            event.stopPropagation();
            onChange('');
          }}
          aria-label="Clear selection"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>`}
        <span class=${`ds-chevron ${isOpen ? 'ds-chevron--open' : ''}`}>
          <${ChevronDownIcon} />
        </span>
      </span>
    </button>
    ${dropdownContent}
  </div>`;
}

function RaceSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const listIdRef = useRef(`race-select-${Math.random().toString(36).slice(2)}`);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setActiveIndex(-1);
  }, []);

  const { dropdownPos, dropdownRef } = usePortalDropdown({
    isOpen,
    triggerRef,
    dropdownHeight: 320,
    minWidth: 320,
    onClose: close,
  });

  const filteredRaces = useMemo(() => {
    if (!search.trim()) return RACES;
    const query = search.toLowerCase();
    return RACES.filter(
      (race) =>
        race.name.toLowerCase().includes(query) ||
        race.location.toLowerCase().includes(query) ||
        String(race.round).includes(query),
    );
  }, [search]);

  const selectedRace = value ? RACES.find((race) => race.id === value) : null;

  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = filteredRaces.findIndex((race) => race.id === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [filteredRaces, isOpen, value]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listRef.current) return;
    listRef.current
      .querySelector(`#race-option-${filteredRaces[activeIndex]?.id}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, filteredRaces, isOpen]);

  const handleSelect = useCallback(
    (raceId) => {
      onChange(raceId);
      close();
    },
    [close, onChange],
  );

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      triggerRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) =>
        findNavigableIndex(filteredRaces, current, 1, () => false),
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        findNavigableIndex(filteredRaces, current, -1, () => false),
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const race = filteredRaces[activeIndex];
      if (race) handleSelect(race.id);
    }
  };

  const dropdownContent =
    isOpen &&
    createPortal(
      html`<div
        class=${`rs-dropdown ${dropdownPos.flipped ? 'rs-dropdown--flipped' : ''}`}
        ref=${dropdownRef}
        style=${dropdownPos}
      >
        <div class="rs-search-wrap">
          <input
            ref=${searchRef}
            class="rs-search"
            type="text"
            placeholder="Search races..."
            value=${search}
            onInput=${(event) => setSearch(event.target.value)}
            onKeyDown=${handleSearchKeyDown}
            aria-controls=${listIdRef.current}
          />
        </div>
        <div class="rs-list" id=${listIdRef.current} ref=${listRef} role="listbox">
          ${filteredRaces.length === 0
            ? html`<div class="rs-empty">No races found</div>`
            : filteredRaces.map((race, index) => {
                const isSelected = race.id === value;
                const isHighlighted = index === activeIndex;
                return html`<button
                  key=${race.id}
                  id=${`race-option-${race.id}`}
                  type="button"
                  class=${`rs-option ${isSelected ? 'rs-option--active' : ''} ${isHighlighted ? 'rs-option--highlighted' : ''}`}
                  onMouseEnter=${() => setActiveIndex(index)}
                  onClick=${() => handleSelect(race.id)}
                  role="option"
                  aria-selected=${isSelected}
                >
                  <span class="rs-option-round">R${String(race.round).padStart(2, '0')}</span>
                  <span class="rs-option-name">${race.name}</span>
                  ${race.sprint &&
                  html`<span class="rs-option-sprint"
                    ><span class="sprint-badge">Sprint</span></span
                  >`}
                </button>`;
              })}
        </div>
      </div>`,
      document.body,
    );

  return html`<div class="rs-container">
    <button
      type="button"
      ref=${triggerRef}
      class=${`rs-trigger ${isOpen ? 'rs-trigger--open' : ''}`}
      onClick=${() => setIsOpen((current) => !current)}
      onKeyDown=${(event) => {
        if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
          event.preventDefault();
          setIsOpen(true);
        }
      }}
      aria-haspopup="listbox"
      aria-expanded=${isOpen}
      aria-controls=${listIdRef.current}
    >
      ${selectedRace
        ? html`<span class="rs-trigger-value">
            <span class="rs-trigger-round">R${String(selectedRace.round).padStart(2, '0')}</span>
            <span class="rs-trigger-name">${selectedRace.name}</span>
            ${selectedRace.sprint &&
            html`<span class="sprint-badge rs-trigger-badge">Sprint</span>`}
          </span>`
        : html`<span class="rs-trigger-placeholder">Select race...</span>`}
      <span class="rs-trigger-icons">
        <span class=${`rs-chevron ${isOpen ? 'rs-chevron--open' : ''}`}>
          <${ChevronDownIcon} />
        </span>
      </span>
    </button>
    ${dropdownContent}
  </div>`;
}

function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    window.clearTimeout(timerRef.current);
    setToast({ message, type, show: true });
    timerRef.current = window.setTimeout(() => {
      setToast((current) => (current ? { ...current, show: false } : null));
      window.setTimeout(() => setToast(null), 300);
    }, 3000);
  }, []);

  return html`<${ToastContext.Provider} value=${showToast}>
    ${children}
    ${toast &&
    html`<div class=${`toast toast-${toast.type} ${toast.show ? 'show' : ''}`}>
      ${toast.message}
    </div>`}
  <//>`;
}

function UsernameLink({ username, displayName }) {
  return html`<a class="username-link" href=${`#/profile/${username}`}>
    ${displayName || username}
  </a>`;
}

export {
  CalendarIcon,
  CloseIcon,
  DriverSelect,
  FlagIcon,
  InlineMessage,
  LocationIcon,
  MenuIcon,
  RaceSelect,
  Spinner,
  TeamDot,
  ToastProvider,
  TrophyIcon,
  UserIcon,
  UsernameLink,
};
