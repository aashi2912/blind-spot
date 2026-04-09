/**
 * TMDB API Wrapper
 * All endpoints needed for Blind Spot.
 * In-memory cache to avoid redundant calls.
 */

const BASE = "https://api.themoviedb.org/3";
const cache = new Map();

function getKey() {
  return import.meta.env.VITE_TMDB_KEY;
}

async function tmdbGet(path, params = {}) {
  const url = new URL(BASE + path);
  url.searchParams.set("api_key", getKey());
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const cacheKey = url.toString();
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("TMDB " + res.status + ": " + errText);
  }

  const data = await res.json();
  cache.set(cacheKey, data);
  return data;
}

// --- Search ---
export async function searchMovies(query, page = 1) {
  return tmdbGet("/search/movie", { query, page, language: "en-US" });
}

export async function searchTV(query, page = 1) {
  return tmdbGet("/search/tv", { query, page, language: "en-US" });
}

/**
 * Search both movies and TV, merge results sorted by popularity
 */
export async function searchAll(query) {
  if (!query || query.length < 2) return [];

  const [movies, tv] = await Promise.all([
    searchMovies(query).catch(() => ({ results: [] })),
    searchTV(query).catch(() => ({ results: [] })),
  ]);

  const combined = [
    ...movies.results.map((m) => ({
      id: m.id,
      media_type: "movie",
      title: m.title,
      name: m.title,
      poster_path: m.poster_path,
      release_date: m.release_date || "",
      first_air_date: null,
      genre_ids: m.genre_ids || [],
      original_language: m.original_language || "en",
      vote_average: m.vote_average || 0,
      vote_count: m.vote_count || 0,
      overview: m.overview || "",
      popularity: m.popularity || 0,
    })),
    ...tv.results.map((t) => ({
      id: t.id,
      media_type: "tv",
      title: t.name,
      name: t.name,
      poster_path: t.poster_path,
      release_date: t.first_air_date || "",
      first_air_date: t.first_air_date || "",
      genre_ids: t.genre_ids || [],
      original_language: t.original_language || "en",
      vote_average: t.vote_average || 0,
      vote_count: t.vote_count || 0,
      overview: t.overview || "",
      popularity: t.popularity || 0,
    })),
  ];

  // Sort by popularity, filter out very low vote counts
  return combined
    .filter((r) => r.vote_count > 5)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 20);
}

// --- Keywords ---
export async function getMovieKeywords(movieId) {
  const data = await tmdbGet("/movie/" + movieId + "/keywords");
  return data.keywords || [];
}

export async function getTVKeywords(tvId) {
  const data = await tmdbGet("/tv/" + tvId + "/keywords");
  return data.results || [];
}

export async function getKeywords(id, mediaType) {
  if (mediaType === "tv") return getTVKeywords(id);
  return getMovieKeywords(id);
}

// --- Details ---
export async function getDetails(id, mediaType) {
  const path = mediaType === "tv" ? "/tv/" + id : "/movie/" + id;
  return tmdbGet(path, {
    append_to_response: "keywords,credits",
    language: "en-US",
  });
}

// --- Discover (for blind spot scoring + bridge candidates) ---
export async function discoverNetflix(genreId, region = "CA", page = 1) {
  return tmdbGet("/discover/movie", {
    with_genres: genreId,
    with_watch_providers: "8",
    watch_region: region,
    sort_by: "vote_average.desc",
    "vote_count.gte": "50",
    page,
    language: "en-US",
  });
}

// Relaxed version — lower vote threshold for genres with fewer titles
export async function discoverNetflixRelaxed(genreId, region = "CA", page = 1) {
  return tmdbGet("/discover/movie", {
    with_genres: genreId,
    with_watch_providers: "8",
    watch_region: region,
    sort_by: "popularity.desc",
    "vote_count.gte": "10",
    page,
    language: "en-US",
  });
}

// --- Trending ---
export async function getTrending() {
  return tmdbGet("/trending/movie/week", { language: "en-US" });
}

// --- Genre list ---
export async function getGenreList() {
  return tmdbGet("/genre/movie/list", { language: "en-US" });
}

// --- Image helpers ---
export function posterUrl(path, size = "w342") {
  if (!path) return null;
  return "https://image.tmdb.org/t/p/" + size + path;
}

export function backdropUrl(path) {
  if (!path) return null;
  return "https://image.tmdb.org/t/p/w780" + path;
}
