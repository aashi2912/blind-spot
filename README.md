# Blind Spot

**See your Netflix bubble. Find what you're missing. Get one reasoned way out.**

Every recommender optimizes for engagement — it shows you more of what you already
watch, so your taste narrows into a bubble you can't see. Blind Spot is the
inverse: it reads your Netflix history, shows you the shape of your taste with a
0–100 **Bubble Score**, finds the genres you've walled off, and uses an LLM to
bridge from something you love to something you'd never pick.

**[Try it live →](https://my-blind-spot.vercel.app/)**  ·  [Case study](docs/CASE_STUDY.md)  ·  [Decision log](docs/DECISION_LOG.md)  ·  [Evals](evals/README.md)

---

## Why it exists

Netflix's recommender drives ~80% of what people watch, optimizing for engagement.
Research on its operational logic found personas' homepages collapsing into a
closed loop within days — the system even swaps poster art to reinforce the bubble
(Pajkovic, 2022, *SAGE*). Everyone builds *better* recommenders (Taste.io,
Letterboxd, Criticker). Nobody builds the inverse — a tool that shows you your
bubble, quantifies the blind spots, and gives you a reasoned way out. That's the
gap Blind Spot fills.

## The loop

```
Import your history ──► See your bubble ──► Confront blind spots ──► Bridge out ──► Act
 Netflix CSV / search     score + shape       genres you avoid        reasoned pick    save / share
```

## How it works

**Input.** Upload a Netflix viewing-activity CSV (parsed entirely client-side —
nothing is uploaded) or search titles by hand. The parser collapses the export's
`Show: Season 1: Episode` rows into real titles and handles the ambiguous cases
(`Mission: Impossible` stays a movie; `Chumbak: Episode 16` collapses to one show).

**Taste profiling (classical ML / stats, client-side).** Each title is matched to
TMDB for genres and keywords, then reduced to feature vectors: a normalized
19-dim genre vector, a TF-weighted keyword vector, a decade distribution, and a
language-concentration score (Herfindahl index).

**Bubble Score (0–100).** A transparent weighted blend of four concentration
signals (genre focus, genre breadth, language, era) — higher means a tighter
bubble. Shown with a plain-language "how is this scored" breakdown, not a black box.

**Blind spots.** Gap analysis over the genre vector, scored by opportunity
(available Netflix titles × average rating) via TMDB Discover.

**Bridges (LLM).** For a chosen blind spot, candidates are pulled from TMDB and
ranked by cosine similarity to the user's keyword vector; an LLM then writes a
grounded 2–3 sentence explanation of *why this specific person* would like it,
constrained to the provided facts with an explicit refusal path when no honest
connection exists.

## The AI, scoped honestly

- **LLM features:** the bridge reasoning (the core generative surface) and the
  one-line taste summary. Both run server-side (key never reaches the client) with
  deterministic fallbacks.
- **Classical ML / statistics:** content-based filtering (genre & keyword
  vectors), cosine-similarity candidate ranking, Herfindahl concentration, the
  Bubble Score.
- **Measured, not trusted:** the bridge feature has an [eval harness](evals/README.md)
  — a 21-case golden set and an LLM-as-judge scoring groundedness, relevance, and
  specificity. It caught a real production bug (fragile refusal parsing) and a
  miscalibrated metric. Headline: v2 (production prompt) hits 0% hallucination and
  100% refuse-accuracy vs the naive baseline.

## Privacy

Your Netflix history is read in the browser and never uploaded. API keys live only
in serverless functions — the TMDB and Anthropic keys are never shipped to the
client. Profiles and watchlists are stored in `localStorage`.

## Tech

React + Vite · Tailwind (custom design system) · Recharts · Vercel serverless
functions (TMDB proxy + two LLM endpoints) · Anthropic Claude (Haiku) · TMDB ·
PostHog (funnel analytics) · a dependency-free Node eval harness.

## Run locally

```bash
npm install
# .env:
#   TMDB_KEY=...            (v3 key, server-side via /api/tmdb)
#   LLM_API_KEY=...         (Anthropic, server-side)
#   VITE_POSTHOG_KEY=...    (optional — analytics no-ops without it)
#   VITE_POSTHOG_HOST=https://us.i.posthog.com
npm run dev

# run the bridge evals
node evals/run.mjs          # or: node evals/run.mjs --mock
```
