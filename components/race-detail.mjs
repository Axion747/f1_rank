import {
  html,
  supabase,
  useEffect,
  useMemo,
  useState,
} from '../lib/core.mjs';
import {
  fetchRaceSessions,
  loadRankingsWithProfiles,
  openF1Fetch,
  useAuth,
  useDialog,
  useToast,
} from '../lib/app-utils.mjs';
import {
  buildConsensusSnapshot,
  computeAccuracy,
  computeConsensusAccuracy,
  formatDateTime,
  formatLapTime,
  formatRelativeDeadline,
  getDriver,
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
  UsernameLink,
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

function getDriverLastName(driver) {
  if (!driver?.name) return 'Unknown';
  const parts = driver.name.trim().split(/\s+/);
  return parts[parts.length - 1] || driver.name;
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
  const [predictActualResults, setPredictActualResults] = useState([]);
  const [consensusState, setConsensusState] = useState({
    actualResults: [],
    error: '',
    loading: false,
    rankings: [],
  });
  const [consensusRefreshKey, setConsensusRefreshKey] = useState(0);

  const raceLock = getPredictionLock(race, 'race');
  const sprintLock = race.sprint ? getPredictionLock(race, 'sprint') : null;
  const activeRaceType = race.sprint ? raceTypeTab : 'race';

  useEffect(() => {
    setGpSelections(Array(10).fill(''));
    setSprintSelections(Array(8).fill(''));
    setRaceTypeTab('race');
    setSessionKey(null);
    setSessionLaps([]);
    setSessionDrivers([]);
    setLapsError('');
    setConsensusState({
      actualResults: [],
      error: '',
      loading: false,
      rankings: [],
    });
    setPredictActualResults([]);
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
    if (activeTab !== 'consensus') return undefined;
    let cancelled = false;

    async function loadConsensus() {
      setConsensusState({
        actualResults: [],
        error: '',
        loading: true,
        rankings: [],
      });

      try {
        const [rankings, resultsResponse] = await Promise.all([
          loadRankingsWithProfiles(race.id, activeRaceType),
          supabase
            .from('actual_results')
            .select('race_id, position, driver_id, race_type')
            .eq('race_id', race.id)
            .eq('race_type', activeRaceType)
            .order('position'),
        ]);
        if (cancelled) return;

        if (resultsResponse.error) throw resultsResponse.error;

        setConsensusState({
          actualResults: resultsResponse.data || [],
          error: '',
          loading: false,
          rankings: rankings || [],
        });
      } catch (loadError) {
        if (cancelled) return;
        setConsensusState({
          actualResults: [],
          error:
            loadError.message ||
            'Public picks could not be loaded right now. Please try again.',
          loading: false,
          rankings: [],
        });
      }
    }

    loadConsensus();
    return () => {
      cancelled = true;
    };
  }, [activeRaceType, activeTab, consensusRefreshKey, race.id]);

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

  useEffect(() => {
    if (activeTab !== 'predict') return undefined;
    const lockInfo = activeRaceType === 'sprint' ? sprintLock : raceLock;
    if (!lockInfo?.isLocked) {
      setPredictActualResults([]);
      return undefined;
    }

    let cancelled = false;

    async function loadActualResults() {
      try {
        const { data, error } = await supabase
          .from('actual_results')
          .select('race_id, position, driver_id, race_type')
          .eq('race_id', race.id)
          .eq('race_type', activeRaceType)
          .order('position');

        if (!cancelled && !error) {
          setPredictActualResults(data || []);
        }
      } catch (_) {
        if (!cancelled) setPredictActualResults([]);
      }
    }

    loadActualResults();
    return () => {
      cancelled = true;
    };
  }, [activeTab, activeRaceType, race.id, raceLock, sprintLock]);

  const currentSession = sessionsState.sessions.find(
    (session) => String(session.session_key) === String(sessionKey),
  );
  const sessionDriverMap = useMemo(
    () => buildSessionDriverMap(sessionDrivers),
    [sessionDrivers],
  );
  const consensusSnapshot = useMemo(
    () => buildConsensusSnapshot(consensusState.rankings, activeRaceType),
    [activeRaceType, consensusState.rankings],
  );
  const consensusAccuracy = useMemo(
    () =>
      computeConsensusAccuracy(
        consensusState.rankings,
        consensusState.actualResults,
        activeRaceType,
        race.id,
      ),
    [activeRaceType, consensusState.actualResults, consensusState.rankings, race.id],
  );
  const publicPickGroups = useMemo(() => {
    const grouped = new Map();
    const visibleRankings = (consensusState.rankings || []).filter(
      (ranking) => !auth.session || ranking.user_id !== auth.session.user.id,
    );

    visibleRankings.forEach((ranking) => {
      const key = ranking.user_id || ranking._username || 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, {
          displayName: ranking._display_name || ranking._username || 'Unknown player',
          picks: {},
          totalPicks: 0,
          username: ranking._username || '',
        });
      }

      const current = grouped.get(key);
      current.picks[ranking.position] = Number(ranking.driver_id);
      current.totalPicks += 1;
    });

    return [...grouped.values()].sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    );
  }, [auth.session?.user?.id, consensusState.rankings]);
  const topPodiumChoice = useMemo(() => {
    if (!consensusSnapshot.entries.length) return null;
    return [...consensusSnapshot.entries].sort(
      (left, right) =>
        right.podiumShare - left.podiumShare ||
        right.rawPoints - left.rawPoints ||
        left.avgPosition - right.avgPosition,
    )[0];
  }, [consensusSnapshot.entries]);

  const predictAccuracy = useMemo(() => {
    if (!predictActualResults.length) return null;

    const selections = activeRaceType === 'sprint' ? sprintSelections : gpSelections;
    const userRankings = selections
      .map((driverId, index) =>
        driverId
          ? {
              race_id: race.id,
              race_type: activeRaceType,
              position: index + 1,
              driver_id: Number(driverId),
            }
          : null,
      )
      .filter(Boolean);

    if (!userRankings.length) return null;

    const stats = computeAccuracy(userRankings, predictActualResults);
    if (!stats) return null;

    const actualByPosition = new Map();
    predictActualResults.forEach((r) => actualByPosition.set(r.position, r.driver_id));

    const actualDriverPos = new Map();
    predictActualResults.forEach((r) => actualDriverPos.set(r.driver_id, r.position));

    const positions = activeRaceType === 'sprint' ? 8 : 10;
    const rows = Array.from({ length: positions }, (_, i) => {
      const pos = i + 1;
      const predictedDriverId = selections[i] ? Number(selections[i]) : null;
      const actualDriverId = actualByPosition.get(pos) || null;
      const isExact = predictedDriverId != null && predictedDriverId === actualDriverId;
      const actualPos =
        predictedDriverId != null ? (actualDriverPos.get(predictedDriverId) ?? null) : null;
      const diff = actualPos != null ? Math.abs(pos - actualPos) : null;

      return { pos, predictedDriverId, actualDriverId, isExact, actualPos, diff };
    });

    const actualPodiumIds = predictActualResults
      .filter((r) => r.position >= 1 && r.position <= 3)
      .map((r) => r.driver_id);
    const userPodiumIds = selections
      .slice(0, 3)
      .filter(Boolean)
      .map(Number);
    const podiumHits = userPodiumIds.filter((id) => actualPodiumIds.includes(id)).length;

    return { ...stats, rows, podiumHits };
  }, [activeRaceType, gpSelections, predictActualResults, race.id, sprintSelections]);

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
      const rows = rankings.map((ranking) => ({
        user_id: auth.session.user.id,
        race_id: race.id,
        position: ranking.position,
        driver_id: ranking.driver_id,
        race_type: raceType,
      }));

      // Upsert by the composite unique key (user_id, race_id, position, race_type)
      const { error: upsertError } = await supabase
        .from('rankings')
        .upsert(rows, { onConflict: 'user_id,race_id,position,race_type' });
      if (upsertError) throw upsertError;

      // Remove positions that are no longer used (user cleared a slot)
      const usedPositions = rankings.map((r) => r.position);
      const maxPositions = raceType === 'sprint' ? 8 : 10;
      const unusedPositions = Array.from(
        { length: maxPositions },
        (_, i) => i + 1,
      ).filter((p) => !usedPositions.includes(p));

      if (unusedPositions.length > 0) {
        await supabase
          .from('rankings')
          .delete()
          .eq('user_id', auth.session.user.id)
          .eq('race_id', race.id)
          .eq('race_type', raceType)
          .in('position', unusedPositions);
      }

      showToast(
        `${raceType === 'sprint' ? 'Sprint' : 'Grand Prix'} predictions saved.`,
      );
    } catch (saveError) {
      showToast('Unable to save predictions. Please try again.', 'error');
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

      ${lockInfo.isLocked && predictAccuracy && hasSavedSelections
        ? html`<div class="predict-comparison">
            <div class="predict-comparison-stats">
              <div class="rdm-consensus-card rdm-consensus-card-accent">
                <span class="rdm-consensus-card-label">Accuracy</span>
                <div class="accuracy-bar-wrapper">
                  <div class="accuracy-bar">
                    <div
                      class="accuracy-bar-fill"
                      style=${{ width: `${Math.min(predictAccuracy.accuracy, 100)}%` }}
                    ></div>
                  </div>
                  <span class="accuracy-bar-text">${predictAccuracy.accuracy}%</span>
                </div>
                <span class="rdm-consensus-card-copy">
                  ${predictAccuracy.total_correct}/${predictAccuracy.total_predictions} exact
                </span>
              </div>
              <div class="rdm-consensus-card">
                <span class="rdm-consensus-card-label">Average Miss</span>
                <strong class="rdm-consensus-card-value">${predictAccuracy.position_diff_avg}</strong>
                <span class="rdm-consensus-card-copy">Positions off on average</span>
              </div>
              <div class="rdm-consensus-card">
                <span class="rdm-consensus-card-label">Podium Hits</span>
                <strong class="rdm-consensus-card-value">${predictAccuracy.podiumHits}/3</strong>
                <span class="rdm-consensus-card-copy">Correct names in top 3</span>
              </div>
            </div>

            <div class="table-wrapper">
              <table class="data-table predict-comparison-table">
                <thead>
                  <tr>
                    <th style=${{ width: '46px' }}>Pos</th>
                    <th>Your Pick</th>
                    <th>Actual</th>
                    <th style=${{ width: '46px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  ${predictAccuracy.rows.map((row) => {
                    const predictedDriver = row.predictedDriverId
                      ? getDriver(row.predictedDriverId)
                      : null;
                    const actualDriver = row.actualDriverId
                      ? getDriver(row.actualDriverId)
                      : null;

                    let matchClass = '';
                    let matchIcon = '';
                    if (row.isExact) {
                      matchClass = 'predict-match-exact';
                      matchIcon = '\u2713';
                    } else if (row.diff !== null && row.diff === 1) {
                      matchClass = 'predict-match-close';
                      matchIcon = '~';
                    } else if (row.predictedDriverId) {
                      matchClass = 'predict-match-miss';
                      matchIcon = row.diff !== null ? `${row.diff}` : '?';
                    }

                    return html`<tr key=${row.pos} class=${matchClass}>
                      <td class=${`pos-cell ${row.pos <= 3 ? `pos-${row.pos}` : ''}`}>
                        P${row.pos}
                      </td>
                      <td>
                        <span class="driver-cell">
                          ${predictedDriver &&
                          html`<${TeamDot} teamId=${predictedDriver.team} />`}
                          <span>${predictedDriver ? getDriverLastName(predictedDriver) : '-'}</span>
                        </span>
                      </td>
                      <td>
                        <span class="driver-cell">
                          ${actualDriver && html`<${TeamDot} teamId=${actualDriver.team} />`}
                          <span>${actualDriver ? getDriverLastName(actualDriver) : '-'}</span>
                        </span>
                      </td>
                      <td class="predict-match-indicator">
                        ${matchIcon}
                      </td>
                    </tr>`;
                  })}
                </tbody>
              </table>
            </div>
          </div>`
        : html`<div>
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
          </div>`}
    </div>`;
  };

  const renderConsensusPanel = () => {
    const sessionSubject = activeRaceType === 'sprint' ? 'sprint' : 'Grand Prix';
    const consensusLeader = consensusSnapshot.entries[0]
      ? getDriver(consensusSnapshot.entries[0].driverId)
      : null;
    const podiumFavoriteDriver = topPodiumChoice ? getDriver(topPodiumChoice.driverId) : null;

    if (consensusState.loading) return html`<${Spinner} />`;

    if (consensusState.error) {
      return html`<div>
        ${race.sprint &&
        html`<div class="rdm-inner-tabs">
          <button
            class=${`rdm-inner-tab ${raceTypeTab === 'sprint' ? 'active' : ''}`}
            onClick=${() => setRaceTypeTab('sprint')}
          >
            Sprint
          </button>
          <button
            class=${`rdm-inner-tab ${raceTypeTab === 'race' ? 'active' : ''}`}
            onClick=${() => setRaceTypeTab('race')}
          >
            Grand Prix
          </button>
        </div>`}
        <${InlineMessage}
          title="Public picks unavailable"
          text=${consensusState.error}
          action=${html`<button
            class="btn btn-secondary"
            onClick=${() => setConsensusRefreshKey((current) => current + 1)}
          >
            Retry
          </button>`}
        />
      </div>`;
    }

    if (!consensusSnapshot.ballotCount) {
      return html`<div>
        ${race.sprint &&
        html`<div class="rdm-inner-tabs">
          <button
            class=${`rdm-inner-tab ${raceTypeTab === 'sprint' ? 'active' : ''}`}
            onClick=${() => setRaceTypeTab('sprint')}
          >
            Sprint
          </button>
          <button
            class=${`rdm-inner-tab ${raceTypeTab === 'race' ? 'active' : ''}`}
            onClick=${() => setRaceTypeTab('race')}
          >
            Grand Prix
          </button>
        </div>`}
        <${InlineMessage}
          title="No public picks yet"
          text=${`Once people submit their ${sessionSubject} picks, the crowd board will appear here.`}
        />
      </div>`;
    }

    return html`<div class="rdm-consensus-layout">
      ${race.sprint &&
      html`<div class="rdm-inner-tabs">
        <button
          class=${`rdm-inner-tab ${raceTypeTab === 'sprint' ? 'active' : ''}`}
          onClick=${() => setRaceTypeTab('sprint')}
        >
          Sprint
        </button>
        <button
          class=${`rdm-inner-tab ${raceTypeTab === 'race' ? 'active' : ''}`}
          onClick=${() => setRaceTypeTab('race')}
        >
          Grand Prix
        </button>
      </div>`}

      <div class="rdm-consensus-summary">
        <div class="rdm-consensus-card">
          <span class="rdm-consensus-card-label">Ballots</span>
          <strong class="rdm-consensus-card-value">${consensusSnapshot.ballotCount}</strong>
          <span class="rdm-consensus-card-copy">Submitted ${sessionSubject} boards</span>
        </div>
        <div class="rdm-consensus-card">
          <span class="rdm-consensus-card-label">Consensus Leader</span>
          <strong class="rdm-consensus-card-value">
            ${consensusLeader ? getDriverLastName(consensusLeader) : '-'}
          </strong>
          <span class="rdm-consensus-card-copy">Most common winner pick right now</span>
        </div>
        <div class="rdm-consensus-card">
          <span class="rdm-consensus-card-label">Strongest Podium Case</span>
          <strong class="rdm-consensus-card-value">
            ${topPodiumChoice ? `${topPodiumChoice.podiumShare}%` : '-'}
          </strong>
          <span class="rdm-consensus-card-copy">
            ${podiumFavoriteDriver ? getDriverLastName(podiumFavoriteDriver) : 'Waiting on picks'}
          </span>
        </div>
        <div class="rdm-consensus-card">
          <span class="rdm-consensus-card-label">Public Accuracy</span>
          <strong class="rdm-consensus-card-value">
            ${consensusAccuracy ? `${consensusAccuracy.accuracy}%` : 'Pending'}
          </strong>
          <span class="rdm-consensus-card-copy">
            ${consensusAccuracy
              ? `${consensusAccuracy.total_correct}/${consensusAccuracy.total_predictions} exact hits`
              : 'Official results needed'}
          </span>
        </div>
      </div>

      <section class="rdm-consensus-section">
        <div class="rdm-consensus-section-header">
          <div>
            <h3 class="rdm-consensus-section-title">Crowd Power Ratings</h3>
            <p class="rdm-consensus-section-copy">
              Power is normalized to 100 using official F1 points from every submitted ballot.
              Podium share shows how often each driver is placed in the top three.
            </p>
          </div>
        </div>
        <div class="rdm-consensus-list">
          ${consensusSnapshot.entries
            .slice(0, consensusSnapshot.positionsLimit)
            .map((entry, index) => {
              const driver = getDriver(entry.driverId);
              const team = driver ? getTeam(driver.team) : null;
              const barWidth = Math.max(entry.powerRating, 4);

              return html`<div key=${entry.driverId} class="rdm-consensus-row">
                <div class="rdm-consensus-rank">
                  <span class=${`pos-cell ${index < 3 ? `pos-${index + 1}` : ''}`}>
                    ${index + 1}
                  </span>
                </div>
                <div class="rdm-consensus-driver">
                  ${team && driver && html`<${TeamDot} teamId=${driver.team} size=${10} />`}
                  <div class="rdm-consensus-driver-copy">
                    <span class="rdm-consensus-driver-name">
                      ${driver ? driver.name : `Driver ${entry.driverId}`}
                    </span>
                    <span class="rdm-consensus-driver-team">${team ? team.name : 'Unknown team'}</span>
                  </div>
                </div>
                <div class="rdm-consensus-track">
                  <div
                    class="rdm-consensus-track-bar"
                    style=${{
                      background: team ? team.color : 'var(--color-primary)',
                      width: `${barWidth}%`,
                    }}
                  ></div>
                </div>
                <div class="rdm-consensus-metrics">
                  <div class="rdm-consensus-metric">
                    <span>Power</span>
                    <strong>${entry.powerRating.toFixed(1)}</strong>
                  </div>
                  <div class="rdm-consensus-metric">
                    <span>Podium</span>
                    <strong>${entry.podiumShare}%</strong>
                  </div>
                  <div class="rdm-consensus-metric">
                    <span>Avg Pick</span>
                    <strong>${entry.avgPosition !== null ? `P${entry.avgPosition}` : '-'}</strong>
                  </div>
                </div>
              </div>`;
            })}
        </div>
      </section>

      <section class="rdm-consensus-section">
        <div class="rdm-consensus-section-header">
          <div>
            <h3 class="rdm-consensus-section-title">Public Consensus Accuracy</h3>
            <p class="rdm-consensus-section-copy">
              Once official results are stored, the crowd gets scored on exact position matches,
              average miss, and podium hits.
            </p>
          </div>
        </div>
        ${consensusAccuracy
          ? html`<div class="rdm-consensus-accuracy-block">
              <div class="rdm-consensus-accuracy-grid">
                <div class="rdm-consensus-card rdm-consensus-card-accent">
                  <span class="rdm-consensus-card-label">Exact Match Rate</span>
                  <div class="accuracy-bar-wrapper">
                    <div class="accuracy-bar">
                      <div
                        class="accuracy-bar-fill"
                        style=${{
                          width: `${Math.min(consensusAccuracy.accuracy, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span class="accuracy-bar-text">${consensusAccuracy.accuracy}%</span>
                  </div>
                </div>
                <div class="rdm-consensus-card">
                  <span class="rdm-consensus-card-label">Average Miss</span>
                  <strong class="rdm-consensus-card-value">
                    ${consensusAccuracy.position_diff_avg}
                  </strong>
                  <span class="rdm-consensus-card-copy">Positions away from the real order</span>
                </div>
                <div class="rdm-consensus-card">
                  <span class="rdm-consensus-card-label">Podium Hits</span>
                  <strong class="rdm-consensus-card-value">
                    ${consensusAccuracy.podium_hits}/3
                  </strong>
                  <span class="rdm-consensus-card-copy">
                    ${consensusAccuracy.exact_podium ? 'Exact podium nailed' : 'Correct names, any order'}
                  </span>
                </div>
              </div>
              <div class="rdm-consensus-podium-grid">
                <div class="rdm-consensus-podium-card">
                  <span class="rdm-consensus-card-label">Consensus Podium</span>
                  <div class="rdm-consensus-podium-list">
                    ${consensusAccuracy.consensus_podium.map((driverId, index) => {
                      const driver = getDriver(driverId);
                      return html`<span key=${`consensus-${driverId}`} class="rdm-consensus-podium-chip">
                        <span class="rdm-public-pick-position">P${index + 1}</span>
                        <span>${driver ? getDriverLastName(driver) : `#${driverId}`}</span>
                      </span>`;
                    })}
                  </div>
                </div>
                <div class="rdm-consensus-podium-card">
                  <span class="rdm-consensus-card-label">Actual Podium</span>
                  <div class="rdm-consensus-podium-list">
                    ${consensusAccuracy.actual_podium.map((driverId, index) => {
                      const driver = getDriver(driverId);
                      return html`<span key=${`actual-${driverId}`} class="rdm-consensus-podium-chip">
                        <span class="rdm-public-pick-position">P${index + 1}</span>
                        <span>${driver ? getDriverLastName(driver) : `#${driverId}`}</span>
                      </span>`;
                    })}
                  </div>
                </div>
              </div>
            </div>`
          : html`<div class="rdm-consensus-empty">
              Official ${sessionSubject} results have not been stored yet, so crowd accuracy is still pending.
            </div>`}
      </section>

      <section class="rdm-consensus-section">
        <div class="rdm-consensus-section-header">
          <div>
            <h3 class="rdm-consensus-section-title">What Everyone Picked</h3>
            <p class="rdm-consensus-section-copy">
              ${auth.session
                ? 'Your own ballot is hidden here so you only see the rest of the room.'
                : `Every submitted ${sessionSubject} ballot is shown below.`}
            </p>
          </div>
        </div>
        ${publicPickGroups.length
          ? html`<div class="rdm-public-picks-grid">
              ${publicPickGroups.map((group) => html`<div
                key=${group.username || group.displayName}
                class="rdm-public-pick-card"
              >
                <div class="rdm-public-pick-card-header">
                  ${group.username
                    ? html`<${UsernameLink}
                        username=${group.username}
                        displayName=${group.displayName}
                      />`
                    : html`<span class="rdm-public-pick-name">${group.displayName}</span>`}
                  <span class="rdm-public-pick-count">${group.totalPicks} picks</span>
                </div>
                <div class="rdm-public-pick-grid">
                  ${Array.from({ length: consensusSnapshot.positionsLimit }, (_, index) => {
                    const position = index + 1;
                    const driver = getDriver(group.picks[position]);
                    const team = driver ? getTeam(driver.team) : null;

                    return html`<div key=${position} class="rdm-public-pick-pill">
                      <span class="rdm-public-pick-position">P${position}</span>
                      <span class="rdm-public-pick-driver">
                        ${team && driver && html`<${TeamDot} teamId=${driver.team} size=${8} />`}
                        <span>${driver ? getDriverLastName(driver) : '-'}</span>
                      </span>
                    </div>`;
                  })}
                </div>
              </div>`) }
            </div>`
          : html`<div class="rdm-consensus-empty">
              No one else has submitted a ${sessionSubject} ballot for this race yet.
            </div>`}
      </section>
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
          class=${`rdm-tab ${activeTab === 'consensus' ? 'active' : ''}`}
          onClick=${() => setActiveTab('consensus')}
        >
          Consensus
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
          : activeTab === 'consensus'
            ? renderConsensusPanel()
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
                ${renderPredictionPanel(activeRaceType)}
              </div>`}
    </div>
  </div>`;
}



