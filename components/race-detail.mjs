import {
  html,
  supabase,
  useEffect,
  useMemo,
  useState,
} from '../lib/core.mjs';
import { fetchRaceSessions, openF1Fetch, useAuth, useDialog, useToast } from '../lib/app-utils.mjs';
import {
  formatDateTime,
  formatLapTime,
  formatRelativeDeadline,
  getDriverByNumber,
  getPredictionLock,
  getTeam,
} from '../lib/f1-utils.mjs';
import { AuthGate } from './auth.mjs';
import { BettingOddsTab } from './betting-odds.mjs';
import {
  CalendarIcon,
  CloseIcon,
  DriverSelect,
  InlineMessage,
  LocationIcon,
  Spinner,
  TeamDot,
} from './app-components.mjs';

function formatSessionDisplayName(session) {
  const raw = String(session?.session_name || session?.session_type || 'Session')
    .replace(/_/g, ' ')
    .trim();

  if (/sprint shootout|sprint qualifying|sprint qualifier/i.test(raw)) {
    return 'Sprint Qualifier';
  }

  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Session';
}

function buildSessionDriverMap(drivers) {
  const driverMap = new Map();

  (drivers || []).forEach((driver) => {
    const driverNumber = Number(driver.driver_number);
    if (!Number.isFinite(driverNumber)) return;

    const fullName =
      driver.full_name ||
      `${driver.first_name || ''} ${driver.last_name || ''}`.trim() ||
      driver.broadcast_name ||
      driver.name_acronym ||
      `#${driverNumber}`;

    driverMap.set(driverNumber, {
      name: fullName,
      teamName: driver.team_name || '',
      teamColor: driver.team_colour
        ? `#${String(driver.team_colour).replace(/^#/, '')}`
        : '',
    });
  });

  return driverMap;
}

