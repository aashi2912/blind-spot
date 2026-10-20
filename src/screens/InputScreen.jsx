import { useState, useEffect, useRef } from "react";
import { searchAll, getTrending, posterUrl } from "../services/tmdbApi";
import { GENRE_MAP, GENRE_COLORS, MIN_TITLES, GOOD_TITLES } from "../utils/constants";
import { parseNetflixCsv } from "../utils/netflixImport";
import { enrichTitles } from "../services/enrichTitles";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";

const PAGE_BG = {
  backgroundImage:
    "radial-gradient(55% 40% at 85% 0%, rgba(124,92,255,0.14), transparent 70%), radial-gradient(45% 40% at 0% 100%, rgba(255,138,91,0.06), transparent 70%)",
};

export default function InputScreen({ watched, onAdd, onRemove, onAnalyze, onImportMany, profile }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [trending, setTrending] = useState([]);
  const debounceRef = useRef(null);

  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, matched: 0 });
  const [importError, setImportError] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    getTrending().then((d) => setTrending(d.results?.slice(0, 10) || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchAll(query);
        const ids = new Set(watched.map((w) => w.id + ":" + w.media_type));
        setResults(res.filter((r) => !ids.has(r.id + ":" + r.media_type)));
      } catch { setResults([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, watched]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportedCount(0);
    try {
      const text = await file.text();
      const { titles } = parseNetflixCsv(text);
      if (!titles.length) {
        setImportError("Could not find titles in that file. Make sure it is your Netflix viewing-activity CSV.");
        return;
      }
      setImporting(true);
      setImportProgress({ done: 0, total: titles.length, matched: 0 });
      const enriched = await enrichTitles(titles, { concurrency: 5, onProgress: (p) => setImportProgress(p) });
      onImportMany?.(enriched);
      setImportedCount(enriched.length);
      if (!enriched.length) setImportError("Read your file, but couldn't match any titles. Check your connection and try again.");
    } catch {
      setImportError("Something went wrong reading that file. Try re-downloading it from Netflix.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const watchedIds = new Set(watched.map((w) => w.id + ":" + (w.media_type || "movie")));
  const progress = Math.min(watched.length / GOOD_TITLES, 1);

  const genreCounts = {};
  watched.forEach((t) => (t.genre_ids || []).forEach((gid) => {
    const name = GENRE_MAP[gid]?.name;
    if (name) genreCounts[name] = (genreCounts[name] || 0) + 1;
  }));
  const totalGenreTags = Object.values(genreCounts).reduce((a, b) => a + b, 0) || 1;
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="min-h-screen bg-void text-ink" style={PAGE_BG}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8 font-bold">
          <svg viewBox="0 0 26 26" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="13" cy="13" r="11.5" stroke="#7C5CFF" strokeWidth="1.5" opacity="0.5" fill="none" />
            <circle cx="10.5" cy="11" r="2.4" fill="#7C5CFF" />
            <circle cx="20" cy="19.5" r="2" fill="#FF8A5B" />
          </svg>
          Blind Spot
        </div>

        <h1 className="font-brand text-3xl font-bold mb-2">What have you been watching?</h1>
        <p className="text-ink-muted font-body mb-6">Import your Netflix history, or search and add titles.</p>

        {/* Import */}
        <Card className="p-5 mb-4">
          <h3 className="text-base font-bold font-body mb-1">Import your Netflix history</h3>
          <p className="text-xs text-ink-muted font-body mb-3">One file, everything at once. Read in your browser, never uploaded.</p>
          {!importing && (
            <>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              <Button className="w-full" onClick={() => fileRef.current && fileRef.current.click()}>Choose your Netflix file</Button>
              <button onClick={() => setShowHelp((v) => !v)} className="mt-2 text-xs text-ink-muted hover:text-ink font-body underline underline-offset-2">
                How do I get this file?
              </button>
              {showHelp && (
                <ol className="mt-2 text-xs text-ink-muted font-body list-decimal pl-4 space-y-1">
                  <li>Go to netflix.com/viewingactivity (on the profile you want).</li>
                  <li>Scroll to the bottom and click "Download all".</li>
                  <li>Upload the NetflixViewingHistory.csv file here.</li>
                </ol>
              )}
            </>
          )}
          {importing && (
            <div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: (importProgress.total ? (importProgress.done / importProgress.total) * 100 : 0) + "%" }} />
                </div>
                <span className="text-xs text-ink-muted font-body whitespace-nowrap">{importProgress.done}/{importProgress.total}</span>
              </div>
              <p className="text-xs text-ink-muted font-body mt-2">Matching your titles… {importProgress.matched} found</p>
            </div>
          )}
          {importError && <p className="text-xs text-accent font-body mt-2">{importError}</p>}
          {importedCount > 0 && !importing && <p className="text-xs text-[#3ddc97] font-body mt-2">✓ Imported {importedCount} titles from your history.</p>}
        </Card>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-line" />
          <span className="text-[10px] text-ink-muted font-body uppercase tracking-wider">or add manually</span>
          <div className="flex-1 h-px bg-line" />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies and TV shows…"
            className="w-full py-3.5 px-10 rounded-xl border border-line bg-surface text-ink text-sm font-body outline-none focus:border-primary/60 transition-colors"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base opacity-40">🔍</span>
          {searching && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary loading-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary loading-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary loading-dot" />
            </div>
          )}
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-surface border border-line rounded-xl mt-1 z-20 max-h-72 overflow-y-auto shadow-2xl">
              {results.slice(0, 8).map((r) => (
                <div
                  key={r.id + r.media_type}
                  onClick={() => { onAdd(r); setQuery(""); setResults([]); }}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 border-b border-line last:border-0 transition-colors"
                >
                  {r.poster_path ? (
                    <img src={posterUrl(r.poster_path, "w92")} alt="" className="w-8 h-12 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-12 rounded bg-line grid place-items-center text-xs shrink-0">🎬</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{r.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-ink-muted">{(r.release_date || "").slice(0, 4)}</span>
                      <span className="text-xs text-ink-muted capitalize">{r.media_type === "tv" ? "TV" : "Movie"}</span>
                      {r.vote_average > 0 && <span className="text-xs text-ink">★ {r.vote_average.toFixed(1)}</span>}
                    </div>
                  </div>
                  <span className="text-primary text-lg shrink-0">+</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress */}
        {watched.length > 0 && watched.length < GOOD_TITLES && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-1 bg-line rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: progress * 100 + "%" }} />
            </div>
            <span className="text-xs text-ink-muted font-body whitespace-nowrap">{watched.length}/{GOOD_TITLES}</span>
          </div>
        )}

        {watched.length >= MIN_TITLES && (
          <div className="bg-[#3ddc97]/10 border border-[#3ddc97]/20 rounded-xl px-4 py-2.5 mb-4 text-xs text-[#3ddc97] font-body">
            {watched.length >= GOOD_TITLES ? "✓ Great profile. Ready for deep analysis." : "✓ Enough for a basic read. Add more for deeper insight."}
          </div>
        )}

        {/* Taste so far */}
        {topGenres.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-bold text-ink-muted mb-2 font-body">Your taste so far</p>
            <div className="flex flex-wrap gap-1.5 items-center">
              {topGenres.map(([name, count]) => {
                const genre = Object.values(GENRE_MAP).find((g) => g.name === name);
                const color = genre ? GENRE_COLORS[genre.id] : "#7C5CFF";
                return (
                  <span key={name} className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-md" style={{ backgroundColor: color }}>{name}</span>
                    <span className="text-[10px] text-ink-muted">{Math.round((count / totalGenreTags) * 100)}%</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Watched list */}
        {watched.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-bold text-ink-muted mb-2 font-body">{watched.length} title{watched.length !== 1 ? "s" : ""} added</p>
            <div className="flex flex-wrap gap-2">
              {watched.map((t) => (
                <div key={t.id + (t.media_type || "")} className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2 border border-line">
                  {t.poster_path ? (
                    <img src={posterUrl(t.poster_path, "w92")} alt="" className="w-6 h-9 rounded object-cover" />
                  ) : (
                    <div className="w-6 h-9 rounded bg-line grid place-items-center text-xs">🎬</div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-ink leading-tight">{t.title}</p>
                    <p className="text-[10px] text-ink-muted">{(t.release_date || "").slice(0, 4)}</p>
                  </div>
                  <button onClick={() => onRemove(t.id, t.media_type)} className="text-ink-muted hover:text-accent text-sm ml-1 transition-colors">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analyze */}
        {watched.length >= MIN_TITLES && (
          <Button className="w-full" size="lg" onClick={onAnalyze}>Reveal my bubble</Button>
        )}

        {/* Trending */}
        {trending.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold text-ink-muted mb-2 font-body">Quick add — trending on Netflix</p>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {trending.filter((t) => !watchedIds.has(t.id + ":movie")).slice(0, 8).map((t) => (
                <div
                  key={t.id}
                  onClick={() => onAdd({ id: t.id, media_type: "movie", title: t.title, poster_path: t.poster_path, release_date: t.release_date || "", genre_ids: t.genre_ids || [], original_language: t.original_language || "en", vote_average: t.vote_average || 0, vote_count: t.vote_count || 0, overview: t.overview || "" })}
                  className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {t.poster_path ? (
                    <img src={posterUrl(t.poster_path, "w154")} alt={t.title} className="w-16 h-24 rounded-lg object-cover border border-line" />
                  ) : (
                    <div className="w-16 h-24 rounded-lg bg-surface border border-line grid place-items-center text-xs text-ink-muted">{t.title?.slice(0, 6)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
