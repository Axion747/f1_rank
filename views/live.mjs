import {
  html,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from '../lib/core.mjs';
import { openF1Fetch } from '../lib/app-utils.mjs';
import {
  formatLapTime,
  formatTimeAgo,
  getDriverByNumber,
  getFlagClass,
  getTeam,
} from '../lib/f1-utils.mjs';
import { InlineMessage, Spinner } from '../components/app-components.mjs';

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

function sessionLabel(session) {
  const raw = (session.session_name || session.session_type || '').replace(/_/g, ' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
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
        const maxLaps =
          totalLaps || Math.max(...driverStints.map((stint) => stint.lap_end || stint.lap_start || 0));
        return html`<tr key=${driverNumber}>
          <td>
            <span class="driver-cell">
              <span
                class="timing-driver-color"
                style=${{
                  background: driver?.teamColor || getTeam(driver?.team || '').color,
                }}
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
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
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
      setError('');
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
        setSelectedSession(sorted[0]?.session_key || null);
      } catch (loadError) {
        if (!cancelled) {
          setSessions([]);
          setError(loadError.message || 'Unable to load session data.');
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
        if (!cancelled) setError('');
      } catch (fetchError) {
        if (!cancelled) setError(fetchError.message || 'Unable to refresh live timing.');
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    runFetch();
    return () => {
      cancelled = true;
    };
  }, [fetchDashboardData, selectedSession]);

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

  const currentSession = sessions.find(
    (session) => String(session.session_key) === String(selectedSession),
  );
  const isLive = Boolean(
    currentSession &&
      currentSession.date_end &&
      new Date(currentSession.date_end) > new Date() &&
      !currentSession._archived,
  );

  const driverMap = useMemo(() => {
    const map = {};
    (drivers || []).forEach((driver) => {
      const localDriver = getDriverByNumber(driver.driver_number);
      const team = localDriver ? getTeam(localDriver.team) : null;
      map[driver.driver_number] = {
        ...driver,
        name: driver.full_name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim(),
        teamColor: driver.team_colour ? `#${driver.team_colour}` : team?.color || '#555',
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
            (localDriver ? localDriver.name.split(' ').pop().slice(0, 3).toUpperCase() : `#${position.driver_number}`),
          teamName: openF1Driver?.team_name || team?.name || '',
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

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData(selectedSession);
      setError('');
    } catch (refreshError) {
      setError(refreshError.message || 'Unable to refresh live timing.');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return html`<${Spinner} />`;
  if (error && !sessions.length) {
    return html`<${InlineMessage} title="Live timing unavailable" text=${error} />`;
  }
  if (!sessions.length) {
    return html`<${InlineMessage}
      title="No sessions available"
      text="Live timing will appear once OpenF1 publishes the season sessions."
    />`;
  }

  return html`<div class="live-dashboard">
    <div class="live-dash-header">
      <div>
        <h1 class="live-dash-title">Live Timing</h1>
        ${currentSession &&
        html`<div class="live-dash-session-info">
          <span class=${`live-dash-session-badge ${isLive ? 'live' : ''}`}>
            ${isLive && html`<span class="live-dot"></span>`}
            ${(currentSession.location || currentSession.circuit_short_name || '') +
            ' - ' +
            sessionLabel(currentSession)}
          </span>
          ${currentSession._archived &&
          html`<span class="session-source-badge archived">Archived</span>`}
        </div>`}
      </div>

      <div class="live-refresh-group">
        ${lastUpdate &&
        html`<span class="live-refresh-note">Updated ${formatTimeAgo(lastUpdate)}</span>`}
        <button
          class=${`live-dash-refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick=${handleManualRefresh}
          disabled=${refreshing}
        >
          <${RefreshIcon} /> Refresh
        </button>
      </div>
    </div>

    ${error &&
    html`<div class="page-note page-note--warning">
      ${error}
    </div>`}

    <div class="live-session-select">
      <select
        value=${selectedSession || ''}
        onChange=${(event) => setSelectedSession(event.target.value)}
      >
        ${sessions.map((session) => html`<option key=${session.session_key} value=${session.session_key}>
          ${sessionLabel(session)}
          ${session.date_start ? ` (${new Date(session.date_start).toLocaleDateString()})` : ''}
          ${session._archived ? ' - archived' : ''}
        </option>`)}
      </select>
    </div>

    ${timingTower.length > 0 &&
    html`<div class="live-kpi-row">
      <div class="live-kpi-card">
        <div class="live-kpi-value">${timingTower[0]?.shortName || '-'}</div>
        <div class="live-kpi-label">Leader</div>
      </div>
      <div class="live-kpi-card">
        <div class="live-kpi-value">${totalLaps || '-'}</div>
        <div class="live-kpi-label">Laps</div>
      </div>
      <div class="live-kpi-card">
        <div class="live-kpi-value">
          ${timingTower[0]?.bestLap ? formatLapTime(timingTower[0].bestLap) : '-'}
        </div>
        <div class="live-kpi-label">Fastest Lap</div>
      </div>
      <div class="live-kpi-card">
        <div class="live-kpi-value">${pits.length || 0}</div>
        <div class="live-kpi-label">Pit Stops</div>
      </div>
      ${weather &&
      html`<div class="live-kpi-card">
        <div class="live-kpi-value">${weather.air_temperature ?? '-'} degC</div>
        <div class="live-kpi-label">Air Temp</div>
      </div>`}
    </div>`}

    <div class="live-dash-grid">
      <div class="live-panel panel-timing">
        <div class="live-panel-header">
          <h3 class="live-panel-title">Timing Tower</h3>
          <span class="live-panel-subtitle">
            ${isLive ? 'Live session' : currentSession?._archived ? 'Archived replay' : 'Latest available'}
          </span>
        </div>
        <div class="live-panel-body">
          ${timingTower.length === 0
            ? html`<${InlineMessage}
                title="No timing data yet"
                text="Position data has not been published for this session."
              />`
            : html`<table class="timing-tower">
                <thead>
                  <tr>
                    <th style=${{ width: '40px' }}>Pos</th>
                    <th>Driver</th>
                    <th class="right">Gap</th>
                    <th class="right">Int</th>
                    <th class="right">Last Lap</th>
                    <th class="right">Best</th>
                    <th>Tyre</th>
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
                        <span class="timing-driver-name">${row.shortName}</span>
                        <span class="timing-driver-team">${row.teamName}</span>
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
                    <td>
                      ${row.tyre
                        ? html`<div class="timing-tyre">
                            <span class=${`tyre-badge ${row.tyre}`}>${row.tyre.charAt(0).toUpperCase()}</span>
                            ${row.tyreLaps != null && html`<span class="tyre-laps">${row.tyreLaps}L</span>`}
                          </div>`
                        : '-'}
                    </td>
                  </tr>`)}
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
                text="OpenF1 has not published weather updates for this session."
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
        <div class="live-panel-body">
          ${raceControl.length === 0
            ? html`<${InlineMessage}
                title="No race control notes"
                text="Messages will appear here when the session publishes them."
              />`
            : html`<div class="rc-messages">
                ${[...raceControl].reverse().slice(0, 30).map((message, index) => html`<div
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
                </div>`)}
              </div>`}
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
    </div>
  </div>`;
}
