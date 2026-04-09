/**
 * AI #3: Bridge Engine
 * Finds bridge candidates and generates AI reasoning.
 *
 * Step 1: TMDB Discover for top-rated titles in blind spot genre on Netflix
 * Step 2: Fetch keywords, score by cosine similarity to user profile
 * Step 3: Top candidates → LLM for bridge reasoning
 *
 * Concepts: cosine similarity, content-based filtering, LLM reasoning (CoT)
 */

import { discoverNetflix, getKeywords, posterUrl } from "./tmdbApi";
import { cosineSimilarity, movieToKeywordVector, userToKeywordVector } from "../utils/vectors";
import { GENRE_MAP } from "../utils/constants";

/**
 * Find bridge candidates for a blind spot genre
 * Returns top 5 candidates scored by similarity to user's taste
 */
export async function findBridgeCandidates(
  blindSpotGenreId,
  userProfile,
  region = "CA",
  onProgress
) {
  // Step 1: Get top-rated Netflix titles in blind spot genre
  if (onProgress) onProgress("Finding candidates...");
  const resp = await discoverNetflix(blindSpotGenreId, region);
  const raw = resp.results.slice(0, 10);

  if (raw.length === 0) return [];

  // Step 2: Fetch keywords for each candidate (staggered)
  if (onProgress) onProgress("Analyzing themes...");
  const withKeywords = [];

  for (let i = 0; i < raw.length; i++) {
    try {
      const kws = await getKeywords(raw[i].id, "movie");
      withKeywords.push({
        ...raw[i],
        keywords: kws,
        genre_names: (raw[i].genre_ids || [])
          .map((gid) => GENRE_MAP[gid]?.name)
          .filter(Boolean),
        poster: posterUrl(raw[i].poster_path),
      });
    } catch {
      // Skip if keywords fail
      withKeywords.push({
        ...raw[i],
        keywords: [],
        genre_names: (raw[i].genre_ids || [])
          .map((gid) => GENRE_MAP[gid]?.name)
          .filter(Boolean),
        poster: posterUrl(raw[i].poster_path),
      });
    }

    // Rate limit
    if (i < raw.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  // Step 3: Score by cosine similarity to user's keyword vector
  if (onProgress) onProgress("Scoring matches...");
  const userKwNames = userProfile.keywordVector.map((kw) => kw.name);

  if (userKwNames.length === 0) {
    // No keywords — sort by rating instead
    return withKeywords
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, 5);
  }

  const userVec = userToKeywordVector(userProfile.keywordVector);

  const scored = withKeywords.map((movie) => {
    const movieVec = movieToKeywordVector(movie.keywords, userKwNames);
    const similarity = cosineSimilarity(userVec, movieVec);
    return { ...movie, similarity };
  });

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

/**
 * Generate bridge reasoning via LLM
 */
export async function generateBridgeReasoning(userFavorites, candidate) {
  try {
    const response = await fetch("/api/bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userFavorites: userFavorites.slice(0, 5).map((t) => {
          const kws = (t.keywords || []).map((k) => k.name).join(", ");
          return t.title + (kws ? " (" + kws + ")" : "");
        }),
        candidate: {
          title: candidate.title,
          year: (candidate.release_date || "").slice(0, 4),
          genres: candidate.genre_names?.join(", ") || "",
          keywords: (candidate.keywords || []).map((k) => k.name).join(", "),
          overview: candidate.overview || "",
          rating: candidate.vote_average || 0,
        },
      }),
    });

    if (!response.ok) {
      return fallbackReasoning(candidate);
    }

    const data = await response.json();
    if (data.fallback || !data.reasoning || data.reasoning === "NO_BRIDGE") {
      if (data.reasoning === "NO_BRIDGE") return null; // Skip this candidate
      return fallbackReasoning(candidate);
    }

    return data.reasoning;
  } catch {
    return fallbackReasoning(candidate);
  }
}

function fallbackReasoning(candidate) {
  const kws = (candidate.keywords || [])
    .slice(0, 3)
    .map((k) => k.name)
    .join(", ");
  const genre = candidate.genre_names?.[0] || "film";
  return (
    "Highly-rated " +
    genre +
    " with a " +
    candidate.vote_average +
    "/10 rating" +
    (kws ? ". Themes include: " + kws + "." : ".")
  );
}

/**
 * Get bridge strength based on cosine similarity score
 */
export function getBridgeStrength(similarity) {
  if (similarity >= 0.3) return { label: "Strong Bridge", color: "#22c55e" };
  if (similarity >= 0.1) return { label: "Good Match", color: "#f97316" };
  return { label: "Stretch Pick", color: "#eab308" };
}
