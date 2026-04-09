import { GENRES, GENRE_IDS, GENRE_COLORS, DECADES } from "../utils/constants";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

export default function BubbleScreen({ profile, watched, onViewBlindSpots, onGoBack }) {
  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-spot-muted font-body">Add at least 5 titles to see your bubble.</p>
        <button onClick={onGoBack} className="mt-4 text-spot-red font-body text-sm">← Add more titles</button>
      </div>
    );
  }

  const { genreVector, keywordVector, decadeDistribution, languageConcentration, headline } = profile;

  // Radar chart data — only show genres with non-zero weight + some zero neighbors for context
  const radarData = GENRES.map((g, i) => ({
    genre: g.name,
    value: Math.round(genreVector[i] * 100),
    fullMark: 100,
  }));

  // Decade bars
  const decadeEntries = Object.entries(decadeDistribution);

  // Language bars
  const langEntries = languageConcentration.breakdown.slice(0, 5);

  return (
    <div>
      <h2 className="text-xl font-extrabold text-white mb-1 font-display">Your Bubble</h2>
      <p className="text-sm text-spot-muted mb-5 font-body">Here's what your taste actually looks like</p>

      {/* Headline stat */}
      <div className="bg-gradient-to-br from-red-950/50 to-spot-dark rounded-2xl p-5 mb-5 border border-spot-red/20">
        <p className="text-2xl font-extrabold text-white leading-tight font-display">
          {headline.titleCount} titles.{" "}
          <span className="text-spot-red">{headline.topGenrePercent}%</span>{" "}
          {headline.topGenreName.toLowerCase()}.
        </p>
        <p className="text-sm text-gray-400 mt-1 font-body">
          Your taste occupies {headline.activeGenreCount} of {profile.totalGenres} genres.{" "}
          {headline.dominantLanguagePercent}% {headline.dominantLanguage === "en" ? "English" : headline.dominantLanguage}-language.
        </p>
      </div>

      {/* Genre Radar */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-3 font-body">
          Genre distribution
        </p>
        <div className="bg-spot-card rounded-2xl p-4 border border-spot-border">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#333" />
              <PolarAngleAxis
                dataKey="genre"
                tick={{ fill: "#888", fontSize: 9, fontFamily: "DM Sans" }}
              />
              <Radar
                dataKey="value"
                stroke="#dc2626"
                fill="#dc2626"
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Genre bars (alternate view for clarity) */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-2 font-body">
          Genre breakdown
        </p>
        {GENRES.map((g, i) => {
          const val = genreVector[i];
          const pct = Math.round(val * 100);
          return (
            <div key={g.id} className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] w-20 text-right font-body ${val > 0 ? "text-white font-semibold" : "text-gray-600"}`}>
                {g.name}
              </span>
              <div className="flex-1 h-2.5 bg-spot-card rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: pct + "%",
                    backgroundColor: val > 0 ? GENRE_COLORS[g.id] : "transparent",
                  }}
                />
              </div>
              {val > 0 && (
                <span className="text-[10px] text-spot-muted w-8 font-mono">{pct}%</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Decade + Language side by side */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-spot-card rounded-xl p-4 border border-spot-border">
          <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-2 font-body">
            Decade skew
          </p>
          {decadeEntries.map(([decade, pct]) => (
            <div key={decade} className="flex items-center gap-1.5 mb-1.5">
              <span className={`text-[10px] w-14 font-body ${pct > 0 ? "text-gray-300" : "text-gray-600"}`}>
                {decade}
              </span>
              <div className="flex-1 h-1.5 bg-spot-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: pct + "%",
                    backgroundColor: pct > 50 ? "#dc2626" : pct > 0 ? "#f97316" : "transparent",
                  }}
                />
              </div>
              <span className="text-[9px] text-spot-muted w-7 font-mono">{pct}%</span>
            </div>
          ))}
        </div>

        <div className="bg-spot-card rounded-xl p-4 border border-spot-border">
          <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-2 font-body">
            Language
          </p>
          {langEntries.map((l) => (
            <div key={l.language} className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px] text-gray-300 w-14 font-body uppercase">
                {l.language}
              </span>
              <div className="flex-1 h-1.5 bg-spot-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: l.percent + "%",
                    backgroundColor: l.percent > 50 ? "#dc2626" : "#6366f1",
                  }}
                />
              </div>
              <span className="text-[9px] text-spot-muted w-7 font-mono">{l.percent}%</span>
            </div>
          ))}
          <p className="text-[10px] text-spot-red mt-2 font-body">
            Concentration: {(languageConcentration.index * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Theme clusters */}
      {keywordVector.length > 0 && (
        <div className="bg-spot-card rounded-xl p-4 border border-spot-border mb-6">
          <p className="text-[10px] font-bold text-spot-muted uppercase tracking-wider mb-2 font-body">
            Your recurring themes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {keywordVector.slice(0, 15).map((kw, i) => (
              <span
                key={kw.name}
                className="text-[11px] text-white px-2.5 py-1 rounded-lg font-body"
                style={{
                  backgroundColor:
                    i < 3 ? "#dc2626" : i < 6 ? "#7c3aed" : i < 10 ? "#374151" : "#1f2937",
                  opacity: 0.6 + kw.weight * 0.4,
                }}
              >
                {kw.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onViewBlindSpots}
        className="w-full py-4 rounded-xl bg-spot-red text-white text-base font-bold font-body shadow-lg shadow-spot-red/20 active:scale-[0.98] transition-transform"
      >
        Show My Blind Spots →
      </button>
    </div>
  );
}
