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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
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
      const markets = (data.markets || []).map(m => ({
        driver: m.yes_sub_title || "",
        team: (m.subtitle || "").replace(":: ", ""),
        yes_ask: m.yes_ask || 0,
        yes_bid: m.yes_bid || 0,
        last_price: m.last_price || 0,
        volume: m.volume || 0,
        volume_24h: m.volume_24h || 0,
        ticker: m.ticker || "",
        status: m.status || ""
      })).sort((a, b) => b.last_price - a.last_price);

      return res.json({ markets, event_ticker: eventTicker, available: markets.length > 0 });
    }

    if (type === 'podium' && race_id) {
      const suffix = RACE_TICKER_MAP[Number(race_id)];
      if (!suffix) return res.status(404).json({ markets: [], available: false });

      const eventTicker = `KXF1RACEPODIUM-${suffix}`;
      const response = await fetch(`${KALSHI_BASE}/markets?event_ticker=${eventTicker}&limit=30`);
      if (!response.ok) return res.json({ markets: [], available: false });
      
      const data = await response.json();
      const markets = (data.markets || []).map(m => ({
        driver: m.yes_sub_title || "",
        team: (m.subtitle || "").replace(":: ", ""),
        yes_ask: m.yes_ask || 0,
        yes_bid: m.yes_bid || 0,
        last_price: m.last_price || 0,
        volume: m.volume || 0
      })).sort((a, b) => b.last_price - a.last_price);

      return res.json({ markets, available: markets.length > 0 });
    }

    if (type === 'championship') {
      const response = await fetch(`${KALSHI_BASE}/markets?event_ticker=KXF1-26&limit=30`);
      if (!response.ok) return res.json({ markets: [], available: false });
      
      const data = await response.json();
      const markets = (data.markets || []).map(m => ({
        driver: m.yes_sub_title || "",
        yes_ask: m.yes_ask || 0,
        yes_bid: m.yes_bid || 0,
        last_price: m.last_price || 0,
        volume: m.volume || 0
      })).sort((a, b) => b.last_price - a.last_price);

      return res.json({ markets, available: markets.length > 0 });
    }

    return res.status(400).json({ error: "Missing type parameter. Use type=race&race_id=1, type=podium&race_id=1, or type=championship" });
  } catch (err) {
    return res.status(500).json({ markets: [], available: false, error: err.message });
  }
}
