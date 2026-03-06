import { html, useMemo, useState } from '../lib/core.mjs';
import { useAuth } from '../lib/app-utils.mjs';
import { RACES } from '../data/f1-data.mjs';
import {
  formatDateTime,
  formatRelativeDeadline,
  getNextPredictionDeadline,
  getRace,
  getRaceCardStatus,
  getSeasonContext,
} from '../lib/f1-utils.mjs';
import { CalendarIcon, LocationIcon } from '../components/app-components.mjs';
import { RaceDetailModal } from '../components/app-shell.mjs';

function RaceCard({ race, onOpen, isFeatured }) {
  const status = getRaceCardStatus(race);
  const statusLabel =
    status === 'completed'
      ? 'Completed'
      : status === 'locked'
        ? 'Race locked'
        : 'Picks open';

  return html`<button
    class=${`race-card race-card--clickable ${isFeatured ? 'race-card--featured' : ''}`}
    onClick=${onOpen}
    type="button"
    aria-label="Open ${race.name} details"
  >
    <div class="race-card-header">
      <span class="race-round">R${String(race.round).padStart(2, '0')}</span>
      <div class="race-card-badges">
        ${race.sprint && html`<span class="sprint-badge">Sprint</span>`}
        <span class=${`race-status-badge race-status-${status}`}>${statusLabel}</span>
      </div>
    </div>
    <h3 class="race-name">${race.name}</h3>
    <div class="race-details">
      <span class="race-detail"><${LocationIcon} /> ${race.location}</span>
      <span class="race-detail"><${CalendarIcon} /> ${race.race_date_label}</span>
    </div>
  </button>`;
}

export function CalendarView() {
  const auth = useAuth();
  const [activeRace, setActiveRace] = useState(null);

  const seasonContext = useMemo(() => getSeasonContext(), []);
  const nextDeadline = useMemo(() => getNextPredictionDeadline(), []);
  const nextRace = nextDeadline ? getRace(nextDeadline.raceId) : seasonContext.nextRace;
  const nextRaceName = nextRace?.name || seasonContext.nextRace?.name || 'Season complete';

  return html`<div>
    <section class="hero-card">
      <div class="hero-copy">
        <div class="hero-kicker">Private Prediction Pool</div>
        <h1 class="hero-title">Make each race weekend feel consequential.</h1>
        <p class="hero-subtitle">
          Pick the top finishers for every 2026 Formula 1 round, compare your calls
          with your group, and let official results settle the leaderboard.
        </p>
      </div>

      <div class="hero-meta-grid">
        <div class="hero-meta-card">
          <span class="hero-meta-label">Current round</span>
          <span class="hero-meta-value">R${String(seasonContext.currentRound).padStart(2, '0')}</span>
        </div>
        <div class="hero-meta-card">
          <span class="hero-meta-label">Next lock</span>
          <span class="hero-meta-value">${nextDeadline ? nextRaceName : 'Season complete'}</span>
          ${nextDeadline &&
          html`<span class="hero-meta-note">
            ${formatDateTime(nextDeadline.startsAt)} - ${formatRelativeDeadline(nextDeadline.startsAt)}
          </span>`}
        </div>
        <div class="hero-meta-card">
          <span class="hero-meta-label">Your status</span>
          <span class="hero-meta-value">
            ${auth.session ? 'Signed in' : 'Guest'}
          </span>
          <span class="hero-meta-note">
            ${auth.session
              ? 'Open a race and lock in your picks.'
              : 'Sign in when you want your predictions saved.'}
          </span>
        </div>
      </div>

      <div class="hero-actions">
        <button
          class="btn btn-primary btn-lg"
          onClick=${() => nextRace && setActiveRace(nextRace)}
          disabled=${!nextRace}
        >
          Submit Picks
        </button>
        <a class="btn btn-secondary btn-lg" href="#/leaderboard">
          View Leaderboard
        </a>
      </div>
    </section>

    <div class="page-header page-header--compact">
      <h2 class="page-title">2026 Race Calendar</h2>
      <p class="page-subtitle">
        Every card opens sessions, market context, and prediction entry for that weekend.
      </p>
    </div>

    <div class="card-grid">
      ${seasonContext.nextRace &&
      html`<${RaceCard}
        key=${seasonContext.nextRace.id}
        race=${seasonContext.nextRace}
        isFeatured=${true}
        onOpen=${() => setActiveRace(seasonContext.nextRace)}
      />`}
      ${RACES.filter((race) => race.id !== seasonContext.nextRace?.id).map(
        (race) => html`<${RaceCard}
          key=${race.id}
          race=${race}
          isFeatured=${false}
          onOpen=${() => setActiveRace(race)}
        />`,
      )}
    </div>

    ${activeRace &&
    html`<${RaceDetailModal} race=${activeRace} onClose=${() => setActiveRace(null)} />`}
  </div>`;
}
