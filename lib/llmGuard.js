/**
 * Shared guards for the LLM serverless endpoints (api/bridge.js, api/summary.js).
 *
 * Protects the Anthropic key behind these public POST endpoints from casual
 * abuse and keeps launch cost predictable:
 *   - originAllowed: only serve requests that came from the site (or ALLOW_ANON)
 *   - rateLimited:   best-effort per-IP token bucket
 *   - cacheGet/Set:  tiny TTL cache keyed by taste+candidate, so the SAMPLE
 *                    profile (identical for everyone who clicks "Try a sample")
 *                    collapses to one LLM call per candidate instead of one
 *                    per visitor
 *   - resolveKey/Model: tolerate ANTHROPIC_API_KEY + allow LLM_MODEL override
 *
 * NOTE: the Map-backed state lives in one warm lambda instance — it is reset on
 * cold starts and not shared across instances. That is enough to blunt casual
 * abuse. For a hard, global cap, swap `hits`/`cache` for Vercel KV or Upstash.
 */

const RL_WINDOW_MS = 10 * 60 * 1000; // per-IP window
const RL_MAX = 40; // max LLM requests per IP per window
const CACHE_TTL_MS = 60 * 60 * 1000; // cached reasoning lifetime
const CACHE_MAX = 500; // max cached entries per instance

const hits = new Map(); // ip -> { count, resetAt }
const cache = new Map(); // key -> { value, exp }

export function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.headers["x-real-ip"] || "unknown";
}

function hostFrom(value) {
  if (!value) return "";
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

export function originAllowed(req) {
  if (process.env.ALLOW_ANON === "1") return true; // escape hatch
  const host = hostFrom(req.headers.origin) || hostFrom(req.headers.referer);
  if (!host) return false; // naked request with no Origin/Referer -> block
  if (host === req.headers.host) return true; // same-origin
  if (host.endsWith(".vercel.app")) return true; // prod + preview deploys
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return true;
  const allow = (process.env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => hostFrom(s) || s);
  return allow.includes(host); // custom domain(s)
}

export function rateLimited(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > RL_MAX;
}

/** Tiny stable hash so cache keys stay bounded (djb2). */
export function hash(str) {
  let h = 5381;
  const s = String(str);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function cacheGet(key) {
  const rec = cache.get(key);
  if (!rec) return undefined;
  if (Date.now() > rec.exp) {
    cache.delete(key);
    return undefined;
  }
  return rec.value;
}

export function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { value, exp: Date.now() + CACHE_TTL_MS });
}

export function resolveKey() {
  return process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || "";
}

export function resolveModel() {
  return process.env.LLM_MODEL || "claude-haiku-4-5-20251001";
}
