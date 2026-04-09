/**
 * AI #2: Blind Spot Detector
 * Gap analysis — finds unexplored genres and scores them by opportunity.
 *
 * Concepts: anomaly detection (inverted), coverage analysis
 */

import { GENRES, GENRE_IDS, BLIND_SPOT_THRESHOLD } from "../utils/constants";
import { discoverNetflix, discoverNetflixRelaxed } from "./tmdbApi";
import { getGenreCache, setGenreCache } from "../utils/storage";

/**
 * Detect genre blind spots from the user's genre vector
 */
export function detectGenreBlindSpots(genreVector) {
  return GENRES.map((genre, idx) => ({
    genre,
    weight: genreVector[idx],
    isBlindSpot: genreVector[idx] < BLIND_SPOT_THRESHOLD,
    genreIndex: idx,
  })).filter((g) => g.isBlindSpot);
}

/**
 * Detect decade blind spots
 */
export function detectDecadeBlindSpots(decadeDistribution) {
  return Object.entries(decadeDistribution)
    .filter(([, percent]) => percent === 0)
    .map(([decade]) => decade);
}

/**
 * Detect language blind spots
 */
export function detectLanguageBlindSpots(languageConcentration) {
  // If Herfindahl index > 0.7, user is heavily concentrated in one language
  return {
    isConcentrated: languageConcentration.index > 0.7,
    dominantLanguage: languageConcentration.breakdown[0]?.language || "en",
    dominantPercent: languageConcentration.breakdown[0]?.percent || 100,
    missingLanguages: getMissingLanguages(languageConcentration.breakdown),
  };
}

function getMissingLanguages(breakdown) {
  const watchedLangs = new Set(breakdown.map((b) => b.language));
  const majorLangs = [
    { code: "ko", name: "Korean" },
    { code: "ja", name: "Japanese" },
    { code: "fr", name: "French" },
    { code: "es", name: "Spanish" },
    { code: "de", name: "German" },
    { code: "hi", name: "Hindi" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "zh", name: "Chinese" },
    { code: "th", name: "Thai" },
  ];
  return majorLangs.filter((l) => !watchedLangs.has(l.code));
}

/**
 * Score blind spot opportunities by querying TMDB Discover
 * Returns blind spots with Netflix title counts and avg ratings
 */
export async function scoreBlindSpotOpportunities(
  blindSpots,
  region = "CA",
  onProgress
) {
  // Check cache first
  const cached = getGenreCache();
  if (cached) {
    // Only use cache if it has data for most blind spots
    const cachedCount = blindSpots.filter((bs) => cached[bs.genre.id]?.count > 0).length;
    if (cachedCount > blindSpots.length * 0.5) {
      return blindSpots.map((bs) => ({
        ...bs,
        netflixCount: cached[bs.genre.id]?.count || 0,
        avgRating: cached[bs.genre.id]?.avgRating || 0,
        opportunity: cached[bs.genre.id]?.opportunity || 0,
      })).sort((a, b) => b.opportunity - a.opportunity);
    }
  }

  // Fetch from TMDB — with retry for failed calls
  const genreStats = {};
  const scored = [];

  for (let i = 0; i < blindSpots.length; i++) {
    const bs = blindSpots[i];
    let count = 0;
    let avgRating = 0;
    let success = false;

    // Try up to 2 times
    for (let attempt = 0; attempt < 2 && !success; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 1000));
        const resp = await discoverNetflix(bs.genre.id, region);
        count = resp.total_results || 0;
        avgRating =
          resp.results.length > 0
            ? resp.results.reduce((s, m) => s + m.vote_average, 0) /
              resp.results.length
            : 0;
        success = true;
      } catch (err) {
        console.warn("Discover failed for", bs.genre.name, "attempt", attempt + 1, err);
      }
    }

    // If still 0, try without vote_count filter as fallback
    if (count === 0 && success) {
      try {
        const fallbackResp = await discoverNetflixRelaxed(bs.genre.id, region);
        count = fallbackResp.total_results || 0;
        avgRating =
          fallbackResp.results.length > 0
            ? fallbackResp.results.reduce((s, m) => s + m.vote_average, 0) /
              fallbackResp.results.length
            : 0;
      } catch {}
    }

    const opportunity = Math.round((count / 50) * avgRating * 10);

    // Only cache if we got real data
    if (count > 0) {
      genreStats[bs.genre.id] = {
        count,
        avgRating: Math.round(avgRating * 10) / 10,
        opportunity,
      };
    }

    scored.push({
      ...bs,
      netflixCount: count,
      avgRating: Math.round(avgRating * 10) / 10,
      opportunity,
    });

    // Progress callback
    if (onProgress) onProgress(i + 1, blindSpots.length);

    // Rate limit: 500ms between calls
    if (i < blindSpots.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Cache for 24 hours
  setGenreCache(genreStats);

  return scored.sort((a, b) => b.opportunity - a.opportunity);
}
