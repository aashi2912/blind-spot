// Standard top nav on every screen: logo returns Home; the back link steps up
// one level in the flow. Gives consistent back/home navigation everywhere.
export default function TopBar({ onHome, onBack, backLabel = "Back" }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={onHome}
        aria-label="Back to home"
        className="flex items-center gap-2 font-bold text-ink hover:opacity-80 transition-opacity"
      >
        <svg viewBox="0 0 26 26" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="13" cy="13" r="11.5" stroke="#7C5CFF" strokeWidth="1.5" opacity="0.5" fill="none" />
          <circle cx="10.5" cy="11" r="2.4" fill="#7C5CFF" />
          <circle cx="20" cy="19.5" r="2" fill="#FF8A5B" />
        </svg>
        Blind Spot
      </button>
      {onBack && (
        <button onClick={onBack} className="text-sm text-ink-muted hover:text-ink font-body transition-colors">
          ← {backLabel}
        </button>
      )}
    </div>
  );
}
