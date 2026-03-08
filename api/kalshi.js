// Vercel Serverless Function: Proxy for Kalshi F1 betting market data
// Deployed at /api/kalshi

const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";

// Map race IDs to Kalshi event ticker suffixes
const RACE_TICKER_MAP = {
  1: "AUSGP26", 2: "CHNGP26", 3: "JPNGP26", 4: "BAHGP26", 5: "SAUGP26",
  6: "MIAGP26", 7: "CANGP26", 8: "MONGP26", 9: "BARGP26", 10: "AUTGP26",
  11: "BRTGP26", 12: "BELGP26", 13: "HUNGP26", 14: "DUTGP26", 15: "ITLGP26",
  16: "SPAGP26", 17: "AZEGP26", 18: "SNGP26", 19: "USGP26", 20: "MEXGP26",
  21: "SAOPGP26", 22: "LASVGP26", 23: "QATGP26", 24: "ABUDGP26"
};

function toText(value) {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : String(value);
}

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function toKalshiCents(centsValue, dollarsValue) {
  if (centsValue !== undefined && centsValue !== null && centsValue !== "") {
    const numericValue = Number(centsValue);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  if (dollarsValue !== undefined && dollarsValue !== null && dollarsValue !== "") {
    const numericValue = Number(dollarsValue);
    if (Number.isFinite(numericValue)) return Math.round(numericValue * 100);
  }

  return 0;
}

function normalizeMarket(market, options = {}) {
  const includeMeta = Boolean(options.includeMeta);
  const normalized = {
    driver: toText(market?.driver || market?.yes_sub_title || market?.title),
    team: toText(market?.team || market?.subtitle).replace(":: ", ""),
    yes_ask: toKalshiCents(market?.yes_ask, market?.yes_ask_dollars),
    yes_bid: toKalshiCents(market?.yes_bid, market?.yes_bid_dollars),
    last_price: toKalshiCents(market?.last_price, market?.last_price_dollars),
    volume: toNumber(market?.volume),
    volume_24h: toNumber(market?.volume_24h ?? market?.volume_24h_fp),
  };

  if (includeMeta) {
    normalized.ticker = toText(market?.ticker);
    normalized.status = toText(market?.status || market?.result);
  }

  return normalized;
}

module.exports = async function handler(req, res) {
  // CORS — restrict to own domain when ALLOWED_ORIGIN is set
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "";
  const requestOrigin = req.headers.origin || "";
  if (allowedOrigin && requestOrigin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  } else if (!allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin || "*");
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { type, race_id } = req.query;

  try {
    if (type === 'race' && race_id) {
      const suffix = RACE_TICKER_MAP[Number(race_id)];
      if (!suffix) return res.status(404).json({ markets: [], available: false, error: "Unknown race ID" });

      const eventTicker = `KXF1RACE-${suffix}`;
      const response = await fetch(`${KALSHI_BASE}/markets?event_ticker=${eventTicker}&limit=30`);
      if (!response.ok) return res.json({ markets: [], event_ticker: eventTicker, available: false });
      
      const data = await response.json();
      const markets = (data.markets || [])
        .map((market) => normalizeMarket(market, { includeMeta: true }))
        .sort((a, b) => b.last_price - a.last_price);

      return res.json({ markets, event_ticker: eventTicker, available: markets.length > 0 });
    }

    if (type === 'podium' && race_id) {
      const suffix = RACE_TICKER_MAP[Number(race_id)];
      if (!suffix) return res.status(404).json({ markets: [], available: false });

      const eventTicker = `KXF1RACEPODIUM-${suffix}`;
      const response = await fetch(`${KALSHI_BASE}/markets?event_ticker=${eventTicker}&limit=30`);
      if (!response.ok) return res.json({ markets: [], available: false });
      
      const data = await response.json();
      const markets = (data.markets || [])
        .map((market) => normalizeMarket(market))
        .sort((a, b) => b.last_price - a.last_price);

      return res.json({ markets, available: markets.length > 0 });
    }

    if (type === 'championship') {
      const response = await fetch(`${KALSHI_BASE}/markets?event_ticker=KXF1-26&limit=30`);
      if (!response.ok) return res.json({ markets: [], available: false });
      
      const data = await response.json();
      const markets = (data.markets || [])
        .map((market) => normalizeMarket(market))
        .sort((a, b) => b.last_price - a.last_price);

      return res.json({ markets, available: markets.length > 0 });
    }

    return res.status(400).json({ error: "Missing type parameter. Use type=race&race_id=1, type=podium&race_id=1, or type=championship" });
  } catch (err) {
    return res.status(500).json({ markets: [], available: false, error: err.message });
  }
}

