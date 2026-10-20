import { useState, useEffect } from "react";
import { GENRE_COLORS } from "../utils/constants";
import { posterUrl } from "../services/tmdbApi";
import { findBridgeCandidates, generateBridgeReasoning, getBridgeStrength } from "../services/bridgeEngine";
import { getBridges, setBridges } from "../utils/storage";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";

const PAGE_BG = {
  backgroundImage:
    "radial-gradient(55% 40% at 85% 0%, rgba(255,138,91,0.10), transparent 70%), radial-gradient(45% 40% at 0% 100%, rgba(124,92,255,0.12), transparent 70%)",
};

export default function BridgeScreen({ profile, watched, blindSpot, onViewDetail, onGoBack }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Finding candidates…");
  const [reasonings, setReasonings] = useState({});
  const [expanded, setExpanded] = useState(0);

  useEffect(() => {
    if (!blindSpot || !profile) return;

    const cached = getBridges(blindSpot.genre.id);
    if (cached) {
      setCandidates(cached.candidates);
      setReasonings(cached.reasonings);
      setLoading(false);
      return;
    }

    setLoading(true);
    findBridgeCandidates(blindSpot.genre.id, profile, "US", (msg) => setLoadingMsg(msg))
      .then(async (results) => {
        setCandidates(results);
        setLoading(false);
        const newReasonings = {};
        for (const candidate of results) {
          try {
            const reasoning = await generateBridgeReasoning(watched, candidate);
            if (reasoning) {
              newReasonings[candidate.id] = reasoning;
              setReasonings((prev) => ({ ...prev, [candidate.id]: reasoning }));
            }
          } catch {
            /* fallback handled inside generateBridgeReasoning */
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        setBridges(blindSpot.genre.id, { candidates: results, reasonings: newReasonings });
      })
      .catch(() => {
        setCandidates([]);
        setLoading(false);
      });
  }, [blindSpot, profile, watched]);

  if (!blindSpot) {
    return (
      <div className="min-h-screen bg-void text-ink grid place-items-center px-6" style={PAGE_BG}>
        <div className="text-center">
          <p className="text-ink-muted font-body mb-4">Pick a blind spot to explore.</p>
          <Button variant="ghost" onClick={onGoBack}>Back to blind spots</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void text-ink" style={PAGE_BG}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button onClick={onGoBack} className="text-sm text-ink-muted hover:text-ink font-body transition-colors mb-6">
          ← Back to blind spots
        </button>

        <h1 className="font-brand text-3xl font-bold mb-2">
          Bridges to <span style={{ color: GENRE_COLORS[blindSpot.genre.id] || "#7C5CFF" }}>{blindSpot.genre.name}</span>
        </h1>
        <p className="text-ink-muted font-body mb-6">Films that connect what you already love to a genre you avoid.</p>

        {loading && (
          <div className="text-center py-12">
            <div className="flex gap-1.5 justify-center mb-3">
              <span className="w-2 h-2 rounded-full bg-primary loading-dot" />
              <span className="w-2 h-2 rounded-full bg-primary loading-dot" />
              <span className="w-2 h-2 rounded-full bg-primary loading-dot" />
            </div>
            <p className="text-sm text-ink-muted font-body">{loadingMsg}</p>
          </div>
        )}

        {!loading && candidates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-ink-muted font-body mb-4">No Netflix titles found in this genre for your region.</p>
            <Button variant="ghost" onClick={onGoBack}>Try another blind spot</Button>
          </div>
        )}

        {!loading &&
          candidates.map((movie, i) => {
            const reasoning = reasonings[movie.id];
            const strength = getBridgeStrength(movie.similarity || 0);
            const isExpanded = expanded === i;
            return (
              <Card key={movie.id} className={`mb-3 overflow-hidden ${isExpanded ? "border-primary" : ""}`}>
                <div onClick={() => setExpanded(isExpanded ? -1 : i)} className="p-4 cursor-pointer flex gap-3">
                  {movie.poster_path ? (
                    <img src={posterUrl(movie.poster_path, "w154")} alt={movie.title} className="w-14 h-20 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-20 rounded-lg bg-line grid place-items-center text-2xl shrink-0">🎬</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-ink leading-tight">
                      {movie.title} <span className="text-ink-muted font-normal text-sm">({(movie.release_date || "").slice(0, 4)})</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {(movie.genre_names || []).slice(0, 3).map((g) => (
                        <Chip key={g} tone="neutral">{g}</Chip>
                      ))}
                      {movie.vote_average > 0 && <span className="text-[11px] text-ink font-body">★ {movie.vote_average.toFixed(1)}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md font-body" style={{ color: strength.color, backgroundColor: strength.color + "20" }}>
                        {strength.label}
                      </span>
                      <Chip tone="primary">On Netflix</Chip>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-line">
                    <div className="bg-void rounded-xl p-3.5 mt-3">
                      <p className="text-[10px] font-bold text-primary-soft uppercase tracking-wider mb-1.5 font-body">Why this is your bridge</p>
                      {reasoning ? (
                        <p className="text-[13px] text-ink/90 leading-relaxed font-body">{reasoning}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary loading-dot" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary loading-dot" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary loading-dot" />
                          </div>
                          <span className="text-xs text-ink-muted font-body">Generating reasoning…</span>
                        </div>
                      )}
                    </div>

                    {movie.keywords && movie.keywords.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-ink-muted font-body">Themes:</span>
                        {movie.keywords.slice(0, 5).map((kw) => (
                          <Chip key={kw.id || kw.name} tone="neutral">{kw.name}</Chip>
                        ))}
                      </div>
                    )}

                    <Button variant="ghost" className="w-full mt-3" onClick={() => onViewDetail(movie)}>View details</Button>
                  </div>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
}
