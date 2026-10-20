/**
 * Bridge-reasoning prompt variants used by the eval harness.
 *
 * v2 ("production") mirrors the prompt in api/bridge.js. It is duplicated here
 * on purpose: the eval stays runnable in isolation and can't silently drift the
 * production path. (A production system would share one source module; that's a
 * noted next step.) v1 ("naive") is the strawman we're measuring against.
 */

function favLines(userFavorites) {
  return userFavorites.map((f) => "- " + f).join("\n");
}

function candidateBlock(c) {
  return [
    "- Title: " + c.title + " (" + c.year + ")",
    "- Genres: " + c.genres,
    "- Keywords: " + c.keywords,
    "- Synopsis: " + c.overview,
    "- Rating: " + c.rating + "/10",
  ].join("\n");
}

// v1 — naive: persuasive, no grounding guard, no refusal path.
export function buildPromptV1({ userFavorites, candidate }) {
  return [
    "You recommend movies. Convince this person to watch the candidate movie.",
    "",
    "THEIR FAVOURITES:",
    favLines(userFavorites),
    "",
    "CANDIDATE:",
    candidateBlock(candidate),
    "",
    "Write 2-3 enthusiastic sentences on why they'll love it.",
  ].join("\n");
}

// v2 — production: grounded, thematic, with an explicit refusal path.
export function buildPromptV2({ userFavorites, candidate }) {
  return [
    "You are a film expert helping someone discover movies outside their comfort zone.",
    "",
    "USER'S FAVORITE TITLES AND THEMES:",
    favLines(userFavorites),
    "",
    "CANDIDATE MOVIE (from a genre they have never watched):",
    candidateBlock(candidate),
    "",
    "Write 2-3 sentences explaining WHY this person would enjoy this movie.",
    "Focus on THEMATIC connections to their existing taste — not just genre similarity.",
    "Connect specific qualities they love to specific qualities in this candidate.",
    "",
    "Do NOT invent facts about the movie. Only reference data provided above.",
    "If no genuine thematic connection exists, respond with exactly: NO_BRIDGE",
  ].join("\n");
}

export const VARIANTS = { v1: buildPromptV1, v2: buildPromptV2 };
