/**
 * LLM-as-judge. Given the ground-truth candidate data, the user's favourites,
 * and the generated bridge text, scores three metrics 1-5 and flags any claim
 * not supported by the provided candidate data (hallucination).
 */
import { callAnthropic } from "./anthropic.mjs";

function judgePrompt({ userFavorites, candidate, output }) {
  return [
    "You are a strict evaluator of a movie-recommendation 'bridge' explanation.",
    "You are given the ONLY facts that were available to the writer, and their output.",
    "",
    "USER FAVOURITES:",
    userFavorites.map((f) => "- " + f).join("\n"),
    "",
    "CANDIDATE FACTS (the only allowed source of truth):",
    "- Title: " + candidate.title + " (" + candidate.year + ")",
    "- Genres: " + candidate.genres,
    "- Keywords: " + candidate.keywords,
    "- Synopsis: " + candidate.overview,
    "- Rating: " + candidate.rating + "/10",
    "",
    "WRITER'S OUTPUT:",
    output,
    "",
    "The writer's JOB is to draw thematic connections between the user's taste and the candidate's",
    "genres/keywords/synopsis. Interpreting or paraphrasing those provided themes is EXPECTED and is NOT a",
    "hallucination. Only treat something as unsupported if it asserts a CONCRETE FACT not in the candidate data:",
    "a named actor/director, a specific plot event not in the synopsis, an award, a date, box-office, etc.",
    "",
    "Score each 1-5 (5 best):",
    "- groundedness: 5 = stays within the candidate facts and fair readings of them; 1 = invents concrete facts.",
    "- relevance: it draws a specific connection to the USER FAVOURITES' themes, not just describing the candidate.",
    "- specificity: concrete and specific, not generic marketing filler.",
    "Also list hallucinated_claims: ONLY concrete fabricated facts per the rule above (empty if none; do not list thematic interpretations).",
    "If the output is exactly 'NO_BRIDGE', set is_refusal true and score all three as null.",
    "",
    "Respond with ONLY this JSON, nothing else:",
    '{"groundedness": <1-5|null>, "relevance": <1-5|null>, "specificity": <1-5|null>, "hallucinated_claims": [<string>], "is_refusal": <true|false>}',
  ].join("\n");
}

function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in judge output: " + text.slice(0, 120));
  return JSON.parse(match[0]);
}

export async function judge({ apiKey, model, userFavorites, candidate, output }) {
  const text = await callAnthropic({
    apiKey,
    model,
    prompt: judgePrompt({ userFavorites, candidate, output }),
    maxTokens: 400,
    temperature: 0,
  });
  return parseJson(text);
}
