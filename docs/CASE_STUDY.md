# Blind Spot — case study

> A consumer AI product that inverts the recommender: instead of feeding you more
> of what you like, it shows you the bubble you're in and gives you one reasoned
> way out. Built end-to-end — product, design, engineering, and an eval harness
> for the core AI feature.

**Live:** https://my-blind-spot.vercel.app · **Code:** github.com/aashi2912/blind-spot

---

## 1. The problem and the bet

Every streaming recommender optimizes for engagement, which means optimizing for
*familiarity*. The second-order effect is a filter bubble the user can't see:
research on Netflix's recommender found personas' homepages collapsing into a
closed loop within days (Pajkovic, 2022).

The market is saturated with tools that build *better* recommenders. The
non-obvious bet behind Blind Spot: the valuable unbuilt product is the **inverse** —
not "here's more of what you like," but "here's the shape of your taste, here's
what you've walled off, and here's a reasoned path out." Same data, opposite
objective function.

**Who it's for:** anyone who feels stuck in a streaming rut — and, as a portfolio
piece, a demonstration of AI product judgment end to end.

## 2. Key product decisions (and the roads not taken)

**Upload, not "connect your Netflix."** Netflix killed its public API in 2014;
the only ways to "connect" are credential-harvesting or brittle scrapers — both
terms violations, both fatal for a trust product. Netflix does let users export
their own history. So the feature is a one-file **upload, parsed client-side**, not
an OAuth "connect." This trades a flashier integration for a defensible, private
one — the right call for a product whose pitch is "nothing leaves your browser."

**CSV import as the primary input.** Typing titles one-by-one is the biggest
drop-off in the funnel. Making the Netflix export the hero action (search demoted
to a fallback) is the single largest conversion lever. The parser had to solve two
non-obvious problems: episodic rows (`Show: Season 1: Episode`) collapsing to one
title, without mangling real titles that contain colons (`Mission: Impossible`).

**One number: the Bubble Score (0–100).** The original reveal was a wall of charts —
accurate but not graspable in two seconds and not *comparable*. A single score
makes the insight legible and shareable ("I scored 73, what's yours"), which is
the growth loop. It's a transparent weighted blend with a visible "how is this
scored" breakdown — explainable, not a black box.

**Own identity, not Netflix's palette.** The product is about *escaping* the
Netflix bubble, so dressing it in Netflix red reads as a clone and flirts with
implying affiliation. The chosen indigo/violet system is semantic: cool violet =
your bubble, warm ember = the way out. Warmth literally means "outside your
comfort zone."

**Funnel integrity over data capture.** Sign-in is deferred and will never gate
the core value — you see your bubble with zero friction; an account is offered only
after the aha moment, to persist a watchlist. A login placed at the door is the
most common top-of-funnel killer; it was explicitly kept out.

## 3. The AI — and how I measured it

The core AI surface is the **bridge**: a 2–3 sentence, LLM-written explanation of
why a specific person would enjoy a film from a genre they avoid. It's the one
place the product makes an open-ended generative claim — so it's the one place
that needed measurement rather than trust.

I built an [eval harness](../evals/README.md): a 21-case golden set (clear bridges,
honest stretches, and adversarial "no genuine link" cases), two prompt variants to
measure a change rather than assert one, and an LLM-as-judge scoring groundedness,
relevance, and specificity.

**It did its job — it caught two things a "ship it and trust the prompt" approach
misses:**

1. **A real production bug.** On no-fit cases the model refuses correctly but emits
   `NO_BRIDGE` *followed by* a rationalization. Production used an exact-match
   check, so those refusals leaked to users as half-hearted bridges — real
   refuse-accuracy was ~40%, not the ~100% the model was capable of. Fixed by
   matching on `startsWith`.

2. **A miscalibrated metric — my own eval was wrong first.** The initial judge
   flagged legitimate thematic interpretation (the feature's entire job) as
   "hallucination," reporting a false 88% rate. Corrected the judge and redefined
   the metric around groundedness. The honest rate is 0%.

**Result (naive v1 → production v2):** groundedness 4.67→4.88, relevance
4.43→4.94, specificity 4.05→4.44, hallucination 5%→0%, refuse-accuracy 0%→100%,
with zero coverage cost (it never wrongly refuses a real bridge). The
grounding-and-refusal design measurably earns its place.

The lesson I'd put on a slide: *an eval is only as trustworthy as its judge, and
the first number it gives you is a hypothesis, not a result.* Both fixes came from
reading the per-case table, not the summary.

## 4. Instrumentation

The product is wired to PostHog with an explicit funnel — screen views, CSV import,
sample run, share, and watchlist save/dismiss — so activation, share rate, and
retention are measurable rather than guessed. (Live numbers populate post-launch.)

## 5. What I deliberately left out

No multi-service support (Spotify/Prime), no social graph, no gamified streaks, no
accounts-for-sync yet. Each would dilute a single sharp idea; for a product whose
value is one clear insight, resisting the feature pile *is* the product decision.

## 6. What I'd do next

- **Candidate selection is the real quality frontier.** Bridges currently lean
  "popular-and-highly-rated in the target genre" more than deeply personalized;
  the next iteration weights candidates harder on the user's own theme vector —
  and the eval above is how I'd measure whether it actually improves.
- Grow the golden set and run the eval in CI on every prompt change.
- Optional Supabase accounts to make the watchlist cross-device.

## 7. Honest limitations

The LLM-as-judge shares a model family with the generator, which can inflate
agreement (mitigated by a human spot-check of the per-case table). The Bubble Score
weights are chosen, not learned. The golden set (21 cases) is sized to catch
direction, not fine differences.
