/**
 * Vercel Serverless Function — Bridge Reasoning via LLM (AI #3).
 *
 * Hardened for public launch:
 *   - origin lock + per-IP rate limit (lib/llmGuard) so the key isn't an open tap
 *   - taste+candidate cache so identical requests (esp. the sample) don't re-bill
 *   - diagnostic `reason` on every fallback so prod failures are visible, not silent
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
    return res.status(403).json({ reasoning: null, fallback: true, reason: "forbidden_origin" });
  }
  if (rateLimited(req)) {
    return res.status(429).json({ reasoning: null, fallback: true, reason: "rate_limited" });
  }

  const { userFavorites, candidate } = req.body || {};
  if (!userFavorites || !candidate) {
    return res.status(400).json({ error: "Missing userFavorites or candidate" });
  }

  // Cache key depends on BOTH the candidate and the user's taste, so reasoning
  // is never shown to the wrong taste — but the sample profile is identical for
  // everyone, so sample traffic collapses to one call per candidate.
  const cacheKey =
    "b:" + hash(JSON.stringify(userFavorites)) + ":" + hash((candidate.title || "") + candidate.year);
  const hit = cacheGet(cacheKey);
  if (hit !== undefined) {
    return res.status(200).json({ reasoning: hit, cached: true });
  }

  const apiKey = resolveKey();
  if (!apiKey) {
    return res.status(200).json({ reasoning: null, fallback: true, reason: "no_key" });
  }

  try {
    const prompt = [
      "You are a film expert helping someone discover movies outside their comfort zone.",
      "",
      "USER'S FAVORITE TITLES AND THEMES:",
      ...userFavorites.map((f) => "- " + f),
      "",
      "CANDIDATE MOVIE (from a genre they have never watched):",
      "- Title: " + candidate.title + " (" + candidate.year + ")",
      "- Genres: " + candidate.genres,
      "- Keywords: " + candidate.keywords,
      "- Synopsis: " + candidate.overview,
      "- Rating: " + candidate.rating + "/10",
      "",
      "Write 2-3 sentences of plain prose explaining WHY this person would enjoy this movie. Start directly with the reason. No markdown, asterisks, bold, or headings.",
      "Focus on THEMATIC connections to their existing taste — not just genre similarity.",
      "Connect specific qualities they love to specific qualities in this candidate.",
      "",
      "Do NOT invent facts about the movie. Only reference data provided above.",
      "If no genuine thematic connection exists, respond with exactly: NO_BRIDGE",
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
        max_tokens: 200,
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
        .json({ reasoning: null, fallback: true, reason: "upstream_" + response.status, detail });
    }

    const data = await response.json();
    const reasoning = data.content?.[0]?.text || null;
    if (reasoning) cacheSet(cacheKey, reasoning); // cache NO_BRIDGE too — it's a valid, stable answer
    return res.status(200).json({ reasoning });
  } catch (error) {
    return res.status(200).json({
      reasoning: null,
      fallback: true,
      reason: "exception",
      detail: String((error && error.message) || error).slice(0, 180),
    });
  }
}
