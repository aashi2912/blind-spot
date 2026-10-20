/**
 * Bridge-reasoning eval runner.
 *
 *   node evals/run.mjs            # full run, both variants
 *   node evals/run.mjs --limit 4  # quick slice
 *   node evals/run.mjs --mock                        # no API calls; verifies harness wiring
 *
 * Env: LLM_API_KEY (or ANTHROPIC_API_KEY). GEN_MODEL / JUDGE_MODEL optional.
 * Writes evals/report.md and evals/report.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { VARIANTS } from "./lib/bridgePrompt.mjs";
import { callAnthropic } from "./lib/anthropic.mjs";
import { judge } from "./lib/judge.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// Load ../.env if present (no --env-file flag needed; works on older Node).
try {
  const envPath = join(HERE, "..", ".env");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch { /* no .env — rely on real env or --mock */ }
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };

const MOCK = has("--mock");
const LIMIT = parseInt(val("--limit", "0"), 10);
const ONLY = val("--variant", "all");
const GEN_MODEL = process.env.GEN_MODEL || "claude-haiku-4-5-20251001";
const JUDGE_MODEL = process.env.JUDGE_MODEL || "claude-haiku-4-5-20251001";
const API_KEY = process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY;

if (!MOCK && !API_KEY) {
  console.error("Missing LLM_API_KEY. Add LLM_API_KEY to .env (or export it), or use --mock to verify wiring.");
  process.exit(1);
}

const golden = JSON.parse(readFileSync(join(HERE, "golden-set.json"), "utf8"));
let cases = golden.cases;
if (LIMIT > 0) cases = cases.slice(0, LIMIT);
const variantKeys = ONLY === "all" ? ["v1", "v2"] : [ONLY];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isRefusal = (t) => t.trim().toUpperCase().startsWith("NO_BRIDGE");

// Deterministic mock so harness logic is testable offline. v2 behaves better.
function mockGenerate(variant, c) {
  if (c.expectation === "refuse") return variant === "v2" ? "NO_BRIDGE" : "You'll absolutely love this instant classic, a thrilling ride from start to finish!";
  if (variant === "v1") return `This ${c.candidate.genres.split(",")[0]} is a must-watch — critics call it the best of the decade and you won't look away.`;
  return `Like your taste for ${c.userFavorites[0].split("(")[0].trim()}, this leans on ${c.candidate.keywords.split(",")[0].trim()} and ${c.candidate.keywords.split(",")[1]?.trim() || "tension"} — a grounded way into ${c.blindSpotGenre}.`;
}
function mockJudge(variant, c, output) {
  if (isRefusal(output)) return { groundedness: null, relevance: null, specificity: null, hallucinated_claims: [], is_refusal: true };
  if (variant === "v1") return { groundedness: 2, relevance: 2, specificity: 2, hallucinated_claims: ["best of the decade"], is_refusal: false };
  return { groundedness: 5, relevance: 4, specificity: 4, hallucinated_claims: [], is_refusal: false };
}

async function run() {
  const rows = [];
  for (const variant of variantKeys) {
    const build = VARIANTS[variant];
    for (const c of cases) {
      let output, scores;
      try {
        output = MOCK ? mockGenerate(variant, c) : await callAnthropic({ apiKey: API_KEY, model: GEN_MODEL, prompt: build(c), maxTokens: 220 });
        if (!MOCK) await sleep(400);
        scores = isRefusal(output)
          ? { groundedness: null, relevance: null, specificity: null, hallucinated_claims: [], is_refusal: true }
          : MOCK ? mockJudge(variant, c, output)
                 : await judge({ apiKey: API_KEY, model: JUDGE_MODEL, userFavorites: c.userFavorites, candidate: c.candidate, output });
        if (!MOCK) await sleep(400);
      } catch (e) {
        console.error(`! ${variant}/${c.id}: ${e.message}`);
        scores = { error: e.message };
        output = output || "(error)";
      }
      rows.push({ variant, id: c.id, expectation: c.expectation, refusal: isRefusal(output || ""), output, ...scores });
      process.stdout.write(".");
    }
  }
  process.stdout.write("\n");
  return rows;
}

function mean(nums) { const v = nums.filter((n) => typeof n === "number"); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

function aggregate(rows) {
  const out = {};
  for (const variant of variantKeys) {
    const r = rows.filter((x) => x.variant === variant);
    const scored = r.filter((x) => !x.is_refusal && typeof x.groundedness === "number");
    const nonRefuseCases = r.filter((x) => x.expectation !== "refuse");
    const refuseCases = r.filter((x) => x.expectation === "refuse");
    const hallucinated = scored.filter((x) => x.groundedness <= 2);
    out[variant] = {
      n: r.length,
      groundedness: +mean(r.map((x) => x.groundedness)).toFixed(2),
      relevance: +mean(r.map((x) => x.relevance)).toFixed(2),
      specificity: +mean(r.map((x) => x.specificity)).toFixed(2),
      hallucination_rate_pct: pct(hallucinated.length, scored.length),
      refuse_accuracy_pct: pct(refuseCases.filter((x) => x.refusal).length, refuseCases.length),
      over_bridged_pct: pct(nonRefuseCases.filter((x) => x.refusal).length, nonRefuseCases.length),
    };
  }
  return out;
}

function toReport(agg, rows) {
  const date = new Date().toISOString().slice(0, 10);
  const L = [];
  L.push("# Bridge-reasoning eval — results", "");
  L.push(`_Run ${date}${MOCK ? " (MOCK — illustrative wiring only, not real model output)" : ""}. Golden set: ${cases.length} cases. Gen model: ${MOCK ? "mock" : GEN_MODEL}._`, "");
  L.push("| Metric | v1 (naive) | v2 (production) |");
  L.push("|---|---|---|");
  const m = (k) => `| ${k} | ${agg.v1?.[k] ?? "—"} | ${agg.v2?.[k] ?? "—"} |`;
  L.push(m("groundedness"));
  L.push(m("relevance"));
  L.push(m("specificity"));
  L.push(m("hallucination_rate_pct"));
  L.push(m("refuse_accuracy_pct"));
  L.push(m("over_bridged_pct"));
  L.push("", "Metrics: groundedness/relevance/specificity are 1–5 (higher better). hallucination_rate = share of non-refusal outputs the judge flagged as inventing facts. refuse_accuracy = share of 'no genuine link' cases correctly answered NO_BRIDGE. over_bridged = share of real-link cases wrongly refused.", "");
  L.push("## Per-case (v2)", "");
  L.push("| id | expect | refused | ground | relev | spec | hallucinated |");
  L.push("|---|---|---|---|---|---|---|");
  for (const x of rows.filter((r) => r.variant === "v2")) {
    L.push(`| ${x.id} | ${x.expectation} | ${x.refusal ? "yes" : "no"} | ${x.groundedness ?? "—"} | ${x.relevance ?? "—"} | ${x.specificity ?? "—"} | ${(x.hallucinated_claims || []).join("; ") || "—"} |`);
  }
  return L.join("\n");
}

const rows = await run();
const agg = aggregate(rows);
console.table(agg);
writeFileSync(join(HERE, "report.json"), JSON.stringify({ agg, rows }, null, 2));
writeFileSync(join(HERE, "report.md"), toReport(agg, rows));
console.log("\nWrote evals/report.md and evals/report.json");
