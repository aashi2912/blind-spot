/**
 * Vercel Serverless Function — Bridge Reasoning via LLM
 * AI #3: Generates thematic bridge explanations
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ reasoning: null, fallback: true });
  }

  try {
    const { userFavorites, candidate } = req.body;

    if (!userFavorites || !candidate) {
      return res.status(400).json({ error: "Missing userFavorites or candidate" });
    }

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
      "Write 2-3 sentences explaining WHY this person would enjoy this movie.",
      "Focus on THEMATIC connections to their existing taste — not just genre similarity.",
      "Connect specific qualities they love to specific qualities in this candidate.",
      "",
      "Do NOT invent facts about the movie. Only reference data provided above.",
      'If no genuine thematic connection exists, respond with exactly: NO_BRIDGE',
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
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return res.status(200).json({ reasoning: null, fallback: true });
    }

    const data = await response.json();
    const reasoning = data.content?.[0]?.text || null;

    return res.status(200).json({ reasoning });
  } catch (error) {
    console.error("Bridge reasoning error:", error);
    return res.status(200).json({ reasoning: null, fallback: true });
  }
}
