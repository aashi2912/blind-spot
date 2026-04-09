import { useState, useEffect, useRef } from "react";
import { searchAll, getTrending, posterUrl } from "../services/tmdbApi";
import { GENRE_MAP, GENRE_COLORS, MIN_TITLES, GOOD_TITLES } from "../utils/constants";

export default function InputScreen({ watched, onAdd, onRemove, onAnalyze, profile }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [trending, setTrending] = useState([]);
  const debounceRef = useRef(null);

  // Load trending on mount
  useEffect(() => {
    getTrending()
      .then((data) => setTrending(data.results?.slice(0, 10) || []))
      .catch(() => {});
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchAll(query);
        // Filter out already watched
        const watchedIds = new Set(watched.map((w) => w.id + ":" + w.media_type));
        setResults(res.filter((r) => !watchedIds.has(r.id + ":" + r.media_type)));
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, watched]);

  const watchedIds = new Set(watched.map((w) => w.id + ":" + (w.media_type || "movie")));
  const progress = Math.min(watched.length / GOOD_TITLES, 1);

  // Genre breakdown for preview
  const genreCounts = {};
  watched.forEach((t) =>
    (t.genre_ids || []).forEach((gid) => {
      const name = GENRE_MAP[gid]?.name;
      if (name) genreCounts[name] = (genreCounts[name] || 0) + 1;
    })
  );
  const totalGenreTags = Object.values(genreCounts).reduce((a, b) => a + b, 0) || 1;
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <h2 className="text-xl font-extrabold text-white mb-1 font-display">
        What have you been watching?
      </h2>
      <p className="text-sm text-spot-muted mb-5 font-body">
        Search and add titles to build your taste profile
      </p>

      {/* Search */}
      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies and TV shows..."
          className="w-full py-3.5 px-10 rounded-xl border border-spot-border bg-spot-card text-white text-sm font-body outline-none focus:border-spot-red/50 transition-colors"
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base opacity-40">
          🔍
        </span>
        {searching && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-spot-red loading-dot" />
            <span className="w-1.5 h-1.5 rounded-full bg-spot-red loading-dot" />
            <span className="w-1.5 h-1.5 rounded-full bg-spot-red loading-dot" />
          </div>
        )}

        {/* Search results dropdown */}
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-spot-card border border-spot-border rounded-xl mt-1 z-20 max-h-72 overflow-y-auto shadow-2xl">
            {results.slice(0, 8).map((r) => (
              <div
                key={r.id + r.media_type}
                onClick={() => {
                  onAdd(r);
                  setQuery("");
                  setResults([]);
                }}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 border-b border-spot-border/50 last:border-0 transition-colors"
              >
                {r.poster_path ? (
                  <img
                    src={posterUrl(r.poster_path, "w92")}
                    alt=""
                    className="w-8 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-12 rounded bg-spot-border flex items-center justify-center text-xs flex-shrink-0">
                    🎬
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-spot-muted">
                      {(r.release_date || "").slice(0, 4)}
                    </span>
                    <span className="text-xs text-spot-muted capitalize">
                      {r.media_type === "tv" ? "TV" : "Movie"}
                    </span>
                    {r.vote_average > 0 && (
                      <span className="text-xs text-yellow-400">
                        ★ {r.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-spot-red text-lg flex-shrink-0">+</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress */}
      {watched.length > 0 && watched.length < GOOD_TITLES && (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-1 bg-spot-border rounded-full overflow-hidden">
            <div
              className="h-full bg-spot-red rounded-full transition-all duration-500"
              style={{ width: progress * 100 + "%" }}
            />
          </div>
          <span className="text-xs text-spot-muted font-body whitespace-nowrap">
            {watched.length}/{GOOD_TITLES}
          </span>
        </div>
      )}

      {/* Status messages */}
      {watched.length >= MIN_TITLES && watched.length < GOOD_TITLES && (
        <div className="bg-green-900/20 border border-green-500/20 rounded-xl px-4 py-2.5 mb-4 text-xs text-green-400 font-body">
          ✓ Enough for basic analysis! Add more for deeper insights.
        </div>
      )}
      {watched.length >= GOOD_TITLES && (
        <div className="bg-green-900/20 border border-green-500/20 rounded-xl px-4 py-2.5 mb-4 text-xs text-green-400 font-body">
          ✓ Great profile! Ready for deep analysis.
        </div>
      )}

      {/* Live genre preview */}
      {topGenres.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-2 font-body">
            Your taste so far
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topGenres.map(([name, count]) => {
              const genre = Object.values(GENRE_MAP).find((g) => g.name === name);
              const color = genre ? GENRE_COLORS[genre.id] : "#666";
              return (
                <div key={name} className="flex items-center gap-1">
                  <span
                    className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: color }}
                  >
                    {name}
                  </span>
                  <span className="text-[10px] text-spot-muted">
                    {Math.round((count / totalGenreTags) * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Watched list */}
      {watched.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-2 font-body">
            {watched.length} title{watched.length !== 1 ? "s" : ""} added
          </p>
          <div className="flex flex-wrap gap-2">
            {watched.map((t) => (
              <div
                key={t.id + (t.media_type || "")}
                className="flex items-center gap-2 bg-spot-card rounded-lg px-3 py-2 border border-spot-border animate-fade-in"
              >
                {t.poster_path ? (
                  <img
                    src={posterUrl(t.poster_path, "w92")}
                    alt=""
                    className="w-6 h-9 rounded object-cover"
                  />
                ) : (
                  <div className="w-6 h-9 rounded bg-spot-border flex items-center justify-center text-xs">
                    🎬
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-white leading-tight">
                    {t.title}
                  </p>
                  <p className="text-[10px] text-spot-muted">
                    {(t.release_date || "").slice(0, 4)}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(t.id, t.media_type)}
                  className="text-spot-muted hover:text-spot-red text-sm ml-1 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyze button */}
      {watched.length >= MIN_TITLES && (
        <button
          onClick={onAnalyze}
          className="w-full py-4 rounded-xl bg-spot-red text-white text-base font-bold font-body shadow-lg shadow-spot-red/20 active:scale-[0.98] transition-transform"
        >
          Analyze My Taste →
        </button>
      )}

      {/* Trending quick-add */}
      {trending.length > 0 && (
        <div className="mt-6">
          <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-2 font-body">
            Quick add — trending on Netflix
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {trending
              .filter(
                (t) =>
                  !watchedIds.has(t.id + ":movie")
              )
              .slice(0, 8)
              .map((t) => (
                <div
                  key={t.id}
                  onClick={() =>
                    onAdd({
                      id: t.id,
                      media_type: "movie",
                      title: t.title,
                      poster_path: t.poster_path,
                      release_date: t.release_date || "",
                      genre_ids: t.genre_ids || [],
                      original_language: t.original_language || "en",
                      vote_average: t.vote_average || 0,
                      vote_count: t.vote_count || 0,
                      overview: t.overview || "",
                    })
                  }
                  className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {t.poster_path ? (
                    <img
                      src={posterUrl(t.poster_path, "w154")}
                      alt={t.title}
                      className="w-16 h-24 rounded-lg object-cover border border-spot-border"
                    />
                  ) : (
                    <div className="w-16 h-24 rounded-lg bg-spot-card border border-spot-border flex items-center justify-center text-xs text-spot-muted">
                      {t.title?.slice(0, 6)}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
