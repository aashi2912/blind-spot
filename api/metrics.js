/**
 * Vercel Serverless Function — live product metrics for the public /metrics page.
 *
 * Reads aggregate usage from PostHog via the HogQL query API (server-side personal
 * key, never exposed). No personal data — only anonymous behavioural counts.
 * Results cached 60s so traffic never hammers PostHog. Degrades gracefully to a
 * "not configured yet" state so the page works before keys/traffic exist.
 *
 * Env: POSTHOG_PROJECT_ID, POSTHOG_PERSONAL_API_KEY, POSTHOG_API_HOST (optional,
 * default https://us.posthog.com — use https://eu.posthog.com for EU cloud).
 */
let cache = { at: 0, data: null };
const TTL = 60 * 1000;

const FUNNEL_SQL = `
SELECT
  count(DISTINCT distinct_id) AS visitors,
  count(DISTINCT if(event IN ('sample_viewed','csv_import_completed'), distinct_id, NULL)) AS tried,
  count(DISTINCT if(event='screen_viewed' AND properties.screen='bubble', distinct_id, NULL)) AS taste,
  count(DISTINCT if(event='screen_viewed' AND properties.screen='blindspots', distinct_id, NULL)) AS blindspots,
  count(DISTINCT if(event='screen_viewed' AND properties.screen='bridges', distinct_id, NULL)) AS bridges,
  count(DISTINCT if(event='bridge_saved', distinct_id, NULL)) AS saved,
  count(DISTINCT if(event='result_shared', distinct_id, NULL)) AS shared,
  count(DISTINCT if(event='sample_viewed', distinct_id, NULL)) AS sample_users,
  count(DISTINCT if(event='csv_import_completed', distinct_id, NULL)) AS upload_users,
  count(DISTINCT if(event='bridge_dismissed', distinct_id, NULL)) AS dismissed
FROM events
WHERE timestamp > now() - INTERVAL 180 DAY
`;

const TS_SQL = `
SELECT toDate(timestamp) AS day, count(DISTINCT distinct_id) AS visitors
FROM events
WHERE timestamp > now() - INTERVAL 30 DAY
GROUP BY day ORDER BY day
`;

async function hogql(host, pid, key, query) {
  const r = await fetch(`${host}/api/projects/${pid}/query/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!r.ok) throw new Error("posthog_" + r.status + " " + (await r.text().catch(() => "")).slice(0, 160));
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=30");
  const pid = process.env.POSTHOG_PROJECT_ID;
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const host = process.env.POSTHOG_API_HOST || "https://us.posthog.com";

  if (!pid || !key) {
    return res.status(200).json({ configured: false, updatedAt: new Date().toISOString() });
  }
  if (cache.data && Date.now() - cache.at < TTL) {
    return res.status(200).json(cache.data);
  }
  try {
    const [f, ts] = await Promise.all([
      hogql(host, pid, key, FUNNEL_SQL),
      hogql(host, pid, key, TS_SQL),
    ]);
    const cols = f.columns || [];
    const row = (f.results && f.results[0]) || [];
    const funnel = {};
    cols.forEach((c, i) => (funnel[c] = Number(row[i] || 0)));
    const timeseries = (ts.results || []).map((r) => ({ day: r[0], visitors: Number(r[1] || 0) }));
    const data = { configured: true, funnel, timeseries, updatedAt: new Date().toISOString() };
    cache = { at: Date.now(), data };
    return res.status(200).json(data);
  } catch (e) {
    if (cache.data) return res.status(200).json({ ...cache.data, stale: true });
    return res.status(200).json({ configured: true, error: String(e.message || e).slice(0, 180), updatedAt: new Date().toISOString() });
  }
}
