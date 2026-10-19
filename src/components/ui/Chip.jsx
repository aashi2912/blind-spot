export default function Chip({ tone = "neutral", className = "", children, ...props }) {
  const tones = {
    neutral: "bg-white/5 text-ink-muted border border-line",
    primary: "bg-primary/15 text-primary-soft border border-primary/30",
    accent: "bg-accent/15 text-accent border border-accent/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-body ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
