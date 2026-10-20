/**
 * Prebuilt sample history — lets a first-time visitor (or a recruiter) see the
 * full product in one click without exporting their own Netflix data.
 * Skewed toward crime / drama / thriller so the bubble is tight and the blind
 * spots are obvious. IDs are arbitrary (never fetched); the profiler only reads
 * genre_ids, language, year, and keywords.
 */
const m = (id, title, year, genre_ids, keywords = []) => ({
  id,
  media_type: "movie",
  title,
  poster_path: null,
  release_date: year + "-01-01",
  genre_ids,
  original_language: "en",
  vote_average: 8.2,
  vote_count: 5000,
  overview: "",
  keywords: keywords.map((name) => ({ name })),
});

export const SAMPLE_WATCHED = [
  m(900001, "The Dark Knight", "2008", [28, 80, 18], ["vigilante", "chaos", "moral dilemma"]),
  m(900002, "Inception", "2010", [28, 878, 12], ["dream", "heist", "reality"]),
  m(900003, "Se7en", "1995", [80, 18, 9648], ["serial killer", "investigation", "dread"]),
  m(900004, "The Social Network", "2010", [18], ["ambition", "betrayal", "startup"]),
  m(900005, "Gone Girl", "2014", [80, 18, 53], ["marriage", "deception", "media"]),
  m(900006, "Prisoners", "2013", [80, 18, 53], ["abduction", "obsession", "justice"]),
  m(900007, "Whiplash", "2014", [18, 10402], ["ambition", "mentor", "obsession"]),
  m(900008, "Interstellar", "2014", [12, 18, 878], ["space", "time", "fatherhood"]),
  m(900009, "The Wolf of Wall Street", "2013", [80, 18], ["greed", "excess", "fraud"]),
  m(900010, "Knives Out", "2019", [80, 35, 9648], ["whodunit", "family", "inheritance"]),
  m(900011, "Shutter Island", "2010", [18, 9648, 53], ["asylum", "memory", "paranoia"]),
  m(900012, "No Country for Old Men", "2007", [80, 18, 53], ["chase", "fate", "violence"]),
];
