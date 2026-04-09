/**
 * AI #1: Taste Profile Analyzer
 * Content-based filtering — builds feature vectors from watch history.
 *
 * Concepts: content-based filtering, TF weighting, Herfindahl index
 */

import { GENRE_IDS, GENRE_MAP, DECADES } from "../utils/constants";

/**
 * Build normalized genre vector (19 dimensions)
 */
export function buildGenreVector(watchedTitles) {
  const counts = new Array(GENRE_IDS.length).fill(0);

  watchedTitles.forEach((title) => {
    (title.genre_ids || []).forEach((gid) => {
      const idx = GENRE_IDS.indexOf(gid);
      if (idx !== -1) counts[idx]++;
    });
  });

  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return counts.map((c) => c / total);
}

/**
 * Build keyword vector — TF-weighted, top N keywords
 */
export function buildKeywordVector(watchedTitles, topN = 50) {
  const kwCounts = {};

  watchedTitles.forEach((title) => {
    (title.keywords || []).forEach((kw) => {
      const name = kw.name.toLowerCase();
      kwCounts[name] = (kwCounts[name] || 0) + 1;
    });
  });

  const sorted = Object.entries(kwCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);

  if (sorted.length === 0) return [];

  const maxCount = sorted[0][1];
  return sorted.map(([name, count]) => ({
    name,
    weight: count / maxCount,
    count,
  }));
}

/**
 * Build decade distribution — percentage per decade bucket
 */
export function buildDecadeDistribution(watchedTitles) {
  const buckets = {};
  DECADES.forEach((d) => (buckets[d] = 0));

  watchedTitles.forEach((t) => {
    const dateStr = t.release_date || t.first_air_date || "";
    const year = parseInt(dateStr);
    if (isNaN(year)) return;

    if (year < 1980) buckets["Pre-1980"]++;
    else if (year < 1990) buckets["1980s"]++;
    else if (year < 2000) buckets["1990s"]++;
    else if (year < 2010) buckets["2000s"]++;
    else if (year < 2020) buckets["2010s"]++;
    else buckets["2020s"]++;
  });

  const total = watchedTitles.length || 1;
  return Object.fromEntries(
    Object.entries(buckets).map(([k, v]) => [k, Math.round((v / total) * 100)])
  );
}

/**
 * Calculate language concentration (Herfindahl index)
 * 1.0 = all one language, approaching 0 = diverse
 */
export function calcLanguageConcentration(watchedTitles) {
  const langCounts = {};
  watchedTitles.forEach((t) => {
    const lang = t.original_language || "en";
    langCounts[lang] = (langCounts[lang] || 0) + 1;
  });

  const total = watchedTitles.length || 1;
  const hhi = Object.values(langCounts).reduce(
    (sum, c) => sum + (c / total) ** 2,
    0
  );

  return {
    index: Math.round(hhi * 100) / 100,
    breakdown: Object.entries(langCounts)
      .map(([lang, count]) => ({
        language: lang,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Build full taste profile from watched titles
 */
export function buildTasteProfile(watchedTitles) {
  const genreVector = buildGenreVector(watchedTitles);
  const keywordVector = buildKeywordVector(watchedTitles);
  const decadeDistribution = buildDecadeDistribution(watchedTitles);
  const languageConcentration = calcLanguageConcentration(watchedTitles);

  // Genre summary — which genres are represented
  const genreSummary = genreVector
    .map((weight, idx) => ({
      genre: GENRE_MAP[GENRE_IDS[idx]],
      weight,
    }))
    .filter((g) => g.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  const activeGenreCount = genreSummary.length;
  const topGenre = genreSummary[0];

  // Headline stat
  const topGenrePercent = topGenre
    ? Math.round(topGenre.weight * 100)
    : 0;
  const dominantLang = languageConcentration.breakdown[0];
  const dominantLangPercent = dominantLang?.percent || 0;

  return {
    genreVector,
    keywordVector,
    decadeDistribution,
    languageConcentration,
    genreSummary,
    activeGenreCount,
    totalGenres: GENRE_IDS.length,
    headline: {
      titleCount: watchedTitles.length,
      topGenreName: topGenre?.genre?.name || "Unknown",
      topGenrePercent,
      activeGenreCount,
      dominantLanguage: dominantLang?.language || "en",
      dominantLanguagePercent: dominantLangPercent,
    },
  };
}
