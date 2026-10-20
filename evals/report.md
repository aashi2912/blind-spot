# Bridge-reasoning eval — results

_Run 2026-10-20. Golden set: 21 cases. Gen model: claude-haiku-4-5-20251001._

| Metric | v1 (naive) | v2 (production) |
|---|---|---|
| groundedness | 4.67 | 4.88 |
| relevance | 4.43 | 4.94 |
| specificity | 4.05 | 4.44 |
| hallucination_rate_pct | 5 | 0 |
| refuse_accuracy_pct | 0 | 100 |
| over_bridged_pct | 0 | 0 |

Metrics: groundedness/relevance/specificity are 1–5 (higher better). hallucination_rate = share of non-refusal outputs the judge flagged as inventing facts. refuse_accuracy = share of 'no genuine link' cases correctly answered NO_BRIDGE. over_bridged = share of real-link cases wrongly refused.

## Per-case (v2)

| id | expect | refused | ground | relev | spec | hallucinated |
|---|---|---|---|---|---|---|
| b01 | bridge | no | 4 | 5 | 4 | — |
| b02 | bridge | no | 5 | 5 | 5 | — |
| b03 | bridge | no | 5 | 5 | 5 | — |
| b04 | bridge | no | 5 | 5 | 4 | — |
| b05 | bridge | no | 5 | 5 | 4 | — |
| b06 | bridge | no | 5 | 5 | 5 | — |
| b07 | bridge | no | 5 | 5 | 5 | — |
| b08 | bridge | no | 5 | 5 | 4 | — |
| b09 | bridge | no | 5 | 5 | 5 | — |
| b10 | bridge | no | 5 | 5 | 4 | — |
| b11 | bridge | no | 5 | 5 | 5 | — |
| b12 | bridge | no | 5 | 5 | 5 | — |
| s01 | stretch | no | 4 | 4 | 4 | — |
| s02 | stretch | no | 5 | 5 | 4 | — |
| s03 | stretch | no | 5 | 5 | 4 | — |
| s04 | stretch | no | 5 | 5 | 4 | — |
| r01 | refuse | yes | — | — | — | — |
| r02 | refuse | yes | — | — | — | — |
| r03 | refuse | yes | — | — | — | — |
| r04 | refuse | yes | — | — | — | — |
| r05 | refuse | yes | — | — | — | — |