export default function Button({
  as: Tag = "button",
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center font-semibold font-body rounded-xl transition-transform active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void disabled:opacity-60 disabled:pointer-events-none";
  const sizes = {
    sm: "text-sm px-4 py-2",
    md: "text-base px-5 py-3",
    lg: "text-base px-6 py-3.5",
  };
  const variants = {
    primary: "bg-primary text-white shadow-glow hover:bg-primary-soft",
    ghost: "bg-transparent text-ink border border-line hover:border-primary/60",
    accent: "bg-accent text-[#1a0f0a] hover:brightness-105",
  };
  return (
    <Tag className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </Tag>
  );
}
