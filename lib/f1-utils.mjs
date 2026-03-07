import { DRIVERS, RACES, TEAMS } from '../data/f1-data.mjs';

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

const DRIVER_LOOKUP = new Map(DRIVERS.map((driver) => [driver.id, driver]));
const DRIVER_NUMBER_LOOKUP = new Map(
  DRIVERS.map((driver) => [driver.number, driver]),
);
const TEAM_LOOKUP = new Map(TEAMS.map((team) => [team.id, team]));

export function getRace(raceId) {
  return RACES.find((race) => race.id === raceId) || null;
}

export function getTeam(teamId) {
  return TEAM_LOOKUP.get(teamId) || { name: '?', color: '#555', id: '' };
}

export function getDriver(driverId) {
  return DRIVER_LOOKUP.get(Number(driverId)) || null;
}

export function getDriverByNumber(number) {
  return DRIVER_NUMBER_LOOKUP.get(Number(number)) || null;
}

export function computeAccuracy(userRankings, actualResults) {
  if (!userRankings.length || !actualResults.length) return null;

  const actualMap = new Map();
  const actualDriverPosMap = new Map();
  const actualEventKeys = new Set();

  actualResults.forEach((result) => {
    const eventKey = `${result.race_id}|${result.race_type}`;
    actualEventKeys.add(eventKey);
    actualMap.set(
      `${result.race_id}|${result.race_type}|${result.position}`,
      result.driver_id,
    );
    actualDriverPosMap.set(
      `${result.race_id}|${result.race_type}|${result.driver_id}`,
      result.position,
    );
  });

  let totalCorrect = 0;
  let totalPredictions = 0;
  let totalPosDiff = 0;
  const racesWithResults = new Set();

  userRankings.forEach((prediction) => {
    const eventKey = `${prediction.race_id}|${prediction.race_type}`;
    if (!actualEventKeys.has(eventKey)) return;

    racesWithResults.add(eventKey);
    totalPredictions += 1;

    const actualDriverAtPosition = actualMap.get(
      `${prediction.race_id}|${prediction.race_type}|${prediction.position}`,
    );
    if (actualDriverAtPosition === prediction.driver_id) {
      totalCorrect += 1;
    }

    const actualPosition = actualDriverPosMap.get(
      `${prediction.race_id}|${prediction.race_type}|${prediction.driver_id}`,
    );
    totalPosDiff +=
      actualPosition !== undefined
        ? Math.abs(prediction.position - actualPosition)
        : 10;
  });

  if (!totalPredictions) return null;

  return {
    accuracy: Math.round((totalCorrect / totalPredictions) * 100),
    total_correct: totalCorrect,
    total_predictions: totalPredictions,
    position_diff_avg: Number((totalPosDiff / totalPredictions).toFixed(1)),
    races_with_results: racesWithResults.size,
    scored_events: racesWithResults.size,
  };
}

export function buildProfileSummary(profile, userRankings, actualResults) {
  const rankedEvents = new Set(
    (userRankings || []).map((ranking) => `${ranking.race_id}|${ranking.race_type}`),
  );
  const accuracy = computeAccuracy(userRankings || [], actualResults || []);

  return {
    ...profile,
    races_ranked: rankedEvents.size,
    scored_events: accuracy?.races_with_results || 0,
    accuracy,
  };
}

function getPointsTable(raceType) {
  return raceType === 'sprint' ? SPRINT_POINTS : POINTS;
}

