import { useState } from "react";
import Button from "./ui/Button";

const STEPS = [
  {
    title: "Welcome to Blind Spot",
    body: "Netflix mostly shows you more of what you already watch. This tool shows you what that does to your taste — and how to break out of it.",
  },
  {
    title: "Add your Netflix history",
    body: "Upload your history file, or just try a sample. It's read right here in your browser and never uploaded anywhere.",
  },
  {
    title: "See your taste, clearly",
    body: "You get a simple picture of what you watch, plus a score for how much you stick to the same kinds of shows.",
  },
  {
    title: "Find something new",
    body: "We suggest one great show from a genre you usually skip — and explain why you'll probably like it.",
  },
];

export default function OnboardingTour({ onClose }) {
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  const step = STEPS[i];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center px-6" role="dialog" aria-modal="true">
      <div className="bg-surface border border-line rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex gap-1.5 mb-5">
          {STEPS.map((_, idx) => (
            <span key={idx} className={`h-1 flex-1 rounded-full ${idx <= i ? "bg-primary" : "bg-line"}`} />
          ))}
        </div>
        <h2 className="font-brand text-xl font-bold mb-2 text-ink">{step.title}</h2>
        <p className="text-ink-muted font-body text-sm leading-relaxed mb-6">{step.body}</p>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-ink-muted hover:text-ink font-body">Skip</button>
          <div className="flex gap-2">
            {i > 0 && <Button variant="ghost" size="sm" onClick={() => setI(i - 1)}>Back</Button>}
            <Button size="sm" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? "Get started" : "Next"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
