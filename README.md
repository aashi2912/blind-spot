# Blind Spot

**See your Netflix filter bubble. Find what you're missing. Bridge the gap with AI.**

An AI-powered tool that analyzes your viewing patterns, visualizes your content bubble, identifies unexplored genres, and uses LLM reasoning to build bridges from what you love to what you've never considered.

**[Try it live →](https://my-blind-spot.vercel.app/)**

---

## Why This Exists

Netflix's recommendation algorithm drives 80% of what users watch. It optimizes for engagement — showing you more of what you already like. The result is a filter bubble you can't see.

A researcher created fake Netflix personas and found that by Day 3, each persona's homepage became a closed loop — they barely needed to scroll past the second row. The algorithm didn't just change what titles appeared — it changed the poster artwork to reinforce the bubble.

> Pajkovic, N. (2022). "Algorithms and taste-making: Exposing the Netflix Recommender System's operational logics." SAGE Journals.

Everyone builds better recommendation engines (Taste.io, Criticker, Letterboxd). Nobody has built the inverse: a tool that shows you YOUR bubble, quantifies your blind spots, and uses AI to bridge the gap.

---

## How It Works

```
Add watched titles (TMDB search)
  ↓
Fetch keywords per title (async)
  ↓
Build taste profile vectors (client-side):
  • Genre vector: 19-dim, normalized
  • Keyword vector: TF-weighted, top 50
  • Decade distribution: 6 buckets
  • Language concentration: Herfindahl index
  ↓
Render Bubble Visualization — instant
  ↓
Detect Blind Spots + score by opportunity
  ↓
User selects a blind spot to explore
  ↓
Find bridge candidates (cosine similarity)
  ↓
LLM generates bridge reasoning
  ↓
Display Bridge Recommendations
```

---

## The 5 Screens

### 1. Input — Add Your Watch History
Search TMDB for movies and TV shows. Add titles to build your taste profile. Live genre preview updates after every addition. Incremental feedback shows progress toward meaningful analysis. Trending Netflix titles available for quick-add.

### 2. Your Bubble — Taste Profile Visualization
Genre radar chart (19 axes), decade timeline, language concentration (Herfindahl index), and recurring theme clusters. The headline stat: "12 titles. 78% crime dramas. Your taste occupies 3 of 19 genres."

### 3. Your Blind Spots — Gap Analysis
Genres with zero representation, ranked by opportunity score = (Netflix title count) × (avg rating). "Documentary: 133 titles on Netflix, avg 8/10, opportunity score 213." Language and decade blind spots also surfaced.

### 4. Bridge Recommendations — AI Reasoning
Cosine similarity scores candidates against your keyword vector. LLM explains WHY each recommendation connects to your taste: "You loved Breaking Bad for moral ambiguity. This documentary dissects the criminal justice system with the same slow-build tension — but the stakes are real."

### 5. Detail View
Full movie info: poster, synopsis, cast, rating, keywords, Netflix availability. "Mark as Watched" updates your profile and recalculates blind spots.

---

## AI Components

### AI #1: Taste Profile Analyzer — *Content-Based Filtering*
Builds multi-dimensional feature vectors from watch history. Genre distribution (19-dim normalized), keyword themes (TF-weighted), decade skew, and language concentration measured by Herfindahl index (borrowed from economics — 1.0 = all one language, approaching 0 = diverse). All computed client-side.

### AI #2: Blind Spot Detector — *Gap Analysis*
Compares user's taste profile against the full TMDB content space. Identifies genres below 0.05 weight threshold. Scores each blind spot by opportunity: how much highly-rated Netflix content exists that the user has never been exposed to. Uses TMDB Discover endpoint filtered by Netflix provider (ID 8).

### AI #3: Bridge Recommender — *LLM Reasoning + Cosine Similarity*
Two-step pipeline: (1) TMDB Discover finds top-rated titles in blind spot genres on Netflix. Keywords are fetched for each candidate. Cosine similarity between candidate's keyword vector and user's keyword vector identifies thematic overlap despite genre difference. (2) Top candidates go to Claude for bridge reasoning — the LLM explains thematic connections between user's favorites and the candidate. Anti-hallucination: LLM receives only verified TMDB metadata. `NO_BRIDGE` response skips candidates without genuine connections. Fallback reasoning if LLM is unavailable.

### What I Rejected
- **Collaborative filtering** — no user base for meaningful taste neighbors
- **AI mood detection** — privacy nightmare, technically unreliable
- **Auto Netflix import** — Netflix shut down their public API in 2014
- **Neural embeddings** — needs pre-trained models or large datasets; explicit feature vectors work for MVP

---

## Research Foundation

| Source | Key Finding | Impact |
|---|---|---|
| Pajkovic (2022), SAGE Journals | Netflix personas locked into content loops by Day 3 | Validated the core problem this product solves |
| NYU Pyrorank (2023) | Diversity can be added to recommendations with minimal accuracy loss | Proved the concept is technically feasible |
| SERAL, ACM SIGKDD 2025 | LLMs can identify serendipitous recommendations via world knowledge | Validated our bridge reasoning approach |
| Netflix Engineering (2015) | Netflix uses exploration mechanisms internally but they're opaque to users | Confirmed the gap: users can't see or control their bubble |
| Pariser (2011), "The Filter Bubble" | Personalization isolates users from diverse perspectives | Foundational text for the entire product category |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Data | TMDB API (search, discover, keywords, credits, trending) |
| AI Reasoning | Anthropic Claude Haiku (via server-side proxy) |
| Hosting | Vercel (static + serverless functions) |
| Persistence | localStorage (no backend, no account needed) |
| Visualization | Recharts (radar chart, bar charts) |
| Cost | $3-20 total (TMDB is free, LLM ~$0.01 per bridge set) |

---

## Project Structure

```
blind-spot/
├── src/
│   ├── App.jsx                      # Screen routing + state management
│   ├── screens/
│   │   ├── InputScreen.jsx          # Watch history search + add
│   │   ├── BubbleScreen.jsx         # Taste profile visualization
│   │   ├── BlindSpotsScreen.jsx     # Gap analysis + opportunity scoring
│   │   ├── BridgeScreen.jsx         # AI bridge recommendations
│   │   └── DetailScreen.jsx         # Full movie detail view
│   ├── services/
│   │   ├── tmdbApi.js               # TMDB API wrapper with caching
│   │   ├── tasteProfiler.js         # AI #1: taste profile vectors
│   │   ├── blindSpotDetector.js     # AI #2: gap analysis + opportunity
│   │   └── bridgeEngine.js          # AI #3: cosine similarity + LLM
│   └── utils/
│       ├── vectors.js               # Cosine similarity implementation
│       ├── constants.js             # Genre IDs, TMDB config, thresholds
│       └── storage.js               # localStorage wrapper
├── api/
│   └── bridge.js                    # Vercel serverless: LLM proxy
├── index.html
├── vite.config.js                   # Dev proxy for /api/bridge
├── tailwind.config.js
└── package.json
```

---

## Setup

### Prerequisites
- Node.js 18+
- TMDB API key (free — [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))
- (Optional) Anthropic API key for AI bridge reasoning

### Install

```bash
git clone https://github.com/YOUR_USERNAME/blind-spot.git
cd blind-spot
npm install
```

### Configure

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_TMDB_KEY=your_tmdb_api_key
LLM_API_KEY=your_anthropic_api_key  # optional — app works without it
```

### Run

```bash
npm run dev
```

Open `http://localhost:5173`

### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set environment variables in Vercel dashboard: `VITE_TMDB_KEY` and `LLM_API_KEY`.

---

## Known Limitations

- **Manual input friction** — Netflix has no public API. Users add titles via search. Mitigated by fast search-and-click UX and incremental feedback.
- **TMDB keyword coverage varies** — some titles have 20+ keywords, others have 2. Thematic analysis quality depends on keyword richness.
- **19 genres are coarse** — "Drama" spans Schindler's List to Grey's Anatomy. Keywords add granularity but the radar chart may oversimplify.
- **Regional Netflix libraries differ** — TMDB Discover returns different titles for different countries. Some genres show 0 Netflix titles in certain regions (TMDB data gap).
- **No collaborative filtering** — would be the most powerful addition but needs thousands of users. Documented as v2 upgrade path.

---

