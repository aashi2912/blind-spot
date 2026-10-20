# Bridge-reasoning evals

Blind Spot's core AI feature is the **bridge**: a 2–3 sentence explanation of why
someone with a given taste would enjoy a film from a genre they avoid. It's the
one place the product makes an open-ended generative claim to the user — so it's
the one place that needs to be measured rather than trusted.

This harness answers three questions a reviewer (or I) should be able to ask of
any shipped LLM feature:

1. **Does it hallucinate?** Does the reasoning invent plot points, actors, or
   facts that weren't in the data the model was given?
2. **Is it actually personalised?** Does it connect to the user's real taste, or
   just describe the candidate film generically?
3. **Does it know when to say no?** When there's no honest connection, does it
   refuse instead of manufacturing one?

## How it works

```
golden-set.json  ──►  generate (prompt variant)  ──►  LLM-as-judge  ──►  aggregate ──► report.md
   21 cases            claude-haiku                  scores 1–5,          per-variant
   (fixed inputs)                                    flags hallucinations  metrics
```

- **Golden set** — 21 hand-authored `(user taste → candidate film)` pairs. The
  candidate object is treated as the *only* ground truth, so "groundedness" is a
  closed check: did the reasoning stay inside these fields? Fixtures therefore
  don't need to be factually real — they define truth for the case. Cases are
  labelled by intended behaviour:
  - `bridge` (12) — a clear thematic link should be found.
  - `stretch` (4) — a weak but honest link; should stay grounded, lower relevance.
  - `refuse` (5) — no genuine link (rom-com fan → body horror); the model should
    output `NO_BRIDGE`. These are the adversarial cases that catch a model
    inventing a connection to be "helpful".

- **Two prompt variants, to measure a change rather than assert one.**
  - `v1` (naive) — "convince them to watch it," no grounding rule, no refusal path.
  - `v2` (production) — mirrors `api/bridge.js`: thematic connections only, "do
    not invent facts," and an explicit `NO_BRIDGE` escape hatch.

- **LLM-as-judge** — a separate model call scores each output on groundedness,
  relevance, and specificity (1–5) against the candidate facts, and lists any
  claim it couldn't support. Judge temperature is 0 and it's given the same
  ground truth the writer had, so it's checking consistency, not taste.

## Metrics

| Metric | What it catches |
|---|---|
| groundedness (1–5) | hallucination — claims outside the candidate data |
| relevance (1–5) | generic output that ignores the user's taste |
| specificity (1–5) | filler ("a must-watch") vs concrete reasons |
| hallucination_rate | % of non-refusal outputs the judge flagged |
| refuse_accuracy | % of no-link cases correctly answered NO_BRIDGE |
| over_bridged | % of real-link cases *wrongly* refused (the cost of the guard) |

`over_bridged` is deliberately tracked because the refusal guard isn't free — a
model that refuses everything scores perfectly on hallucination and uselessly on
coverage. The pair has to be read together.

## Run it

```bash
# from the project root — loads LLM_API_KEY from .env
node --env-file=.env evals/run.mjs

# quick slice while iterating
node --env-file=.env evals/run.mjs --limit 4

# verify the harness with no API calls / no key
node evals/run.mjs --mock
```

Optional env: `GEN_MODEL`, `JUDGE_MODEL` (default to the production
`claude-haiku-4-5`; point `JUDGE_MODEL` at a stronger model for a tougher judge).

Results are written to **`report.md`** (human-readable table + per-case rows) and
`report.json`.

## Reading the result

The story to look for is v1 → v2: the grounding guard should **cut the
hallucination rate** and **lift refuse-accuracy from ~0 to high**, at a small,
visible `over_bridged` cost. That trade — accepting a few missed bridges to stop
the model inventing connections — is the actual product decision this feature
encodes, and the eval is what makes it a decision instead of a guess.

## Honest limitations

- LLM-as-judge is itself a model; a human spot-check of the per-case table keeps
  it honest. The judge and generator share a family, which can inflate agreement.
- 21 cases is enough to catch direction, not to make fine claims — a real
  regression suite would be larger and version-controlled against prompt changes.
- `v2` is duplicated from `api/bridge.js` so the eval runs in isolation; a
  production setup would share one prompt module and run this in CI on every
  change.

## What the first runs found (the point of doing this)

Running the harness surfaced two things a "ship it and trust the prompt" approach
would have missed:

1. **A real product bug — fragile refusal parsing.** On "no genuine link" cases
   the model refuses correctly, but emits `NO_BRIDGE` *followed by* a
   rationalization (`"NO_BRIDGE\n\nWhile both Sicario and Se7en explore moral
   ambiguity..."`). Production used an exact-match check (`reasoning ===
   "NO_BRIDGE"`), so those refusals leaked to users as half-hearted bridges —
   real refuse-accuracy was ~40%, not the ~100% the model was actually capable
   of. Fixed in `src/services/bridgeEngine.js` by matching `startsWith`.

2. **A miscalibrated metric — my own eval was wrong first.** The initial judge
   flagged legitimate thematic interpretation (the feature's whole job) as
   "hallucination," and the metric counted any flagged phrase as a failure,
   reporting a false 88% hallucination rate. Corrected by instructing the judge
   that interpreting provided themes is expected, and by defining hallucination
   as a groundedness failure (score ≤ 2). The honest rate is 0% on v2.

The lesson worth keeping: an eval is only as trustworthy as its judge, and the
first number it gives you is a hypothesis, not a result. Both the product fix and
the metric fix came from reading the per-case table, not the summary.

### Headline result (v1 naive → v2 production)

| | v1 | v2 |
|---|---|---|
| groundedness (1–5) | 4.67 | 4.88 |
| relevance (1–5) | 4.43 | 4.94 |
| specificity (1–5) | 4.05 | 4.44 |
| hallucination rate | 5% | 0% |
| refuse accuracy | 0% | 100% |
| over-bridged | 0% | 0% |

The grounding-and-refusal design measurably beats the naive prompt on every axis,
and the refusal guard buys a 0→100% lift on adversarial cases at no coverage cost.
_(Your `report.md` holds the live, regenerated numbers.)_
