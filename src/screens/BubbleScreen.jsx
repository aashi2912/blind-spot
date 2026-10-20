import { useState, useEffect } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { GENRES, GENRE_COLORS } from "../utils/constants";
import { computeBubbleScore } from "../services/bubbleScore";
import { templateSummary, generateTasteSummary } from "../services/tasteSummary";
import { shareProfile } from "../utils/shareCard";
import { getSaved } from "../utils/storage";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";
import NavBar from "../components/NavBar";

const PAGE_BG = {
  backgroundImage:
    "radial-gradient(60% 45% at 80% 0%, rgba(124,92,255,0.16), transparent 70%), radial-gradient(40% 35% at 5% 100%, rgba(255,138,91,0.07), transparent 70%)",
};

const PART_LABELS = { genre: "Same few genres", breadth: "Most genres ignored", language: "Mostly one language", decade: "Mostly one era" };

const SHARE_LABEL = {
  working: "Creating image…",
  shared: "Shared ✓",
  downloaded: "Image saved + link copied ✓",
  error: "Couldn't share — try again",
};

export default function BubbleScreen({ profile, watched, sampleMode, onViewBlindSpots, onAddMore, onHome, onGo, ready }) {
  const [summary, setSummary] = useState(() => (profile ? templateSummary(profile) : ""));
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);
  const [saved] = useState(() => getSaved());

  useEffect(() => {
    let alive = true;
    if (profile) {
      generateTasteSummary(profile).then((s) => { if (alive && s) setSummary(s); });
    }
    return () => { alive = false; };
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-void text-ink grid place-items-center px-6" style={PAGE_BG}>
        <div className="text-center">
          <p className="text-ink-muted font-body mb-4">Add a few titles to see your taste.</p>
          <Button variant="ghost" onClick={onAddMore}>Add titles</Button>
        </div>
      </div>
    );
  }

  const { score, band, parts } = computeBubbleScore(profile);
  const { genreVector, keywordVector, decadeDistribution, languageConcentration, headline } = profile;

  const radarData = GENRES.map((g, i) => ({ genre: g.name, value: Math.round(genreVector[i] * 100) }));
  const activeGenres = GENRES.map((g, i) => ({ ...g, weight: genreVector[i] }))
    .filter((g) => g.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  const decadeEntries = Object.entries(decadeDistribution);
  const langEntries = languageConcentration.breakdown.slice(0, 5);

  const handleShare = async () => {
    setShareStatus("working");
    const result = await shareProfile(profile, { score, band, summary });
    setShareStatus(result);
    setTimeout(() => setShareStatus(null), 2800);
  };

  return (
    <div className="min-h-screen bg-void text-ink" style={PAGE_BG}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <NavBar active="bubble" ready={ready} onGo={onGo} onHome={onHome} />

        {sampleMode && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2.5 mb-5 text-xs font-body flex items-center justify-between gap-3">
            <span className="text-primary-soft">You're viewing a sample profile.</span>
            <button onClick={onAddMore} className="text-ink underline underline-offset-2 whitespace-nowrap">Use my own history →</button>
          </div>
        )}

        <div className="text-center animate-score mb-3">
          <p className="text-ink-muted font-body text-sm mb-2">Your Bubble Score</p>
          <div className="font-brand font-bold leading-none tracking-tight">
            <span className="text-7xl sm:text-8xl text-primary">{score}</span>
            <span className="text-2xl text-ink-muted">/100</span>
          </div>
          <p className="font-brand text-xl mt-3">{band}</p>
          <p className="text-ink-muted font-body mt-3 max-w-md mx-auto">{summary}</p>
        </div>

        <div className="flex flex-col items-center gap-2 mb-10">
          <Button variant="accent" onClick={handleShare} disabled={shareStatus === "working"}>
            {SHARE_LABEL[shareStatus] || "Share my result"}
          </Button>
          <button onClick={() => setShowBreakdown((v) => !v)} className="text-xs text-primary-soft hover:text-primary font-body underline underline-offset-2">
            {showBreakdown ? "Hide" : "What does this score mean?"}
          </button>
          {showBreakdown && (
            <Card className="p-4 mt-1 text-left w-full">
              <p className="text-xs text-ink-muted font-body mb-3">A higher score means you stick to a narrower set of shows. It blends four things from your history:</p>
              {Object.entries(parts).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-ink w-36 font-body">{PART_LABELS[k]}</span>
                  <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: Math.round(v * 100) + "%" }} />
                  </div>
                  <span className="text-[10px] text-ink-muted w-8 text-right font-body">{Math.round(v * 100)}</span>
                </div>
              ))}
            </Card>
          )}
        </div>

        <Card className="p-5 mb-5">
          <p className="text-sm font-bold font-body mb-1">The shape of your taste</p>
          <p className="text-xs text-ink-muted font-body mb-3">
            {headline.titleCount} titles across {headline.activeGenreCount} of {profile.totalGenres} genres
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#272B3D" />
              <PolarAngleAxis dataKey="genre" tick={{ fill: "#9AA0B4", fontSize: 9, fontFamily: "DM Sans" }} />
              <Radar dataKey="value" stroke="#7C5CFF" fill="#7C5CFF" fillOpacity={0.28} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 mb-5">
          <p className="text-sm font-bold font-body mb-3">Genre breakdown</p>
          {activeGenres.slice(0, 8).map((g) => {
            const pct = Math.round(g.weight * 100);
            return (
              <div key={g.id} className="flex items-center gap-3 mb-2">
                <span className="text-xs w-24 text-right text-ink font-body">{g.name}</span>
                <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: pct + "%", backgroundColor: GENRE_COLORS[g.id] || "#7C5CFF" }} />
                </div>
                <span className="text-[10px] text-ink-muted w-8 font-body">{pct}%</span>
              </div>
            );
          })}
        </Card>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <Card className="p-4">
            <p className="text-xs font-bold font-body mb-3">Decade skew</p>
            {decadeEntries.map(([decade, pct]) => (
              <div key={decade} className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] w-14 text-ink-muted font-body">{decade}</span>
                <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: pct + "%", backgroundColor: pct > 50 ? "#7C5CFF" : "#A594FF" }} />
                </div>
                <span className="text-[9px] text-ink-muted w-7 text-right font-body">{pct}%</span>
              </div>
            ))}
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold font-body mb-3">Language</p>
            {langEntries.map((l) => (
              <div key={l.language} className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] w-14 uppercase text-ink-muted font-body">{l.language}</span>
                <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: l.percent + "%", backgroundColor: l.percent > 50 ? "#7C5CFF" : "#A594FF" }} />
                </div>
                <span className="text-[9px] text-ink-muted w-7 text-right font-body">{l.percent}%</span>
              </div>
            ))}
            <p className="text-[10px] text-accent mt-2 font-body">Concentration {Math.round(languageConcentration.index * 100)}%</p>
          </Card>
        </div>

        {keywordVector.length > 0 && (
          <Card className="p-5 mb-5">
            <p className="text-sm font-bold font-body mb-3">Themes you keep coming back to</p>
            <div className="flex flex-wrap gap-1.5">
              {keywordVector.slice(0, 15).map((kw, i) => (
                <Chip key={kw.name} tone={i < 3 ? "primary" : "neutral"}>{kw.name}</Chip>
              ))}
            </div>
          </Card>
        )}

        {saved.length > 0 && (
          <Card className="p-5 mb-5 border-accent/30">
            <p className="text-sm font-bold font-body mb-3">Your watchlist · {saved.length}</p>
            <div className="flex flex-col gap-2">
              {saved.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <span className="text-ink font-body truncate">{s.title}</span>
                  <span className="text-ink-muted font-body text-xs">{(s.release_date || "").slice(0, 4)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Button className="w-full mb-3" size="lg" onClick={onViewBlindSpots}>Show me what I'm missing</Button>
        <Button className="w-full" variant="ghost" onClick={onAddMore}>
          {sampleMode ? "Use my own history" : "Add more titles"}
        </Button>
      </div>
    </div>
  );
}
