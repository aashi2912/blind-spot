# Blind Spot — PRD

**Status:** shipped (v2) · **Surface:** responsive web · **Owner:** Aashi Thakkar

## Problem

Streaming recommenders optimize for engagement, narrowing taste into an invisible
filter bubble. Users have no way to see the shape of their own taste, know what
they're systematically missing, or get a trustworthy nudge out of it.

## Goals

- Let a user understand their taste and its narrowness in under 30 seconds.
- Surface the genres they avoid, ranked by what's actually worth trying.
- Give one reasoned, trustworthy recommendation out of the bubble.
- Make the result shareable (growth) and the product measurable (learning).

## Non-goals

- A better in-genre recommender (the market is saturated; this is the inverse).
- Multi-service aggregation, social features, or a full accounts system (v2).
- Replacing Netflix's UI or acting as a catalog browser.

## Users

- **Primary:** streaming users who feel stuck in a rut and are curious about their
  own habits.
- **Secondary (portfolio):** reviewers evaluating AI product judgment.

## Success metrics

- **Activation:** % of visitors who reach their Bubble Score (imported or sampled).
- **Aha→explore:** % who open at least one blind spot.
- **Share rate:** % who share a result.
- **Retention:** day-3 return.
- **AI quality:** bridge groundedness & refuse-accuracy on the eval set (gating).

## Scope — the core loop

1. **Import** — Netflix CSV (client-side parse) or manual search; a one-click
   **sample** for zero-effort trial.
2. **Reveal** — Bubble Score (0–100) + genre/decade/language/theme breakdown + an
   LLM taste summary.
3. **Confront** — blind-spot genres ranked by opportunity.
4. **Bridge** — LLM-reasoned picks from a blind-spot genre, with save / not-for-me.
5. **Act** — watchlist + shareable result card.

## Key requirements

- Core value reachable with no account and no upload of personal data.
- API keys never exposed client-side.
- The bridge LLM feature must pass the eval bar (grounded, refuses honestly)
  before prompt changes ship.
- Responsive; first-run onboarding tour; consistent stage navigation.

## Risks & mitigations

- **Reads as an unofficial Netflix tool** → own palette, clear "data from TMDB /
  nothing uploaded" framing.
- **LLM hallucination / over-bridging** → grounding prompt + refusal path, verified
  by evals.
- **Thin personalization on bridges** → acknowledged; candidate-selection tuning is
  the next iteration, measured against the eval.

## Open questions / next

- Weight bridge candidates harder on the user's theme vector; measure the lift.
- Optional accounts (Supabase) for cross-device watchlist.
- Eval in CI; larger golden set.
