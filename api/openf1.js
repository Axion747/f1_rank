/**
 * Vercel serverless function: OpenF1 authenticated proxy
 * Route: /api/openf1?endpoint=sessions&year=2026
 */

const OPENF1_BASE = "https://api.openf1.org/v1";
const OPENF1_TOKEN_URL = "https://api.openf1.org/token";
const OPENF1_USERNAME = process.env.OPENF1_USERNAME || "";
const OPENF1_PASSWORD = process.env.OPENF1_PASSWORD || "";

const ALLOWED_ENDPOINTS = new Set([
  "sessions", "laps", "car_data", "position", "drivers",
  "intervals", "location", "pit", "race_control", "weather",
  "stints", "team_radio", "meetings"
]);

// Token cache (persists across warm invocations)
let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (!OPENF1_USERNAME || !OPENF1_PASSWORD) {
    return null;
  }
  if (cachedToken && Date.now() < (tokenExpiry - 60000)) {
    return cachedToken;
  }
  try {
    const resp = await fetch(OPENF1_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `username=${encodeURIComponent(OPENF1_USERNAME)}&password=${encodeURIComponent(OPENF1_PASSWORD)}`
    });
    if (!resp.ok) {
      console.error("OpenF1 token error:", resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    cachedToken = data.access_token;
    const expiresIn = parseInt(data.expires_in || "3600", 10);
    tokenExpiry = Date.now() + expiresIn * 1000;
    return cachedToken;
  } catch (e) {
    console.error("OpenF1 token fetch failed:", e);
    return null;
  }
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { endpoint, ...params } = req.query;

  if (!endpoint || !ALLOWED_ENDPOINTS.has(endpoint)) {
    return res.status(400).json({ error: `Invalid endpoint: ${endpoint}` });
  }

  // Build query string from remaining params
  const qs = Object.entries(params)
    .filter(([k, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  const url = `${OPENF1_BASE}/${endpoint}${qs ? "?" + qs : ""}`;

  try {
    const token = await getToken();
    const headers = { accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let resp = await fetch(url, { headers });

    // Retry once on 401
    if (resp.status === 401) {
      cachedToken = null;
      tokenExpiry = 0;
      const newToken = await getToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        resp = await fetch(url, { headers });
      }
    }

    if (!resp.ok) {
      return res.status(200).json({ error: `OpenF1 returned ${resp.status}`, data: [] });
    }

    const data = await resp.json();
    return res.status(200).json({ data });
  } catch (e) {
    return res.status(200).json({ error: e.message, data: [] });
  }
};
