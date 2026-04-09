import { useState, useEffect } from "react";
import { GENRE_COLORS } from "../utils/constants";
import { detectGenreBlindSpots, detectDecadeBlindSpots, detectLanguageBlindSpots, scoreBlindSpotOpportunities } from "../services/blindSpotDetector";

export default function BlindSpotsScreen({ profile, onExplore, onGoBack }) {
  const [blindSpots, setBlindSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [decadeGaps, setDecadeGaps] = useState([]);
  const [langGaps, setLangGaps] = useState(null);

  useEffect(() => {
    if (!profile) return;

    const genreBS = detectGenreBlindSpots(profile.genreVector);
    const decBS = detectDecadeBlindSpots(profile.decadeDistribution);
    const langBS = detectLanguageBlindSpots(profile.languageConcentration);

    setDecadeGaps(decBS);
    setLangGaps(langBS);

    // Score opportunities (async — queries TMDB Discover)
    setLoading(true);
    scoreBlindSpotOpportunities(genreBS, "CA", (done, total) => {
      setProgress({ done, total });
    })
      .then((scored) => {
        setBlindSpots(scored);
        setLoading(false);
      })
      .catch(() => {
        setBlindSpots(genreBS.map((bs) => ({ ...bs, netflixCount: 0, avgRating: 0, opportunity: 0 })));
        setLoading(false);
      });
  }, [profile]);

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-spot-muted font-body">Analyze your taste first.</p>
        <button onClick={onGoBack} className="mt-4 text-spot-red font-body text-sm">← Go back</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onGoBack} className="text-spot-muted hover:text-white text-sm transition-colors">←</button>
        <h2 className="text-xl font-extrabold text-white font-display">Your Blind Spots</h2>
      </div>
      <p className="text-sm text-spot-muted mb-1 font-body">
        Genres you've never explored, ranked by opportunity
      </p>
      {!loading && (
        <p className="text-xs text-spot-red font-semibold mb-5 font-body">
          {blindSpots.filter((bs) => bs.netflixCount > 0).length} unexplored genres with Netflix content available
        </p>
      )}

      {/* Language + decade gaps */}
      {(langGaps?.isConcentrated || decadeGaps.length > 0) && (
        <div className="mb-5">
          <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-2 font-body">
            Also missing
          </p>
          <div className="flex flex-wrap gap-2">
            {langGaps?.missingLanguages?.slice(0, 4).map((l) => (
              <span
                key={l.code}
                className="text-[11px] text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2.5 py-1 rounded-lg font-body"
              >
                {l.name} cinema
              </span>
            ))}
            {decadeGaps.map((d) => (
              <span
                key={d}
                className="text-[11px] text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2.5 py-1 rounded-lg font-body"
              >
                {d} films
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="flex gap-1 justify-center mb-3">
            <span className="w-2 h-2 rounded-full bg-spot-red loading-dot" />
            <span className="w-2 h-2 rounded-full bg-spot-red loading-dot" />
            <span className="w-2 h-2 rounded-full bg-spot-red loading-dot" />
          </div>
          <p className="text-sm text-spot-muted font-body">
            Scanning Netflix library... {progress.done}/{progress.total}
          </p>
        </div>
      )}

      {/* Blind spot cards — only show genres with Netflix content */}
      {!loading &&
        blindSpots.filter((bs) => bs.netflixCount > 0).map((bs) => (
          <div
            key={bs.genre.id}
            onClick={() => onExplore(bs)}
            className="bg-spot-card rounded-2xl p-4 mb-3 border border-spot-border hover:border-spot-red/30 cursor-pointer transition-colors flex justify-between items-center"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[11px] font-semibold text-white px-2.5 py-0.5 rounded-md"
                  style={{ backgroundColor: GENRE_COLORS[bs.genre.id] || "#666" }}
                >
                  {bs.genre.name}
                </span>
                <span className="text-xs text-spot-muted font-body">
                  {bs.netflixCount} titles on Netflix
                </span>
                <span className="text-xs text-spot-muted font-body">
                  • avg {bs.avgRating}/10
                </span>
              </div>
              <p className="text-xs text-gray-500 font-body">
                Tap to explore bridge recommendations →
              </p>
            </div>
            <div className="text-center ml-3 flex-shrink-0">
              <div
                className="text-xl font-extrabold"
                style={{
                  color:
                    bs.opportunity > 85
                      ? "#dc2626"
                      : bs.opportunity > 60
                      ? "#f97316"
                      : "#888",
                }}
              >
                {bs.opportunity}
              </div>
              <div className="text-[8px] text-spot-muted uppercase font-body">
                opportunity
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
