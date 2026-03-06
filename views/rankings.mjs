import { html, useEffect, useMemo, useState } from '../lib/core.mjs';
import { loadRankingsWithProfiles } from '../lib/app-utils.mjs';
import {
  computePowerScores,
  getDriver,
  getRace,
  getSeasonContext,
  getTeam,
} from '../lib/f1-utils.mjs';
import {
  FlagIcon,
  InlineMessage,
  RaceSelect,
  Spinner,
  TeamDot,
  UsernameLink,
} from '../components/app-components.mjs';

export function RankingsView() {
  const [selectedRace, setSelectedRace] = useState(() => getSeasonContext().nextRace.id);
  const [raceType, setRaceType] = useState('race');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const race = getRace(selectedRace);

  useEffect(() => {
    if (race && !race.sprint) setRaceType('race');
  }, [race]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRankings() {
      setLoading(true);
      setError('');
      try {
        const data = await loadRankingsWithProfiles(selectedRace, raceType);
        if (!cancelled) setRankings(data);
      } catch (fetchError) {
        if (!cancelled) {
          setRankings([]);
          setError(fetchError.message || 'Unable to load rankings right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRankings();
    return () => {
      cancelled = true;
    };
  }, [raceType, selectedRace]);

  const userRankings = {};
  const userDisplayNames = {};
  rankings.forEach((ranking) => {
    if (!userRankings[ranking._username]) userRankings[ranking._username] = {};
    userRankings[ranking._username][ranking.position] = ranking.driver_id;
    userDisplayNames[ranking._username] = ranking._display_name;
  });

  const users = Object.keys(userRankings);
  const numPositions = raceType === 'sprint' ? 8 : 10;
  const powerScores = useMemo(
    () => computePowerScores(rankings, raceType),
    [rankings, raceType],
  );

  return html`<div>
    <div class="page-header">
      <h1 class="page-title">Rankings</h1>
      <p class="page-subtitle">
        Compare everyone's picks for each race. Consensus rankings weight each position
        using official F1 points.
      </p>
    </div>

    <div class="page-note">
      Predictions shown here are live submissions from your group. Race and sprint views
      switch independently so locked sessions stay readable without confusion.
    </div>

    <div class="race-select-header">
      <${RaceSelect} value=${selectedRace} onChange=${(id) => setSelectedRace(id)} />
    </div>

    ${race && race.sprint &&
    html`<div class="race-type-toggle">
      <span class="race-type-toggle-label">View:</span>
      <div class="pill-tabs">
        <button
          class=${`pill-tab ${raceType === 'race' ? 'active' : ''}`}
          onClick=${() => setRaceType('race')}
        >
          Grand Prix
        </button>
        <button
          class=${`pill-tab ${raceType === 'sprint' ? 'active' : ''}`}
          onClick=${() => setRaceType('sprint')}
        >
          Sprint
        </button>
      </div>
    </div>`}

    ${loading
      ? html`<${Spinner} />`
      : error
        ? html`<${InlineMessage} title="Rankings unavailable" text=${error} />`
        : users.length === 0
          ? html`<div class="empty-state">
              <div class="empty-state-icon"><${FlagIcon} /></div>
              <h3 class="empty-state-title">No rankings yet</h3>
              <p class="empty-state-text">
                Be the first to submit your ${raceType === 'sprint' ? 'sprint' : 'Grand Prix'} picks for this round.
              </p>
            </div>`
          : html`<div>
              <div class="table-wrapper rankings-user-table">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      ${Array.from({ length: numPositions }, (_, index) => html`<th key=${index}>
                        P${index + 1}
                      </th>`)}
                    </tr>
                  </thead>
                  <tbody>
                    ${users.map((user) => html`<tr key=${user}>
                      <td>
                        <${UsernameLink}
                          username=${user}
                          displayName=${userDisplayNames[user]}
                        />
                      </td>
                      ${Array.from({ length: numPositions }, (_, index) => {
                        const driverId = userRankings[user][index + 1];
                        const driver = driverId ? getDriver(driverId) : null;

                        return html`<td key=${index}>
                          ${driver
                            ? html`<span class="driver-cell">
                                <${TeamDot} teamId=${driver.team} size=${8} />
                                <span style=${{ fontSize: 'var(--text-xs)' }}>
                                  ${driver.name.split(' ').pop()}
                                </span>
                              </span>`
                            : html`<span style=${{ color: 'var(--color-text-faint)' }}>-</span>`}
                        </td>`;
                      })}
                    </tr>`)}
                  </tbody>
                </table>
              </div>

              ${powerScores.length > 0 &&
              html`<div class="consensus-section">
                <h3 class="consensus-title">
                  Consensus Power Rankings${raceType === 'sprint' ? ' - Sprint' : ''}
                </h3>
                <p class="consensus-copy">
                  A score of 1000 means every submitted ballot ranked that driver first.
                </p>
                <div class="power-rankings-list">
                  ${powerScores.map((entry, index) => {
                    const driver = getDriver(entry.driverId);
                    const team = driver ? getTeam(driver.team) : null;
                    const barWidth = (entry.score / 1000) * 100;

                    return html`<div key=${entry.driverId} class="power-rank-row">
                      <div class="power-rank-pos">
                        <span class=${`power-rank-num ${index < 3 ? `power-top-${index + 1}` : ''}`}>
                          ${index + 1}
                        </span>
                      </div>
                      <div class="power-rank-driver">
                        ${team && html`<${TeamDot} teamId=${driver.team} size=${10} />`}
                        <span class="power-rank-name">${driver ? driver.name : 'Unknown'}</span>
                        <span class="power-rank-team">${team ? team.name : ''}</span>
                      </div>
                      <div class="power-rank-bar-wrapper">
                        <div
                          class="power-rank-bar"
                          style=${{
                            width: `${barWidth}%`,
                            background: team ? team.color : 'var(--color-primary)',
                          }}
                        ></div>
                      </div>
                      <div class="power-rank-score">${entry.score}</div>
                    </div>`;
                  })}
                </div>
              </div>`}
            </div>`}
  </div>`;
}
