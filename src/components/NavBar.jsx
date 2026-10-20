// Persistent product nav. The three main stages are always visible; you can
// jump to any that's available (Your taste / Blind spots unlock once you have a
// profile). Drill-down screens (Bridges, Detail) also get a contextual back.
const STAGES = [
  { key: "input", label: "Titles" },
  { key: "bubble", label: "Your taste" },
  { key: "blindspots", label: "Blind spots" },
];

export default function NavBar({ active, ready, onGo, onHome, onBack, backLabel }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onHome}
          aria-label="Back to home"
          className="flex items-center gap-2 font-bold text-ink hover:opacity-80 transition-opacity shrink-0"
        >
          <svg viewBox="0 0 26 26" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="13" cy="13" r="11.5" stroke="#7C5CFF" strokeWidth="1.5" opacity="0.5" fill="none" />
            <circle cx="10.5" cy="11" r="2.4" fill="#7C5CFF" />
            <circle cx="20" cy="19.5" r="2" fill="#FF8A5B" />
          </svg>
          <span className="hidden sm:inline">Blind Spot</span>
        </button>

        <nav className="flex items-center gap-1 bg-surface border border-line rounded-xl p-1" aria-label="Progress">
          {STAGES.map((st) => {
            const enabled = st.key === "input" ? true : !!ready;
            const isActive = active === st.key;
            return (
              <button
                key={st.key}
                disabled={!enabled}
                onClick={() => enabled && onGo(st.key)}
                aria-current={isActive ? "page" : undefined}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold font-body transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : enabled
                    ? "text-ink-muted hover:text-ink"
                    : "text-ink-muted/30 cursor-not-allowed"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </nav>
      </div>

      {onBack && (
        <button onClick={onBack} className="mt-3 text-sm text-ink-muted hover:text-ink font-body transition-colors">
          ← {backLabel || "Back"}
        </button>
      )}
    </div>
  );
}
