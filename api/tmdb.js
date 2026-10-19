/**
 * Vercel Serverless Function — TMDB proxy.
 *
 * Keeps the TMDB key server-side (process.env.TMDB_KEY). The browser calls
 * /api/tmdb?path=/search/movie&query=... and this function attaches the key
 * and forwards to TMDB, so the key is never shipped to the client.
 *
 * Raw Node req/res (no framework helpers) so it runs on any Node runtime,
 * and only a whitelist of TMDB path prefixes is allowed — no open relay.
 */
const TMDB_BASE = "https://api.themoviedb.org/3";
const ALLOWED_PREFIXES = ["/search", "/movie", "/tv", "/discover", "/trending", "/genre"];

export default async function handler(req, res) {
  const send = (status, obj, headers = {}) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    res.end(JSON.stringify(obj));
  };

  if (req.method !== "GET") return send(405, { error: "Method not allowed" });

  const apiKey = process.env.TMDB_KEY;
  if (!apiKey) return send(500, { error: "TMDB key not configured on server" });

  const incoming = new URL(req.url, "http://localhost");
  const path = incoming.searchParams.get("path");
  if (!path || !path.startsWith("/")) return send(400, { error: "Missing or invalid 'path' param" });
  if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p))) return send(400, { error: "Path not allowed" });

  const target = new URL(TMDB_BASE + path);
  incoming.searchParams.forEach((v, k) => { if (k !== "path") target.searchParams.set(k, v); });
  target.searchParams.set("api_key", apiKey);

  try {
    const r = await fetch(target);
    const data = await r.json();
    send(r.status, data, r.ok ? { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" } : {});
  } catch (err) {
    console.error("TMDB proxy error:", err);
    send(502, { error: "TMDB request failed" });
  }
}