export function buildConsensusSnapshot(rankings, raceType) {
  const filtered = (rankings || []).filter((ranking) => ranking.race_type === raceType);
  const positionsLimit = raceType === 'sprint' ? 8 : 10;

  if (!filtered.length) {
    return {
      ballotCount: 0,
      entries: [],
      consensusPredictions: [],
      maxPossible: 0,
      positionsLimit,
    };
  }

  const pointsTable = getPointsTable(raceType);
  const ballots = new Map();
  const statsByDriver = new Map();

  filtered.forEach((ranking) => {
    const ballotKey = ranking.user_id || ranking._username || 'unknown';
    if (!ballots.has(ballotKey)) ballots.set(ballotKey, true);

    const driverId = Number(ranking.driver_id);
    if (!statsByDriver.has(driverId)) {
      statsByDriver.set(driverId, {
        appearances: 0,
        avgPositionTotal: 0,
        driverId,
        podiumVotes: 0,
        rawPoints: 0,
        winVotes: 0,
      });
    }

    const points = pointsTable[ranking.position - 1] || 0;
    const current = statsByDriver.get(driverId);
    current.rawPoints += points;
    current.appearances += 1;
    current.avgPositionTotal += ranking.position;
    if (ranking.position <= 3) current.podiumVotes += 1;
    if (ranking.position === 1) current.winVotes += 1;
  });

  const ballotCount = ballots.size;
  const maxPossible = ballotCount * (pointsTable[0] || 0);

  const entries = [...statsByDriver.values()]
    .map((entry) => {
      const score = maxPossible ? Math.round((entry.rawPoints / maxPossible) * 1000) : 0;
      return {
        appearances: entry.appearances,
        avgPosition: entry.appearances
          ? Number((entry.avgPositionTotal / entry.appearances).toFixed(1))
          : null,
        ballotShare: ballotCount
          ? Math.round((entry.appearances / ballotCount) * 100)
          : 0,
        driverId: entry.driverId,
        podiumShare: ballotCount
          ? Math.round((entry.podiumVotes / ballotCount) * 100)
          : 0,
        powerRating: Number((score / 10).toFixed(1)),
        rawPoints: entry.rawPoints,
        score,
        winShare: ballotCount ? Math.round((entry.winVotes / ballotCount) * 100) : 0,
      };
    })
    .sort(
      (left, right) =>
        right.rawPoints - left.rawPoints ||
        right.podiumShare - left.podiumShare ||
        left.avgPosition - right.avgPosition ||
        left.driverId - right.driverId,
    );

  const consensusPredictions = entries.slice(0, positionsLimit).map((entry, index) => ({
    driver_id: entry.driverId,
    position: index + 1,
    race_type: raceType,
  }));

  return {
    ballotCount,
    consensusPredictions,
    entries,
    maxPossible,
    positionsLimit,
  };
}

export function computePowerScores(rankings, raceType) {
  return buildConsensusSnapshot(rankings, raceType).entries
    .map((entry) => ({
      driverId: entry.driverId,
      rawPoints: entry.rawPoints,
      score: entry.score,
    }))
    .slice(0, 10);
}

export function computeConsensusAccuracy(rankings, actualResults, raceType, raceId) {
  const scopedResults = (actualResults || []).filter(
    (result) =>
      result.race_type === raceType &&
      (raceId === undefined || raceId === null || result.race_id === raceId),
  );
  if (!scopedResults.length) return null;

  const snapshot = buildConsensusSnapshot(rankings, raceType);
  if (!snapshot.consensusPredictions.length) return null;

  const consensusRankings = snapshot.consensusPredictions.map((entry) => ({
    driver_id: entry.driver_id,
    position: entry.position,
    race_id: raceId,
    race_type: raceType,
  }));
  const accuracy = computeAccuracy(consensusRankings, scopedResults);
  if (!accuracy) return null;

  const actualPodium = [...scopedResults]
    .filter((result) => result.position >= 1 && result.position <= 3)
    .sort((left, right) => left.position - right.position)
    .map((result) => Number(result.driver_id));
  const consensusPodium = snapshot.entries
    .slice(0, 3)
    .map((entry) => Number(entry.driverId));

  return {
    ...accuracy,
    actual_podium: actualPodium,
    consensus_podium: consensusPodium,
    exact_podium:
      actualPodium.length === consensusPodium.length &&
      consensusPodium.every((driverId, index) => driverId === actualPodium[index]),
    podium_hits: consensusPodium.filter((driverId) => actualPodium.includes(driverId))
      .length,
  };
}

export function computeChampionshipData(rankings) {
  const driverPoints = new Map();

  (rankings || []).forEach((ranking) => {
    const points =
      ranking.race_type === 'sprint'
        ? SPRINT_POINTS[ranking.position - 1] || 0
        : POINTS[ranking.position - 1] || 0;
    driverPoints.set(
      ranking.driver_id,
      (driverPoints.get(ranking.driver_id) || 0) + points,
    );
  });

  const drivers = [...driverPoints.entries()]
    .map(([driver_id, points]) => ({ driver_id: Number(driver_id), points }))
    .sort((a, b) => b.points - a.points);

  const constructorPoints = new Map();
  drivers.forEach((entry) => {
    const driver = getDriver(entry.driver_id);
    if (!driver) return;
    constructorPoints.set(
      driver.team,
      (constructorPoints.get(driver.team) || 0) + entry.points,
    );
  });

  const constructors = [...constructorPoints.entries()]
    .map(([team_id, points]) => ({ team_id, points }))
    .sort((a, b) => b.points - a.points);

  return { drivers, constructors };
}

export function formatDateTime(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...options,
  }).format(date);
}

export function formatShortDate(value) {
  return formatDateTime(value, {
    hour: undefined,
    minute: undefined,
    timeZoneName: undefined,
  });
}

