import { html, supabase, useEffect, useMemo, useState } from '../lib/core.mjs';
import { loadRankingsWithProfiles } from '../lib/app-utils.mjs';
import {
  buildConsensusSnapshot,
  computeAccuracy,
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
  const [actualResults, setActualResults] = useState([]);
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
        const [data, resultsResponse] = await Promise.all([
          loadRankingsWithProfiles(selectedRace, raceType),
          supabase
            .from('actual_results')
            .select('race_id, position, driver_id, race_type')
            .eq('race_id', selectedRace)
            .eq('race_type', raceType)
            .order('position'),
        ]);
        if (!cancelled) {
          setRankings(data);
          setActualResults(resultsResponse.data || []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setRankings([]);
          setActualResults([]);
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
  const hasResults = actualResults.length > 0;

  const userAccuracyMap = useMemo(() => {
    if (!hasResults) return {};

    const map = {};
    const byUser = {};

    rankings.forEach((ranking) => {
      if (!byUser[ranking._username]) byUser[ranking._username] = [];
      byUser[ranking._username].push({
        race_id: selectedRace,
        race_type: raceType,
        position: ranking.position,
        driver_id: Number(ranking.driver_id),
      });
    });

    Object.entries(byUser).forEach(([username, userPicks]) => {
      const result = computeAccuracy(userPicks, actualResults);
      map[username] = result;
    });

    return map;
  }, [actualResults, hasResults, rankings, raceType, selectedRace]);

  const consensusSnapshot = useMemo(
    () => buildConsensusSnapshot(rankings, raceType),
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
                      <th style=${{ textAlign: 'right' }}>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${users.map((user) => {
                      const accuracy = userAccuracyMap[user];

                      return html`<tr key=${user}>
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
                        <td style=${{ textAlign: 'right' }}>
                          ${accuracy
                            ? html`<span class="rankings-accuracy-badge">
                                ${accuracy.accuracy}%
                              </span>`
                            : html`<span style=${{
                                color: 'var(--color-text-faint)',
                                fontSize: 'var(--text-xs)',
                              }}>
                                Pending
                              </span>`}
                        </td>
                      </tr>`;
                    })}
                  </tbody>
                </table>
              </div>

              ${consensusSnapshot.entries.length > 0 &&
              html`<div class="consensus-section">
                <h3 class="consensus-title">
                  Consensus Power Rankings${raceType === 'sprint' ? ' - Sprint' : ''}
                </h3>
                <p class="consensus-copy">
                  Power is normalized to 100 using official F1 points from every submitted ballot.
                  ${consensusSnapshot.ballotCount} ballot${consensusSnapshot.ballotCount !== 1 ? 's' : ''} submitted.
                </p>
                <div class="power-rankings-list">
                  ${consensusSnapshot.entries
                    .slice(0, consensusSnapshot.positionsLimit)
                    .map((entry, index) => {
                      const driver = getDriver(entry.driverId);
                      const team = driver ? getTeam(driver.team) : null;
                      const barWidth = Math.max(entry.powerRating, 4);

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
                        <div class="power-rank-metrics">
                          <span class="power-rank-metric" title="Power rating">
                            ${entry.powerRating.toFixed(1)}
                          </span>
                          <span class="power-rank-metric" title="Podium share">
                            ${entry.podiumShare}% pod
                          </span>
                          <span class="power-rank-metric" title="Win share">
                            ${entry.winShare}% win
                          </span>
                          <span class="power-rank-metric" title="Average predicted position">
                            P${entry.avgPosition !== null ? entry.avgPosition : '-'}
                          </span>
                        </div>
                      </div>`;
                    })}
                </div>
              </div>`}
            </div>`}
  </div>`;
}
