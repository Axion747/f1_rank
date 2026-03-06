import { html, useEffect, useState } from '../lib/core.mjs';
import { kalshiFetch } from '../lib/app-utils.mjs';
import { getTeam, matchKalshiDriver } from '../lib/f1-utils.mjs';
import { InlineMessage, Spinner, TeamDot } from './app-components.mjs';

function DollarIcon() {
  return html`<svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="12" y1="2" x2="12" y2="22"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>`;
}

function ExternalLinkIcon() {
  return html`<svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>`;
}

export function BettingOddsTab({ raceId }) {
  const [loading, setLoading] = useState(true);
  const [oddsTab, setOddsTab] = useState('winner');
  const [winnerData, setWinnerData] = useState({ markets: [], available: false });
  const [podiumData, setPodiumData] = useState({ markets: [], available: false });
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchOdds() {
      setLoading(true);
      setError('');
      try {
        const [winnerResponse, podiumResponse] = await Promise.all([
          kalshiFetch('race', raceId),
          kalshiFetch('podium', raceId),
        ]);
        if (cancelled) return;
        setWinnerData(winnerResponse);
        setPodiumData(podiumResponse);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message || 'Unable to load market data right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOdds();
    return () => {
      cancelled = true;
    };
  }, [raceId]);

  if (loading) return html`<${Spinner} />`;

  if (error) {
    return html`<${InlineMessage}
      title="Market data unavailable"
      text=${error}
      action=${html`<a
        class="betting-kalshi-link"
        href="https://kalshi.com/browse/sports/formula-1"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Kalshi <${ExternalLinkIcon} />
      </a>`}
    />`;
  }

  const winnerAvailable = winnerData.available && winnerData.markets.length > 0;
  const podiumAvailable = podiumData.available && podiumData.markets.length > 0;

  if (!winnerAvailable && !podiumAvailable) {
    return html`<div class="betting-unavailable">
      <div class="betting-unavailable-icon"><${DollarIcon} /></div>
      <div class="betting-unavailable-title">Market odds not yet available</div>
      <p class="betting-unavailable-text">
        Kalshi markets usually appear closer to the race weekend.
      </p>
      <a
        class="betting-kalshi-link"
        href="https://kalshi.com/browse/sports/formula-1"
        target="_blank"
        rel="noopener noreferrer"
      >
        View F1 markets <${ExternalLinkIcon} />
      </a>
    </div>`;
  }

  const activeMarkets =
    oddsTab === 'winner' ? winnerData.markets || [] : podiumData.markets || [];
  const significantOdds = activeMarkets.filter(
    (market) => market.last_price > 1 || market.yes_ask > 1,
  );
  const longshots = activeMarkets.filter(
    (market) => market.last_price <= 1 && market.yes_ask <= 1,
  );

  return html`<div class="betting-container">
    <div class="betting-header">
      <div class="betting-header-left">
        <span class="betting-source">Powered by</span>
        <a
          class="betting-kalshi-brand"
          href="https://kalshi.com/browse/sports/formula-1"
          target="_blank"
          rel="noopener noreferrer"
        >
          Kalshi
        </a>
      </div>
      <div class="betting-header-right">
        <span class="betting-update-note">Live market prices</span>
      </div>
    </div>

    ${winnerAvailable && podiumAvailable
      ? html`<div class="betting-tabs">
          <button
            class=${`betting-tab ${oddsTab === 'winner' ? 'active' : ''}`}
            onClick=${() => setOddsTab('winner')}
          >
            Race Winner
          </button>
          <button
            class=${`betting-tab ${oddsTab === 'podium' ? 'active' : ''}`}
            onClick=${() => setOddsTab('podium')}
          >
            Podium Finish
          </button>
        </div>`
      : html`<div class="betting-section-label">
          ${winnerAvailable ? 'Race Winner' : 'Podium Finish'}
        </div>`}

    ${significantOdds.length > 0 &&
    html`<div class="betting-odds-list">
      ${significantOdds.map((market, index) => {
        const driver = matchKalshiDriver(market.driver);
        const team = driver ? getTeam(driver.team) : null;
        const impliedProbability = market.last_price;
        const barWidth = Math.min(impliedProbability, 100);

        return html`<div key=${market.ticker || index} class="betting-odds-row">
          <div class="betting-odds-rank">${index + 1}</div>
          <div class="betting-odds-driver">
            ${team
              ? html`<${TeamDot} teamId=${driver.team} size=${10} />`
              : html`<span class="betting-dot-placeholder"></span>`}
            <span class="betting-driver-name">${market.driver}</span>
            <span class="betting-driver-team">
              ${market.team || (team ? team.name : '')}
            </span>
          </div>
          <div class="betting-odds-bar-wrapper">
            <div
              class="betting-odds-bar"
              style=${{
                width: `${barWidth}%`,
                background: team ? team.color : 'var(--color-primary)',
              }}
            ></div>
          </div>
          <div class="betting-odds-values">
            <span class="betting-implied-prob">${impliedProbability}%</span>
            <span class="betting-price">${market.yes_bid}c / ${market.yes_ask}c</span>
          </div>
        </div>`;
      })}
    </div>`}

    ${longshots.length > 0 &&
    html`<details class="betting-longshots">
      <summary class="betting-longshots-toggle">
        ${longshots.length} longshot${longshots.length > 1 ? 's' : ''} at 1c or less
      </summary>
      <div class="betting-longshots-list">
        ${longshots.map((market, index) => {
          const driver = matchKalshiDriver(market.driver);
          const team = driver ? getTeam(driver.team) : null;
          return html`<div key=${market.ticker || index} class="betting-longshot-row">
            ${team ? html`<${TeamDot} teamId=${driver.team} size=${8} />` : null}
            <span class="betting-longshot-name">${market.driver}</span>
            <span class="betting-longshot-price"><=1c</span>
          </div>`;
        })}
      </div>
    </details>`}

    <div class="betting-legend">
      <div class="betting-legend-item">
        <span class="betting-legend-label">Implied probability</span>
        <span class="betting-legend-desc">Last trade price in cents.</span>
      </div>
      <div class="betting-legend-item">
        <span class="betting-legend-label">Bid / Ask</span>
        <span class="betting-legend-desc">Current buy and sell prices.</span>
      </div>
    </div>
  </div>`;
}
