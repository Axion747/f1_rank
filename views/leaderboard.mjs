import { html, supabase, useEffect, useState } from '../lib/core.mjs';
import { loadLeaderboardSummary } from '../lib/app-utils.mjs';
import { buildProfileSummary, getTeam } from '../lib/f1-utils.mjs';
import { InlineMessage, Spinner, TeamDot, TrophyIcon, UsernameLink } from '../components/app-components.mjs';

async function loadFallbackLeaderboard() {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, display_name, favorite_team, created_at');
  if (profilesError) throw profilesError;

  const { data: rankings, error: rankingsError } = await supabase
    .from('rankings')
    .select('user_id, race_id, position, driver_id, race_type');
  if (rankingsError) throw rankingsError;

  const { data: actualResults, error: resultsError } = await supabase
    .from('actual_results')
    .select('race_id, position, driver_id, race_type');
  if (resultsError) throw resultsError;

  return (profiles || [])
    .map((profile) => {
      const summary = buildProfileSummary(
        profile,
        (rankings || []).filter((row) => row.user_id === profile.id),
        actualResults || [],
      );
      return {
        username: summary.username,
        display_name: summary.display_name,
        favorite_team: summary.favorite_team,
        races_ranked: summary.races_ranked,
        scored_events: summary.scored_events,
        accuracy: summary.accuracy?.accuracy ?? null,
        total_correct: summary.accuracy?.total_correct ?? null,
        total_predictions: summary.accuracy?.total_predictions ?? null,
        position_diff_avg: summary.accuracy?.position_diff_avg ?? null,
      };
    })
    .filter((entry) => entry.races_ranked > 0)
    .sort((left, right) => {
      if (left.accuracy !== null && right.accuracy !== null) {
        return right.accuracy - left.accuracy;
      }
      if (left.accuracy !== null) return -1;
      if (right.accuracy !== null) return 1;
      return right.races_ranked - left.races_ranked;
    });
}

export function LeaderboardView() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoading(true);
      setError('');
      try {
        const data = await loadLeaderboardSummary();
        if (!cancelled) setLeaderboard(data || []);
      } catch (rpcError) {
        try {
          const fallback = await loadFallbackLeaderboard();
          if (!cancelled) setLeaderboard(fallback);
        } catch (fallbackError) {
          if (!cancelled) {
            setLeaderboard([]);
            setError(
              fallbackError.message || 'Unable to load leaderboard data right now.',
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLeaderboard();
    return () => {
      cancelled = true;
    };
  }, []);

  return html`<div>
    <div class="page-header">
      <h1 class="page-title">Leaderboard</h1>
      <p class="page-subtitle">
        Accuracy is based on exact driver-position matches once official race results exist.
      </p>
    </div>

    <div class="page-note">
      Users with official scored events rank by accuracy first. Entries without completed
      results stay visible and are marked as pending. Official results are stored
      separately and are no longer writable by regular signed-in users.
    </div>

    ${loading
      ? html`<${Spinner} />`
      : error
        ? html`<${InlineMessage} title="Leaderboard unavailable" text=${error} />`
        : leaderboard.length === 0
          ? html`<div class="empty-state">
              <div class="empty-state-icon"><${TrophyIcon} /></div>
              <h3 class="empty-state-title">No leaderboard data yet</h3>
              <p class="empty-state-text">
                Submit picks and wait for official results to see the standings come alive.
              </p>
            </div>`
          : html`<div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style=${{ width: '60px' }}>Rank</th>
                    <th>User</th>
                    <th>Team</th>
                    <th>Events</th>
                    <th>Accuracy</th>
                    <th style=${{ textAlign: 'right' }}>Avg Diff</th>
                  </tr>
                </thead>
                <tbody>
                  ${leaderboard.map((entry, index) => {
                    const rank = index + 1;
                    const favoriteTeam = entry.favorite_team ? getTeam(entry.favorite_team) : null;
                    const hasAccuracy = entry.accuracy !== null && entry.accuracy !== undefined;

                    return html`<tr key=${entry.username}>
                      <td style=${{ textAlign: 'center' }}>
                        ${rank <= 3
                          ? html`<span class=${`leaderboard-rank-badge leaderboard-rank-${rank}`}>
                              ${rank}
                            </span>`
                          : html`<span class="pos-cell">${rank}</span>`}
                      </td>
                      <td>
                        <${UsernameLink}
                          username=${entry.username}
                          displayName=${entry.display_name}
                        />
                      </td>
                      <td>
                        ${favoriteTeam
                          ? html`<span class="driver-cell">
                              <${TeamDot} teamId=${favoriteTeam.id} size=${8} />
                              <span
                                style=${{
                                  fontSize: 'var(--text-xs)',
                                  color: 'var(--color-text-muted)',
                                }}
                              >
                                ${favoriteTeam.name}
                              </span>
                            </span>`
                          : html`<span style=${{ color: 'var(--color-text-faint)' }}>-</span>`}
                      </td>
                      <td style=${{ color: 'var(--color-text-muted)' }}>
                        ${entry.scored_events || 0} / ${entry.races_ranked}
                      </td>
                      <td>
                        ${hasAccuracy
                          ? html`<div class="accuracy-bar-wrapper">
                              <div class="accuracy-bar">
                                <div
                                  class="accuracy-bar-fill"
                                  style=${{
                                    width: `${Math.min(entry.accuracy, 100)}%`,
                                  }}
                                ></div>
                              </div>
                              <span class="accuracy-bar-text">${entry.accuracy}%</span>
                            </div>`
                          : html`<span
                              style=${{
                                color: 'var(--color-text-faint)',
                                fontSize: 'var(--text-xs)',
                              }}
                            >
                              Pending
                            </span>`}
                      </td>
                      <td
                        style=${{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        ${hasAccuracy ? entry.position_diff_avg : '-'}
                      </td>
                    </tr>`;
                  })}
                </tbody>
              </table>
            </div>`}
  </div>`;
}
