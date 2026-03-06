import {
  html,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from '../lib/core.mjs';
import { RACES } from '../data/f1-data.mjs';
import { openF1Fetch } from '../lib/app-utils.mjs';
import {
  formatDateTime,
  formatLapTime,
  formatTimeAgo,
  getDriverByNumber,
  getFlagClass,
  getTeam,
} from '../lib/f1-utils.mjs';
import { InlineMessage, RaceSelect, Spinner } from '../components/app-components.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

function RefreshIcon() {
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
    <path d="M21 12a9 9 0 1 1-3.2-6.8"></path>
    <path d="M21 3v6h-6"></path>
  </svg>`;
}

function rawSessionLabel(session) {
  const raw = (session.session_name || session.session_type || '').replace(/_/g, ' ').trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Session';
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bformula 1\b/g, '')
    .replace(/\bgrand prix\b/g, 'gp')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getSessionType(session) {
  const raw = normalizeText(session.session_name || session.session_type);

  if (raw.includes('practice 1') || raw.includes('fp1')) return 'fp1';
  if (raw.includes('practice 2') || raw.includes('fp2')) return 'fp2';
  if (raw.includes('practice 3') || raw.includes('fp3')) return 'fp3';
  if (
    raw.includes('sprint shootout') ||
    raw.includes('sprint qualifying') ||
    raw.includes('sprint qualifier')
  ) {
    return 'sprint-qualifier';
  }
  if (raw === 'sprint' || raw.endsWith(' sprint') || raw.includes(' sprint ')) {
    return 'sprint';
  }
  if (raw.includes('qualifying') || raw.includes('quali')) return 'qualifying';
  if (raw.includes('race')) return 'race';

  return 'other';
}

function sessionLabel(session) {
  switch (getSessionType(session)) {
    case 'fp1':
      return 'Practice 1';
    case 'fp2':
      return 'Practice 2';
    case 'fp3':
      return 'Practice 3';
    case 'sprint-qualifier':
      return 'Sprint Qualifier';
    case 'sprint':
      return 'Sprint';
    case 'qualifying':
      return 'Qualifying';
    case 'race':
      return 'Race';
    default:
      return rawSessionLabel(session);
  }
}

function isWeekendSession(session) {
  return getSessionType(session) !== 'other';
}

function sessionShortLabel(session) {
  switch (getSessionType(session)) {
    case 'fp1':
      return 'FP1';
    case 'fp2':
      return 'FP2';
    case 'fp3':
      return 'FP3';
    case 'sprint-qualifier':
      return 'Sprint Qualifier';
    case 'sprint':
      return 'Sprint';
    case 'qualifying':
      return 'Qualifying';
    case 'race':
      return 'Race';
    default:
      return sessionLabel(session);
  }
}

function getSessionOrder(session) {
  switch (getSessionType(session)) {
    case 'fp1':
      return 10;
    case 'fp2':
      return 20;
    case 'fp3':
      return 30;
    case 'sprint-qualifier':
      return 40;
    case 'sprint':
      return 50;
    case 'qualifying':
      return 60;
    case 'race':
      return 70;
    default:
      return 90;
  }
}

function getSessionState(session) {
  const now = Date.now();
  const startsAt = session.date_start ? new Date(session.date_start).getTime() : 0;
  const endsAt = session.date_end ? new Date(session.date_end).getTime() : 0;

  if (startsAt && endsAt && now >= startsAt && now <= endsAt) return 'live';
  if (startsAt && now < startsAt) return 'upcoming';
  if (endsAt && now > endsAt) return 'completed';
  return 'scheduled';
}

function formatSessionStateLabel(session) {
  switch (getSessionState(session)) {
    case 'live':
      return 'Live now';
    case 'upcoming':
      return 'Up next';
    case 'completed':
      return 'Complete';
    default:
      return 'Scheduled';
  }
}

function formatStopDuration(value) {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) return 'Stop logged';
  return `${duration.toFixed(duration >= 10 ? 1 : 2)}s`;
}

function isLiveSession(session) {
  return getSessionState(session) === 'live';
}

function scoreSessionMatch(session, race) {
  let score = 0;

  if (
    session.meeting_key &&
    race.meeting_key &&
    String(session.meeting_key) === String(race.meeting_key)
  ) {
    score += 1000;
  }

  const sessionMeeting = normalizeText(
    session.meeting_name || session.meeting_official_name,
  );
  const raceMeeting = normalizeText(race.meeting_name || race.name);
  const sessionLocation = normalizeText(
    session.location || session.circuit_short_name,
  );
  const raceLocation = normalizeText(race.location);
  const sessionCountry = normalizeText(session.country_name);
  const raceCountry = normalizeText(race.country_name);

  if (sessionMeeting && raceMeeting) {
    if (sessionMeeting === raceMeeting) score += 70;
    else if (
      sessionMeeting.includes(raceMeeting) ||
      raceMeeting.includes(sessionMeeting)
    ) {
      score += 55;
    }
  }

  if (sessionLocation && raceLocation) {
    if (sessionLocation === raceLocation) score += 50;
    else if (
      sessionLocation.includes(raceLocation) ||
      raceLocation.includes(sessionLocation)
    ) {
      score += 35;
    }
  }

  if (sessionCountry && raceCountry && sessionCountry === raceCountry) {
    score += 20;
  }

  if (session.date_start) {
    const diffDays =
      Math.abs(
        new Date(session.date_start).getTime() -
          new Date(race.race_starts_at).getTime(),
      ) / DAY_MS;
    if (diffDays <= 5) {
      score += Math.max(0, 60 - diffDays * 12);
    }
  }

  return score;
}

function buildRaceSessionMap(sessions) {
  const raceSessionMap = new Map(RACES.map((race) => [race.id, []]));

  (sessions || [])
    .filter(isWeekendSession)
    .forEach((session) => {
      let bestRace = null;
      let bestScore = -1;

      RACES.forEach((race) => {
        const score = scoreSessionMatch(session, race);
        if (score > bestScore) {
          bestScore = score;
          bestRace = race;
        }
      });

      if (bestRace && bestScore >= 50) {
        raceSessionMap.get(bestRace.id).push(session);
      }
    });

  raceSessionMap.forEach((raceSessions) => {
    raceSessions.sort((left, right) => {
      const orderDiff = getSessionOrder(left) - getSessionOrder(right);
      if (orderDiff !== 0) return orderDiff;
      return (
        new Date(left.date_start || 0).getTime() -
        new Date(right.date_start || 0).getTime()
      );
    });
  });

  return raceSessionMap;
}

function getPreferredSession(sessions) {
  if (!sessions.length) return null;

  const liveSession = sessions.find(isLiveSession);
  if (liveSession) return liveSession;

  const latestStartedSession = [...sessions]
    .filter((session) => {
      const startsAt = session.date_start ? new Date(session.date_start).getTime() : 0;
      return startsAt && startsAt <= Date.now();
    })
    .sort(
      (left, right) =>
        new Date(right.date_start || 0).getTime() -
        new Date(left.date_start || 0).getTime(),
    )[0];
  if (latestStartedSession) return latestStartedSession;

  const upcomingSession = sessions
    .filter(
      (session) =>
        session.date_start && new Date(session.date_start).getTime() > Date.now(),
    )
    .sort(
      (left, right) =>
        new Date(left.date_start || 0).getTime() -
        new Date(right.date_start || 0).getTime(),
    )[0];
  if (upcomingSession) return upcomingSession;

  return [...sessions].sort(
    (left, right) =>
      new Date(right.date_start || 0).getTime() -
      new Date(left.date_start || 0).getTime(),
  )[0];
}

function getDefaultRaceId(raceSessionMap) {
  const liveRace = RACES.find((race) =>
    (raceSessionMap.get(race.id) || []).some(isLiveSession),
  );
  if (liveRace) return liveRace.id;

  const now = Date.now();
  const currentOrNextRace = RACES.find(
    (race) => new Date(race.race_starts_at).getTime() >= now - 3 * DAY_MS,
  );
  if (currentOrNextRace) return currentOrNextRace.id;

  const latestRaceWithSessions = [...RACES]
    .reverse()
    .find((race) => (raceSessionMap.get(race.id) || []).length > 0);
  if (latestRaceWithSessions) return latestRaceWithSessions.id;

  return RACES[0]?.id || null;
}

function StintTimeline({ stints, driverMap, totalLaps }) {
  const byDriver = useMemo(() => {
    const grouped = {};
    stints.forEach((stint) => {
      if (!grouped[stint.driver_number]) grouped[stint.driver_number] = [];
      grouped[stint.driver_number].push(stint);
    });
    Object.values(grouped).forEach((list) =>
      list.sort((left, right) => (left.stint_number || 0) - (right.stint_number || 0)),
    );
    return grouped;
  }, [stints]);

  return html`<table class="stints-table">
    <thead>
      <tr>
        <th style=${{ width: '120px' }}>Driver</th>
        <th>Tyre Strategy</th>
        <th style=${{ width: '80px' }}>Stints</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(byDriver).map(([driverNumber, driverStints]) => {
        const driver = driverMap[driverNumber] || getDriverByNumber(Number(driverNumber));
        const fallbackTeam = getTeam(driver?.team || '');
        const driverColor =
          driver?.teamColor ||
          fallbackTeam?.color ||
          'var(--color-text-faint)';
        const maxLaps =
          totalLaps || Math.max(...driverStints.map((stint) => stint.lap_end || stint.lap_start || 0));
        return html`<tr key=${driverNumber}>
          <td>
            <span class="driver-cell">
              <span
                class="timing-driver-color"
                style=${{ background: driverColor }}
              ></span>
              ${driver?.name || `#${driverNumber}`}
            </span>
          </td>
          <td>
            <div class="stint-track">
              ${driverStints.map((stint, index) => {
                const start = stint.lap_start || 1;
                const end = stint.lap_end || start;
                const width = `${Math.max(((end - start + 1) / maxLaps) * 100, 4)}%`;
                return html`<span
                  key=${`${driverNumber}-${index}`}
                  class=${`stint-bar ${(stint.compound || '').toLowerCase()}`}
                  style=${{ width }}
                  title=${`${stint.compound || 'Unknown'} - laps ${start}-${end}`}
                ></span>`;
              })}
            </div>
          </td>
          <td>
            ${(driverStints || []).map(
              (stint, index) => html`<span
                key=${`${driverNumber}-badge-${index}`}
                class=${`tyre-badge ${(stint.compound || '').toLowerCase()}`}
              >
                ${(stint.compound || '?').charAt(0)}
              </span>`,
            )}
          </td>
        </tr>`;
      })}
    </tbody>
  </table>`;
}

export function LiveDashboard() {
  const [sessions, setSessions] = useState([]);
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [positions, setPositions] = useState([]);
  const [laps, setLaps] = useState([]);
  const [intervals, setIntervals] = useState([]);
  const [weather, setWeather] = useState(null);
  const [raceControl, setRaceControl] = useState([]);
  const [stints, setStints] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [pits, setPits] = useState([]);
  const autoRefreshRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      setLoading(true);
      setLoadError('');
      try {
        let data = await openF1Fetch('sessions', { year: 2026 });
        let archived = false;
        if (!data || !data.length) {
          data = await openF1Fetch('sessions', { year: 2025 });
          archived = true;
        }
        if (cancelled) return;
        const sorted = [...(data || [])].sort(
          (left, right) => new Date(right.date_start || 0) - new Date(left.date_start || 0),
        );
        sorted.forEach((session) => {
          session._archived = archived || !String(session.date_start || '').startsWith('2026');
        });
        setSessions(sorted);
      } catch (loadError) {
        if (!cancelled) {
          setSessions([]);
          setLoadError(loadError.message || 'Unable to load session data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, []);

  const raceSessionMap = useMemo(() => buildRaceSessionMap(sessions), [sessions]);
  const defaultRaceId = useMemo(
    () => getDefaultRaceId(raceSessionMap),
    [raceSessionMap],
  );

  useEffect(() => {
    if (!selectedRaceId && defaultRaceId) {
      setSelectedRaceId(defaultRaceId);
      return;
    }

    if (
      selectedRaceId &&
      !RACES.some((race) => race.id === selectedRaceId) &&
      defaultRaceId
    ) {
      setSelectedRaceId(defaultRaceId);
    }
  }, [defaultRaceId, selectedRaceId]);

  const fetchDashboardData = useCallback(async (sessionKey) => {
    if (!sessionKey) return;
    const [positionData, lapData, intervalData, weatherData, raceControlData, stintData, driverData, pitData] =
      await Promise.allSettled([
        openF1Fetch('position', { session_key: sessionKey }),
        openF1Fetch('laps', { session_key: sessionKey }),
        openF1Fetch('intervals', { session_key: sessionKey }),
        openF1Fetch('weather', { session_key: sessionKey }),
        openF1Fetch('race_control', { session_key: sessionKey }),
        openF1Fetch('stints', { session_key: sessionKey }),
        openF1Fetch('drivers', { session_key: sessionKey }),
        openF1Fetch('pit', { session_key: sessionKey }),
      ]);

    if (positionData.status === 'fulfilled') setPositions(positionData.value);
    if (lapData.status === 'fulfilled') setLaps(lapData.value);
    if (intervalData.status === 'fulfilled') setIntervals(intervalData.value);
    if (weatherData.status === 'fulfilled') {
      setWeather(weatherData.value[weatherData.value.length - 1] || null);
    }
    if (raceControlData.status === 'fulfilled') setRaceControl(raceControlData.value);
    if (stintData.status === 'fulfilled') setStints(stintData.value);
    if (driverData.status === 'fulfilled') setDrivers(driverData.value);
    if (pitData.status === 'fulfilled') setPits(pitData.value);

    const failedCalls = [
      positionData,
      lapData,
      intervalData,
      weatherData,
      raceControlData,
      stintData,
      driverData,
      pitData,
    ].filter((result) => result.status === 'rejected');

    if (failedCalls.length === 8) {
      throw new Error('Live timing endpoints did not return data for this session.');
    }

    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    if (!selectedSession) return undefined;

    const session = sessions.find(
      (entry) => String(entry.session_key) === String(selectedSession),
    );
    const sessionState = session ? getSessionState(session) : null;

    if (sessionState === 'upcoming' || sessionState === 'scheduled') {
      setRefreshing(false);
      setPositions([]);
      setLaps([]);
      setIntervals([]);
      setWeather(null);
      setRaceControl([]);
      setStints([]);
      setDrivers([]);
      setPits([]);
      setLastUpdate(null);
      setDashboardError('');
      return undefined;
    }

    let cancelled = false;

    async function runFetch() {
      setRefreshing(true);
      setPositions([]);
      setLaps([]);
      setIntervals([]);
      setWeather(null);
      setRaceControl([]);
      setStints([]);
      setDrivers([]);
      setPits([]);
      try {
        await fetchDashboardData(selectedSession);
        if (!cancelled) setDashboardError('');
      } catch (fetchError) {
        if (!cancelled) {
          setDashboardError(
            fetchError.message || 'Unable to refresh live timing.',
          );
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    runFetch();
    return () => {
      cancelled = true;
    };
  }, [fetchDashboardData, selectedSession, sessions]);

  useEffect(() => {
    if (selectedSession) return;

    setPositions([]);
    setLaps([]);
    setIntervals([]);
    setWeather(null);
    setRaceControl([]);
    setStints([]);
    setDrivers([]);
    setPits([]);
    setLastUpdate(null);
    setDashboardError('');
  }, [selectedSession]);

  useEffect(() => {
    if (!selectedSession) return undefined;
    const session = sessions.find(
      (entry) => String(entry.session_key) === String(selectedSession),
    );
    const isLive =
      session &&
      session.date_end &&
      new Date(session.date_end) > new Date() &&
      !session._archived;

    if (isLive) {
      autoRefreshRef.current = setInterval(() => {
        fetchDashboardData(selectedSession).catch(() => null);
      }, 10000);
    }

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [fetchDashboardData, selectedSession, sessions]);

  const selectedRace = useMemo(
    () =>
      RACES.find((race) => race.id === selectedRaceId) ||
      RACES.find((race) => race.id === defaultRaceId) ||
      RACES[0] ||
      null,
    [defaultRaceId, selectedRaceId],
  );
  const selectedRaceSessions = useMemo(
    () => (selectedRace ? raceSessionMap.get(selectedRace.id) || [] : []),
    [raceSessionMap, selectedRace],
  );

  useEffect(() => {
    if (!selectedRace) return;

    if (!selectedRaceSessions.length) {
      if (selectedSession !== null) setSelectedSession(null);
      return;
    }

    const stillValid = selectedRaceSessions.some(
      (session) => String(session.session_key) === String(selectedSession),
    );
    if (stillValid) return;

    const preferredSession = getPreferredSession(selectedRaceSessions);
    setSelectedSession(preferredSession?.session_key || null);
  }, [selectedRace, selectedRaceSessions, selectedSession]);

  const currentSession =
    selectedRaceSessions.find(
      (session) => String(session.session_key) === String(selectedSession),
    ) || null;
  const currentSessionState = currentSession ? getSessionState(currentSession) : null;
  const isLive = Boolean(currentSessionState === 'live' && !currentSession?._archived);
  const selectedRaceStatus = useMemo(() => {
    if (!selectedRace) return '';
    if (!selectedRaceSessions.length) return 'No published sessions yet';
    if (selectedRaceSessions.some(isLiveSession)) return 'Live weekend';

    const nextScheduledSession = selectedRaceSessions.find(
      (session) => getSessionState(session) === 'upcoming',
    );
    if (nextScheduledSession) {
      return `Next: ${sessionShortLabel(nextScheduledSession)}`;
    }

    if (selectedRaceSessions.some((session) => session._archived)) {
      return 'Archived replay available';
    }

    return 'Weekend data available';
  }, [selectedRace, selectedRaceSessions]);
  const selectedRaceHasArchived = selectedRaceSessions.some(
    (session) => session._archived,
  );
  const anyRaceHasSessions = useMemo(
    () =>
      RACES.some((race) => (raceSessionMap.get(race.id) || []).length > 0),
    [raceSessionMap],
  );

  const driverMap = useMemo(() => {
    const map = {};
    (drivers || []).forEach((driver) => {
      const localDriver = getDriverByNumber(driver.driver_number);
      const team = localDriver ? getTeam(localDriver.team) : null;
      map[driver.driver_number] = {
        ...driver,
        name:
          driver.full_name ||
          `${driver.first_name || ''} ${driver.last_name || ''}`.trim() ||
          driver.broadcast_name ||
          driver.name_acronym ||
          `#${driver.driver_number}`,
        teamName: driver.team_name || team?.name || '',
        teamColor:
          driver.team_colour
            ? `#${String(driver.team_colour).replace(/^#/, '')}`
            : team?.color || '#555',
      };
    });
    return map;
  }, [drivers]);

  const timingTower = useMemo(() => {
    if (!positions.length) return [];
    const latestPosition = {};
    positions.forEach((position) => {
      if (
        !latestPosition[position.driver_number] ||
        new Date(position.date) > new Date(latestPosition[position.driver_number].date)
      ) {
        latestPosition[position.driver_number] = position;
      }
    });

    const latestInterval = {};
    intervals.forEach((interval) => {
      if (
        !latestInterval[interval.driver_number] ||
        new Date(interval.date) > new Date(latestInterval[interval.driver_number].date)
      ) {
        latestInterval[interval.driver_number] = interval;
      }
    });

    const bestLap = {};
    const latestLap = {};
    let overallBest = Infinity;
    laps.forEach((lap) => {
      if (lap.lap_duration && lap.lap_duration > 0) {
        if (!bestLap[lap.driver_number] || lap.lap_duration < bestLap[lap.driver_number]) {
          bestLap[lap.driver_number] = lap.lap_duration;
        }
        if (lap.lap_duration < overallBest) overallBest = lap.lap_duration;
      }
      if (
        !latestLap[lap.driver_number] ||
        lap.lap_number > (latestLap[lap.driver_number].lap_number || 0)
      ) {
        latestLap[lap.driver_number] = lap;
      }
    });

    const latestStint = {};
    stints.forEach((stint) => {
      if (
        !latestStint[stint.driver_number] ||
        stint.stint_number > (latestStint[stint.driver_number].stint_number || 0)
      ) {
        latestStint[stint.driver_number] = stint;
      }
    });

    return Object.values(latestPosition)
      .sort((left, right) => left.position - right.position)
      .map((position) => {
        const openF1Driver = driverMap[position.driver_number];
        const localDriver = getDriverByNumber(position.driver_number);
        const team = localDriver ? getTeam(localDriver.team) : null;
        const interval = latestInterval[position.driver_number];
        const lap = latestLap[position.driver_number];
        const lapTime = lap?.lap_duration || null;
        const best = bestLap[position.driver_number] || null;
        return {
          position: position.position,
          driverNumber: position.driver_number,
          shortName:
            openF1Driver?.name_acronym ||
            (openF1Driver?.name
              ? openF1Driver.name.split(' ').pop().slice(0, 3).toUpperCase()
              : localDriver
                ? localDriver.name.split(' ').pop().slice(0, 3).toUpperCase()
                : `#${position.driver_number}`),
          teamName: openF1Driver?.teamName || team?.name || '',
          teamColor: openF1Driver?.teamColor || team?.color || '#555',
          gap: interval?.gap_to_leader ?? null,
          interval: interval?.interval ?? null,
          lastLap: lapTime,
          bestLap: best,
          lapClass:
            lapTime && lapTime === overallBest ? 'fastest' : lapTime && lapTime === best ? 'personal-best' : '',
          tyre: latestStint[position.driver_number]?.compound?.toLowerCase() || null,
          tyreLaps:
            latestStint[position.driver_number] && lap
              ? (lap.lap_number || 0) - (latestStint[position.driver_number].lap_start || 0) + 1
              : null,
        };
      });
  }, [driverMap, intervals, laps, positions, stints]);

  const totalLaps = useMemo(
    () => (laps.length ? Math.max(...laps.map((lap) => lap.lap_number || 0)) : 0),
    [laps],
  );
  const fastestLapEntry = useMemo(
    () =>
      [...timingTower]
        .filter((row) => row.bestLap)
        .sort((left, right) => left.bestLap - right.bestLap)[0] || null,
    [timingTower],
  );
  const recentRaceControl = useMemo(
    () =>
      [...raceControl]
        .sort(
          (left, right) =>
            new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime(),
        )
        .slice(0, 30),
    [raceControl],
  );
  const trackStatus = useMemo(() => {
    const latestMessage = recentRaceControl[0];
    const source = String(
      latestMessage?.flag || latestMessage?.category || latestMessage?.message || '',
    ).toLowerCase();

    if (!source) return isLive ? 'Green' : 'Clear';
    if (source.includes('red')) return 'Red Flag';
    if (source.includes('yellow') || source.includes('safety') || source.includes('vsc')) {
      return 'Yellow';
    }
    if (source.includes('blue')) return 'Blue Flag';
    if (source.includes('chequered') || source.includes('checkered')) {
      return 'Chequered';
    }
    if (source.includes('green')) return 'Green';

    return latestMessage?.category || latestMessage?.flag || 'Clear';
  }, [isLive, recentRaceControl]);
  const latestPitStop = useMemo(() => {
    if (!pits.length) return null;

    const latestPit = [...pits].sort(
      (left, right) =>
        new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime(),
    )[0];
    const openF1Driver = driverMap[latestPit.driver_number];
    const localDriver = getDriverByNumber(latestPit.driver_number);

    return {
      displayName:
        openF1Driver?.name_acronym ||
        (openF1Driver?.name
          ? openF1Driver.name.split(' ').pop().slice(0, 3).toUpperCase()
          : localDriver
            ? localDriver.name.split(' ').pop().slice(0, 3).toUpperCase()
            : `#${latestPit.driver_number}`),
      lapNumber: latestPit.lap_number || null,
      duration: latestPit.pit_duration ?? latestPit.duration ?? latestPit.lane_time ?? null,
    };
  }, [driverMap, pits]);
  const tyreMix = useMemo(() => {
    const counts = new Map();

    timingTower.forEach((row) => {
      if (!row.tyre) return;
      counts.set(row.tyre, (counts.get(row.tyre) || 0) + 1);
    });

    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [timingTower]);

  const handleManualRefresh = async () => {
    const session = sessions.find(
      (entry) => String(entry.session_key) === String(selectedSession),
    );
    const sessionState = session ? getSessionState(session) : null;
    if (!selectedSession || sessionState === 'upcoming' || sessionState === 'scheduled') {
      return;
    }

    setRefreshing(true);
    try {
      await fetchDashboardData(selectedSession);
      setDashboardError('');
    } catch (refreshError) {
      setDashboardError(
        refreshError.message || 'Unable to refresh live timing.',
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return html`<${Spinner} />`;

  return html`<div class="live-dashboard">
    <div class="live-dash-header">
      <div>
        <h1 class="live-dash-title">Live Timing</h1>
        <div class="live-dash-session-info">
          <span class=${`live-dash-session-badge ${isLive ? 'live' : ''}`}>
            ${isLive && html`<span class="live-dot"></span>`}
            ${selectedRace
              ? currentSession
                ? `${selectedRace.name} - ${sessionShortLabel(currentSession)}`
                : selectedRace.name
              : '2026 Season'}
          </span>
          ${selectedRaceStatus &&
          html`<span class="live-dash-session-meta">${selectedRaceStatus}</span>`}
          ${selectedRaceHasArchived &&
          html`<span class="session-source-badge archived">Archived</span>`}
        </div>
      </div>

      <div class="live-refresh-group">
        ${lastUpdate &&
        html`<span class="live-refresh-note">Updated ${formatTimeAgo(lastUpdate)}</span>`}
        <button
          class=${`live-dash-refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick=${handleManualRefresh}
          disabled=${
            refreshing ||
            !selectedSession ||
            currentSessionState === 'upcoming' ||
            currentSessionState === 'scheduled'
          }
        >
          <${RefreshIcon} /> Refresh
        </button>
      </div>
    </div>

    ${loadError &&
    html`<div class="page-note page-note--warning">
      ${loadError}
    </div>`}
    ${dashboardError &&
    html`<div class="page-note page-note--warning">
      ${dashboardError}
    </div>`}

    <div class="live-session-browser">
      <div class="live-session-browser-main">
        <div class="live-session-browser-header">
          <div class="live-session-browser-copy">
            <div class="live-session-browser-kicker">2026 Weekend Selector</div>
            <div class="live-race-select">
              <${RaceSelect}
                value=${selectedRace?.id || null}
                onChange=${(raceId) => {
                  const nextRace = RACES.find((race) => race.id === raceId) || null;
                  const nextRaceSessions = nextRace ? raceSessionMap.get(nextRace.id) || [] : [];
                  setSelectedRaceId(raceId);
                  setSelectedSession(
                    getPreferredSession(nextRaceSessions)?.session_key || null,
                  );
                }}
              />
            </div>
            ${selectedRace &&
            html`<div class="live-session-browser-meta">
              <span>${selectedRace.race_date_label}</span>
              <span>${selectedRaceStatus}</span>
            </div>`}
          </div>

          ${selectedRace &&
          html`<div class="live-session-highlight">
            <div class="live-session-highlight-label">
              ${currentSession ? formatSessionStateLabel(currentSession) : 'Weekend status'}
            </div>
            <div class="live-session-highlight-value">
              ${currentSession ? sessionShortLabel(currentSession) : 'No session selected'}
            </div>
            <div class="live-session-highlight-meta">
              ${currentSession?.date_start
                ? formatDateTime(currentSession.date_start)
                : selectedRaceStatus}
            </div>
          </div>`}
        </div>

        ${selectedRaceSessions.length
          ? html`<div class="pill-tabs live-session-tabs">
              ${selectedRaceSessions.map((session) => {
                const sessionState = getSessionState(session);
                return html`<button
                  type="button"
                  key=${session.session_key}
                  class=${`pill-tab live-session-tab ${String(session.session_key) === String(selectedSession) ? 'active' : ''} ${sessionState === 'live' ? 'is-live' : ''}`}
                  onClick=${() => setSelectedSession(session.session_key)}
                  title=${session.date_start
                    ? formatDateTime(session.date_start)
                    : sessionLabel(session)}
                >
                  ${sessionState === 'live' && html`<span class="live-session-tab-dot"></span>`}
                  ${sessionShortLabel(session)}
                </button>`;
              })}
            </div>`
          : html`<div class="live-no-session-card">
              <h3 class="live-no-session-title">No session tabs yet</h3>
              <p class="live-no-session-text">
                ${anyRaceHasSessions
                  ? `OpenF1 has not published weekend sessions for ${selectedRace?.name || 'this race'} yet.`
                  : 'OpenF1 has not published this season\'s live weekend sessions yet.'}
              </p>
            </div>`}

        ${currentSession &&
        html`<div class="live-session-meta">
          <span>${sessionLabel(currentSession)}</span>
          ${currentSession.date_start &&
          html`<span>${formatDateTime(currentSession.date_start)}</span>`}
          ${currentSession._archived && html`<span>Archived source</span>`}
        </div>`}
      </div>
    </div>
    ${currentSession &&
    html`<div class="live-kpi-row">
      <div class="live-kpi-card">
        <div class="live-kpi-label">Leader</div>
        <div class="live-kpi-value">${timingTower[0]?.shortName || '-'}</div>
        <div class="live-kpi-meta">${timingTower[0]?.teamName || 'Waiting on timing'}</div>
      </div>
      <div class="live-kpi-card">
        <div class="live-kpi-label">Laps</div>
        <div class="live-kpi-value">${totalLaps || '-'}</div>
        <div class="live-kpi-meta">${sessionShortLabel(currentSession)}</div>
      </div>
      <div class="live-kpi-card">
        <div class="live-kpi-label">Fastest Lap</div>
        <div class="live-kpi-value">
          ${fastestLapEntry?.bestLap ? formatLapTime(fastestLapEntry.bestLap) : '-'}
        </div>
        <div class="live-kpi-meta">${fastestLapEntry?.shortName || 'No lap times'}</div>
      </div>
      <div class="live-kpi-card">
        <div class="live-kpi-label">Track Status</div>
        <div class="live-kpi-value">${trackStatus}</div>
        <div class="live-kpi-meta">
          ${recentRaceControl[0]?.date
            ? new Date(recentRaceControl[0].date).toLocaleTimeString()
            : 'No control notes'}
        </div>
      </div>
      <div class="live-kpi-card">
        <div class="live-kpi-label">Pit Stops</div>
        <div class="live-kpi-value">${pits.length || 0}</div>
        <div class="live-kpi-meta">
          ${latestPitStop
            ? `${latestPitStop.displayName}${latestPitStop.lapNumber ? ` - Lap ${latestPitStop.lapNumber}` : ''}`
            : 'No pit activity logged'}
        </div>
      </div>
      <div class="live-kpi-card">
        <div class="live-kpi-label">Air Temp</div>
        <div class="live-kpi-value">${weather?.air_temperature ?? '-'} degC</div>
        <div class="live-kpi-meta">
          ${weather ? `Track ${weather.track_temperature ?? '-'} deg` : 'Weather pending'}
        </div>
      </div>
    </div>`}
    ${!currentSession &&
    html`<div class="live-empty-state-card">
      <${InlineMessage}
        title=${selectedRaceSessions.length
          ? 'Choose a session tab'
          : 'No live timing selected'}
        text=${selectedRaceSessions.length
          ? 'Select FP1, qualifying, sprint, or race above to load timing for this weekend.'
          : 'Choose another race from the dropdown, or check back closer to this event for published sessions.'}
      />
    </div>`}

    ${currentSession &&
    html`<div class="live-dash-grid">
      <div class="live-panel panel-timing">
        <div class="live-panel-header">
          <h3 class="live-panel-title">Times</h3>
          <span class="live-panel-subtitle">
            ${isLive ? 'Live session' : currentSession?._archived ? 'Archived replay' : 'Latest available'}
          </span>
        </div>
        <div class="live-panel-body">
          ${timingTower.length === 0
            ? html`<${InlineMessage}
                title="No timing data yet"
                text=${
                  currentSessionState === 'upcoming' || currentSessionState === 'scheduled'
                    ? 'Timing will appear once this session begins.'
                    : 'Position data has not been published for this session.'
                }
              />`
            : html`<table class="timing-tower">
                <colgroup>
                  <col style=${{ width: '52px' }} />
                  <col />
                  <col style=${{ width: '74px' }} />
                  <col style=${{ width: '60px' }} />
                  <col style=${{ width: '82px' }} />
                  <col style=${{ width: '82px' }} />
                  <col style=${{ width: '74px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Driver</th>
                    <th class="right">Gap</th>
                    <th class="right">Int</th>
                    <th class="right">Last</th>
                    <th class="right">Best</th>
                    <th class="right">Tyre</th>
                  </tr>
                </thead>
                <tbody>
                  ${timingTower.map((row) => html`<tr key=${row.driverNumber}>
                    <td>
                      <span class=${`timing-pos ${row.position === 1 ? 'p1' : row.position === 2 ? 'p2' : row.position === 3 ? 'p3' : ''}`}>
                        ${row.position}
                      </span>
                    </td>
                    <td>
                      <div class="timing-driver">
                        <div
                          class="timing-driver-color"
                          style=${{ background: row.teamColor }}
                        ></div>
                        <div class="timing-driver-text">
                          <span class="timing-driver-name">${row.shortName}</span>
                          <span class="timing-driver-team">${row.teamName}</span>
                        </div>
                      </div>
                    </td>
                    <td class="right">
                      <span class=${`timing-gap ${row.position === 1 ? 'leader' : ''}`}>
                        ${row.position === 1
                          ? 'LEADER'
                          : row.gap != null
                            ? `+${typeof row.gap === 'number' ? row.gap.toFixed(3) : row.gap}`
                            : '-'}
                      </span>
                    </td>
                    <td class="right mono">
                      ${row.position === 1
                        ? '-'
                        : row.interval != null
                          ? `+${typeof row.interval === 'number' ? row.interval.toFixed(3) : row.interval}`
                          : '-'}
                    </td>
                    <td class="right mono">
                      <span class=${`lap-time ${row.lapClass}`}>${row.lastLap ? formatLapTime(row.lastLap) : '-'}</span>
                    </td>
                    <td class="right mono">${row.bestLap ? formatLapTime(row.bestLap) : '-'}</td>
                    <td class="right">
                      ${row.tyre
                        ? html`<div class="timing-tyre">
                            <span class=${`tyre-badge ${row.tyre}`}>${row.tyre.charAt(0).toUpperCase()}</span>
                            ${row.tyreLaps != null && html`<span class="tyre-laps">${row.tyreLaps}L</span>`}
                          </div>`
                        : '-'}
                    </td>
                  </tr>`) }
                </tbody>
              </table>`}
        </div>
      </div>

      <div class="live-panel panel-weather">
        <div class="live-panel-header">
          <h3 class="live-panel-title">Weather</h3>
        </div>
        <div class="live-panel-body">
          ${!weather
            ? html`<${InlineMessage}
                title="No weather data"
                text=${
                  currentSessionState === 'upcoming' || currentSessionState === 'scheduled'
                    ? 'Weather updates will appear once this session begins.'
                    : 'OpenF1 has not published weather updates for this session.'
                }
              />`
            : html`<div class="weather-grid">
                <div class="weather-stat">
                  <div class="weather-stat-value">${weather.air_temperature ?? '-'} deg</div>
                  <div class="weather-stat-label">Air</div>
                </div>
                <div class="weather-stat">
                  <div class="weather-stat-value">${weather.track_temperature ?? '-'} deg</div>
                  <div class="weather-stat-label">Track</div>
                </div>
                <div class="weather-stat">
                  <div class="weather-stat-value">${weather.wind_speed ?? '-'} km/h</div>
                  <div class="weather-stat-label">Wind</div>
                </div>
                <div class="weather-stat">
                  <div class="weather-stat-value">${weather.humidity ?? '-'}%</div>
                  <div class="weather-stat-label">Humidity</div>
                </div>
                <div class="weather-stat">
                  <div class="weather-stat-value">${weather.rainfall ? 'Yes' : 'No'}</div>
                  <div class="weather-stat-label">Rain</div>
                </div>
                <div class="weather-stat">
                  <div class="weather-stat-value">${weather.pressure ?? '-'} hPa</div>
                  <div class="weather-stat-label">Pressure</div>
                </div>
              </div>`}
        </div>
      </div>

      <div class="live-panel panel-race-control">
        <div class="live-panel-header">
          <h3 class="live-panel-title">Race Control</h3>
          ${raceControl.length > 0 && html`<span class="live-panel-subtitle">${raceControl.length} messages</span>`}
        </div>
        <div class="live-panel-body live-panel-body--race-control">
          ${recentRaceControl.length === 0
            ? html`<${InlineMessage}
                title="No race control notes"
                text="Messages will appear here when the session publishes them."
              />`
            : html`<div class="rc-messages">
                ${recentRaceControl.slice(0, 14).map((message, index) => html`<div
                  key=${index}
                  class="rc-message"
                >
                  <div class=${`rc-message-flag ${getFlagClass(message.flag || message.category || '')}`}></div>
                  <div class="rc-message-content">
                    <div class="rc-message-text">${message.message || message.category || '-'}</div>
                    <div class="rc-message-meta">
                      ${message.lap_number ? `Lap ${message.lap_number}` : ''}
                      ${message.date ? ` - ${new Date(message.date).toLocaleTimeString()}` : ''}
                    </div>
                  </div>
                </div>`) }
              </div>`}

          <div class="race-control-insights">
            <div class="race-control-insight">
              <div class="race-control-insight-label">Track status</div>
              <div class="race-control-insight-value">${trackStatus}</div>
              <div class="race-control-insight-meta">
                ${recentRaceControl[0]?.date
                  ? `Updated ${new Date(recentRaceControl[0].date).toLocaleTimeString()}`
                  : 'No active control updates'}
              </div>
            </div>
            <div class="race-control-insight">
              <div class="race-control-insight-label">Latest pit</div>
              <div class="race-control-insight-value">${latestPitStop?.displayName || '-'}</div>
              <div class="race-control-insight-meta">
                ${latestPitStop
                  ? `${latestPitStop.lapNumber ? `Lap ${latestPitStop.lapNumber}` : 'Pit event'} - ${formatStopDuration(latestPitStop.duration)}`
                  : 'No pit activity logged'}
              </div>
            </div>
            <div class="race-control-insight race-control-insight--wide">
              <div class="race-control-insight-label">Tyre mix</div>
              ${tyreMix.length
                ? html`<div class="tyre-mix-list">
                    ${tyreMix.map(([compound, count]) => html`<span key=${compound} class="tyre-mix-chip">
                      <span class=${`tyre-badge ${compound}`}>${compound.charAt(0).toUpperCase()}</span>
                      <span>${count}</span>
                    </span>`) }
                  </div>`
                : html`<div class="race-control-insight-meta">Tyre compounds will appear once stint data publishes.</div>`}
            </div>
          </div>
        </div>
      </div>
      <div class="live-panel panel-stints">
        <div class="live-panel-header">
          <h3 class="live-panel-title">Tyre Strategy</h3>
        </div>
        <div class="live-panel-body">
          ${stints.length === 0
            ? html`<${InlineMessage}
                title="No stint data"
                text="Tyre strategy data is not available for this session yet."
              />`
            : html`<${StintTimeline} stints=${stints} driverMap=${driverMap} totalLaps=${totalLaps} />`}
        </div>
      </div>
    </div>`}
  </div>`;
}

