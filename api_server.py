#!/usr/bin/env python3
"""Proxy server for Kalshi F1 betting + OpenF1 live timing data."""

import os
import time
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2"
OPENF1_BASE = "https://api.openf1.org/v1"
OPENF1_TOKEN_URL = "https://api.openf1.org/token"

# OpenF1 credentials (server-side only)
OPENF1_USERNAME = os.getenv("OPENF1_USERNAME", "")
OPENF1_PASSWORD = os.getenv("OPENF1_PASSWORD", "")

# Token cache
_openf1_token = None
_openf1_token_expires = 0

# Map our app's race IDs to Kalshi event ticker suffixes
RACE_TICKER_MAP = {
    1: "AUSGP26", 2: "CHNGP26", 3: "JPNGP26", 4: "BAHGP26",
    5: "SAUGP26", 6: "MIAGP26", 7: "CANGP26", 8: "MONGP26",
    9: "BARGP26", 10: "AUTGP26", 11: "BRTGP26", 12: "BELGP26",
    13: "HUNGP26", 14: "DUTGP26", 15: "ITLGP26", 16: "SPAGP26",
    17: "AZEGP26", 18: "SNGP26", 19: "USGP26", 20: "MEXGP26",
    21: "SAOPGP26", 22: "LASVGP26", 23: "QATGP26", 24: "ABUDGP26",
}

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = httpx.AsyncClient(timeout=15.0)


# ===== OPENF1 TOKEN MANAGEMENT =====

async def get_openf1_token():
    """Get a valid OpenF1 access token, refreshing if expired."""
    global _openf1_token, _openf1_token_expires
    if not OPENF1_USERNAME or not OPENF1_PASSWORD:
        return None
    # Refresh 60s before expiry
    if _openf1_token and time.time() < (_openf1_token_expires - 60):
        return _openf1_token
    try:
        resp = await client.post(
            OPENF1_TOKEN_URL,
            data={"username": OPENF1_USERNAME, "password": OPENF1_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp.status_code != 200:
            print(f"OpenF1 token error: {resp.status_code} {resp.text}")
            return None
        body = resp.json()
        _openf1_token = body.get("access_token")
        expires_in = int(body.get("expires_in", 3600))
        _openf1_token_expires = time.time() + expires_in
        print(f"OpenF1 token acquired, expires in {expires_in}s")
        return _openf1_token
    except Exception as e:
        print(f"OpenF1 token fetch failed: {e}")
        return None


async def openf1_request(endpoint: str, params: dict):
    """Make an authenticated request to the OpenF1 API."""
    token = await get_openf1_token()
    headers = {"accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    url = f"{OPENF1_BASE}/{endpoint}"
    try:
        resp = await client.get(url, params=params, headers=headers)
        if resp.status_code == 401:
            # Token expired mid-flight, clear and retry once
            global _openf1_token, _openf1_token_expires
            _openf1_token = None
            _openf1_token_expires = 0
            token = await get_openf1_token()
            if token:
                headers["Authorization"] = f"Bearer {token}"
                resp = await client.get(url, params=params, headers=headers)
        if resp.status_code != 200:
            return {"error": f"OpenF1 returned {resp.status_code}", "data": []}
        return {"data": resp.json()}
    except Exception as e:
        return {"error": str(e), "data": []}


# ===== OPENF1 ENDPOINTS =====

ALLOWED_ENDPOINTS = {
    "sessions", "laps", "car_data", "position", "drivers",
    "intervals", "location", "pit", "race_control", "weather",
    "stints", "team_radio", "meetings",
}

from starlette.requests import Request

@app.get("/api/openf1/{endpoint}")
async def openf1_proxy(endpoint: str, request: Request):
    """Authenticated OpenF1 proxy — forwards all query params."""
    if endpoint not in ALLOWED_ENDPOINTS:
        raise HTTPException(status_code=400, detail=f"Endpoint '{endpoint}' not allowed")
    params = dict(request.query_params)
    return await openf1_request(endpoint, params)


# ===== KALSHI ENDPOINTS =====

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