export function formatRelativeDeadline(targetDate, now = new Date()) {
  const diffMs = new Date(targetDate).getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (Math.abs(diffMins) < 60) {
    return diffMins >= 0 ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`;
  }

  const diffHours = Math.round(diffMins / 60);
  if (Math.abs(diffHours) < 48) {
    return diffHours >= 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return diffDays >= 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
}

export function getPredictionLock(race, raceType, now = new Date()) {
  const lockAt =
    raceType === 'sprint' && race.sprint && race.sprint_starts_at
      ? race.sprint_starts_at
      : race.race_starts_at;
  const isLocked = new Date(now).getTime() >= new Date(lockAt).getTime();
  const label =
    raceType === 'sprint'
      ? 'Sprint picks lock at sprint start'
      : 'Grand Prix picks lock at race start';

  return {
    isLocked,
    lockAt,
    label,
    relative: formatRelativeDeadline(lockAt, new Date(now)),
  };
}

export function getRaceTimeline(race) {
  const events = [];
  if (race.sprint && race.sprint_starts_at) {
    events.push({
      type: 'sprint',
      raceId: race.id,
      raceName: race.name,
      startsAt: race.sprint_starts_at,
      title: `${race.name} sprint deadline`,
    });
  }
  events.push({
    type: 'race',
    raceId: race.id,
    raceName: race.name,
    startsAt: race.race_starts_at,
    title: `${race.name} race deadline`,
  });
  return events.sort(
    (left, right) => new Date(left.startsAt) - new Date(right.startsAt),
  );
}

export function getNextPredictionDeadline(now = new Date()) {
  const upcoming = RACES.flatMap(getRaceTimeline)
    .filter((event) => new Date(event.startsAt) > new Date(now))
    .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt));

  return upcoming[0] || null;
}

export function getSeasonContext(now = new Date()) {
  const nowMs = new Date(now).getTime();
  const nextRace = RACES.find(
    (race) => new Date(race.race_starts_at).getTime() > nowMs,
  );
  const lastCompleted = [...RACES]
    .reverse()
    .find((race) => new Date(race.race_starts_at).getTime() <= nowMs);

  return {
    nextRace: nextRace || RACES[RACES.length - 1],
    lastCompleted,
    currentRound: nextRace ? nextRace.round : RACES[RACES.length - 1].round,
    completedRaces: RACES.filter(
      (race) => new Date(race.race_starts_at).getTime() <= nowMs,
    ).length,
  };
}

export function getRaceCardStatus(race, now = new Date()) {
  const nowMs = new Date(now).getTime();
  const raceStartMs = new Date(race.race_starts_at).getTime();
  if (raceStartMs <= nowMs) return 'completed';
  return 'open';
}

export function isLikelyLiveWindow(now = new Date()) {
  const nowMs = new Date(now).getTime();
  return RACES.some((race) => {
    const weekendAnchor = race.sprint_starts_at || race.race_starts_at;
    const startWindow = new Date(weekendAnchor).getTime() - 48 * 60 * 60 * 1000;
    const endWindow = new Date(race.race_starts_at).getTime() + 8 * 60 * 60 * 1000;
    return nowMs >= startWindow && nowMs <= endWindow;
  });
}

export function buildRaceSessionQueries(race, year) {
  const queries = [];
  if (race.meeting_key) {
    queries.push({ year, meeting_key: race.meeting_key });
  }
  if (race.meeting_name) {
    queries.push({ year, meeting_name: race.meeting_name });
  }
  if (race.country_name) {
    queries.push({ year, country_name: race.country_name });
  }
  if (race.location) {
    queries.push({ year, location: race.location });
  }
  return queries;
}

export function normalizeRouteFromHash(hashValue) {
  const rawHash = typeof hashValue === 'string' ? hashValue : '';
  const route = rawHash.replace(/^#/, '') || '/';
  return route === '/calendar' ? '/' : route;
}

export function formatLapTime(seconds) {
  if (!seconds || seconds <= 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
}

export function formatTimeAgo(dateValue) {
  const seconds = Math.floor((new Date() - new Date(dateValue)) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export function getFlagClass(flagValue) {
  const flag = (flagValue || '').toLowerCase();
  if (flag.includes('green')) return 'rc-flag-green';
  if (flag.includes('yellow') || flag.includes('vsc') || flag.includes('safety')) {
    return 'rc-flag-yellow';
  }
  if (flag.includes('red')) return 'rc-flag-red';
  if (flag.includes('blue')) return 'rc-flag-blue';
  if (flag.includes('chequered') || flag.includes('checkered')) {
    return 'rc-flag-chequered';
  }
  return 'rc-flag-default';
}

export function matchKalshiDriver(kalshiName) {
  if (!kalshiName) return null;
  const normalized = String(kalshiName || '').toLowerCase().trim();

  for (const driver of DRIVERS) {
    const lastName = driver.name.split(' ').pop().toLowerCase();
    if (normalized.includes(lastName)) return driver;
  }

  if (normalized.includes('hulkenberg')) return getDriver(27);
  if (normalized.includes('perez')) return getDriver(11);
  return null;
}

