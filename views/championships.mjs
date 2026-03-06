import { html, supabase, useEffect, useState } from '../lib/core.mjs';
import {
  loadConstructorChampionshipSummary,
  loadDriverChampionshipSummary,
} from '../lib/app-utils.mjs';
import { computeChampionshipData, getDriver, getTeam } from '../lib/f1-utils.mjs';
import { InlineMessage, Spinner, TeamDot, TrophyIcon } from '../components/app-components.mjs';

async function loadFallbackChampionships() {
  const { data: rankings, error } = await supabase
    .from('rankings')
    .select('position, driver_id, race_type');
  if (error) throw error;
  return computeChampionshipData(rankings || []);
}

function DriversStandings({ drivers }) {
  return html`<div class="table-wrapper">
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
        ${drivers.map((entry, index) => {
          const driver = getDriver(entry.driver_id);
          const team = driver ? getTeam(driver.team) : null;
          return html`<tr key=${entry.driver_id}>
            <td class=${`pos-cell ${index < 3 ? `pos-${index + 1}` : ''}`}>${index + 1}</td>
            <td>
              <span class="driver-cell">
                ${team && html`<${TeamDot} teamId=${driver.team} />`}
                <span>${driver ? driver.name : `Driver ${entry.driver_id}`}</span>
                ${driver && html`<span class="driver-number">#${driver.number}</span>`}
              </span>
            </td>
            <td style=${{ color: team ? team.color : 'var(--color-text-muted)' }}>
              ${team ? team.name : '-'}
            </td>
            <td class="points-cell" style=${{ textAlign: 'right' }}>${entry.points}</td>
          </tr>`;
        })}
      </tbody>
    </table>
  </div>`;
}

function ConstructorsStandings({ constructors }) {
  return html`<div class="table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          <th style=${{ width: '60px' }}>Pos</th>
          <th>Team</th>
          <th style=${{ textAlign: 'right' }}>Points</th>
        </tr>
      </thead>
      <tbody>
        ${constructors.map((entry, index) => {
          const team = getTeam(entry.team_id);
          return html`<tr key=${entry.team_id}>
            <td class=${`pos-cell ${index < 3 ? `pos-${index + 1}` : ''}`}>${index + 1}</td>
            <td>
              <span class="driver-cell">
                <span
                  class="constructor-color-bar"
                  style=${{ backgroundColor: team.color }}
                ></span>
                <span style=${{ fontWeight: 600 }}>${team.name}</span>
              </span>
            </td>
            <td class="points-cell" style=${{ textAlign: 'right' }}>${entry.points}</td>
          </tr>`;
        })}
      </tbody>
    </table>
  </div>`;
}

export function ChampionshipsView() {
  const [tab, setTab] = useState('drivers');
  const [data, setData] = useState({ drivers: [], constructors: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchStandings() {
      setLoading(true);
      setError('');
      try {
        const [drivers, constructors] = await Promise.all([
          loadDriverChampionshipSummary(),
          loadConstructorChampionshipSummary(),
        ]);
        if (!cancelled) setData({ drivers: drivers || [], constructors: constructors || [] });
      } catch (rpcError) {
        try {
          const fallback = await loadFallbackChampionships();
          if (!cancelled) setData(fallback);
        } catch (fallbackError) {
          if (!cancelled) {
            setData({ drivers: [], constructors: [] });
            setError(fallbackError.message || 'Unable to load standings.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStandings();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasData =
    tab === 'drivers' ? data.drivers.length > 0 : data.constructors.length > 0;

  return html`<div>
    <div class="page-header">
      <h1 class="page-title">Championship Standings</h1>
      <p class="page-subtitle">
        Consensus points based on every submitted ballot, using official F1 points scoring.
      </p>
    </div>

    <div class="page-note">
      These standings represent the group's collective predictions, not official FIA results.
    </div>

    <div style=${{ marginBottom: 'var(--space-6)' }}>
      <div class="pill-tabs">
        <button
          class=${`pill-tab ${tab === 'drivers' ? 'active' : ''}`}
          onClick=${() => setTab('drivers')}
        >
          Drivers
        </button>
        <button
          class=${`pill-tab ${tab === 'constructors' ? 'active' : ''}`}
          onClick=${() => setTab('constructors')}
        >
          Constructors
        </button>
      </div>
    </div>

    ${loading
      ? html`<${Spinner} />`
      : error
        ? html`<${InlineMessage} title="Standings unavailable" text=${error} />`
        : !hasData
          ? html`<div class="empty-state">
              <div class="empty-state-icon"><${TrophyIcon} /></div>
              <h3 class="empty-state-title">No championship data yet</h3>
              <p class="empty-state-text">
                Submit some predictions to start building the season narrative.
              </p>
            </div>`
          : tab === 'drivers'
            ? html`<${DriversStandings} drivers=${data.drivers} />`
            : html`<${ConstructorsStandings} constructors=${data.constructors} />`}
  </div>`;
}
