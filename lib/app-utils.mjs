import {
  createContext,
  supabase,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from './core.mjs';
import { buildRaceSessionQueries, normalizeRouteFromHash } from './f1-utils.mjs';

const AuthContext = createContext(null);
const ToastContext = createContext(null);
const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2';
const KALSHI_RACE_TICKER_MAP = {
  1: 'AUSGP26',
  2: 'CHNGP26',
  3: 'JPNGP26',
  4: 'BAHGP26',
  5: 'SAUGP26',
  6: 'MIAGP26',
  7: 'CANGP26',
  8: 'MONGP26',
  9: 'BARGP26',
  10: 'AUTGP26',
  11: 'BRTGP26',
  12: 'BELGP26',
  13: 'HUNGP26',
  14: 'DUTGP26',
  15: 'ITLGP26',
  16: 'SPAGP26',
  17: 'AZEGP26',
  18: 'SNGP26',
  19: 'USGP26',
  20: 'MEXGP26',
  21: 'SAOPGP26',
  22: 'LASVGP26',
  23: 'QATGP26',
  24: 'ABUDGP26',
};

export function useAuth() {
  return useContext(AuthContext);
}

export function useToast() {
  return useContext(ToastContext);
}

export { AuthContext, ToastContext };

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getProxyBase() {
  const rawBase = String(window.__F1_RANK_CONFIG__?.proxyBase || '').trim();

  if (
    !rawBase ||
    rawBase === 'undefined' ||
    rawBase === 'null' ||
    rawBase.includes('<') ||
    rawBase.includes('>')
  ) {
    return '';
  }

  return rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
}

function getApiUrlCandidates(pathnameAndSearch) {
  const localUrl = pathnameAndSearch.startsWith('/')
    ? pathnameAndSearch
    : `/${pathnameAndSearch}`;
  const proxyBase = getProxyBase();

  if (!proxyBase) return [localUrl];

  const proxiedUrl = `${proxyBase}${localUrl}`;

  try {
    const proxyOrigin = new URL(proxyBase, window.location.origin).origin;
    if (proxyOrigin === window.location.origin) {
      return [...new Set([proxiedUrl, localUrl])];
    }
  } catch (error) {
    return [...new Set([localUrl, proxiedUrl])];
  }

  return [...new Set([localUrl, proxiedUrl])];
}

export function navigateTo(path) {
  window.location.hash = path;
}

export function useHashRoute() {
  const [route, setRoute] = useState(normalizeRouteFromHash(window.location.hash));

  useEffect(() => {
    const handleChange = () => {
      setRoute(normalizeRouteFromHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleChange);
    return () => window.removeEventListener('hashchange', handleChange);
  }, []);

  return [route, setRoute];
}

export function useDialog(onClose, isOpen = true) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const dialogNode = dialogRef.current;
    const previouslyFocused = document.activeElement;
    const bodyOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const focusableNodes = dialogNode?.querySelectorAll(focusableSelector);
      if (focusableNodes && focusableNodes.length > 0) {
        focusableNodes[0].focus();
      } else {
        dialogNode?.focus();
      }
    };

    const timer = window.setTimeout(focusFirst, 0);

    const handleKeyDown = (event) => {
      if (!dialogNode) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableNodes = [...dialogNode.querySelectorAll(focusableSelector)];
      if (!focusableNodes.length) {
        event.preventDefault();
        dialogNode.focus();
        return;
      }

      const first = focusableNodes[0];
      const last = focusableNodes[focusableNodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = bodyOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  return dialogRef;
}

export async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || `Request failed with ${response.status}`);
  }

  if (body?.error) {
    throw new Error(body.error);
  }

  return body;
}

async function fetchJsonWithFallback(urls) {
  let lastError = null;

  for (const url of urls) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Request failed.');
}

function buildKalshiDirectUrl(type, raceId) {
  if (type === 'championship') {
    return `${KALSHI_BASE}/markets?event_ticker=KXF1-26&limit=30`;
  }

  const suffix = KALSHI_RACE_TICKER_MAP[Number(raceId)];
  if (!suffix) {
    throw new Error('Unknown race ID for Kalshi market lookup.');
  }

  const eventTicker =
    type === 'podium' ? `KXF1RACEPODIUM-${suffix}` : `KXF1RACE-${suffix}`;
  return `${KALSHI_BASE}/markets?event_ticker=${eventTicker}&limit=30`;
}

