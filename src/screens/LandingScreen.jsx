import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

function Orbit() {
  return (
    <svg viewBox="0 0 420 420" className="w-full max-w-[420px]" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="bs-glow" cx="42%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="210" cy="210" r="180" stroke="#272B3D" strokeWidth="1" fill="none" />
      <circle cx="210" cy="210" r="132" stroke="#272B3D" strokeWidth="1" fill="none" />
      <circle cx="210" cy="210" r="84" stroke="#272B3D" strokeWidth="1" fill="none" />
      <circle cx="210" cy="210" r="150" fill="url(#bs-glow)" />
      <g fill="#7C5CFF">
        <circle cx="150" cy="150" r="12" /><circle cx="188" cy="120" r="9" /><circle cx="128" cy="196" r="8" />
        <circle cx="176" cy="180" r="14" /><circle cx="212" cy="152" r="7" /><circle cx="146" cy="112" r="6" />
      </g>
      <g fill="#A594FF" opacity="0.8"><circle cx="228" cy="196" r="6" /><circle cx="196" cy="224" r="5" /></g>
      <g fill="#3A3F55">
        <circle cx="300" cy="150" r="5" /><circle cx="318" cy="230" r="6" /><circle cx="150" cy="300" r="5" />
        <circle cx="250" cy="312" r="5" /><circle cx="110" cy="260" r="4" /><circle cx="288" cy="286" r="4" />
      </g>
      <line x1="176" y1="180" x2="300" y2="300" stroke="#FF8A5B" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.7" />
      <circle cx="300" cy="300" r="10" fill="#FF8A5B" />
      <circle cx="300" cy="300" r="18" stroke="#FF8A5B" strokeWidth="1" opacity="0.4" fill="none" />
    </svg>
  );
}

const STEPS = [
  { n: "01", title: "Add your history", body: "Upload your Netflix history file, or just try a sample. It's read on your device and never uploaded." },
  { n: "02", title: "See your taste", body: "Get a clear picture of the genres, decades, and languages you watch most — plus a score for how much you stick to the same thing." },
  { n: "03", title: "Find something new", body: "Get one great pick from a genre you usually skip, with a short reason you'll probably like it.", out: true },
];

export default function LandingScreen({ onStart, onSample }) {
  const bg = {
    backgroundImage:
      "radial-gradient(60% 50% at 78% 8%, rgba(124,92,255,0.16), transparent 70%), radial-gradient(45% 40% at 12% 95%, rgba(255,138,91,0.08), transparent 70%)",
  };
  return (
    <div className="min-h-screen bg-void text-ink" style={bg}>
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5 font-bold text-lg">
            <svg viewBox="0 0 26 26" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="13" cy="13" r="11.5" stroke="#7C5CFF" strokeWidth="1.5" opacity="0.5" fill="none" />
              <circle cx="13" cy="13" r="6" fill="#7C5CFF" opacity="0.18" />
              <circle cx="10.5" cy="11" r="2.4" fill="#7C5CFF" />
              <circle cx="20" cy="19.5" r="2" fill="#FF8A5B" />
            </svg>
            Blind Spot
          </div>
          <nav className="hidden sm:flex items-center gap-7 text-sm font-medium text-ink-muted">
            <a href="#how" className="hover:text-ink transition-colors">How it works</a>
          </nav>
        </header>

        <section className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center py-12 lg:py-16">
          <div>
            <p className="text-primary-soft font-semibold mb-5">Your Netflix taste, seen clearly</p>
            <h1 className="font-brand font-bold tracking-tight leading-[1.03] text-4xl sm:text-5xl lg:text-[3.4rem]">
              See the great shows your Netflix habits hide.
            </h1>
            <p className="text-ink-muted text-lg mt-5 max-w-[34ch]">
              Netflix keeps showing you more of what you already watch. Blind Spot reads your history, shows you the genres you're stuck in, and picks one great show from a genre you skip.
            </p>
            <div className="flex flex-wrap gap-3.5 mt-9">
              <Button size="lg" onClick={onStart}>See my taste</Button>
              <Button variant="ghost" size="lg" onClick={onSample}>Try a sample</Button>
            </div>
            <p className="flex items-center gap-2 text-ink-muted text-sm mt-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3ddc97]" />
              Your history is read in your browser. Nothing is uploaded.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end"><Orbit /></div>
        </section>

        <section id="how" className="pb-20 pt-4 scroll-mt-8">
          <h2 className="font-brand text-ink-muted text-sm font-semibold mb-7">How it works</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <Card key={s.n} className={`p-6 ${s.out ? "border-accent/35" : ""}`}>
                <div className={`font-brand font-bold mb-3.5 ${s.out ? "text-accent" : "text-primary-soft"}`}>{s.n}</div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-ink-muted text-sm leading-relaxed">{s.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <footer className="border-t border-line py-7 flex items-center justify-between text-ink-muted text-xs">
          <span>Blind Spot</span>
          <span>Data from TMDB · Nothing leaves your browser</span>
        </footer>
      </div>
    </div>
  );
}
