import { useState, useEffect } from "react";
import { GENRE_COLORS } from "../utils/constants";
import { posterUrl } from "../services/tmdbApi";
import { findBridgeCandidates, generateBridgeReasoning, getBridgeStrength, fallbackReasoning } from "../services/bridgeEngine";
import { getBridges, setBridges, getWatchlist, setWatchlistStatus } from "../utils/storage";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";
import NavBar from "../components/NavBar";

const PAGE_BG = {
  backgroundImage:
    "radial-gradient(55% 40% at 85% 0%, rgba(255,138,91,0.10), transparent 70%), radial-gradient(45% 40% at 0% 100%, rgba(124,92,255,0.12), transparent 70%)",
};

function capture(event, props) {
  try { window.posthog && window.posthog.capture && window.posthog.capture(event, props); } catch { /* ignore */ }
}

export default function BridgeScreen({ profile, watched, blindSpot, onViewDetail, onGoBack, onHome, onGo, ready }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Finding picks…");
  const [reasonings, setReasonings] = useState({});
  const [reasoningLoading, setReasoningLoading] = useState({});
  const [expanded, setExpanded] = useState(0);
  const [statusMap, setStatusMap] = useState(() => {
    const m = {};
    Object.values(getWatchlist()).forEach((it) => { m[it.id] = it.status; });
    return m;
  });

  // Load candidates (TMDB only). Reasoning is generated lazily, per expanded
  // card — not up front for all 5 — so opening a genre costs ~1 LLM call, not 5.
  useEffect(() => {
    if (!blindSpot || !profile) return;
    const cached = getBridges(blindSpot.genre.id);
    if (cached) {
      setCandidates(cached.candidates);
      setReasonings(cached.reasonings || {});
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    findBridgeCandidates(blindSpot.genre.id, profile, "US", (msg) => setLoadingMsg(msg))
      .then((results) => {
        if (!alive) return;
        setCandidates(results);
        setLoading(false);
        setBridges(blindSpot.genre.id, { candidates: results, reasonings: {} });
      })
      .catch(() => {
        if (!alive) return;
        setCandidates([]);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [blindSpot, profile]);

  // Lazily fetch reasoning for whichever card is expanded (default: the top pick).
  useEffect(() => {
    const movie = candidates[expanded];
    if (!movie) return;
    if (reasonings[movie.id] !== undefined || reasoningLoading[movie.id]) return;
    let alive = true;
    setReasoningLoading((p) => ({ ...p, [movie.id]: true }));
    generateBridgeReasoning(watched, movie)
      .then((text) => {
        if (!alive) return;
        // null = genuine no-fit (NO_BRIDGE); show the plain template so the card
        // always resolves instead of spinning forever.
        const reasoning = text || fallbackReasoning(movie);
        setReasonings((prev) => {
          const next = { ...prev, [movie.id]: reasoning };
          const stored = getBridges(blindSpot.genre.id) || { candidates, reasonings: {} };
          setBridges(blindSpot.genre.id, { candidates: stored.candidates || candidates, reasonings: next });
          return next;
        });
      })
      .finally(() => {
        if (!alive) return;
        setReasoningLoading((p) => { const n = { ...p }; delete n[movie.id]; return n; });
      });
    return () => { alive = false; };
  }, [expanded, candidates]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = (movie, status) => {
    setWatchlistStatus(movie, status);
    setStatusMap((prev) => {
      const next = { ...prev };
      if (!status) delete next[movie.id];
      else next[movie.id] = status;
      return next;
    });
    if (status === "saved") capture("bridge_saved", { id: movie.id });
    if (status === "dismissed") capture("bridge_dismissed", { id: movie.id });
  };

  if (!blindSpot) {
    return (
      <div className="min-h-screen bg-void text-ink grid place-items-center px-6" style={PAGE_BG}>
        <div className="text-center">
          <p className="text-ink-muted font-body mb-4">Pick a genre to explore.</p>
          <Button variant="ghost" onClick={onGoBack}>Back</Button>
        </div>
      </div>
    );
  }

  const visible = candidates.filter((m) => statusMap[m.id] !== "dismissed");

  return (
    <div className="min-h-screen bg-void text-ink" style={PAGE_BG}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <NavBar active="blindspots" ready={ready} onGo={onGo} onHome={onHome} onBack={onGoBack} backLabel="Blind spots" />

        <h1 className="font-brand text-3xl font-bold mb-2">
          Bridges to <span style={{ color: GENRE_COLORS[blindSpot.genre.id] || "#7C5CFF" }}>{blindSpot.genre.name}</span>
        </h1>
        <p className="text-ink-muted font-body mb-6">Each pick shares themes with shows you already watch — an easy way in.</p>

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

        {!loading && visible.length === 0 && (
          <div className="text-center py-12">
            <p className="text-ink-muted font-body mb-4">
              {candidates.length ? "You've cleared these out. Try another genre." : "No Netflix titles found in this genre for your region."}
            </p>
            <Button variant="ghost" onClick={onGoBack}>Back to blind spots</Button>
          </div>
        )}

        {!loading &&
          visible.map((movie) => {
            const i = candidates.indexOf(movie);
            const reasoning = reasonings[movie.id];
            const strength = getBridgeStrength(movie.similarity || 0);
            const isExpanded = expanded === i;
            const isSaved = statusMap[movie.id] === "saved";
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
                      {isSaved && <span className="text-accent text-xs ml-1">• saved</span>}
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
                      <p className="text-[10px] font-bold text-primary-soft uppercase tracking-wider mb-1.5 font-body">Why you'll probably like it</p>
                      {reasoning ? (
                        <p className="text-[13px] text-ink/90 leading-relaxed font-body">{reasoning}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary loading-dot" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary loading-dot" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary loading-dot" />
                          </div>
                          <span className="text-xs text-ink-muted font-body">Writing the reason…</span>
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

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Button variant={isSaved ? "accent" : "ghost"} onClick={() => setStatus(movie, isSaved ? null : "saved")}>
                        {isSaved ? "✓ Saved" : "+ Save"}
                      </Button>
                      <Button variant="ghost" onClick={() => setStatus(movie, "dismissed")}>Not for me</Button>
                    </div>
                    <Button variant="ghost" className="w-full mt-2" onClick={() => onViewDetail(movie)}>See details</Button>
                  </div>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
}
