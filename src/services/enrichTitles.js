/**
 * Enrichment orchestrator for CSV import.
 * The Netflix export gives only title + date (no genres), so each parsed name
 * is matched against TMDB to pull genre_ids / language / poster, which the
 * taste profiler needs. Runs with a concurrency cap so a large history does
 * not hammer the proxy or trip TMDB's rate limit, and reports progress.
 */
import { searchAll } from "./tmdbApi";

export async function enrichTitles(parsed, { concurrency = 5, onProgress } = {}) {
  const names = parsed.map((p) => (typeof p === "string" ? p : p.title));
  const out = [];
  const seen = new Set();
  let done = 0;
  let idx = 0;

  async function worker() {
    while (idx < names.length) {
      const name = names[idx++];
      try {
        const results = await searchAll(name);
        const match = results && results[0];
        if (match) {
          const key = match.id + ":" + match.media_type;
          if (!seen.has(key)) {
            seen.add(key);
            out.push({
              id: match.id,
              media_type: match.media_type,
              title: match.title,
              poster_path: match.poster_path,
              release_date: match.release_date || "",
              genre_ids: match.genre_ids || [],
              original_language: match.original_language || "en",
              vote_average: match.vote_average || 0,
              vote_count: match.vote_count || 0,
              overview: match.overview || "",
            });
          }
        }
      } catch {
        /* unmatched — skip */
      } finally {
        done++;
        if (onProgress) onProgress({ done, total: names.length, matched: out.length });
      }
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, names.length || 1) }, worker);
  await Promise.all(pool);
  return out;
}
