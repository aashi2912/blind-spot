/**
 * Vector operations for taste profiling and bridge scoring
 */

/**
 * Cosine similarity between two numeric arrays.
 * Returns 0 (completely different) to 1 (identical direction).
 */
export function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] ** 2;
    magB += vecB[i] ** 2;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Build a binary keyword vector for a movie,
 * aligned to the user's keyword space.
 * @param {Array} movieKeywords - [{id, name}, ...]
 * @param {Array} userKeywordNames - ["heist", "corruption", ...]
 * @returns {Array} binary vector [0, 1, 0, 1, ...]
 */
export function movieToKeywordVector(movieKeywords, userKeywordNames) {
  const movieKwSet = new Set(movieKeywords.map((k) => k.name.toLowerCase()));
  return userKeywordNames.map((name) =>
    movieKwSet.has(name.toLowerCase()) ? 1 : 0
  );
}

/**
 * Build the user's keyword weight vector.
 * @param {Array} userKeywords - [{name, weight}, ...]
 * @returns {Array} weight vector [0.8, 0.6, 0.3, ...]
 */
export function userToKeywordVector(userKeywords) {
  return userKeywords.map((kw) => kw.weight);
}
