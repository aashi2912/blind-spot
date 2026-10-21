/**
 * Vercel Serverless Function — one-line AI taste summary for the Reveal.
 * Mirrors api/bridge.js: origin lock, rate limit, cache, and diagnostic
 * `reason` on fallback so prod failures are visible instead of silent.
 */
import {
  originAllowed,
  rateLimited,
  cacheGet,
  cacheSet,
  hash,
  resolveKey,
  resolveModel,
} from "../lib/llmGuard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!originAllowed(req)) {
    return res.status(403).json({ summary: null, fallback: true, reason: "forbidden_origin" });
  }
  if (rateLimited(req)) {
    return res.status(429).json({ summary: null, fallback: true, reason: "rate_limited" });
  }

  const { titleCount, topGenres = [], topDecade, language } = req.body || {};
  const genreLine = topGenres.map((g) => `${g.name} ${g.pct}%`).join(", ");

  const cacheKey =
    "s:" + hash(JSON.stringify({ titleCount, genreLine, topDecade, language }));
  const hit = cacheGet(cacheKey);
  if (hit !== undefined) {
    return res.status(200).json({ summary: hit, cached: true });
  }

  const apiKey = resolveKey();
  if (!apiKey) {
    return res.status(200).json({ summary: null, fallback: true, reason: "no_key" });
  }

  try {
    const prompt = [
      "You describe a person's streaming taste as a single vivid one-line identity.",
      "",
      "DATA:",
      "- Titles watched: " + titleCount,
      "- Top genres: " + genreLine,
      "- Dominant decade: " + (topDecade || "unknown"),
      "- Language: " + (language ? language.pct + "% " + language.name : "unknown"),
      "",
      "Write ONE sentence, max 18 words, describing them (e.g. 'A prestige-crime loyalist with a 2010s streak').",
      "Be specific and a little playful, but accurate to the data. No preamble, no quotation marks.",
    ].join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: resolveModel(),
        max_tokens: 60,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      let detail = "";
      try {
        detail = (await response.text()).slice(0, 180);
      } catch {}
      return res
        .status(200)
        .json({ summary: null, fallback: true, reason: "upstream_" + response.status, detail });
    }

    const data = await response.json();
    const summary = data.content?.[0]?.text || null;
    if (summary) cacheSet(cacheKey, summary);
    return res.status(200).json({ summary });
  } catch (error) {
    return res.status(200).json({
      summary: null,
      fallback: true,
      reason: "exception",
      detail: String((error && error.message) || error).slice(0, 180),
    });
  }
}
