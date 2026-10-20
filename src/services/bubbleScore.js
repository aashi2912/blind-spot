/**
 * Bubble Score — a single 0-100 measure of how concentrated ("trapped") a
 * taste profile is. Higher = tighter bubble. Pure function, no API.
 *
 * Transparent weighting (explainable, not a black box):
 *   genre concentration   (HHI over genre weights)      35%
 *   genre breadth penalty (fewer genres touched = more) 20%
 *   language concentration(HHI, from the profiler)      25%
 *   decade concentration  (HHI over decade shares)      20%
 */

function hhi(fractions) {
  return fractions.reduce((s, f) => s + f * f, 0);
}

export function computeBubbleScore(profile) {
  if (!profile) return { score: 0, band: "", parts: {} };

  const genreConc = hhi(profile.genreVector || []);
  const breadthPenalty = profile.totalGenres
    ? 1 - (profile.activeGenreCount || 0) / profile.totalGenres
    : 0;
  const langConc = profile.languageConcentration?.index || 0;
  const decadeConc = hhi(
    Object.values(profile.decadeDistribution || {}).map((p) => p / 100)
  );

  const tightness =
    0.35 * genreConc + 0.2 * breadthPenalty + 0.25 * langConc + 0.2 * decadeConc;
  const score = Math.max(0, Math.min(100, Math.round(tightness * 100)));

  const band =
    score >= 67 ? "Deep in the bubble" : score >= 34 ? "A comfortable groove" : "Wide open";

  return {
    score,
    band,
    parts: { genre: genreConc, breadth: breadthPenalty, language: langConc, decade: decadeConc },
  };
}
