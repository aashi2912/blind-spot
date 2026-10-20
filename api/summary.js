/**
 * Vercel Serverless Function — one-line AI taste summary for the Reveal.
 * Mirrors api/bridge.js: key stays server-side, graceful fallback flag.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ summary: null, fallback: true });
  }

  try {
    const { titleCount, topGenres = [], topDecade, language } = req.body || {};
    const genreLine = topGenres.map((g) => `${g.name} ${g.pct}%`).join(", ");

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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 60,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return res.status(200).json({ summary: null, fallback: true });
    }

    const data = await response.json();
    const summary = data.content?.[0]?.text || null;
    return res.status(200).json({ summary });
  } catch (error) {
    console.error("Summary error:", error);
    return res.status(200).json({ summary: null, fallback: true });
  }
}
