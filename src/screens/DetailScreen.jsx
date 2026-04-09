import { useState, useEffect } from "react";
import { getDetails, posterUrl, backdropUrl } from "../services/tmdbApi";
import { GENRE_MAP, GENRE_COLORS } from "../utils/constants";

export default function DetailScreen({ movie, watched, onMarkWatched, onGoBack }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const isWatched = watched?.some(
    (w) => w.id === movie?.id && w.media_type === (movie?.media_type || "movie")
  );

  useEffect(() => {
    if (!movie) return;
    setLoading(true);
    getDetails(movie.id, movie.media_type || "movie")
      .then((d) => {
        setDetails(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [movie]);

  if (!movie) {
    return (
      <div className="text-center py-12">
        <p className="text-spot-muted font-body">No movie selected.</p>
        <button onClick={onGoBack} className="mt-4 text-spot-red font-body text-sm">
          {"<-"} Back
        </button>
      </div>
    );
  }

  const title = details?.title || details?.name || movie.title;
  const year = (details?.release_date || details?.first_air_date || movie.release_date || "").slice(0, 4);
  const runtime = details?.runtime ? details.runtime + "m" : null;
  const rating = details?.vote_average || movie.vote_average || 0;
  const overview = details?.overview || movie.overview || "";
  const genres = (details?.genres || []).map((g) => g.name);
  const genreIds = (details?.genres || []).map((g) => g.id);
  const cast = details?.credits?.cast?.slice(0, 6) || [];
  const keywords = details?.keywords?.keywords || details?.keywords?.results || movie.keywords || [];
  const backdrop = details?.backdrop_path || movie.backdrop_path;
  const poster = details?.poster_path || movie.poster_path;

  return (
    <div>
      <button
        onClick={onGoBack}
        className="text-spot-muted hover:text-white text-sm font-body mb-3 transition-colors"
      >
        {"<-"} Back to bridges
      </button>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden mb-4 relative">
        {backdrop ? (
          <div className="relative">
            <img
              src={backdropUrl(backdrop)}
              alt=""
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-spot-dark via-spot-dark/50 to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-gray-900 to-spot-dark" />
        )}

        <div className="relative -mt-16 px-5 pb-5 flex gap-4">
          {poster ? (
            <img
              src={posterUrl(poster, "w185")}
              alt={title}
              className="w-20 h-[120px] rounded-xl object-cover shadow-xl flex-shrink-0 border-2 border-spot-dark"
            />
          ) : (
            <div className="w-20 h-[120px] rounded-xl bg-spot-card border border-spot-border flex items-center justify-center text-3xl flex-shrink-0">
              {"🎬"}
            </div>
          )}
          <div className="pt-8">
            <h2 className="text-xl font-extrabold text-white leading-tight font-display">
              {title}
            </h2>
            <p className="text-sm text-spot-muted font-body mt-0.5">
              {year}
              {runtime && " • " + runtime}
              {details?.original_language && details.original_language !== "en" && (
                " • " + details.original_language.toUpperCase()
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {rating > 0 && (
                <span className="text-lg font-extrabold text-yellow-400">
                  {"★"} {rating.toFixed(1)}
                </span>
              )}
              <span className="text-[10px] text-green-400 bg-green-400/10 px-2.5 py-1 rounded-md font-semibold font-body">
                On Netflix
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Genres */}
      {genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {genreIds.map((gid, i) => (
            <span
              key={gid}
              className="text-[11px] font-semibold text-white px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: GENRE_COLORS[gid] || "#666" }}
            >
              {genres[i]}
            </span>
          ))}
        </div>
      )}

      {/* Synopsis */}
      {overview && (
        <div className="bg-spot-card rounded-xl p-4 border border-spot-border mb-3">
          <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-1.5 font-body">
            Synopsis
          </p>
          <p className="text-[13px] text-gray-300 leading-relaxed font-body">
            {overview}
          </p>
        </div>
      )}

      {/* Cast */}
      {cast.length > 0 && (
        <div className="bg-spot-card rounded-xl p-4 border border-spot-border mb-3">
          <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-1.5 font-body">
            Cast
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {cast.map((c) => (
              <p key={c.id} className="text-xs text-gray-300 font-body">
                <span className="font-semibold text-white">{c.name}</span>
                {c.character && (
                  <span className="text-spot-muted"> as {c.character}</span>
                )}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="bg-spot-card rounded-xl p-4 border border-spot-border mb-4">
          <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-1.5 font-body">
            Themes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {keywords.slice(0, 10).map((kw) => (
              <span
                key={kw.id || kw.name}
                className="text-[10px] text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-md font-body"
              >
                {kw.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bridge reasoning (if available from movie object) */}
      {movie.bridgeReasoning && (
        <div className="bg-spot-dark rounded-xl p-4 border border-spot-red/20 mb-4">
          <p className="text-[10px] font-bold text-spot-red uppercase tracking-wider mb-1.5 font-body">
            Why this is your bridge
          </p>
          <p className="text-[13px] text-gray-300 leading-relaxed font-body">
            {movie.bridgeReasoning}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => !isWatched && onMarkWatched(movie)}
          disabled={isWatched}
          className={`py-3.5 rounded-xl text-sm font-bold font-body transition-all ${
            isWatched
              ? "bg-green-900/30 text-green-400 border border-green-500/20"
              : "bg-spot-red text-white active:scale-[0.98]"
          }`}
        >
          {isWatched ? "✓ Watched" : "✓ Mark as Watched"}
        </button>
        <button
          onClick={() => window.open("https://www.netflix.com/search?q=" + encodeURIComponent(title), "_blank")}
          className="py-3.5 rounded-xl border border-spot-border text-white text-sm font-semibold font-body hover:bg-white/5 transition-colors"
        >
          Search on Netflix
        </button>
      </div>
    </div>
  );
}
