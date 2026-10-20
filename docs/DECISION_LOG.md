# Decision log

The decisions worth defending, with the alternative that was rejected and the
signal that would make me revisit. (A product is its decisions, not its features.)

---

### D1 · Upload the Netflix export, don't "connect" an account
- **Options:** OAuth "connect" (no public Netflix API exists) · scrape with the
  user's login · user-provided CSV export.
- **Chose:** CSV export, parsed client-side.
- **Why:** Netflix has no public API; the only "connect" paths are
  credential-harvesting or brittle scrapers — terms violations and fatal for a
  trust product. The export is legitimate, private, and nothing leaves the browser.
- **Revisit if:** Netflix ships a real data API, or a sanctioned integration appears.

### D2 · CSV import is the primary input; search is the fallback
- **Options:** search-first (type titles) · import-first.
- **Chose:** import-first, search demoted below an "or add by hand" divider.
- **Why:** typing titles one-by-one is the biggest funnel drop-off; the one-file
  import is the largest conversion lever.
- **Cost:** a parser that must collapse episodic rows without mangling colon-titles.

### D3 · Collapse episodes by prefix frequency, not a naive split
- **Options:** always take text before the first colon · only strip known markers ·
  frequency heuristic.
- **Chose:** 3+ colon segments → show; 2 segments → strip only if it's a
  season/episode marker **or** the prefix recurs across the file.
- **Why:** protects `Mission: Impossible` / `The Lost World: Jurassic Park` (movies)
  while collapsing `Chumbak: Episode 16` and named-episode shows like
  `Musafir Cafe: Arrival`. Verified on a real 100-row export (71 raw → 39 titles).
- **Limitation:** a show whose *name* contains a colon gets shortened. Accepted.

### D4 · One Bubble Score (0–100), transparent weights
- **Options:** charts only · a single score.
- **Chose:** a single score = 0.35·genre-concentration + 0.20·genre-breadth +
  0.25·language + 0.20·decade, with a visible breakdown.
- **Why:** one number is graspable in two seconds and comparable/shareable — the
  growth loop. Explainability beats a black box for trust.
- **Limitation:** weights are chosen, not learned; documented as such.

### D5 · Own brand identity, not Netflix red
- **Options:** Netflix red/black (familiar) · a distinct palette.
- **Chose:** indigo/violet (your bubble) + ember accent (the way out).
- **Why:** the product is about *leaving* the Netflix bubble; wearing Netflix's
  colors reads as a clone and implies affiliation. The palette is semantic.

### D6 · Auth never gates the funnel
- **Options:** account up front (capture users) · no account · account after aha.
- **Chose:** deferred; offered only after the reveal, to persist a watchlist.
- **Why:** a login at the door is the most common top-of-funnel killer; the core
  value must be reachable with zero friction.

### D7 · Keys server-side via serverless proxies
- **Options:** call TMDB/Anthropic from the client · proxy through functions.
- **Chose:** `/api/tmdb`, `/api/bridge`, `/api/summary` hold the keys; a path
  whitelist stops the TMDB proxy being an open relay.
- **Why:** a `VITE_`-prefixed key ships in the browser bundle — the original TMDB
  key was exposed this way and had to be rotated. (PostHog's project key is public
  by design and is the deliberate exception.)

### D8 · Measure the bridge feature; fix what the eval finds
- **Options:** trust the anti-hallucination prompt · build an eval.
- **Chose:** a golden-set + LLM-as-judge harness run before shipping prompt changes.
- **Why:** it caught a real refusal-parsing bug and a miscalibrated metric (see the
  [eval README](../evals/README.md)). Shipping an LLM feature without an eval is the
  exact gap this product is meant to prove I don't have.
