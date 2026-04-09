import { useState, useEffect } from "react";
import { GENRE_COLORS } from "../utils/constants";
import { posterUrl } from "../services/tmdbApi";
import { findBridgeCandidates, generateBridgeReasoning, getBridgeStrength } from "../services/bridgeEngine";
import { getBridges, setBridges } from "../utils/storage";

export default function BridgeScreen({ profile, watched, blindSpot, onViewDetail, onGoBack }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Finding candidates...");
  const [reasonings, setReasonings] = useState({});
  const [expanded, setExpanded] = useState(0);

  useEffect(() => {
    if (!blindSpot || !profile) return;

    // Check cache
    const cached = getBridges(blindSpot.genre.id);
    if (cached) {
      setCandidates(cached.candidates);
      setReasonings(cached.reasonings);
      setLoading(false);
      return;
    }

    setLoading(true);
    findBridgeCandidates(
      blindSpot.genre.id,
      profile,
      "US",
      (msg) => setLoadingMsg(msg)
    )
      .then(async (results) => {
        setCandidates(results);
        setLoading(false);

        // Generate bridge reasonings progressively
        const newReasonings = {};
        for (const candidate of results) {
          try {
            const reasoning = await generateBridgeReasoning(watched, candidate);
            if (reasoning) {
              newReasonings[candidate.id] = reasoning;
              setReasonings((prev) => ({ ...prev, [candidate.id]: reasoning }));
            }
          } catch {
            // Fallback already handled inside generateBridgeReasoning
          }
          // Small delay between LLM calls
          await new Promise((r) => setTimeout(r, 500));
        }

        // Cache results
        setBridges(blindSpot.genre.id, {
          candidates: results,
          reasonings: newReasonings,
        });
      })
      .catch(() => {
        setCandidates([]);
        setLoading(false);
      });
  }, [blindSpot, profile, watched]);

  if (!blindSpot) {
    return (
      <div className="text-center py-12">
        <p className="text-spot-muted font-body">Select a blind spot to explore.</p>
        <button onClick={onGoBack} className="mt-4 text-spot-red font-body text-sm">
          {"<-"} Back to blind spots
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onGoBack} className="text-spot-muted hover:text-white text-sm transition-colors">
          {"<-"}
        </button>
        <h2 className="text-xl font-extrabold text-white font-display">
          Bridges to{" "}
          <span style={{ color: GENRE_COLORS[blindSpot.genre.id] }}>
            {blindSpot.genre.name}
          </span>
        </h2>
      </div>
      <p className="text-sm text-spot-muted mb-5 font-body">
        AI-selected films connecting your taste to this blind spot
      </p>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="flex gap-1 justify-center mb-3">
            <span className="w-2 h-2 rounded-full bg-spot-red loading-dot" />
            <span className="w-2 h-2 rounded-full bg-spot-red loading-dot" />
            <span className="w-2 h-2 rounded-full bg-spot-red loading-dot" />
          </div>
          <p className="text-sm text-spot-muted font-body">{loadingMsg}</p>
        </div>
      )}

      {/* No results */}
      {!loading && candidates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-spot-muted font-body">
            No Netflix titles found in this genre for your region.
          </p>
          <button onClick={onGoBack} className="mt-4 text-spot-red font-body text-sm">
            Try another blind spot
          </button>
        </div>
      )}

      {/* Bridge cards */}
      {!loading &&
        candidates.map((movie, i) => {
          const reasoning = reasonings[movie.id];
          const strength = getBridgeStrength(movie.similarity || 0);
          const isExpanded = expanded === i;

          return (
            <div
              key={movie.id}
              className={`bg-spot-card rounded-2xl mb-3 overflow-hidden border transition-colors ${
                isExpanded ? "border-spot-red" : "border-spot-border"
              }`}
            >
              {/* Card header */}
              <div
                onClick={() => setExpanded(isExpanded ? -1 : i)}
                className="p-4 cursor-pointer"
              >
                <div className="flex gap-3">
                  {/* Poster */}
                  {movie.poster_path ? (
                    <img
                      src={posterUrl(movie.poster_path, "w154")}
                      alt={movie.title}
                      className="w-12 h-[72px] rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-[72px] rounded-lg bg-spot-border flex items-center justify-center text-2xl flex-shrink-0">
                      {"🎬"}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-white leading-tight">
                      {movie.title}{" "}
                      <span className="text-gray-500 font-normal text-sm">
                        ({(movie.release_date || "").slice(0, 4)})
                      </span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {(movie.genre_names || []).slice(0, 3).map((g) => (
                        <span
                          key={g}
                          className="text-[9px] font-semibold text-white px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor:
                              GENRE_COLORS[
                                Object.entries(GENRE_COLORS).find(
                                  ([, v]) => v
                                )?.[0]
                              ] || "#666",
                          }}
                        >
                          {g}
                        </span>
                      ))}
                      {movie.vote_average > 0 && (
                        <span className="text-[10px] text-yellow-400 font-body">
                          {"★"} {movie.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md font-body"
                        style={{
                          color: strength.color,
                          backgroundColor: strength.color + "18",
                        }}
                      >
                        {strength.label}
                      </span>
                      <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-md font-semibold font-body">
                        On Netflix
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-spot-border/50">
                  {/* Bridge reasoning */}
                  <div className="bg-spot-dark rounded-xl p-3.5 mt-3">
                    <p className="text-[10px] font-bold text-spot-red uppercase tracking-wider mb-1.5 font-body">
                      Why this is your bridge
                    </p>
                    {reasoning ? (
                      <p className="text-[13px] text-gray-300 leading-relaxed font-body">
                        {reasoning}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-spot-red loading-dot" />
                          <span className="w-1.5 h-1.5 rounded-full bg-spot-red loading-dot" />
                          <span className="w-1.5 h-1.5 rounded-full bg-spot-red loading-dot" />
                        </div>
                        <span className="text-xs text-spot-muted font-body">
                          Generating reasoning...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Shared themes */}
                  {movie.keywords && movie.keywords.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] text-spot-muted font-body">
                        Themes:
                      </span>
                      {movie.keywords.slice(0, 5).map((kw) => (
                        <span
                          key={kw.id || kw.name}
                          className="text-[9px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded font-body"
                        >
                          {kw.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => onViewDetail(movie)}
                    className="w-full mt-3 py-2.5 rounded-xl border border-spot-border text-white text-sm font-semibold font-body hover:bg-white/5 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