export async function openF1Fetch(endpoint, params = {}) {
  const searchParams = new URLSearchParams({ endpoint });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });

  const body = await fetchJsonWithFallback(
    getApiUrlCandidates(`/api/openf1?${searchParams.toString()}`),
  );

  if (!Array.isArray(body.data)) {
    throw new Error('OpenF1 proxy returned an unexpected payload.');
  }

  return body.data;
}

export async function kalshiFetch(type, raceId) {
  const searchParams = new URLSearchParams({ type });
  if (raceId) searchParams.set('race_id', raceId);

  const localUrl = `/api/kalshi?${searchParams.toString()}`;
  const fallbackUrls = getApiUrlCandidates(localUrl);

  try {
    const directUrl = buildKalshiDirectUrl(type, raceId);
    return await fetchJsonWithFallback([
      ...new Set([localUrl, directUrl, ...fallbackUrls]),
    ]);
  } catch (error) {
    return fetchJsonWithFallback(fallbackUrls);
  }
}

export async function fetchRaceSessions(race) {
  let latestError = null;

  for (const year of [2026, 2025]) {
    const queries = buildRaceSessionQueries(race, year);
    for (const query of queries) {
      try {
        const sessions = await openF1Fetch('sessions', query);
        const filtered = (sessions || []).filter((session) => {
          const sessionName = (
            session.session_name ||
            session.session_type ||
            ''
          ).toLowerCase();
          return (
            sessionName.includes('practice') ||
            sessionName.includes('sprint') ||
            sessionName.includes('qualifying') ||
            sessionName.includes('quali')
          );
        });

        if (filtered.length > 0) {
          return {
            sessions: filtered,
            isArchived: year !== 2026,
            sourceYear: year,
          };
        }
      } catch (error) {
        latestError = error;
      }
    }
  }

  if (latestError) throw latestError;
  return { sessions: [], isArchived: false, sourceYear: 2026 };
}

export async function loadProfileSummary(username) {
  const { data, error } = await supabase.rpc('get_profile_summary', {
    target_username: username,
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}

export async function loadLeaderboardSummary() {
  const { data, error } = await supabase.rpc('get_leaderboard_summary');
  if (error) throw error;
  return data || [];
}

export async function loadDriverChampionshipSummary() {
  const { data, error } = await supabase.rpc('get_driver_championship_summary');
  if (error) throw error;
  return data || [];
}

export async function loadConstructorChampionshipSummary() {
  const { data, error } = await supabase.rpc(
    'get_constructor_championship_summary',
  );
  if (error) throw error;
  return data || [];
}

export async function loadRankingsWithProfiles(raceId, raceType) {
  const { data: rankings, error } = await supabase
    .from('rankings')
    .select('position, driver_id, user_id')
    .eq('race_id', raceId)
    .eq('race_type', raceType)
    .order('position');

  if (error) throw error;

  const userIds = [...new Set((rankings || []).map((row) => row.user_id))];
  let profiles = [];

  if (userIds.length > 0) {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', userIds);
    if (profileError) throw profileError;
    profiles = data || [];
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  return (rankings || []).map((ranking) => {
    const profile = profileMap.get(ranking.user_id);
    return {
      ...ranking,
      _username: profile?.username || ranking.user_id.slice(0, 8),
      _display_name:
        profile?.display_name || profile?.username || ranking.user_id.slice(0, 8),
    };
  });
}

export async function fallbackProfileSummary(username) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (profileError) throw profileError;

  const { data: userRankings, error: rankingsError } = await supabase
    .from('rankings')
    .select('race_id, position, driver_id, race_type, user_id')
    .eq('user_id', profile.id);

  if (rankingsError) throw rankingsError;

  const { data: actualResults, error: resultsError } = await supabase
    .from('actual_results')
    .select('race_id, position, driver_id, race_type');

  if (resultsError) throw resultsError;

  return { profile, userRankings: userRankings || [], actualResults: actualResults || [] };
}

