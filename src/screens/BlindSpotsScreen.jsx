import { useState, useEffect } from "react";
import { GENRE_COLORS } from "../utils/constants";
import {
  detectGenreBlindSpots,
  detectDecadeBlindSpots,
  detectLanguageBlindSpots,
  scoreBlindSpotOpportunities,
} from "../services/blindSpotDetector";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";

const PAGE_BG = {
  backgroundImage:
    "radial-gradient(55% 40% at 85% 0%, rgba(255,138,91,0.10), transparent 70%), radial-gradient(45% 40% at 0% 100%, rgba(124,92,255,0.12), transparent 70%)",
};

export default function BlindSpotsScreen({ profile, onExplore, onGoBack }) {
  const [blindSpots, setBlindSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [decadeGaps, setDecadeGaps] = useState([]);
  const [langGaps, setLangGaps] = useState(null);

  useEffect(() => {
    if (!profile) return;
    const genreBS = detectGenreBlindSpots(profile.genreVector);
    setDecadeGaps(detectDecadeBlindSpots(profile.decadeDistribution));
    setLangGaps(detectLanguageBlindSpots(profile.languageConcentration));
    setLoading(true);
    scoreBlindSpotOpportunities(genreBS, "CA", (done, total) => setProgress({ done, total }))
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
      <div className="min-h-screen bg-void text-ink grid place-items-center px-6" style={PAGE_BG}>
        <div className="text-center">
          <p className="text-ink-muted font-body mb-4">Analyze your taste first.</p>
          <Button variant="ghost" onClick={onGoBack}>Go back</Button>
        </div>
      </div>
    );
  }

  const live = blindSpots.filter((bs) => bs.netflixCount > 0);

  return (
    <div className="min-h-screen bg-void text-ink" style={PAGE_BG}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button onClick={onGoBack} className="text-sm text-ink-muted hover:text-ink font-body transition-colors mb-6">
          ← Back to your bubble
        </button>

        <h1 className="font-brand text-3xl font-bold mb-2">Your blind spots</h1>
        <p className="text-ink-muted font-body mb-1">Genres you have never explored, ranked by what is worth your time.</p>
        {!loading && (
          <p className="text-accent font-body text-sm font-semibold mb-6">
            {live.length} unexplored {live.length === 1 ? "genre" : "genres"} with strong Netflix picks
          </p>
        )}

        {(langGaps?.isConcentrated || decadeGaps.length > 0) && (
          <div className="mb-6">
            <p className="text-xs font-bold text-ink-muted mb-2 font-body">Also missing from your taste</p>
            <div className="flex flex-wrap gap-2">
              {langGaps?.missingLanguages?.slice(0, 4).map((l) => (
                <Chip key={l.code} tone="accent">{l.name} cinema</Chip>
              ))}
              {decadeGaps.map((d) => (
                <Chip key={d} tone="accent">{d} films</Chip>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-10">
            <div className="flex gap-1.5 justify-center mb-3">
              <span className="w-2 h-2 rounded-full bg-primary loading-dot" />
              <span className="w-2 h-2 rounded-full bg-primary loading-dot" />
              <span className="w-2 h-2 rounded-full bg-primary loading-dot" />
            </div>
            <p className="text-sm text-ink-muted font-body">
              Scanning the Netflix library… {progress.done}/{progress.total}
            </p>
          </div>
        )}

        {!loading &&
          live.map((bs) => {
            const oppColor = bs.opportunity > 85 ? "#FF8A5B" : bs.opportunity > 60 ? "#7C5CFF" : "#9AA0B4";
            return (
              <Card
                key={bs.genre.id}
                className="p-4 mb-3 flex justify-between items-center cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => onExplore(bs)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-[11px] font-semibold text-white px-2.5 py-0.5 rounded-md"
                      style={{ backgroundColor: GENRE_COLORS[bs.genre.id] || "#7C5CFF" }}
                    >
                      {bs.genre.name}
                    </span>
                    <span className="text-xs text-ink-muted font-body">{bs.netflixCount} on Netflix</span>
                    <span className="text-xs text-ink-muted font-body">• avg {bs.avgRating}/10</span>
                  </div>
                  <p className="text-xs text-ink-muted font-body">Tap to see your bridge in →</p>
                </div>
                <div className="text-center ml-3 shrink-0">
                  <div className="text-2xl font-brand font-bold" style={{ color: oppColor }}>{bs.opportunity}</div>
                  <div className="text-[8px] text-ink-muted uppercase font-body tracking-wide">opportunity</div>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