export function RaceDetailModal({ race, onClose, defaultTab = 'predict' }) {
  const auth = useAuth();
  const showToast = useToast();
  const dialogRef = useDialog(onClose);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [raceTypeTab, setRaceTypeTab] = useState('race');
  const [gpSelections, setGpSelections] = useState(Array(10).fill(''));
  const [sprintSelections, setSprintSelections] = useState(Array(8).fill(''));
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [savingPredictions, setSavingPredictions] = useState(false);
  const [sessionsState, setSessionsState] = useState({
    loading: false,
    error: '',
    sessions: [],
    isArchived: false,
    sourceYear: 2026,
  });
  const [sessionKey, setSessionKey] = useState(null);
  const [sessionLaps, setSessionLaps] = useState([]);
  const [sessionDrivers, setSessionDrivers] = useState([]);
  const [lapsLoading, setLapsLoading] = useState(false);
  const [lapsError, setLapsError] = useState('');
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const [lapRefreshKey, setLapRefreshKey] = useState(0);

  const raceLock = getPredictionLock(race, 'race');
  const sprintLock = race.sprint ? getPredictionLock(race, 'sprint') : null;

  useEffect(() => {
    setGpSelections(Array(10).fill(''));
    setSprintSelections(Array(8).fill(''));
    setRaceTypeTab('race');
    setSessionKey(null);
    setSessionLaps([]);
    setSessionDrivers([]);
    setLapsError('');
  }, [race.id]);

  useEffect(() => {
    if (activeTab !== 'predict' || !auth.session) return undefined;
    let cancelled = false;

    async function loadPredictions() {
      setLoadingPredictions(true);
      try {
        const { data: gpData, error: gpError } = await supabase
          .from('rankings')
          .select('position, driver_id')
          .eq('user_id', auth.session.user.id)
          .eq('race_id', race.id)
          .eq('race_type', 'race')
          .order('position');
        if (gpError) throw gpError;

        const nextGpSelections = Array(10).fill('');
        (gpData || []).forEach((row) => {
          if (row.position >= 1 && row.position <= 10) {
            nextGpSelections[row.position - 1] = String(row.driver_id);
          }
        });

        const nextSprintSelections = Array(8).fill('');
        if (race.sprint) {
          const { data: sprintData, error: sprintError } = await supabase
            .from('rankings')
            .select('position, driver_id')
            .eq('user_id', auth.session.user.id)
            .eq('race_id', race.id)
            .eq('race_type', 'sprint')
            .order('position');
          if (sprintError) throw sprintError;

          (sprintData || []).forEach((row) => {
            if (row.position >= 1 && row.position <= 8) {
              nextSprintSelections[row.position - 1] = String(row.driver_id);
            }
          });
        }

        if (!cancelled) {
          setGpSelections(nextGpSelections);
          setSprintSelections(nextSprintSelections);
        }
      } catch (loadError) {
        if (!cancelled) showToast(loadError.message, 'error');
      } finally {
        if (!cancelled) setLoadingPredictions(false);
      }
    }

    loadPredictions();
    return () => {
      cancelled = true;
    };
  }, [activeTab, auth.session, race.id, race.sprint, showToast]);

  useEffect(() => {
    if (activeTab !== 'sessions') return undefined;
    let cancelled = false;

    async function loadSessions() {
      setSessionsState({
        loading: true,
        error: '',
        sessions: [],
        isArchived: false,
        sourceYear: 2026,
      });

      try {
        const sessionResponse = await fetchRaceSessions(race);
        if (cancelled) return;

        const sessions = [...sessionResponse.sessions].sort((left, right) => {
          const leftDate = new Date(left.date_start || 0);
          const rightDate = new Date(right.date_start || 0);
          return leftDate - rightDate;
        });

        setSessionsState({
          loading: false,
          error: '',
          sessions,
          isArchived: sessionResponse.isArchived,
          sourceYear: sessionResponse.sourceYear,
        });
        setSessionKey((currentKey) =>
          currentKey && sessions.some((session) => String(session.session_key) === String(currentKey))
            ? currentKey
            : sessions[0]?.session_key || null,
        );
      } catch (loadError) {
        if (cancelled) return;
        setSessionsState({
          loading: false,
          error:
            loadError.message ||
            'Session data could not be loaded right now. Please try again.',
          sessions: [],
          isArchived: false,
          sourceYear: 2026,
        });
      }
    }

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [activeTab, race, sessionRefreshKey]);

  useEffect(() => {
    if (!sessionKey) return undefined;
    let cancelled = false;

    async function loadLaps() {
      setLapsLoading(true);
      setLapsError('');
      try {
        const [lapsResponse, driversResponse] = await Promise.allSettled([
          openF1Fetch('laps', { session_key: sessionKey }),
          openF1Fetch('drivers', { session_key: sessionKey }),
        ]);
        if (cancelled) return;

        if (lapsResponse.status === 'fulfilled') {
          setSessionLaps(lapsResponse.value);
        } else {
          setSessionLaps([]);
          setLapsError(lapsResponse.reason?.message || 'Lap data is unavailable.');
        }

        if (driversResponse.status === 'fulfilled') {
          setSessionDrivers(driversResponse.value);
        } else {
          setSessionDrivers([]);
        }
      } finally {
        if (!cancelled) setLapsLoading(false);
      }
    }

    loadLaps();
    return () => {
      cancelled = true;
    };
  }, [lapRefreshKey, sessionKey]);

  const currentSession = sessionsState.sessions.find(
    (session) => String(session.session_key) === String(sessionKey),
  );
  const sessionDriverMap = useMemo(
    () => buildSessionDriverMap(sessionDrivers),
    [sessionDrivers],
  );

  const driverBestLaps = useMemo(() => {
    if (!sessionLaps.length) return [];
    const bestLaps = new Map();

    sessionLaps.forEach((lap) => {
      if (!lap.lap_duration || lap.lap_duration <= 0) return;
      const previous = bestLaps.get(lap.driver_number);
      if (!previous || lap.lap_duration < previous) {
        bestLaps.set(lap.driver_number, lap.lap_duration);
      }
    });

    return [...bestLaps.entries()]
      .sort((left, right) => left[1] - right[1])
      .map(([driver_number, lap_duration]) => ({
        driver_number: Number(driver_number),
        lap_duration,
      }));
  }, [sessionLaps]);

  const fastestTime = driverBestLaps[0]?.lap_duration || null;

  const handleSavePredictions = async (raceType) => {
    const lockInfo = raceType === 'sprint' ? sprintLock : raceLock;
    if (lockInfo?.isLocked) {
      showToast('This prediction window is already locked.', 'error');
      return;
    }

    const selections = raceType === 'sprint' ? sprintSelections : gpSelections;
    const rankings = selections
      .map((driverId, index) =>
        driverId ? { position: index + 1, driver_id: Number(driverId) } : null,
      )
      .filter(Boolean);

    if (!rankings.length) {
      showToast('Add at least one driver before saving.', 'error');
      return;
    }

    setSavingPredictions(true);
    try {
      const { error: deleteError } = await supabase
        .from('rankings')
        .delete()
        .eq('user_id', auth.session.user.id)
        .eq('race_id', race.id)
        .eq('race_type', raceType);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from('rankings').insert(
        rankings.map((ranking) => ({
          user_id: auth.session.user.id,
          race_id: race.id,
          position: ranking.position,
          driver_id: ranking.driver_id,
          race_type: raceType,
        })),
      );
      if (insertError) throw insertError;

      showToast(
        `${raceType === 'sprint' ? 'Sprint' : 'Grand Prix'} predictions saved.`,
      );
    } catch (saveError) {
      showToast(saveError.message, 'error');
    } finally {
      setSavingPredictions(false);
    }
  };

  const renderPredictionPanel = (raceType) => {
    const isSprint = raceType === 'sprint';
    const positions = isSprint ? 8 : 10;
    const selections = isSprint ? sprintSelections : gpSelections;
    const setSelections = isSprint ? setSprintSelections : setGpSelections;
    const selectedIds = selections.filter(Boolean);
    const lockInfo = isSprint ? sprintLock : raceLock;
    const hasSavedSelections = selections.some(Boolean);

    if (!auth.session) {
      return html`<div class="rdm-signin-prompt">
        <div class=${`prediction-status-pill ${lockInfo.isLocked ? 'locked' : 'open'}`}>
          ${lockInfo.isLocked
            ? `Locked ${formatRelativeDeadline(lockInfo.lockAt)}`
            : `Locks ${formatRelativeDeadline(lockInfo.lockAt)}`}
        </div>
        <p class="rdm-signin-prompt-text">
          ${lockInfo.isLocked
            ? 'Predictions are closed for this session.'
            : 'Sign in to save your predictions before the deadline.'}
        </p>
        <${AuthGate} />
      </div>`;
    }

    if (loadingPredictions) return html`<${Spinner} />`;

    return html`<div>
      <div class="prediction-lock-card">
        <div>
          <div class=${`prediction-status-pill ${lockInfo.isLocked ? 'locked' : 'open'}`}>
            ${lockInfo.isLocked ? 'Locked' : 'Open'}
          </div>
          <div class="prediction-lock-title">${lockInfo.label}</div>
          <div class="prediction-lock-copy">
            ${formatDateTime(lockInfo.lockAt)}.
            ${lockInfo.isLocked
              ? hasSavedSelections
                ? ' Your saved picks are shown below in read-only mode.'
                : ' No picks were saved before the lock.'
              : ' You can keep editing until the lock time.'}
          </div>
        </div>
      </div>

      <div class="ranking-grid">
        ${Array.from({ length: positions }, (_, index) => html`<div
          class="ranking-row"
          key=${`${raceType}-${index}`}
        >
          <span class=${`ranking-position ${index < 3 ? `pos-${index + 1}` : ''}`}>
            P${index + 1}
          </span>
          <${DriverSelect}
            value=${selections[index]}
            onChange=${(driverId) => {
              const nextSelections = [...selections];
              nextSelections[index] = driverId;
              setSelections(nextSelections);
            }}
            disabledIds=${selectedIds}
            disabled=${lockInfo.isLocked || savingPredictions}
            placeholder="Select driver..."
          />
        </div>`)}
      </div>

      <div class="prediction-actions">
        <button class="btn btn-secondary" onClick=${onClose}>Close</button>
        <button
          class="btn btn-primary"
          onClick=${() => handleSavePredictions(raceType)}
          disabled=${savingPredictions || lockInfo.isLocked}
        >
          ${lockInfo.isLocked
            ? 'Predictions Locked'
            : savingPredictions
              ? 'Saving...'
              : `Save ${isSprint ? 'Sprint' : 'GP'} Picks`}
        </button>
      </div>
    </div>`;
  };

  const renderSessionsPanel = () => {
    if (sessionsState.loading) return html`<${Spinner} />`;

    if (sessionsState.error) {
      return html`<${InlineMessage}
        title="Session data unavailable"
        text=${sessionsState.error}
        action=${html`<button
          class="btn btn-secondary"
          onClick=${() => setSessionRefreshKey((current) => current + 1)}
        >
          Retry
        </button>`}
      />`;
    }

    if (!sessionsState.sessions.length) {
      return html`<${InlineMessage}
        title="No session data yet"
        text="OpenF1 has not published practice or qualifying timing for this race."
        action=${html`<button
          class="btn btn-secondary"
          onClick=${() => setSessionRefreshKey((current) => current + 1)}
        >
          Retry
        </button>`}
      />`;
    }

    return html`<div>
      <div class="session-source-row">
        <span
          class=${`session-source-badge ${sessionsState.isArchived ? 'archived' : 'current'}`}
        >
          ${sessionsState.isArchived
            ? `Archived ${sessionsState.sourceYear} data`
            : 'Current season data'}
        </span>
        ${sessionsState.isArchived &&
        html`<span class="session-source-copy">
          2026 timing is not available yet, so archived weekend data is shown for context.
        </span>`}
      </div>

      <div class="rdm-session-tabs">
        ${sessionsState.sessions.map((session) => html`<button
          key=${session.session_key}
          class=${`rdm-session-tab ${String(session.session_key) === String(sessionKey) ? 'active' : ''}`}
          onClick=${() => setSessionKey(session.session_key)}
        >
          ${formatSessionDisplayName(session)}
        </button>`)}
      </div>

      ${currentSession &&
      html`<div class="session-meta">
        <span>${currentSession.location || race.location}</span>
        <span>-</span>
        <span>${formatDateTime(currentSession.date_start)}</span>
        ${currentSession.status && html`<span>-</span><span>${currentSession.status}</span>`}
      </div>`}

      ${lapsLoading
        ? html`<${Spinner} />`
        : lapsError
          ? html`<${InlineMessage}
              title="Lap data unavailable"
              text=${lapsError}
              action=${html`<button
                class="btn btn-secondary"
                onClick=${() => setLapRefreshKey((current) => current + 1)}
              >
                Retry
              </button>`}
            />`
          : driverBestLaps.length > 0
            ? html`<div class="table-wrapper">
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
                    ${driverBestLaps.slice(0, 20).map((entry, index) => {
                      const sessionDriver = sessionDriverMap.get(entry.driver_number);
                      const localDriver = getDriverByNumber(entry.driver_number);
                      const localTeam = localDriver ? getTeam(localDriver.team) : null;
                      const teamColor =
                        sessionDriver?.teamColor ||
                        localTeam?.color ||
                        'var(--color-text-muted)';
                      const teamName = sessionDriver?.teamName || localTeam?.name || '-';
                      const driverName =
                        sessionDriver?.name || localDriver?.name || 'Unknown Driver';
                      const gap = fastestTime ? entry.lap_duration - fastestTime : 0;

                      return html`<tr key=${entry.driver_number}>
                        <td class=${`pos-cell ${index < 3 ? `pos-${index + 1}` : ''}`}>
                          ${index + 1}
                        </td>
                        <td>
                          <span class="driver-cell">
                            ${localDriver
                              ? html`<${TeamDot} teamId=${localDriver.team} />`
                              : html`<span
                                  class="team-dot"
                                  style=${{
                                    backgroundColor: teamColor,
                                    color: teamColor,
                                  }}
                                ></span>`}
                            <span>${driverName}</span>
                            <span class="driver-number">#${entry.driver_number}</span>
                          </span>
                        </td>
                        <td
                          style=${{
                            color: teamColor,
                            fontSize: 'var(--text-xs)',
                          }}
                        >
                          ${teamName}
                        </td>
                        <td class="timing-value" style=${{ textAlign: 'right' }}>
                          ${formatLapTime(entry.lap_duration)}
                        </td>
                        <td
                          class="timing-value"
                          style=${{
                            textAlign: 'right',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          ${index === 0 ? 'Leader' : `+${formatLapTime(gap)}`}
                        </td>
                      </tr>`;
                    })}
                  </tbody>
                </table>
              </div>`
            : html`<${InlineMessage}
                title="No lap times published"
                text="This session exists, but OpenF1 does not currently have lap data for it."
              />`}
    </div>`;
  };

  return html`<div
    class="modal-overlay open"
    onClick=${(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div
      ref=${dialogRef}
      class="modal-card race-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="race-detail-title"
      tabIndex="-1"
    >
      <div class="rdm-header">
        <div class="rdm-header-info">
          <h2 class="rdm-race-name" id="race-detail-title">${race.name}</h2>
          <div class="rdm-race-meta">
            <span><${LocationIcon} /> ${race.location}</span>
            <span>-</span>
            <span><${CalendarIcon} /> ${race.race_date_label}</span>
            ${race.sprint &&
            html`<span>-</span><span class="sprint-badge">Sprint Weekend</span>`}
          </div>
        </div>
        <button class="modal-close" onClick=${onClose} aria-label="Close">
          <${CloseIcon} />
        </button>
      </div>

      <div class="rdm-tab-bar">
        <button
          class=${`rdm-tab ${activeTab === 'predict' ? 'active' : ''}`}
          onClick=${() => setActiveTab('predict')}
        >
          Predict
        </button>
        <button
          class=${`rdm-tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick=${() => setActiveTab('sessions')}
        >
          Sessions
        </button>
        <button
          class=${`rdm-tab ${activeTab === 'market' ? 'active' : ''}`}
          onClick=${() => setActiveTab('market')}
        >
          Market
        </button>
      </div>

      ${activeTab === 'market'
        ? html`<${BettingOddsTab} raceId=${race.id} />`
        : activeTab === 'sessions'
          ? renderSessionsPanel()
          : html`<div>
              ${race.sprint &&
              html`<div class="rdm-inner-tabs">
                <button
                  class=${`rdm-inner-tab ${raceTypeTab === 'sprint' ? 'active' : ''}`}
                  onClick=${() => setRaceTypeTab('sprint')}
                >
                  Sprint
                  <span class=${`prediction-status-pill ${sprintLock?.isLocked ? 'locked' : 'open'}`}>
                    ${sprintLock?.isLocked ? 'Locked' : 'Open'}
                  </span>
                </button>
                <button
                  class=${`rdm-inner-tab ${raceTypeTab === 'race' ? 'active' : ''}`}
                  onClick=${() => setRaceTypeTab('race')}
                >
                  Grand Prix
                  <span class=${`prediction-status-pill ${raceLock.isLocked ? 'locked' : 'open'}`}>
                    ${raceLock.isLocked ? 'Locked' : 'Open'}
                  </span>
                </button>
              </div>`}
              ${renderPredictionPanel(race.sprint ? raceTypeTab : 'race')}
            </div>`}
    </div>
  </div>`;
}



