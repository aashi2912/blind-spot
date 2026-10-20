/**
 * AI taste summary — one-line identity for the Reveal.
 * Calls /api/summary (key stays server-side), with a deterministic template
 * fallback so the Reveal always has a sentence even if the LLM call fails.
 */

const LANG_NAMES = { en: "English", es: "Spanish", fr: "French", ja: "Japanese", ko: "Korean", hi: "Hindi", de: "German", it: "Italian", pt: "Portuguese", zh: "Chinese" };

function topDecade(profile) {
  const entries = Object.entries(profile.decadeDistribution || {});
  if (!entries.length) return "";
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function payloadFromProfile(profile) {
  const h = profile.headline;
  return {
    titleCount: h.titleCount,
    topGenres: (profile.genreSummary || []).slice(0, 5).map((g) => ({
      name: g.genre?.name,
      pct: Math.round(g.weight * 100),
    })),
    topDecade: topDecade(profile),
    language: { name: LANG_NAMES[h.dominantLanguage] || h.dominantLanguage, pct: h.dominantLanguagePercent },
  };
}

export function templateSummary(profile) {
  const h = profile.headline;
  const dec = topDecade(profile);
  const lang = LANG_NAMES[h.dominantLanguage] || h.dominantLanguage;
  return `Mostly ${h.topGenreName.toLowerCase()} (${h.topGenrePercent}%), ${h.dominantLanguagePercent}% ${lang}${dec ? `, leaning ${dec}` : ""}.`;
}

export async function generateTasteSummary(profile) {
  const fallback = templateSummary(profile);
  try {
    const res = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFromProfile(profile)),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    if (data.fallback || !data.summary) return fallback;
    return String(data.summary).trim().replace(/^["']|["']$/g, "");
  } catch {
    return fallback;
  }
}
