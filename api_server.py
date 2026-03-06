#!/usr/bin/env python3
"""Proxy server for Kalshi F1 betting market data — avoids CORS issues."""

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2"

# Map our app's race IDs to Kalshi event ticker suffixes
# Kalshi uses short GP codes like AUSGP26, CHNGP26, etc.
RACE_TICKER_MAP = {
    1: "AUSGP26",    # Australian GP
    2: "CHNGP26",    # Chinese GP
    3: "JPNGP26",    # Japanese GP
    4: "BAHGP26",    # Bahrain GP
    5: "SAUGP26",    # Saudi Arabian GP
    6: "MIAGP26",    # Miami GP
    7: "CANGP26",    # Canadian GP
    8: "MONGP26",    # Monaco GP
    9: "BARGP26",    # Barcelona-Catalunya GP
    10: "AUTGP26",   # Austrian GP
    11: "BRTGP26",   # British GP
    12: "BELGP26",   # Belgian GP
    13: "HUNGP26",   # Hungarian GP
    14: "DUTGP26",   # Dutch GP
    15: "ITLGP26",   # Italian GP
    16: "SPAGP26",   # Spanish GP (Madrid)
    17: "AZEGP26",   # Azerbaijan GP
    18: "SNGP26",    # Singapore GP
    19: "USGP26",    # United States GP
    20: "MEXGP26",   # Mexico City GP
    21: "SAOPGP26",  # São Paulo GP
    22: "LASVGP26",  # Las Vegas GP
    23: "QATGP26",   # Qatar GP
    24: "ABUDGP26",  # Abu Dhabi GP
}

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = httpx.AsyncClient(timeout=15.0)


@app.get("/api/kalshi/race/{race_id}")
async def get_race_odds(race_id: int):
    """Get race winner odds from Kalshi for a given race_id."""
    suffix = RACE_TICKER_MAP.get(race_id)
    if not suffix:
        raise HTTPException(status_code=404, detail="Unknown race ID")

    event_ticker = f"KXF1RACE-{suffix}"
    url = f"{KALSHI_BASE}/markets?event_ticker={event_ticker}&limit=30"
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            return {"markets": [], "event_ticker": event_ticker, "available": False}
        data = resp.json()
        markets = data.get("markets", [])
        if not markets:
            return {"markets": [], "event_ticker": event_ticker, "available": False}

        results = []
        for m in markets:
            results.append({
                "driver": m.get("yes_sub_title", ""),
                "team": (m.get("subtitle", "") or "").replace(":: ", ""),
                "yes_ask": m.get("yes_ask", 0),
                "yes_bid": m.get("yes_bid", 0),
                "last_price": m.get("last_price", 0),
                "volume": m.get("volume", 0),
                "volume_24h": m.get("volume_24h", 0),
                "ticker": m.get("ticker", ""),
                "status": m.get("status", ""),
            })

        # Sort by last_price descending
        results.sort(key=lambda x: x["last_price"], reverse=True)
        return {"markets": results, "event_ticker": event_ticker, "available": True}

    except Exception as e:
        return {"markets": [], "event_ticker": event_ticker, "available": False, "error": str(e)}


@app.get("/api/kalshi/championship")
async def get_championship_odds():
    """Get F1 2026 WDC championship odds from Kalshi."""
    event_ticker = "KXF1-26"
    url = f"{KALSHI_BASE}/markets?event_ticker={event_ticker}&limit=30"
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            return {"markets": [], "available": False}
        data = resp.json()
        markets = data.get("markets", [])
        if not markets:
            return {"markets": [], "available": False}

        results = []
        for m in markets:
            results.append({
                "driver": m.get("yes_sub_title", ""),
                "yes_ask": m.get("yes_ask", 0),
                "yes_bid": m.get("yes_bid", 0),
                "last_price": m.get("last_price", 0),
                "volume": m.get("volume", 0),
            })

        results.sort(key=lambda x: x["last_price"], reverse=True)
        return {"markets": results, "available": True}

    except Exception:
        return {"markets": [], "available": False}


@app.get("/api/kalshi/podium/{race_id}")
async def get_podium_odds(race_id: int):
    """Get podium finish odds from Kalshi for a given race_id."""
    suffix = RACE_TICKER_MAP.get(race_id)
    if not suffix:
        raise HTTPException(status_code=404, detail="Unknown race ID")

    event_ticker = f"KXF1RACEPODIUM-{suffix}"
    url = f"{KALSHI_BASE}/markets?event_ticker={event_ticker}&limit=30"
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            return {"markets": [], "available": False}
        data = resp.json()
        markets = data.get("markets", [])
        if not markets:
            return {"markets": [], "available": False}

        results = []
        for m in markets:
            results.append({
                "driver": m.get("yes_sub_title", ""),
                "team": (m.get("subtitle", "") or "").replace(":: ", ""),
                "yes_ask": m.get("yes_ask", 0),
                "yes_bid": m.get("yes_bid", 0),
                "last_price": m.get("last_price", 0),
                "volume": m.get("volume", 0),
            })

        results.sort(key=lambda x: x["last_price"], reverse=True)
        return {"markets": results, "available": True}

    except Exception:
        return {"markets": [], "available": False}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
