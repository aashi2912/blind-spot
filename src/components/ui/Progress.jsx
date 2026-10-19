export default function Progress({ value = 0, className = "" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`h-1.5 w-full bg-line rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-primary rounded-full transition-[width] duration-500"
        style={{ width: pct + "%" }}
      />
    </div>
  );
}
