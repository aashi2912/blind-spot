import { useState, useEffect } from "react";
import { getDetails, posterUrl, backdropUrl } from "../services/tmdbApi";
import { GENRE_COLORS } from "../utils/constants";
import { getWatchlistStatus, setWatchlistStatus } from "../utils/storage";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";
import TopBar from "../components/TopBar";

const PAGE_BG = {
  backgroundImage: "radial-gradient(50% 30% at 50% 0%, rgba(124,92,255,0.12), transparent 70%)",
};

function capture(event, props) {
  try { window.posthog && window.posthog.capture && window.posthog.capture(event, props); } catch { /* ignore */ }
}

export default function DetailScreen({ movie, watched, onMarkWatched, onGoBack, onHome }) {
  const [details, setDetails] = useState(null);
  const [saved, setSaved] = useState(false);

  const isWatched = watched?.some(
    (w) => w.id === movie?.id && w.media_type === (movie?.media_type || "movie")
  );

  useEffect(() => {
    if (!movie) return;
    setSaved(getWatchlistStatus(movie.id, movie.media_type) === "saved");
    getDetails(movie.id, movie.media_type || "movie").then(setDetails).catch(() => {});
  }, [movie]);

  if (!movie) {
    return (
      <div className="min-h-screen bg-void text-ink grid place-items-center px-6" style={PAGE_BG}>
        <div className="text-center">
          <p className="text-ink-muted font-body mb-4">No title selected.</p>
          <Button variant="ghost" onClick={onGoBack}>Back</Button>
        </div>
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

  const toggleSave = () => {
    const next = !saved;
    setSaved(next);
    setWatchlistStatus(movie, next ? "saved" : null);
    if (next) capture("bridge_saved", { id: movie.id });
  };

  return (
    <div className="min-h-screen bg-void text-ink" style={PAGE_BG}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <TopBar onHome={onHome} onBack={onGoBack} backLabel="Picks" />

        <div className="rounded-2xl overflow-hidden mb-4 relative">
          {backdrop ? (
            <div className="relative">
              <img src={backdropUrl(backdrop)} alt="" className="w-full h-48 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
            </div>
          ) : (
            <div className="h-28 bg-gradient-to-br from-surface to-void" />
          )}
          <div className="relative -mt-16 px-1 pb-1 flex gap-4">
            {poster ? (
              <img src={posterUrl(poster, "w185")} alt={title} className="w-24 h-36 rounded-xl object-cover shadow-xl shrink-0 border-2 border-void" />
            ) : (
              <div className="w-24 h-36 rounded-xl bg-surface border border-line grid place-items-center text-3xl shrink-0">🎬</div>
            )}
            <div className="pt-10">
              <h1 className="font-brand text-2xl font-bold leading-tight">{title}</h1>
              <p className="text-sm text-ink-muted font-body mt-1">
                {year}{runtime && " • " + runtime}
                {details?.original_language && details.original_language !== "en" && " • " + details.original_language.toUpperCase()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {rating > 0 && <span className="text-lg font-brand font-bold text-ink">★ {rating.toFixed(1)}</span>}
                <Chip tone="primary">On Netflix</Chip>
              </div>
            </div>
          </div>
        </div>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {genreIds.map((gid, i) => (
              <span key={gid} className="text-[11px] font-semibold text-white px-2.5 py-1 rounded-lg" style={{ backgroundColor: GENRE_COLORS[gid] || "#7C5CFF" }}>
                {genres[i]}
              </span>
            ))}
          </div>
        )}

        {overview && (
          <Card className="p-4 mb-3">
            <p className="text-xs font-bold text-ink-muted mb-1.5 font-body">What it's about</p>
            <p className="text-sm text-ink/90 leading-relaxed font-body">{overview}</p>
          </Card>
        )}

        {cast.length > 0 && (
          <Card className="p-4 mb-3">
            <p className="text-xs font-bold text-ink-muted mb-1.5 font-body">Cast</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {cast.map((c) => (
                <p key={c.id} className="text-xs text-ink/90 font-body">
                  <span className="font-semibold text-ink">{c.name}</span>
                  {c.character && <span className="text-ink-muted"> as {c.character}</span>}
                </p>
              ))}
            </div>
          </Card>
        )}

        {keywords.length > 0 && (
          <Card className="p-4 mb-4">
            <p className="text-xs font-bold text-ink-muted mb-2 font-body">Themes</p>
            <div className="flex flex-wrap gap-1.5">
              {keywords.slice(0, 10).map((kw) => (
                <Chip key={kw.id || kw.name} tone="neutral">{kw.name}</Chip>
              ))}
            </div>
          </Card>
        )}

        {movie.bridgeReasoning && (
          <Card className="p-4 mb-4 border-primary/30">
            <p className="text-xs font-bold text-primary-soft mb-1.5 font-body">Why it fits your taste</p>
            <p className="text-sm text-ink/90 leading-relaxed font-body">{movie.bridgeReasoning}</p>
          </Card>
        )}

        <Button variant={saved ? "accent" : "ghost"} className="w-full mb-3" onClick={toggleSave}>
          {saved ? "✓ Saved to watchlist" : "+ Save to watchlist"}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant={isWatched ? "ghost" : "primary"} disabled={isWatched} onClick={() => !isWatched && onMarkWatched(movie)}>
            {isWatched ? "✓ Watched" : "I've seen this"}
          </Button>
          <Button variant="ghost" onClick={() => window.open("https://www.netflix.com/search?q=" + encodeURIComponent(title), "_blank")}>
            Find on Netflix
          </Button>
        </div>
      </div>
    </div>
  );
}
