/**
 * Blind Spot Constants
 */

// TMDB genre IDs → names (movies)
export const GENRES = [
  { id: 28, name: "Action", css: "genre-action" },
  { id: 12, name: "Adventure", css: "genre-adventure" },
  { id: 16, name: "Animation", css: "genre-animation" },
  { id: 35, name: "Comedy", css: "genre-comedy" },
  { id: 80, name: "Crime", css: "genre-crime" },
  { id: 99, name: "Documentary", css: "genre-documentary" },
  { id: 18, name: "Drama", css: "genre-drama" },
  { id: 10751, name: "Family", css: "genre-family" },
  { id: 14, name: "Fantasy", css: "genre-fantasy" },
  { id: 36, name: "History", css: "genre-history" },
  { id: 27, name: "Horror", css: "genre-horror" },
  { id: 10402, name: "Music", css: "genre-music" },
  { id: 9648, name: "Mystery", css: "genre-mystery" },
  { id: 10749, name: "Romance", css: "genre-romance" },
  { id: 878, name: "Sci-Fi", css: "genre-scifi" },
  { id: 10770, name: "TV Movie", css: "genre-tvmovie" },
  { id: 53, name: "Thriller", css: "genre-thriller" },
  { id: 10752, name: "War", css: "genre-war" },
  { id: 37, name: "Western", css: "genre-western" },
];

export const GENRE_MAP = Object.fromEntries(
  GENRES.map((g) => [g.id, g])
);

export const GENRE_IDS = GENRES.map((g) => g.id);

// TMDB image base URL
export const IMG_BASE = "https://image.tmdb.org/t/p";
export const POSTER_SM = IMG_BASE + "/w185";
export const POSTER_MD = IMG_BASE + "/w342";
export const POSTER_LG = IMG_BASE + "/w500";
export const BACKDROP = IMG_BASE + "/w780";

// Netflix provider ID on TMDB
export const NETFLIX_PROVIDER_ID = "8";

// Default watch region
export const DEFAULT_REGION = "US";

// Blind spot threshold — genre weight below this = blind spot
export const BLIND_SPOT_THRESHOLD = 0.05;

// Minimum titles for meaningful analysis
export const MIN_TITLES = 5;
export const GOOD_TITLES = 10;
export const GREAT_TITLES = 15;

// Decade buckets
export const DECADES = ["Pre-1980", "1980s", "1990s", "2000s", "2010s", "2020s"];

// Genre pill color map for inline styles
export const GENRE_COLORS = {
  28: "#ef4444", 12: "#f97316", 16: "#a855f7", 35: "#eab308",
  80: "#6366f1", 99: "#06b6d4", 18: "#8b5cf6", 10751: "#ec4899",
  14: "#14b8a6", 36: "#78716c", 27: "#dc2626", 10402: "#f59e0b",
  9648: "#6366f1", 10749: "#f472b6", 878: "#22d3ee", 10770: "#9ca3af",
  53: "#7c3aed", 10752: "#78716c", 37: "#d97706",
};
