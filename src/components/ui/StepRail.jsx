// Guided-flow progress rail. Replaces peer-tab navigation with a sequence.
export default function StepRail({ steps = [], current = 0, className = "" }) {
  return (
    <nav className={`flex items-center gap-2 ${className}`} aria-label="Progress">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        const dot =
          state === "active"
            ? "bg-primary text-white"
            : state === "done"
            ? "bg-primary/25 text-primary-soft"
            : "bg-line text-ink-muted";
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`h-6 w-6 shrink-0 rounded-full grid place-items-center text-[11px] font-brand font-bold ${dot}`}
              aria-current={state === "active" ? "step" : undefined}
            >
              {i + 1}
            </span>
            <span className={`text-xs font-body hidden sm:block ${state === "todo" ? "text-ink-muted" : "text-ink"}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className={`h-px w-5 ${i < current ? "bg-primary/40" : "bg-line"}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
