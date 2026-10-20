import { useState, useEffect } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { GENRES, GENRE_COLORS } from "../utils/constants";
import { computeBubbleScore } from "../services/bubbleScore";
import { templateSummary, generateTasteSummary } from "../services/tasteSummary";
import { shareProfile } from "../utils/shareCard";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";

const PAGE_BG = {
  backgroundImage:
    "radial-gradient(60% 45% at 80% 0%, rgba(124,92,255,0.16), transparent 70%), radial-gradient(40% 35% at 5% 100%, rgba(255,138,91,0.07), transparent 70%)",
};

const PART_LABELS = {
  genre: "Genre focus",
  breadth: "Few genres",
  language: "One language",
  decade: "One era",
};

const SHARE_LABEL = {
  working: "Generating…",
  shared: "Shared ✓",
  downloaded: "Image saved + link copied ✓",
  error: "Couldn't share — try again",
};

export default function BubbleScreen({ profile, watched, onViewBlindSpots, onGoBack }) {
  const [summary, setSummary] = useState(() => (profile ? templateSummary(profile) : ""));
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);

  useEffect(() => {
    let alive = true;
    if (profile) {
      generateTasteSummary(profile).then((s) => {
        if (alive && s) setSummary(s);
      });
    }
    return () => { alive = false; };
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-void text-ink grid place-items-center px-6" style={PAGE_BG}>
        <div className="text-center">
          <p className="text-ink-muted font-body mb-4">Add a few titles to see your bubble.</p>
          <Button variant="ghost" onClick={onGoBack}>Back to titles</Button>
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
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 font-bold">
            <svg viewBox="0 0 26 26" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="13" cy="13" r="11.5" stroke="#7C5CFF" strokeWidth="1.5" opacity="0.5" fill="none" />
              <circle cx="10.5" cy="11" r="2.4" fill="#7C5CFF" />
              <circle cx="20" cy="19.5" r="2" fill="#FF8A5B" />
            </svg>
            Blind Spot
          </div>
          <button onClick={onGoBack} className="text-sm text-ink-muted hover:text-ink font-body transition-colors">
            Start over
          </button>
        </div>

        {/* Score centerpiece */}
        <div className="text-center animate-score mb-3">
          <p className="text-ink-muted font-body text-sm mb-2">Your Bubble Score</p>
          <div className="font-brand font-bold leading-none tracking-tight">
            <span className="text-7xl sm:text-8xl text-primary">{score}</span>
            <span className="text-2xl text-ink-muted">/100</span>
          </div>
          <p className="font-brand text-xl mt-3">{band}</p>
          <p className="text-ink-muted font-body mt-3 max-w-md mx-auto">{summary}</p>
        </div>

        {/* Share + explain */}
        <div className="flex flex-col items-center gap-2 mb-10">
          <Button variant="accent" onClick={handleShare} disabled={shareStatus === "working"}>
            {SHARE_LABEL[shareStatus] || "Share my bubble"}
          </Button>
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="text-xs text-primary-soft hover:text-primary font-body underline underline-offset-2"
          >
            {showBreakdown ? "Hide" : "How is this scored?"}
          </button>
          {showBreakdown && (
            <Card className="p-4 mt-1 text-left w-full">
              <p className="text-xs text-ink-muted font-body mb-3">
                Higher means a tighter bubble. It blends four signals from your history:
              </p>
              {Object.entries(parts).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-ink w-24 font-body">{PART_LABELS[k]}</span>
                  <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: Math.round(v * 100) + "%" }} />
                  </div>
                  <span className="text-[10px] text-ink-muted w-8 text-right font-body">{Math.round(v * 100)}</span>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Genre radar */}
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

        {/* Genre breakdown */}
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

        {/* Decade + Language */}
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

        {/* Themes */}
        {keywordVector.length > 0 && (
          <Card className="p-5 mb-6">
            <p className="text-sm font-bold font-body mb-3">Your recurring themes</p>
            <div className="flex flex-wrap gap-1.5">
              {keywordVector.slice(0, 15).map((kw, i) => (
                <Chip key={kw.name} tone={i < 3 ? "primary" : "neutral"}>{kw.name}</Chip>
              ))}
            </div>
          </Card>
        )}

        {/* CTAs */}
        <Button className="w-full mb-3" size="lg" onClick={onViewBlindSpots}>See my blind spots</Button>
        <Button className="w-full" variant="ghost" onClick={onGoBack}>Add more titles</Button>
      </div>
    </div>
  );
}
